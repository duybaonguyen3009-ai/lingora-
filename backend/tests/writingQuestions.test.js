/**
 * Tests for the Writing prompt-bank endpoints (migration 0032).
 *
 * Two layers:
 *   1. Service layer — repo mocked; verifies filter normalisation,
 *      attempt 404 path, and Full Test pairing.
 *   2. Route layer   — supertest smoke to confirm auth guards are wired.
 */

"use strict";

jest.mock("../src/repositories/writingQuestionsRepository", () => ({
  listQuestions: jest.fn(),
  listTopics: jest.fn(),
  getQuestionById: jest.fn(),
  upsertAttempt: jest.fn(),
  pickRandomQuestion: jest.fn(),
}));

const repo = require("../src/repositories/writingQuestionsRepository");
const service = require("../src/services/writingQuestionsService");

beforeEach(() => {
  Object.values(repo).forEach((fn) => fn.mockReset());
});

// ---------------------------------------------------------------------------
// Service layer
// ---------------------------------------------------------------------------

describe("writingQuestionsService.listQuestions", () => {
  it("forwards whitelisted filters to the repository", async () => {
    repo.listQuestions.mockResolvedValue([{ id: "q1", task_type: "task1", attempted: true }]);

    const rows = await service.listQuestions("user-1", {
      taskType: "task1",
      topic: "environment",
      difficulty: "band_6_7",
      excludeAttempted: true,
      limit: 10,
      offset: 0,
    });

    expect(repo.listQuestions).toHaveBeenCalledWith({
      userId: "user-1",
      taskType: "task1",
      topic: "environment",
      difficulty: "band_6_7",
      excludeAttempted: true,
      limit: 10,
      offset: 0,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].attempted).toBe(true);
  });

  it("drops invalid task_type and difficulty values", async () => {
    repo.listQuestions.mockResolvedValue([]);

    await service.listQuestions("user-1", {
      taskType: "; DROP TABLE",
      difficulty: "band_9_infinity",
      topic: "tech",
    });

    expect(repo.listQuestions).toHaveBeenCalledWith(
      expect.objectContaining({ taskType: null, difficulty: null, topic: "tech" })
    );
  });
});

describe("writingQuestionsService.recordAttempt", () => {
  it("upserts when the question exists", async () => {
    repo.getQuestionById.mockResolvedValue({ id: "q1" });
    repo.upsertAttempt.mockResolvedValue();

    const res = await service.recordAttempt("user-1", "q1");

    expect(repo.upsertAttempt).toHaveBeenCalledWith("user-1", "q1");
    expect(res).toEqual({ id: "q1" });
  });

  it("throws 404 when the question is missing", async () => {
    repo.getQuestionById.mockResolvedValue(null);

    await expect(service.recordAttempt("user-1", "q-missing")).rejects.toMatchObject({
      status: 404,
      message: expect.stringMatching(/not found/i),
    });
    expect(repo.upsertAttempt).not.toHaveBeenCalled();
  });
});

describe("writingQuestionsService.startFullTest", () => {
  it("returns one task1 + one task2", async () => {
    repo.pickRandomQuestion
      .mockResolvedValueOnce({ id: "t1", task_type: "task1" })
      .mockResolvedValueOnce({ id: "t2", task_type: "task2" });

    const pair = await service.startFullTest();
    expect(pair.task1.id).toBe("t1");
    expect(pair.task2.id).toBe("t2");
    expect(repo.pickRandomQuestion).toHaveBeenNthCalledWith(1, "task1");
    expect(repo.pickRandomQuestion).toHaveBeenNthCalledWith(2, "task2");
  });

  it("throws 503 when bank is empty", async () => {
    repo.pickRandomQuestion.mockResolvedValue(null);
    await expect(service.startFullTest()).rejects.toMatchObject({ status: 503 });
  });
});

// ---------------------------------------------------------------------------
// Route layer — auth guard smoke
// ---------------------------------------------------------------------------

describe("Writing question endpoints (auth guard)", () => {
  const request = require("supertest");
  const createApp = require("../src/app");
  let app;

  beforeAll(() => {
    app = createApp();
  });

  it("rejects unauthenticated GET /writing/questions", async () => {
    const res = await request(app).get("/api/v1/writing/questions");
    expect(res.status).toBe(401);
  });

  it("rejects unauthenticated POST /writing/questions/:id/attempt", async () => {
    const res = await request(app).post("/api/v1/writing/questions/00000000-0000-0000-0000-000000000000/attempt");
    expect(res.status).toBe(401);
  });

  it("rejects unauthenticated GET /writing/full-test/start", async () => {
    const res = await request(app).get("/api/v1/writing/full-test/start");
    expect(res.status).toBe(401);
  });
});
