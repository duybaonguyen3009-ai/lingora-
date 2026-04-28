/**
 * /health/schema endpoint — Wave INFRA-001 Layer 2.
 *
 * Compares filesystem-latest migration filename to pgmigrations'
 * latest row. Mismatch → 500 with drift payload. Used by Railway
 * healthcheckPath so cutover blocks when migrations didn't run.
 *
 * fs.readdirSync is faked so we can drive the "expected" side without
 * touching the real migrations dir; pg query() is mocked too.
 */

"use strict";

jest.mock("fs", () => {
  const real = jest.requireActual("fs");
  return { ...real, readdirSync: jest.fn() };
});

jest.mock("../src/config/db", () => ({ query: jest.fn() }));

const fs = require("fs");
const { query } = require("../src/config/db");

let app;
beforeAll(() => {
  const express = require("express");
  app = express();
  app.use("/health", require("../src/healthRoutes"));
});

beforeEach(() => {
  fs.readdirSync.mockReset();
  query.mockReset();
});

const request = require("supertest");

// ─── liveness (regression) ──────────────────────────────────────────────────

describe("GET /health (liveness — no DB touch)", () => {
  it("returns 200 even when DB is unreachable", async () => {
    query.mockRejectedValue(new Error("db down"));
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

// ─── schema gate ────────────────────────────────────────────────────────────

describe("GET /health/schema — drift detector", () => {
  it("200 when applied === expected", async () => {
    fs.readdirSync.mockReturnValueOnce([
      "0001_auth.js",
      "0046_account_deletion_readiness.js",
      "0047_profile_visibility.js",
      "README.md",          // ignored — pattern requires NNNN_*.js
    ]);
    query.mockResolvedValueOnce({ rows: [{ name: "0047_profile_visibility" }] });

    const res = await request(app).get("/health/schema");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, latest: "0047_profile_visibility" });

    // SQL exact shape — sentinel for the schema-aware contract.
    const sql = query.mock.calls[0][0];
    expect(sql).toMatch(/SELECT\s+name\s+FROM\s+pgmigrations\s+ORDER\s+BY\s+id\s+DESC\s+LIMIT\s+1/i);
  });

  it("500 with drift payload when applied is older than expected", async () => {
    fs.readdirSync.mockReturnValueOnce([
      "0046_account_deletion_readiness.js",
      "0047_profile_visibility.js",
    ]);
    query.mockResolvedValueOnce({ rows: [{ name: "0046_account_deletion_readiness" }] });

    const res = await request(app).get("/health/schema");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      ok:       false,
      drift:    true,
      expected: "0047_profile_visibility",
      applied:  "0046_account_deletion_readiness",
    });
  });

  it("500 when pgmigrations is empty (fresh DB without runs)", async () => {
    fs.readdirSync.mockReturnValueOnce(["0047_profile_visibility.js"]);
    query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/health/schema");

    expect(res.status).toBe(500);
    expect(res.body.drift).toBe(true);
    expect(res.body.applied).toBeNull();
  });

  it("500 when filesystem read fails (no migrations matched)", async () => {
    fs.readdirSync.mockReturnValueOnce([]); // empty / pattern miss

    const res = await request(app).get("/health/schema");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("schema_check_failed");
    expect(res.body.stage).toBe("filesystem_read");
    // Should NOT have queried the DB if filesystem side already failed.
    expect(query).not.toHaveBeenCalled();
  });

  it("500 when DB query throws", async () => {
    fs.readdirSync.mockReturnValueOnce(["0047_profile_visibility.js"]);
    query.mockRejectedValueOnce(new Error("connection refused"));

    const res = await request(app).get("/health/schema");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("schema_check_failed");
    expect(res.body.stage).toBe("db_query");
  });

  it("filters non-migration files (e.g. README.md, .gitkeep) from the expected calc", async () => {
    fs.readdirSync.mockReturnValueOnce([
      "README.md",
      ".gitkeep",
      "0001_auth.js",
      "0047_profile_visibility.js",
    ]);
    query.mockResolvedValueOnce({ rows: [{ name: "0047_profile_visibility" }] });

    const res = await request(app).get("/health/schema");
    expect(res.status).toBe(200);
    expect(res.body.latest).toBe("0047_profile_visibility");
  });

  it("sorts lexicographically (zero-padded prefix discipline)", async () => {
    fs.readdirSync.mockReturnValueOnce([
      "0009_phase_a.js",
      "0010_phase_b.js",
      "0047_profile_visibility.js",
    ]);
    query.mockResolvedValueOnce({ rows: [{ name: "0047_profile_visibility" }] });

    const res = await request(app).get("/health/schema");
    expect(res.status).toBe(200);
  });
});
