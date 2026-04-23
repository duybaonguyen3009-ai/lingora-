/**
 * Unit tests for writingFullTestService + route auth guards.
 *
 * All external repos + writingService are mocked so the test focuses on
 * the Full Test lifecycle logic (create → link → finalize) and the
 * weighted-band arithmetic.
 */

"use strict";

jest.mock("../../src/repositories/writingFullTestRepository", () => ({
  createRun: jest.fn(),
  getRunById: jest.fn(),
  linkSubmission: jest.fn(),
  finalizeRun: jest.fn(),
  markExpired: jest.fn(),
  listForUser: jest.fn(),
  listOverdueInProgress: jest.fn(),
  getInProgressForUser: jest.fn(),
}));

jest.mock("../../src/repositories/writingQuestionsRepository", () => ({
  pickRandomQuestion: jest.fn(),
  getQuestionById: jest.fn(),
}));

jest.mock("../../src/repositories/writingRepository", () => ({
  getSubmissionById: jest.fn(),
}));

jest.mock("../../src/services/writingService", () => ({
  submitEssay: jest.fn(),
}));

const ftRepo = require("../../src/repositories/writingFullTestRepository");
const qRepo = require("../../src/repositories/writingQuestionsRepository");
const subRepo = require("../../src/repositories/writingRepository");
const wService = require("../../src/services/writingService");
const fullTestService = require("../../src/services/writingFullTestService");

const USER = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000999";

beforeEach(() => {
  Object.values(ftRepo).forEach((fn) => fn.mockReset());
  Object.values(qRepo).forEach((fn) => fn.mockReset());
  Object.values(subRepo).forEach((fn) => fn.mockReset());
  Object.values(wService).forEach((fn) => fn.mockReset());
});

describe("writingFullTestService.start", () => {
  it("picks a pair, creates a run, and returns the id + questions", async () => {
    qRepo.pickRandomQuestion
      .mockResolvedValueOnce({ id: "q1" })
      .mockResolvedValueOnce({ id: "q2" });
    ftRepo.createRun.mockResolvedValue({ id: "run-1", started_at: "2026-04-22T10:00:00Z" });

    const res = await fullTestService.start(USER);
    expect(res.full_test_id).toBe("run-1");
    expect(res.task1.id).toBe("q1");
    expect(res.task2.id).toBe("q2");
    expect(ftRepo.createRun).toHaveBeenCalledWith({
      userId: USER,
      task1QuestionId: "q1",
      task2QuestionId: "q2",
    });
  });

  it("throws 503 when bank is empty", async () => {
    qRepo.pickRandomQuestion.mockResolvedValue(null);
    await expect(fullTestService.start(USER)).rejects.toMatchObject({ status: 503 });
  });
});

describe("writingFullTestService.submitTask", () => {
  it("scores the essay, links the submission, stays in progress until both tasks submitted", async () => {
    ftRepo.getRunById
      .mockResolvedValueOnce({
        id: "run-1", user_id: USER, status: "in_progress",
        task1_submission_id: null, task2_submission_id: null,
      })
      .mockResolvedValueOnce({
        id: "run-1", user_id: USER, status: "in_progress",
        task1_submission_id: "sub-1", task2_submission_id: null,
      });
    wService.submitEssay.mockResolvedValue({ submissionId: "sub-1", status: "pending" });
    ftRepo.linkSubmission.mockResolvedValue({ id: "run-1" });

    const res = await fullTestService.submitTask(USER, "run-1", {
      taskType: "task1",
      questionText: "q", essayText: "e", writingQuestionId: "q1",
    });

    expect(wService.submitEssay).toHaveBeenCalled();
    expect(ftRepo.linkSubmission).toHaveBeenCalledWith("run-1", "task1", "sub-1");
    expect(res.finalized).toBe(false);
    expect(res.submissionId).toBe("sub-1");
  });

  it("auto-finalizes when linking the second task completes the run", async () => {
    ftRepo.getRunById
      .mockResolvedValueOnce({
        id: "run-1", user_id: USER, status: "in_progress",
        task1_submission_id: "sub-1", task2_submission_id: null,
      })
      .mockResolvedValueOnce({
        id: "run-1", user_id: USER, status: "in_progress",
        task1_submission_id: "sub-1", task2_submission_id: "sub-2",
        started_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      })
      // Finalize path re-reads the run first
      .mockResolvedValueOnce({
        id: "run-1", user_id: USER, status: "in_progress",
        task1_submission_id: "sub-1", task2_submission_id: "sub-2",
        started_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      });
    wService.submitEssay.mockResolvedValue({ submissionId: "sub-2", status: "pending" });
    ftRepo.linkSubmission.mockResolvedValue({ id: "run-1" });
    subRepo.getSubmissionById
      .mockResolvedValueOnce({ overall_band: 6.5 })  // task1
      .mockResolvedValueOnce({ overall_band: 7.0 }); // task2
    ftRepo.finalizeRun.mockResolvedValue({ id: "run-1", status: "submitted", overall_band: 7.0 });

    const res = await fullTestService.submitTask(USER, "run-1", {
      taskType: "task2",
      questionText: "q", essayText: "e", writingQuestionId: "q2",
    });
    expect(res.finalized).toBe(true);
    // weighted: (6.5*1 + 7.0*2) / 3 = 6.833 → rounded to 6.5 (0.5 grain)… actually 6.833 → 7.0 nearest 0.5
    expect(ftRepo.finalizeRun).toHaveBeenCalledWith("run-1", expect.objectContaining({
      overallBand: expect.any(Number),
    }));
  });

  it("403 when run belongs to another user", async () => {
    ftRepo.getRunById.mockResolvedValue({ id: "run-1", user_id: OTHER, status: "in_progress" });
    await expect(
      fullTestService.submitTask(USER, "run-1", { taskType: "task1", questionText: "q", essayText: "e" })
    ).rejects.toMatchObject({ status: 403 });
  });

  it("409 when run already finalized", async () => {
    ftRepo.getRunById.mockResolvedValue({ id: "run-1", user_id: USER, status: "submitted" });
    await expect(
      fullTestService.submitTask(USER, "run-1", { taskType: "task1", questionText: "q", essayText: "e" })
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("writingFullTestService.finalize", () => {
  it("computes weighted overall band (Task 2 = 2× Task 1), rounded to 0.5", async () => {
    ftRepo.getRunById.mockResolvedValue({
      id: "run-1", user_id: USER, status: "in_progress",
      task1_submission_id: "sub-1", task2_submission_id: "sub-2",
      started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    });
    subRepo.getSubmissionById
      .mockResolvedValueOnce({ overall_band: 6.0 })
      .mockResolvedValueOnce({ overall_band: 7.0 });
    ftRepo.finalizeRun.mockResolvedValue({ id: "run-1", overall_band: 6.5, status: "submitted" });

    await fullTestService.finalize(USER, "run-1");

    // (6.0*1 + 7.0*2)/3 = 6.666… → rounds to 6.5 (nearest 0.5)
    expect(ftRepo.finalizeRun).toHaveBeenCalledWith("run-1",
      expect.objectContaining({ overallBand: 6.5 }));
  });

  it("idempotent — already-submitted run returns existing row without re-finalizing", async () => {
    const existing = { id: "run-1", user_id: USER, status: "submitted", overall_band: 7.5 };
    ftRepo.getRunById.mockResolvedValue(existing);
    const res = await fullTestService.finalize(USER, "run-1");
    expect(res).toBe(existing);
    expect(ftRepo.finalizeRun).not.toHaveBeenCalled();
  });
});

describe("writingFullTestService.getInProgress", () => {
  it("returns null when no in-progress run exists", async () => {
    ftRepo.getInProgressForUser.mockResolvedValueOnce(null);
    const res = await fullTestService.getInProgress(USER);
    expect(res).toBeNull();
  });

  it("returns hydrated run with time_remaining and submission flags", async () => {
    const startedAt = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 min ago
    ftRepo.getInProgressForUser.mockResolvedValueOnce({
      id: "run-42",
      user_id: USER,
      status: "in_progress",
      task1_submission_id: "sub-1",
      task2_submission_id: null,
      task1_question_id: "q1",
      task2_question_id: "q2",
      started_at: startedAt,
    });
    qRepo.getQuestionById
      .mockResolvedValueOnce({ id: "q1", task_type: "task1" })
      .mockResolvedValueOnce({ id: "q2", task_type: "task2" });

    const res = await fullTestService.getInProgress(USER);
    expect(res).toMatchObject({
      id: "run-42",
      task1_submitted: true,
      task2_submitted: false,
      started_at: startedAt,
    });
    // Should have ~55 minutes (3300s) remaining, give a tolerance
    expect(res.time_remaining_seconds).toBeGreaterThan(3000);
    expect(res.time_remaining_seconds).toBeLessThanOrEqual(3600);
    expect(res.task1_question).toMatchObject({ id: "q1" });
    expect(res.task2_question).toMatchObject({ id: "q2" });
  });

  it("returns null if timer already elapsed (defensive)", async () => {
    ftRepo.getInProgressForUser.mockResolvedValueOnce({
      id: "run-stale",
      user_id: USER,
      status: "in_progress",
      task1_submission_id: null,
      task2_submission_id: null,
      task1_question_id: "q1",
      task2_question_id: "q2",
      started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
    });
    const res = await fullTestService.getInProgress(USER);
    expect(res).toBeNull();
  });
});

describe("Full Test endpoint auth", () => {
  const request = require("supertest");
  const createApp = require("../../src/app");
  let app;
  beforeAll(() => { app = createApp(); });

  const uuid = "00000000-0000-0000-0000-000000000042";

  it("rejects unauthenticated submit-task", async () => {
    const res = await request(app).post(`/api/v1/writing/full-test/${uuid}/submit-task`).send({});
    expect(res.status).toBe(401);
  });

  it("rejects unauthenticated finalize", async () => {
    const res = await request(app).post(`/api/v1/writing/full-test/${uuid}/finalize`);
    expect(res.status).toBe(401);
  });

  it("rejects unauthenticated list + get", async () => {
    expect((await request(app).get(`/api/v1/writing/full-tests`)).status).toBe(401);
    expect((await request(app).get(`/api/v1/writing/full-tests/${uuid}`)).status).toBe(401);
  });

  it("rejects unauthenticated in-progress", async () => {
    const res = await request(app).get(`/api/v1/writing/full-tests/in-progress`);
    expect(res.status).toBe(401);
  });

  it("rejects unauthenticated analytics", async () => {
    expect((await request(app).get(`/api/v1/writing/analytics/trend`)).status).toBe(401);
    expect((await request(app).get(`/api/v1/writing/analytics/self-compare`)).status).toBe(401);
  });
});
