/**
 * password_version + session-revoke tests (Wave 1.3, migration 0042).
 *
 * Layered:
 *   1. JWT issuance     — generateAccessToken embeds `pv` claim from
 *                         user.password_version.
 *   2. Middleware       — verifyToken re-checks pv against DB; mismatch
 *                         → 401 TOKEN_INVALIDATED. Legacy token (no pv
 *                         claim) → grace match.
 *   3. Repository TX    — rotatePasswordAndRevokeSessions hits the
 *                         expected SQL sequence (BEGIN, UPDATE users,
 *                         UPDATE refresh_tokens, COMMIT).
 *   4. Service          — changePassword returns requires_relogin signal
 *                         that the FE keys off.
 *
 * The full HTTP integration (existing user logs in → calls
 * /change-password → next /api/v1/* request returns 401) is exercised
 * by manual smoke and the live deploy, since auth.test.js already
 * hits the supertest layer.
 */

"use strict";

// ---------------------------------------------------------------------------
// Common: pg mock — pool.connect() returns a client object with query/release
// ---------------------------------------------------------------------------

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

jest.mock("../src/config/db", () => {
  const query = jest.fn();
  return {
    query,
    pool: { connect: jest.fn() },
  };
});

const db = require("../src/config/db");

beforeEach(() => {
  db.query.mockReset();
  db.pool.connect.mockReset();
  mockClient.query.mockReset();
  mockClient.release.mockReset();
});

// ---------------------------------------------------------------------------
// 1. JWT issuance
// ---------------------------------------------------------------------------

// Need a valid JWT secret BEFORE requiring authService (config validates env).
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret-1234567890-1234567890-1234567890";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret-1234567890-1234567890-1234567890";

const jwt = require("jsonwebtoken");
const config = require("../src/config");

// Re-require fresh to pick up env. Because authService.generateAccessToken
// is private, we test via login (which calls it). But login → DB calls.
// Easier: directly import the helper by re-requiring authService and
// inspecting issued tokens via jwt.decode on the result of login.

describe("generateAccessToken includes pv claim", () => {
  // Test the helper indirectly: register a user (mocked DB) and decode
  // the issued accessToken.

  it("embeds pv from user row when issuing access token via register()", async () => {
    jest.resetModules();
    process.env.JWT_ACCESS_SECRET = "test-access-secret-1234567890-1234567890-1234567890";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret-1234567890-1234567890-1234567890";

    jest.doMock("../src/config/db", () => ({
      query: jest.fn(),
      pool: { connect: jest.fn() },
    }));

    const dbMock = require("../src/config/db");
    // emailExists → no
    dbMock.query.mockResolvedValueOnce({ rows: [] });
    // createUser INSERT
    dbMock.query.mockResolvedValueOnce({
      rows: [{
        id: "user-uuid-1", email: "x@y.com", name: "X", role: "kid",
        password_hash: "$2b$12$mock", password_version: 1, created_at: new Date(),
      }],
    });
    // storeRefreshToken INSERT
    dbMock.query.mockResolvedValueOnce({ rows: [{ id: "rt-1" }] });

    const authService = require("../src/services/authService");
    const result = await authService.register({
      email: "x@y.com", name: "X", password: "abcd1234",
    });

    expect(result.accessToken).toBeDefined();
    const decoded = jwt.decode(result.accessToken);
    expect(decoded).toMatchObject({
      sub: "user-uuid-1",
      role: "kid",
      name: "X",
      pv: 1,
    });
  });

  it("uses pv=1 when user row lacks password_version (defensive default)", async () => {
    jest.resetModules();
    process.env.JWT_ACCESS_SECRET = "test-access-secret-1234567890-1234567890-1234567890";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret-1234567890-1234567890-1234567890";

    jest.doMock("../src/config/db", () => ({
      query: jest.fn(),
      pool: { connect: jest.fn() },
    }));

    const dbMock = require("../src/config/db");
    dbMock.query.mockResolvedValueOnce({ rows: [] }); // emailExists
    // createUser RETURNING — but missing password_version (simulate older schema)
    dbMock.query.mockResolvedValueOnce({
      rows: [{
        id: "user-uuid-2", email: "y@z.com", name: "Y", role: "kid",
        password_hash: "$2b$12$mock", created_at: new Date(),
      }],
    });
    dbMock.query.mockResolvedValueOnce({ rows: [{ id: "rt-2" }] });

    const authService = require("../src/services/authService");
    const result = await authService.register({
      email: "y@z.com", name: "Y", password: "abcd1234",
    });
    const decoded = jwt.decode(result.accessToken);
    expect(decoded.pv).toBe(1); // defaults to 1
  });
});

// ---------------------------------------------------------------------------
// 2. Middleware: pv check
// ---------------------------------------------------------------------------

describe("verifyToken middleware — password_version binding", () => {
  function makeReq(token, url = "/api/v1/test") {
    return {
      headers: { authorization: `Bearer ${token}` },
      method: "GET",
      originalUrl: url,
    };
  }
  function makeRes() { return {}; }

  it("passes when pv claim matches DB", async () => {
    jest.resetModules();
    process.env.JWT_ACCESS_SECRET = "test-access-secret-1234567890-1234567890-1234567890";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret-1234567890-1234567890-1234567890";

    jest.doMock("../src/repositories/authRepository", () => ({
      getPasswordVersion: jest.fn().mockResolvedValue(3),
    }));

    const cfg = require("../src/config");
    const token = jwt.sign(
      { sub: "u1", role: "kid", name: "U", pv: 3 },
      cfg.jwt.accessSecret,
      { expiresIn: cfg.jwt.accessExpiresIn },
    );

    const { verifyToken } = require("../src/middleware/auth");
    const next = jest.fn();
    const req = makeReq(token);
    await verifyToken(req, makeRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeUndefined(); // no error
    expect(req.user).toMatchObject({ id: "u1", role: "kid", name: "U" });
  });

  it("rejects 401 TOKEN_INVALIDATED when pv claim mismatches DB", async () => {
    jest.resetModules();
    process.env.JWT_ACCESS_SECRET = "test-access-secret-1234567890-1234567890-1234567890";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret-1234567890-1234567890-1234567890";

    jest.doMock("../src/repositories/authRepository", () => ({
      getPasswordVersion: jest.fn().mockResolvedValue(5), // DB bumped to 5
    }));

    const cfg = require("../src/config");
    const token = jwt.sign(
      { sub: "u1", role: "kid", name: "U", pv: 4 }, // stale token
      cfg.jwt.accessSecret,
      { expiresIn: cfg.jwt.accessExpiresIn },
    );

    const { verifyToken } = require("../src/middleware/auth");
    const next = jest.fn();
    await verifyToken(makeReq(token), makeRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(401);
    expect(err.code).toBe("TOKEN_INVALIDATED");
  });

  it("grace-matches legacy token without pv claim (backward compat)", async () => {
    jest.resetModules();
    process.env.JWT_ACCESS_SECRET = "test-access-secret-1234567890-1234567890-1234567890";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret-1234567890-1234567890-1234567890";

    const repoMock = {
      getPasswordVersion: jest.fn().mockResolvedValue(7),
    };
    jest.doMock("../src/repositories/authRepository", () => repoMock);

    const cfg = require("../src/config");
    // Legacy token: no pv claim
    const token = jwt.sign(
      { sub: "u1", role: "kid", name: "U" },
      cfg.jwt.accessSecret,
      { expiresIn: cfg.jwt.accessExpiresIn },
    );

    const { verifyToken } = require("../src/middleware/auth");
    const next = jest.fn();
    const req = makeReq(token);
    await verifyToken(req, makeRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeUndefined();
    expect(req.user.id).toBe("u1");
    // Skipped DB lookup entirely — saves a query for legacy tokens.
    expect(repoMock.getPasswordVersion).not.toHaveBeenCalled();
  });

  it("rejects 401 USER_NOT_FOUND when DB returns null (deleted user)", async () => {
    jest.resetModules();
    process.env.JWT_ACCESS_SECRET = "test-access-secret-1234567890-1234567890-1234567890";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret-1234567890-1234567890-1234567890";

    jest.doMock("../src/repositories/authRepository", () => ({
      getPasswordVersion: jest.fn().mockResolvedValue(null),
    }));

    const cfg = require("../src/config");
    const token = jwt.sign(
      { sub: "u1", role: "kid", name: "U", pv: 1 },
      cfg.jwt.accessSecret,
      { expiresIn: cfg.jwt.accessExpiresIn },
    );

    const { verifyToken } = require("../src/middleware/auth");
    const next = jest.fn();
    await verifyToken(makeReq(token), makeRes(), next);

    const err = next.mock.calls[0][0];
    expect(err.status).toBe(401);
    expect(err.code).toBe("USER_NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
// 3. Repository TX: rotatePasswordAndRevokeSessions
// ---------------------------------------------------------------------------

describe("authRepository.rotatePasswordAndRevokeSessions", () => {
  it("runs UPDATE users + UPDATE refresh_tokens inside a transaction", async () => {
    jest.resetModules();
    jest.unmock("../src/repositories/authRepository"); // clear stale doMock from sibling test scopes
    const mockedClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    // Sequence: BEGIN, UPDATE users (returns new version), UPDATE refresh_tokens, COMMIT
    mockedClient.query
      .mockResolvedValueOnce({ rows: [] })                                // BEGIN
      .mockResolvedValueOnce({ rows: [{ password_version: 4 }] })         // UPDATE users
      .mockResolvedValueOnce({ rowCount: 2, rows: [] })                   // UPDATE refresh_tokens
      .mockResolvedValueOnce({ rows: [] });                               // COMMIT

    jest.doMock("../src/config/db", () => ({
      query: jest.fn(),
      pool: { connect: jest.fn().mockResolvedValue(mockedClient) },
    }));

    const repo = require("../src/repositories/authRepository");
    const result = await repo.rotatePasswordAndRevokeSessions("u1", "$2b$12$newhash");

    expect(result).toEqual({ newVersion: 4, revokedTokens: 2 });

    const calls = mockedClient.query.mock.calls.map(c => c[0]);
    expect(calls[0]).toBe("BEGIN");
    expect(calls[1]).toMatch(/UPDATE\s+users[\s\S]*password_version\s*=\s*password_version\s*\+\s*1/i);
    expect(calls[2]).toMatch(/UPDATE\s+refresh_tokens[\s\S]*revoked_at\s*=\s*NOW\(\)[\s\S]*WHERE\s+user_id/i);
    expect(calls[3]).toBe("COMMIT");

    expect(mockedClient.release).toHaveBeenCalled();
  });

  it("ROLLBACKs and throws when the user row is missing", async () => {
    jest.resetModules();
    jest.unmock("../src/repositories/authRepository");
    const mockedClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    mockedClient.query
      .mockResolvedValueOnce({ rows: [] })       // BEGIN
      .mockResolvedValueOnce({ rows: [] })       // UPDATE users — no row matched
      .mockResolvedValueOnce({ rows: [] });      // ROLLBACK

    jest.doMock("../src/config/db", () => ({
      query: jest.fn(),
      pool: { connect: jest.fn().mockResolvedValue(mockedClient) },
    }));

    const repo = require("../src/repositories/authRepository");
    await expect(repo.rotatePasswordAndRevokeSessions("missing", "hash")).rejects.toMatchObject({
      code: "USER_NOT_FOUND",
      status: 404,
    });

    const calls = mockedClient.query.mock.calls.map(c => c[0]);
    expect(calls).toContain("ROLLBACK");
    expect(mockedClient.release).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 4. Service: changePassword returns requires_relogin
// ---------------------------------------------------------------------------

describe("authService.changePassword", () => {
  it("returns requires_relogin:true with new version + revoked count on success", async () => {
    jest.resetModules();
    process.env.JWT_ACCESS_SECRET = "test-access-secret-1234567890-1234567890-1234567890";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret-1234567890-1234567890-1234567890";

    const dbMock = {
      query: jest.fn().mockResolvedValue({
        rows: [{ password_hash: "$2b$12$existing" }],
      }),
      pool: { connect: jest.fn() },
    };
    jest.doMock("../src/config/db", () => dbMock);
    jest.doMock("bcryptjs", () => ({
      compare: jest.fn().mockResolvedValue(true),
      hash:    jest.fn().mockResolvedValue("$2b$12$newhash"),
    }));
    jest.doMock("../src/repositories/authRepository", () => ({
      rotatePasswordAndRevokeSessions: jest.fn().mockResolvedValue({
        newVersion: 5, revokedTokens: 3,
      }),
    }));

    const authService = require("../src/services/authService");
    const result = await authService.changePassword("u1", "oldPass1", "newPass2");

    expect(result).toEqual({
      success: true,
      password_version: 5,
      revoked_sessions: 3,
      requires_relogin: true,
    });
  });
});
