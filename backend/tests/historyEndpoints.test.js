/**
 * Wave 2.9 — history endpoints.
 *
 *   GET /api/v1/reading/history
 *   GET /api/v1/battle/history
 *
 * Both authed, owner-only, paginated. Page 1+, limit 1-50, default
 * page=1 limit=20. Returns { items, total, page, limit, hasMore }.
 *
 * Reading history pulls from xp_ledger (R1 scope — no per-attempt
 * band yet). Battle history JOINs the opposing participant + their
 * users row to expose opponent identity.
 */

"use strict";

jest.mock("../src/config/db", () => ({ query: jest.fn() }));

jest.mock("../src/middleware/auth", () => ({
  verifyToken: (req, _res, next) => {
    req.user = { id: "00000000-0000-0000-0000-000000000001", role: "kid" };
    next();
  },
  optionalAuth: (req, _res, next) => { req.user = null; next(); },
}));

const { query } = require("../src/config/db");

let app;
beforeAll(() => {
  const express = require("express");
  app = express();
  app.use(express.json());
  app.use("/api/v1/reading", require("../src/routes/readingRoutes"));
  app.use("/api/v1/battle",  require("../src/routes/battleRoutes"));
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ success: false, message: err.message, code: err.code });
  });
});

beforeEach(() => { query.mockReset(); });

const request = require("supertest");
const USER = "00000000-0000-0000-0000-000000000001";

// ─── Reading ─────────────────────────────────────────────────────────────────

describe("GET /api/v1/reading/history", () => {
  it("returns empty list + total=0 for a user with no attempts", async () => {
    query
      .mockResolvedValueOnce({ rows: [] })            // listUserHistory
      .mockResolvedValueOnce({ rows: [{ n: 0 }] });   // countUserHistory

    const res = await request(app).get("/api/v1/reading/history");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      items:   [],
      total:   0,
      page:    1,
      limit:   20,
      hasMore: false,
    });
  });

  it("paginates: page=1 limit=20 with 25 total → hasMore=true", async () => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      id: `xp-${i}`,
      attempted_at: "2026-04-28T00:00:00Z",
      xp_earned: 10,
      passage_title: "Passage " + i,
      passage_id: `pas-${i}`,
    }));
    query
      .mockResolvedValueOnce({ rows: items })
      .mockResolvedValueOnce({ rows: [{ n: 25 }] });

    const res = await request(app).get("/api/v1/reading/history?page=1&limit=20");

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(20);
    expect(res.body.data.total).toBe(25);
    expect(res.body.data.hasMore).toBe(true);

    // Verify the SQL targets only this user (owner-only).
    const [, listArgs] = query.mock.calls[0];
    expect(listArgs).toEqual([USER, 20, 0]);
  });

  it("page=2 offset arithmetic + hasMore=false", async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: "x21" }, { id: "x22" }, { id: "x23" }, { id: "x24" }, { id: "x25" }] })
      .mockResolvedValueOnce({ rows: [{ n: 25 }] });

    const res = await request(app).get("/api/v1/reading/history?page=2&limit=20");

    expect(res.status).toBe(200);
    expect(res.body.data.page).toBe(2);
    expect(res.body.data.hasMore).toBe(false);
    expect(query.mock.calls[0][1]).toEqual([USER, 20, 20]); // offset=20
  });

  it.each([
    ["page=0", "page=0"],
    ["page=-1", "page=-1"],
    ["page=abc", "page=abc"],
    ["limit=0", "limit=0"],
    ["limit=51", "limit=51"],
    ["limit=999", "limit=999"],
    ["limit=abc", "limit=abc"],
  ])("rejects invalid pagination [%s] with 400 + INVALID_PAGINATION", async (_label, qs) => {
    const res = await request(app).get(`/api/v1/reading/history?${qs}`);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_PAGINATION");
    expect(query).not.toHaveBeenCalled();
  });

  it("only references current user's id in the SQL params (owner-only)", async () => {
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ n: 0 }] });

    await request(app)
      .get("/api/v1/reading/history?user_id=spoof-different-user");

    // Adversarial: query string user_id should be IGNORED. Both DB
    // calls use the auth-derived id only.
    const [, listArgs] = query.mock.calls[0];
    const [, countArgs] = query.mock.calls[1];
    expect(listArgs[0]).toBe(USER);
    expect(countArgs[0]).toBe(USER);
  });
});

// ─── Battle ─────────────────────────────────────────────────────────────────

describe("GET /api/v1/battle/history", () => {
  it("returns paginated rows with opponent fields", async () => {
    const sampleRow = {
      id: "match-1",
      played_at: "2026-04-28T00:00:00Z",
      status: "completed",
      result: "won",
      my_score: 7000,
      opponent_score: 5500,
      rank_delta: 25,
      xp_earned: 80,
      opponent_username: "bob",
      opponent_name: "Bob",
      opponent_avatar: null,
      passage_title: "City Life",
    };
    query
      .mockResolvedValueOnce({ rows: [sampleRow] })
      .mockResolvedValueOnce({ rows: [{ n: 1 }] });

    const res = await request(app).get("/api/v1/battle/history");

    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([sampleRow]);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.hasMore).toBe(false);
  });

  it("400 on bad pagination params", async () => {
    const res = await request(app).get("/api/v1/battle/history?limit=999");
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_PAGINATION");
  });

  it("owner-only: SQL filters on req.user.id", async () => {
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ n: 0 }] });

    await request(app).get("/api/v1/battle/history");

    expect(query.mock.calls[0][1][0]).toBe(USER);
    expect(query.mock.calls[1][1][0]).toBe(USER);
  });

  it("SQL derives result in-DB (won/lost/draw/pending CASE expression)", async () => {
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ n: 0 }] });

    await request(app).get("/api/v1/battle/history");

    const sql = query.mock.calls[0][0];
    expect(sql).toMatch(/CASE/i);
    expect(sql).toMatch(/'won'/);
    expect(sql).toMatch(/'lost'/);
    expect(sql).toMatch(/'draw'/);
    // LEFT JOIN to users so a deleted opponent still surfaces (anonymized)
    expect(sql).toMatch(/LEFT\s+JOIN\s+users/i);
  });
});
