/**
 * Unit tests for writingProgressService + the progress-context endpoint.
 *
 * Service layer: repository mocked to return synthetic submission history.
 * Route layer: supertest smoke — 401 without auth.
 */

"use strict";

jest.mock("../../src/repositories/writingRepository", () => ({
  getRecentCompletedWithFeedback: jest.fn(),
  getSubmissionById: jest.fn(),
}));

const repo = require("../../src/repositories/writingRepository");
const { getProgressContext } = require("../../src/services/writingProgressService");

function mkSubmission(i, errorTypes, explanations = []) {
  return {
    id: `sub-${i}`,
    task_type: "task2",
    overall_band: 6.5,
    created_at: new Date(2026, 0, 1 + i).toISOString(),
    feedback_json: {
      sentence_corrections: errorTypes.map((t, idx) => ({
        original: `orig ${i}-${idx}`,
        corrected: "fix",
        explanation: explanations[idx] ?? `Generic ${t} issue ${i}`,
        error_type: t,
      })),
    },
  };
}

beforeEach(() => {
  Object.values(repo).forEach((fn) => fn.mockReset());
});

describe("writingProgressService.getProgressContext", () => {
  it("returns insufficient_data when <10 completed submissions", async () => {
    repo.getRecentCompletedWithFeedback.mockResolvedValueOnce(
      Array.from({ length: 5 }, (_, i) => mkSubmission(i, ["grammar"]))
    );
    const res = await getProgressContext("u1");
    expect(res.insufficient_data).toBe(true);
    expect(res.patterns).toEqual([]);
    expect(res.sample_size).toBe(5);
  });

  it("detects error_type patterns appearing in 5+ submissions", async () => {
    // 10 submissions, first 7 flag grammar, 4 flag vocabulary, 2 flag coherence
    const subs = Array.from({ length: 10 }, (_, i) => {
      const types = [];
      if (i < 7) types.push("grammar");
      if (i < 4) types.push("vocabulary");
      if (i < 2) types.push("coherence");
      return mkSubmission(i, types);
    });
    repo.getRecentCompletedWithFeedback.mockResolvedValueOnce(subs);

    const res = await getProgressContext("u1");
    expect(res.insufficient_data).toBe(false);
    expect(res.patterns.length).toBeGreaterThan(0);
    const grammarPattern = res.patterns.find((p) => p.error_type === "grammar");
    expect(grammarPattern).toBeDefined();
    expect(grammarPattern.occurrences).toBe(7);
    // Vocabulary only hits 4 submissions — below the 5-threshold, should NOT appear
    expect(res.patterns.find((p) => p.error_type === "vocabulary")).toBeUndefined();
  });

  it("caps patterns at top 3", async () => {
    // Pump every error_type to well above threshold so multiple qualify.
    const subs = Array.from({ length: 10 }, (_, i) =>
      mkSubmission(i, ["grammar", "vocabulary", "coherence"])
    );
    repo.getRecentCompletedWithFeedback.mockResolvedValueOnce(subs);
    const res = await getProgressContext("u1");
    expect(res.patterns.length).toBeLessThanOrEqual(3);
  });

  it("detects recurring issue stems across 3+ submissions", async () => {
    // Ten submissions where 4 share a common explanation stem.
    const subs = Array.from({ length: 10 }, (_, i) => {
      const explanations = i < 4
        ? ["subject verb agreement missing here"]
        : [`Unique issue ${i}`];
      return mkSubmission(i, ["grammar"], explanations);
    });
    repo.getRecentCompletedWithFeedback.mockResolvedValueOnce(subs);

    const res = await getProgressContext("u1");
    const issuePattern = res.patterns.find((p) => p.pattern_type === "issue");
    expect(issuePattern).toBeDefined();
    expect(issuePattern.occurrences).toBeGreaterThanOrEqual(3);
    expect(issuePattern.example_issue).toMatch(/subject/i);
  });
});

describe("progress-context endpoint auth", () => {
  const request = require("supertest");
  const createApp = require("../../src/app");
  let app;
  beforeAll(() => { app = createApp(); });

  it("rejects unauthenticated GET", async () => {
    const res = await request(app).get("/api/v1/writing/submissions/00000000-0000-0000-0000-000000000000/progress-context");
    expect(res.status).toBe(401);
  });
});
