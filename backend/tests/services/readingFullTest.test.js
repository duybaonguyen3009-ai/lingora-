/**
 * Unit tests for readingService.submitFullTest aggregation + lateness.
 *
 * The repo + gamification side-effects are mocked so the test focuses on
 * the pure aggregation/lateness paths the Full Test runner relies on.
 */

jest.mock("../../src/repositories/readingRepository", () => ({
  scoreAnswers: jest.fn(),
}));
jest.mock("../../src/services/streakService", () => ({
  updateStreak: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../src/services/xpService", () => ({
  awardXp: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../src/repositories/userRepository", () => ({
  updateUserBand: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../src/services/badgeService", () => ({
  checkReadingBadges: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../src/config/db", () => ({
  query: jest.fn().mockResolvedValue({ rows: [{ c: 0 }] }),
}));

const readingRepo = require("../../src/repositories/readingRepository");
const { submitFullTest, FULL_TEST_BUDGET_SECONDS, FULL_TEST_GRACE_SECONDS } = require("../../src/services/readingService");

const passageResults = [
  { passage_id: "p1", answers: [] },
  { passage_id: "p2", answers: [] },
  { passage_id: "p3", answers: [] },
];

function mockScores(perPassage) {
  readingRepo.scoreAnswers.mockReset();
  perPassage.forEach((s) => {
    readingRepo.scoreAnswers.mockResolvedValueOnce({
      correct: s.correct,
      total: s.total,
      results: s.results ?? [],
    });
  });
}

describe("submitFullTest — aggregation", () => {
  test("sums per-passage scores into total_score / total_questions", async () => {
    mockScores([
      { correct: 10, total: 13 },
      { correct: 8,  total: 13 },
      { correct: 6,  total: 14 },
    ]);
    const r = await submitFullTest("user-1", passageResults, 1800, { startedAt: null });
    expect(r.total_score).toBe(24);
    expect(r.total_questions).toBe(40);
    expect(r.passage_breakdowns).toHaveLength(3);
    expect(r.passage_breakdowns[2].score).toBe(6);
    expect(r.late).toBe(false);
  });

  test("preserves per_question_results in breakdowns", async () => {
    mockScores([
      { correct: 1, total: 1, results: [{ question_id: "q1", is_correct: true }] },
      { correct: 0, total: 1, results: [{ question_id: "q2", is_correct: false }] },
      { correct: 1, total: 1, results: [{ question_id: "q3", is_correct: true }] },
    ]);
    const r = await submitFullTest("user-1", passageResults, 60, {});
    expect(r.passage_breakdowns[0].per_question_results[0].question_id).toBe("q1");
    expect(r.passage_breakdowns[1].per_question_results[0].is_correct).toBe(false);
  });

  test("band_estimate maps total → IELTS band via canonical table", async () => {
    mockScores([
      { correct: 13, total: 13 }, // perfect across the three
      { correct: 13, total: 13 },
      { correct: 13, total: 14 }, // 39/40 → band 9 (table maps 39→9)
    ]);
    const r = await submitFullTest("user-1", passageResults, 60, {});
    expect(r.total_score).toBe(39);
    expect(r.total_questions).toBe(40);
    expect(r.band_estimate).toBe(9);
  });
});

describe("submitFullTest — lateness", () => {
  beforeEach(() => {
    mockScores([
      { correct: 5, total: 13 },
      { correct: 5, total: 13 },
      { correct: 5, total: 14 },
    ]);
  });

  test("on-time submission → late=false, time_seconds = client value", async () => {
    const r = await submitFullTest("user-1", passageResults, 1800, { startedAt: null });
    expect(r.late).toBe(false);
    expect(r.time_seconds).toBe(1800);
  });

  test("client-reported overrun beyond budget+grace → late=true", async () => {
    const overrun = FULL_TEST_BUDGET_SECONDS + FULL_TEST_GRACE_SECONDS + 1;
    const r = await submitFullTest("user-1", passageResults, overrun, {});
    expect(r.late).toBe(true);
    expect(r.time_seconds).toBe(overrun);
  });

  test("server-trusted check beats a low client value when startedAt is old", async () => {
    const startedAt = new Date(Date.now() - (FULL_TEST_BUDGET_SECONDS + 30) * 1000).toISOString();
    const r = await submitFullTest("user-1", passageResults, 60, { startedAt });
    // Lying client said 60s, but server saw ~ budget+30s elapsed → flagged late.
    expect(r.late).toBe(true);
    expect(r.time_seconds).toBeGreaterThanOrEqual(FULL_TEST_BUDGET_SECONDS + 30);
  });

  test("submission inside the 10s grace stays not-late", async () => {
    const startedAt = new Date(Date.now() - (FULL_TEST_BUDGET_SECONDS + 5) * 1000).toISOString();
    const r = await submitFullTest("user-1", passageResults, 0, { startedAt });
    expect(r.late).toBe(false);
  });

  test("invalid startedAt is ignored (falls back to client-reported time)", async () => {
    const r = await submitFullTest("user-1", passageResults, 100, { startedAt: "not-a-date" });
    expect(r.late).toBe(false);
    expect(r.time_seconds).toBe(100);
  });
});
