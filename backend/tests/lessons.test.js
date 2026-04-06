/**
 * Lessons endpoint tests.
 *
 * GET /api/v1/lessons is a public endpoint (no auth required).
 * Requires a live DATABASE_URL connection to return real data.
 * If no DB is available, tests skip gracefully.
 */

const request = require("supertest");
const createApp = require("../src/app");

let app;

beforeAll(() => {
  app = createApp();
});

const hasDatabase = !!process.env.DATABASE_URL;

describe("GET /api/v1/lessons", () => {
  if (!hasDatabase) {
    it.skip("skipped — no DATABASE_URL configured", () => {});
    return;
  }

  it("should return 200", async () => {
    const res = await request(app).get("/api/v1/lessons");

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
  });

  it("should return a success response or an array", async () => {
    const res = await request(app).get("/api/v1/lessons");

    // API may return { success: true, data: [...] } or just [...]
    if (Array.isArray(res.body)) {
      expect(Array.isArray(res.body)).toBe(true);
    } else {
      expect(res.body.success).toBe(true);
    }
  });
});
