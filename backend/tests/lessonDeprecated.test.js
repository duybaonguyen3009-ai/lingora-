/**
 * Lesson endpoint deprecation tests (Wave 1.8).
 *
 * Pre-Wave-1.8:
 *   - GET /api/v1/lessons/:id      leaked correct_option in quiz items
 *   - POST /api/v1/lessons/:id/complete trusted client-supplied score
 *
 * Both consumers (LessonModal / useLessonDetail) were orphaned by the
 * speaking-first homepage pivot (commit 7975c23). Wave 1.8 closes both
 * vectors with 410 Gone responses; the safe LIST endpoint
 * (/api/v1/lessons) is preserved so home-legacy dashboard stats
 * (vocabLearned, studyTime via useUserStats) keep working.
 *
 * These tests pin the contract so a future regression is caught before
 * redeploy.
 */

"use strict";

jest.mock("../src/services/lessonService", () => ({
  getAllLessons: jest.fn(),
  getLessonById: jest.fn(),
}));

jest.mock("../src/services/progressService", () => ({
  completeLesson: jest.fn(),
  getProgressForUser: jest.fn(),
}));

const lessonService = require("../src/services/lessonService");
const progressService = require("../src/services/progressService");
const lessonController = require("../src/controllers/lessonController");
const progressController = require("../src/controllers/progressController");

beforeEach(() => {
  lessonService.getAllLessons.mockReset();
  lessonService.getLessonById.mockReset();
  progressService.completeLesson.mockReset();
});

function makeReqRes({ params = {}, body = {}, user = { id: "u1" } } = {}) {
  const req = { params, body, user, ip: "1.2.3.4", originalUrl: "/api/v1/test" };
  const res = {
    statusCode: 0,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
  return { req, res };
}

// ---------------------------------------------------------------------------
// 1. List endpoint (regression check) — must still work
// ---------------------------------------------------------------------------

describe("lessonController.listLessons — UNCHANGED (regression)", () => {
  it("returns 200 with the lesson summary list", async () => {
    lessonService.getAllLessons.mockResolvedValue([
      { id: "l1", title: "Greetings", vocab_count: 10 },
      { id: "l2", title: "Numbers",   vocab_count: 8 },
    ]);
    const { req, res } = makeReqRes();
    const next = jest.fn();
    await lessonController.listLessons(req, res, next);

    expect(lessonService.getAllLessons).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      data: { lessons: expect.arrayContaining([
        expect.objectContaining({ id: "l1" }),
      ]) },
    });
  });
});

// ---------------------------------------------------------------------------
// 2. Detail endpoint deprecated → 410, no leak
// ---------------------------------------------------------------------------

describe("lessonController.getLessonById — DEPRECATED 410", () => {
  it("returns 410 LESSON_DETAIL_DEPRECATED for any lessonId", async () => {
    const { req, res } = makeReqRes({ params: { lessonId: "11111111-1111-1111-1111-111111111111" } });
    const next = jest.fn();
    await lessonController.getLessonById(req, res, next);

    expect(res.statusCode).toBe(410);
    expect(res.body).toMatchObject({
      success: false,
      code: "LESSON_DETAIL_DEPRECATED",
    });
    // Critical: must NOT call the service that would SELECT correct_option.
    expect(lessonService.getLessonById).not.toHaveBeenCalled();
    // Critical: response body must not carry quiz / correct_option / explanation.
    expect(res.body).not.toHaveProperty("quiz_items");
    expect(res.body).not.toHaveProperty("correct_option");
    expect(res.body).not.toHaveProperty("explanation");
  });

  it("ignores even a malformed UUID — 410 either way (no leakage of old 400 path)", async () => {
    const { req, res } = makeReqRes({ params: { lessonId: "not-a-uuid" } });
    await lessonController.getLessonById(req, res, jest.fn());
    expect(res.statusCode).toBe(410);
    expect(res.body.code).toBe("LESSON_DETAIL_DEPRECATED");
  });
});

// ---------------------------------------------------------------------------
// 3. Complete endpoint deprecated → 410, no DB write
// ---------------------------------------------------------------------------

describe("progressController.completeLesson — DEPRECATED 410", () => {
  it("returns 410 LESSON_COMPLETE_DEPRECATED for any submission", async () => {
    const { req, res } = makeReqRes({
      params: { lessonId: "22222222-2222-2222-2222-222222222222" },
      body:   { score: 100, timeTakenMs: 5000 }, // even with score=100 trust attempt
    });
    await progressController.completeLesson(req, res, jest.fn());

    expect(res.statusCode).toBe(410);
    expect(res.body).toMatchObject({
      success: false,
      code: "LESSON_COMPLETE_DEPRECATED",
    });
    // Critical: no DB write / XP award / badge unlock.
    expect(progressService.completeLesson).not.toHaveBeenCalled();
  });

  it("blocks even score=100 client-trust farming attempt", async () => {
    const { req, res } = makeReqRes({
      params: { lessonId: "33333333-3333-3333-3333-333333333333" },
      body:   { score: 100 },
    });
    await progressController.completeLesson(req, res, jest.fn());
    expect(res.statusCode).toBe(410);
    expect(progressService.completeLesson).not.toHaveBeenCalled();
  });
});
