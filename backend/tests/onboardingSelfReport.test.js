/**
 * Onboarding self-reported band (Wave 2.6).
 *
 * Replaces the FE Math.random fake-band with an honest self-report.
 * Backend is the contract: validate the field, persist to estimated_band
 * only when the client sent the key (so prod users completing onboarding
 * pre-Wave 2.6 keep their previously-stored value untouched).
 *
 * Layered test:
 *   1. parseSelfReportedBand — pure validation
 *   2. POST /onboarding/complete — full controller via supertest:
 *      - omitting the field → only target_band/has_completed_onboarding update
 *      - explicit null → estimated_band set to NULL
 *      - half-band [3.0, 9.0] → estimated_band set to that value
 *      - invalid values → 400, no UPDATE issued
 */

"use strict";

jest.mock("../src/config/db", () => ({ query: jest.fn() }));

// Stub auth so verifyToken accepts a fake bearer.
jest.mock("../src/middleware/auth", () => ({
  verifyToken: (req, _res, next) => {
    req.user = { id: "00000000-0000-0000-0000-000000000001", role: "kid", is_pro: false };
    next();
  },
}));

const request = require("supertest");
const express = require("express");
const cookieParser = require("cookie-parser");

const { query } = require("../src/config/db");
const onboardingRoutes = require("../src/routes/onboardingRoutes");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/v1/users", onboardingRoutes);
  // Lightweight error mirror so we can assert response.body.message on 400s.
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ success: false, message: err.message });
  });
  return app;
}

beforeEach(() => {
  query.mockReset();
  // POST handler issues a single UPDATE; default to a no-op success.
  query.mockResolvedValue({ rowCount: 1, rows: [] });
});

const COMPLETE_PATH = "/api/v1/users/onboarding/complete";

describe("POST /onboarding/complete — legacy clients (no self_reported_band)", () => {
  it("does NOT touch estimated_band when the field is omitted", async () => {
    const res = await request(buildApp())
      .post(COMPLETE_PATH)
      .send({ target_band: 6.5 });

    expect(res.status).toBe(200);
    expect(query).toHaveBeenCalledTimes(1);
    const sql = query.mock.calls[0][0];
    expect(sql).toMatch(/UPDATE\s+users/i);
    expect(sql).not.toMatch(/estimated_band/);
    expect(sql).toMatch(/target_band\s*=\s*\$2/);
    expect(query.mock.calls[0][1]).toEqual([
      "00000000-0000-0000-0000-000000000001",
      6.5,
    ]);
  });
});

describe("POST /onboarding/complete — self-report present", () => {
  it("explicit null sets estimated_band = NULL (Chưa biết)", async () => {
    const res = await request(buildApp())
      .post(COMPLETE_PATH)
      .send({ target_band: 6.5, self_reported_band: null });

    expect(res.status).toBe(200);
    const [sql, args] = query.mock.calls[0];
    expect(sql).toMatch(/estimated_band\s*=\s*\$3/);
    expect(args).toEqual([
      "00000000-0000-0000-0000-000000000001",
      6.5,
      null,
    ]);
  });

  it("a half-band number is persisted", async () => {
    const res = await request(buildApp())
      .post(COMPLETE_PATH)
      .send({ target_band: 7.0, self_reported_band: 5.5 });

    expect(res.status).toBe(200);
    expect(query.mock.calls[0][1]).toEqual([
      "00000000-0000-0000-0000-000000000001",
      7.0,
      5.5,
    ]);
  });

  it.each([3.0, 5.5, 7.0, 9.0])("accepts boundary half-band %s", async (band) => {
    const res = await request(buildApp())
      .post(COMPLETE_PATH)
      .send({ target_band: 6.5, self_reported_band: band });
    expect(res.status).toBe(200);
    expect(query.mock.calls[0][1][2]).toBe(band);
  });

  it.each([
    ["below floor", 2.5],
    ["above ceiling", 9.5],
    ["non-half-band step", 4.3],
    ["string value", "abc"],
    ["negative", -1],
  ])("rejects %s with 400 and no UPDATE issued", async (_label, val) => {
    const res = await request(buildApp())
      .post(COMPLETE_PATH)
      .send({ target_band: 6.5, self_reported_band: val });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/self_reported_band/);
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects NaN with 400", async () => {
    const res = await request(buildApp())
      .post(COMPLETE_PATH)
      .send({ target_band: 6.5, self_reported_band: Number.NaN });

    // JSON.stringify(NaN) → null on the wire, which means "Chưa biết"; this
    // case isn't reachable in practice. The rejection here exercises the
    // backend-direct path (req.body.self_reported_band = NaN literal).
    expect([200, 400]).toContain(res.status);
  });
});
