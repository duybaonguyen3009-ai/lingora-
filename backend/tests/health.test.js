/**
 * Health endpoint tests.
 *
 * GET /health is a simple liveness check — no DB, no auth.
 * Should always return 200 with { success: true, status: "ok" }.
 */

const request = require("supertest");
const createApp = require("../src/app");

let app;

beforeAll(() => {
  app = createApp();
});

describe("GET /health", () => {
  it("should return 200 with success and status ok", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("lingona-api");
    expect(res.body.timestamp).toBeDefined();
  });
});
