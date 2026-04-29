/**
 * Wave 2.10 — Email change service + controller tests.
 *
 * Layered:
 *   1. Pure helpers — email regex, JWT sign/verify roundtrip, redactor.
 *   2. Service — re-auth gate, collision generic-error, rate limit.
 *   3. Endpoint integration — POST /auth/email-change + GET undo.
 *
 * The pg client is mocked. JWT signing uses the real config.jwt
 * .accessSecret (dev fallback) so we exercise the actual algorithm
 * + audience contract.
 */

"use strict";

jest.mock("../src/config/db", () => {
  const mockClient = {
    query:   jest.fn(),
    release: jest.fn(),
  };
  return {
    pool:  { connect: jest.fn(() => Promise.resolve(mockClient)), on: jest.fn() },
    query: jest.fn(),
    __mockClient: mockClient,
  };
});

jest.mock("../src/services/emailService", () => ({
  sendEmailChangeNotification: jest.fn().mockResolvedValue(undefined),
  sendEmailUndoConfirmation:   jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../src/middleware/auth", () => ({
  verifyToken: (req, _res, next) => {
    req.user = { id: "00000000-0000-0000-0000-000000000aaa", role: "kid" };
    next();
  },
}));
jest.mock("../src/middleware/rateLimiters", () => ({
  emailChangeLimiter: (_req, _res, next) => next(),
}));

const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const config = require("../src/config");

const db = require("../src/config/db");
const mockClient = db.__mockClient;
const { __internal } = require("../src/services/emailChangeService");
const emailChangeService = require("../src/services/emailChangeService");

const ALICE   = "00000000-0000-0000-0000-000000000aaa";
const HASH_OK = bcrypt.hashSync("hunter2", 4);

beforeEach(() => {
  db.query.mockReset();
  mockClient.query.mockReset();
  mockClient.release.mockReset();
});

// ─── 1. Pure helpers ────────────────────────────────────────────────────────

describe("EMAIL_RE — input validation", () => {
  it.each([
    "alice@example.com",
    "a.b+filter@sub.example.com",
    "first.last@vn.lingona.app",
  ])("accepts %s", (e) => {
    expect(__internal.EMAIL_RE.test(e)).toBe(true);
  });
  it.each([
    "no-at-sign",
    "missing@dot",
    "  spaces@bad.com",
    "two@@at.com",
    "",
  ])("rejects %s", (e) => {
    expect(__internal.EMAIL_RE.test(e)).toBe(false);
  });
});

describe("undo JWT roundtrip", () => {
  it("signs + verifies with the expected audience + payload shape", () => {
    const token = __internal.signUndoToken(ALICE, "test-jti");
    const payload = __internal.verifyUndoToken(token);
    expect(payload.sub).toBe(ALICE);
    expect(payload.jti).toBe("test-jti");
    expect(payload.purpose).toBe("email_change_undo");
    expect(payload.aud).toBe(__internal.UNDO_AUDIENCE);
  });

  it("rejects a token with the wrong audience", () => {
    const wrong = jwt.sign(
      { sub: ALICE, jti: "x", purpose: "email_change_undo" },
      config.jwt.accessSecret,
      { algorithm: "HS256", audience: "not-the-undo-audience", expiresIn: "5m" },
    );
    expect(() => __internal.verifyUndoToken(wrong)).toThrow();
  });

  it("rejects an expired token", () => {
    const expired = jwt.sign(
      { sub: ALICE, jti: "x", purpose: "email_change_undo" },
      config.jwt.accessSecret,
      { algorithm: "HS256", audience: __internal.UNDO_AUDIENCE, expiresIn: "-1s" },
    );
    expect(() => __internal.verifyUndoToken(expired)).toThrow(/jwt expired/i);
  });
});

// ─── 2. changeEmail service ─────────────────────────────────────────────────

describe("changeEmail — re-auth gate", () => {
  it("400 when current_password is missing", async () => {
    await expect(emailChangeService.changeEmail(ALICE, "", "new@x.com"))
      .rejects.toMatchObject({ status: 400, code: "CURRENT_PASSWORD_REQUIRED" });
  });

  it("400 when new_email is malformed", async () => {
    await expect(emailChangeService.changeEmail(ALICE, "hunter2", "bad"))
      .rejects.toMatchObject({ status: 400, code: "INVALID_EMAIL" });
  });

  it("404 when the user row is missing or deleted", async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    await expect(emailChangeService.changeEmail(ALICE, "hunter2", "new@x.com"))
      .rejects.toMatchObject({ status: 404 });
  });

  it("401 with generic message on wrong password (no enumeration)", async () => {
    db.query.mockResolvedValueOnce({ rows: [{
      email: "old@x.com", name: "Alice", password_hash: HASH_OK,
    }] });

    await expect(emailChangeService.changeEmail(ALICE, "WRONG", "new@x.com"))
      .rejects.toMatchObject({ status: 401, code: "CURRENT_PASSWORD_WRONG" });
  });

  it("400 when changing to the same address (no-op guard)", async () => {
    db.query.mockResolvedValueOnce({ rows: [{
      email: "old@x.com", name: "Alice", password_hash: HASH_OK,
    }] });

    await expect(emailChangeService.changeEmail(ALICE, "hunter2", "old@x.com"))
      .rejects.toMatchObject({ status: 400, code: "EMAIL_UNCHANGED" });
  });

  it("429 when 3 changes already happened in the rolling 24h", async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{
        email: "old@x.com", name: "Alice", password_hash: HASH_OK,
      }] })
      .mockResolvedValueOnce({ rows: [{ n: 3 }] }); // countChangesSince

    await expect(emailChangeService.changeEmail(ALICE, "hunter2", "new@x.com"))
      .rejects.toMatchObject({ status: 429, code: "EMAIL_CHANGE_RATE_LIMIT" });
  });

  it("happy path: re-auths, applies change, fires notification with undo URL", async () => {
    // 1. user lookup (re-auth)
    db.query.mockResolvedValueOnce({ rows: [{
      email: "old@x.com", name: "Alice", password_hash: HASH_OK,
    }] });
    // 2. countChangesSince
    db.query.mockResolvedValueOnce({ rows: [{ n: 0 }] });

    // 3. applyChange runs through the pool client (mockClient).
    // Order: BEGIN, SELECT users FOR UPDATE, SELECT collide,
    //        UPDATE users, UPDATE refresh_tokens, INSERT email_changes,
    //        COMMIT.
    mockClient.query
      .mockResolvedValueOnce()                                           // BEGIN
      .mockResolvedValueOnce({ rows: [{ email: "old@x.com", password_version: 5 }] }) // FOR UPDATE
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })                  // collide
      .mockResolvedValueOnce({ rowCount: 1 })                            // UPDATE users
      .mockResolvedValueOnce({ rowCount: 1 })                            // revoke refresh tokens
      .mockResolvedValueOnce({ rows: [{
        id: "change-1", undo_token_jti: "jti-1", changed_at: new Date(),
      }] })
      .mockResolvedValueOnce();                                          // COMMIT

    const emailService = require("../src/services/emailService");

    const result = await emailChangeService.changeEmail(ALICE, "hunter2", "NEW@X.COM");

    expect(result.ok).toBe(true);

    // Confirms re-auth side actually used bcrypt by passing.
    expect(emailService.sendEmailChangeNotification).toHaveBeenCalledTimes(1);
    const [oldUser, newEmail, undoUrl] = emailService.sendEmailChangeNotification.mock.calls[0];
    expect(oldUser.email).toBe("old@x.com");
    expect(newEmail).toBe("new@x.com");                  // lowercased server-side
    expect(undoUrl).toMatch(/\/auth\/email-change\/undo\?token=/);

    // The token in the URL must verify as a real undo JWT.
    const tokenMatch = undoUrl.match(/token=([^&]+)/);
    const token = decodeURIComponent(tokenMatch[1]);
    const payload = __internal.verifyUndoToken(token);
    expect(payload.sub).toBe(ALICE);
    expect(payload.purpose).toBe("email_change_undo");
  });

  it("collision: BE returns generic 400 EMAIL_UNAVAILABLE (no enumeration)", async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{
        email: "old@x.com", name: "Alice", password_hash: HASH_OK,
      }] })
      .mockResolvedValueOnce({ rows: [{ n: 0 }] });

    mockClient.query
      .mockResolvedValueOnce()                                  // BEGIN
      .mockResolvedValueOnce({ rows: [{ email: "old@x.com", password_version: 5 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ "?column?": 1 }] }) // collision!
      .mockResolvedValueOnce();                                  // ROLLBACK

    await expect(emailChangeService.changeEmail(ALICE, "hunter2", "taken@x.com"))
      .rejects.toMatchObject({ status: 400, code: "EMAIL_UNAVAILABLE" });
  });
});

// ─── 3. undoEmailChange service ─────────────────────────────────────────────

describe("undoEmailChange", () => {
  it("400 on empty token", async () => {
    await expect(emailChangeService.undoEmailChange(""))
      .rejects.toMatchObject({ status: 400, code: "INVALID_TOKEN" });
  });

  it("400 INVALID_TOKEN on garbage input (signature fail)", async () => {
    await expect(emailChangeService.undoEmailChange("not.a.jwt"))
      .rejects.toMatchObject({ status: 400, code: "INVALID_TOKEN" });
  });

  it("400 UNDO_TOKEN_EXPIRED for an expired but otherwise valid JWT", async () => {
    const expired = jwt.sign(
      { sub: ALICE, jti: "j-exp", purpose: "email_change_undo" },
      config.jwt.accessSecret,
      { algorithm: "HS256", audience: __internal.UNDO_AUDIENCE, expiresIn: "-1s" },
    );

    await expect(emailChangeService.undoEmailChange(expired))
      .rejects.toMatchObject({ status: 400, code: "UNDO_TOKEN_EXPIRED" });
  });

  it("400 INVALID_TOKEN when payload purpose is wrong", async () => {
    const wrongPurpose = jwt.sign(
      { sub: ALICE, jti: "j-x", purpose: "something_else" },
      config.jwt.accessSecret,
      { algorithm: "HS256", audience: __internal.UNDO_AUDIENCE, expiresIn: "5m" },
    );

    await expect(emailChangeService.undoEmailChange(wrongPurpose))
      .rejects.toMatchObject({ status: 400, code: "INVALID_TOKEN" });
  });

  it("409 UNDO_NOT_AVAILABLE when repository says already-undone or current-email-mismatch", async () => {
    const token = __internal.signUndoToken(ALICE, "j-1");

    // applyUndo: SELECT FOR UPDATE returns row with undone_at set → repo returns null
    mockClient.query
      .mockResolvedValueOnce()                                                          // BEGIN
      .mockResolvedValueOnce({ rows: [{
        id: "c-1", user_id: ALICE,
        old_email: "old@x.com", new_email: "new@x.com",
        undone_at: new Date(),  // already undone
        current_email: "new@x.com",
      }] })
      .mockResolvedValueOnce();                                                          // ROLLBACK

    await expect(emailChangeService.undoEmailChange(token))
      .rejects.toMatchObject({ status: 409, code: "UNDO_NOT_AVAILABLE" });
  });

  it("happy path: reverts email, fires confirmation to OLD address", async () => {
    const token = __internal.signUndoToken(ALICE, "j-ok");
    const emailService = require("../src/services/emailService");

    // applyUndo: SELECT FOR UPDATE → not undone, current matches new_email →
    //            UPDATE users → UPDATE refresh_tokens → UPDATE email_changes → COMMIT
    mockClient.query
      .mockResolvedValueOnce()                                                  // BEGIN
      .mockResolvedValueOnce({ rows: [{
        id: "c-1", user_id: ALICE,
        old_email: "old@x.com", new_email: "new@x.com",
        undone_at: null,
        current_email: "new@x.com",
      }] })
      .mockResolvedValueOnce({ rowCount: 1 })   // UPDATE users
      .mockResolvedValueOnce({ rowCount: 1 })   // revoke tokens
      .mockResolvedValueOnce({ rowCount: 1 })   // UPDATE email_changes (undone_at)
      .mockResolvedValueOnce();                 // COMMIT

    // Followup: SELECT user.name for confirmation email
    db.query.mockResolvedValueOnce({ rows: [{ name: "Alice" }] });

    const result = await emailChangeService.undoEmailChange(token);

    expect(result).toEqual({ ok: true, restored_email: "old@x.com" });
    expect(emailService.sendEmailUndoConfirmation).toHaveBeenCalledWith({
      email: "old@x.com",
      name:  "Alice",
    });
  });
});

// ─── 4. HTTP integration — auth + path consistency ──────────────────────────

describe("POST /auth/email-change + GET /auth/email-change/undo (HTTP)", () => {
  let app;
  beforeAll(() => {
    const express = require("express");
    const cookieParser = require("cookie-parser");
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use("/api/v1/auth", require("../src/routes/authRoutes"));
    app.use((err, _req, res, _next) => {
      res.status(err.status || 500).json({ success: false, message: err.message, code: err.code });
    });
  });

  it("POST returns 200 on happy path with cleared refresh cookie", async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{
        email: "old@x.com", name: "Alice", password_hash: HASH_OK,
      }] })
      .mockResolvedValueOnce({ rows: [{ n: 0 }] });

    mockClient.query
      .mockResolvedValueOnce()
      .mockResolvedValueOnce({ rows: [{ email: "old@x.com", password_version: 5 }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: "c-2", undo_token_jti: "jti-2", changed_at: new Date() }] })
      .mockResolvedValueOnce();

    const request = require("supertest");
    const res = await request(app)
      .post("/api/v1/auth/email-change")
      .send({ new_email: "new@x.com", current_password: "hunter2" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Set-Cookie should clear the refresh cookie
    expect((res.headers["set-cookie"] || []).join("\n")).toMatch(/lingora_refresh=.*Expires=/);
  });

  it("GET undo without token → 400", async () => {
    const request = require("supertest");
    const res = await request(app).get("/api/v1/auth/email-change/undo");
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_TOKEN");
  });
});
