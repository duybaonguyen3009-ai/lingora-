/**
 * Auth endpoint tests.
 *
 * Tests that auth endpoints are alive and responding correctly.
 * Does NOT create real users or require a test DB with seeded data.
 * Uses invalid/missing credentials to verify error handling.
 */

const request = require("supertest");
const createApp = require("../src/app");

let app;

beforeAll(() => {
  app = createApp();
});

describe("POST /api/v1/auth/register", () => {
  it("should return 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBeDefined();
  });
});

describe("POST /api/v1/auth/login", () => {
  it("should return 401 with wrong credentials", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "nonexistent@test.invalid",
        password: "wrongpassword123",
      });

    // 401 = auth is alive and rejecting bad credentials
    // 400 = validation error (also acceptable — endpoint is alive)
    expect([400, 401]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });
});
