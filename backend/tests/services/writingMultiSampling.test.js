/**
 * Unit tests for the Writing scoring pipeline:
 *   - 3x parallel sampling with median aggregation
 *   - 2/3 fallback when one sample fails
 *   - cache hit short-circuit
 *   - cache miss triggers API + write
 *   - median arithmetic (odd/even)
 *   - parse-failure tolerance
 *   - allFail throws with no cache write
 *   - corrupted cache row falls through to miss path
 *
 * Mocks:
 *   - openai           → controllable chat.completions.create
 *   - cache repository → in-memory stubs
 */

"use strict";

// Pure helper — no mocks needed.
const { aggregateSamples, median } = require("../../src/providers/ai/writingScoringMedian");

// ---------------------------------------------------------------------------
// Median arithmetic (pure)
// ---------------------------------------------------------------------------

describe("writingScoringMedian.median", () => {
  it("odd count returns the middle element", () => {
    expect(median([6, 7, 8])).toBe(7);
    expect(median([5.5, 6.5, 7.5])).toBe(6.5);
    expect(median([7, 7, 7])).toBe(7);
  });

  it("even count averages then rounds to nearest 0.5", () => {
    expect(median([6, 7])).toBe(6.5);
    expect(median([6, 6.5])).toBe(6.5); // (6+6.5)/2 = 6.25 → 6.5
    expect(median([6.5, 7.5])).toBe(7);
  });

  it("returns null on empty input", () => {
    expect(median([])).toBeNull();
  });
});

describe("writingScoringMedian.aggregateSamples", () => {
  const mkSample = (overall, taskScore) => ({
    overall_band: overall,
    language_detected: "en",
    criteria: {
      task: { score: taskScore, feedback: `task feedback for ${overall}` },
      coherence: { score: overall, feedback: "coh" },
      lexical: { score: overall, feedback: "lex" },
      grammar: { score: overall, feedback: "gra" },
    },
    strengths: [`strength-${overall}`],
    weaknesses: [],
    improvements: [],
    sentence_corrections: [
      { original: `orig-${overall}`, corrected: "fix", explanation: "why" },
    ],
  });

  it("picks the closest-to-median sample for free-text fields", () => {
    const samples = [mkSample(6.0, 6.0), mkSample(7.0, 7.0), mkSample(8.0, 8.0)];
    const out = aggregateSamples(samples);
    expect(out.overall_band).toBe(7);
    expect(out.criteria.task.score).toBe(7);
    expect(out.criteria.task.feedback).toBe("task feedback for 7");
    // sentence_corrections merge all 3
    expect(out.sentence_corrections.map((c) => c.original).sort()).toEqual([
      "orig-6", "orig-7", "orig-8",
    ]);
  });

  it("dedupes sentence_corrections across samples by original", () => {
    const s1 = mkSample(7, 7);
    const s2 = mkSample(7, 7);
    s2.sentence_corrections = [{ original: "ORIG-7", corrected: "fix-dup", explanation: "" }];
    const out = aggregateSamples([s1, s2]);
    expect(out.sentence_corrections).toHaveLength(1);
  });

  it("sentence_corrections merged use the most-common error_type per sentence", () => {
    const mk = (overall, errorType) => {
      const s = mkSample(overall, overall);
      s.sentence_corrections = [
        { original: "SAME SENTENCE", corrected: "fix", explanation: "", error_type: errorType },
      ];
      return s;
    };
    // 2x grammar, 1x vocabulary → grammar wins.
    const out = aggregateSamples([mk(6, "grammar"), mk(7, "grammar"), mk(8, "vocabulary")]);
    expect(out.sentence_corrections).toHaveLength(1);
    expect(out.sentence_corrections[0].error_type).toBe("grammar");
  });

  it("paragraph_analysis icons are unioned across samples and deduped by type", () => {
    const mkPara = (...iconTypes) => ({
      paragraph_number: 1,
      type: "body",
      score: "adequate",
      feedback: "pp",
      icons: iconTypes.map((t) => ({ type: t, note: `${t}-note` })),
    });
    const s1 = { ...mkSample(7, 7), paragraph_analysis: [mkPara("coherence", "band_upgrade")] };
    const s2 = { ...mkSample(7, 7), paragraph_analysis: [mkPara("band_upgrade", "task_response")] };
    const s3 = { ...mkSample(7, 7), paragraph_analysis: [mkPara("lexical_highlight")] };
    const out = aggregateSamples([s1, s2, s3]);
    const types = out.paragraph_analysis[0].icons.map((i) => i.type).sort();
    expect(types).toEqual(["band_upgrade", "coherence", "lexical_highlight", "task_response"]);
  });
});

// ---------------------------------------------------------------------------
// analyzeEssay — multi-sampling + cache orchestration
// ---------------------------------------------------------------------------

// Jest hoists jest.mock() calls to the top of the file — any referenced
// variables must be prefixed `mock*` to survive the hoist.
jest.mock("../../src/repositories/writingScoringCacheRepository", () => ({
  findByCacheKey: jest.fn(),
  insertEntry: jest.fn(),
  deleteOldest: jest.fn(),
  countEntries: jest.fn(),
  getOldestLastHit: jest.fn(),
}));

const mockCreate = jest.fn();
jest.mock("openai", () =>
  jest.fn().mockImplementation(() => ({
    chat: { completions: { create: (...args) => mockCreate(...args) } },
  }))
);

// Imported AFTER the mocks so the require resolves to the stubbed module.
const cacheStub = require("../../src/repositories/writingScoringCacheRepository");
const createMock = mockCreate;
const { analyzeEssay } = require("../../src/providers/ai/writingAnalyzer");

const BEFORE_KEY = process.env.OPENAI_API_KEY;
beforeAll(() => { process.env.OPENAI_API_KEY = "sk-test-dummy"; });
afterAll(() => {
  if (BEFORE_KEY === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = BEFORE_KEY;
});

beforeEach(() => {
  createMock.mockReset();
  cacheStub.findByCacheKey.mockReset();
  cacheStub.insertEntry.mockReset();
  cacheStub.findByCacheKey.mockResolvedValue(null);
  cacheStub.insertEntry.mockResolvedValue(true);
});

function mkResponse(band) {
  const body = {
    overall_band: band,
    language_detected: "en",
    criteria: {
      task:      { score: band, feedback: "t" },
      coherence: { score: band, feedback: "c" },
      lexical:   { score: band, feedback: "l" },
      grammar:   { score: band, feedback: "g" },
    },
    strengths: [`s-${band}`],
    weaknesses: [],
    improvements: [],
    sentence_corrections: [{ original: `o-${band}`, corrected: "x", explanation: "" }],
  };
  return { choices: [{ message: { content: JSON.stringify(body) } }] };
}

const TASK_TYPE = "task2";
const QUESTION = "Some question";
const ESSAY = "Some essay text.";

describe("analyzeEssay — cache + multi-sampling", () => {
  it("3/3 success → median + cache write", async () => {
    createMock
      .mockResolvedValueOnce(mkResponse(6))
      .mockResolvedValueOnce(mkResponse(7))
      .mockResolvedValueOnce(mkResponse(8));

    const result = await analyzeEssay(TASK_TYPE, QUESTION, ESSAY);

    expect(createMock).toHaveBeenCalledTimes(3);
    expect(result.overall_band).toBe(7);
    expect(result._meta.sample_count).toBe(3);
    expect(result._meta.cached).toBe(false);
    expect(cacheStub.insertEntry).toHaveBeenCalledTimes(1);
    expect(cacheStub.insertEntry).toHaveBeenCalledWith(
      expect.objectContaining({ sampleCount: 3, taskType: "task2" })
    );
  });

  it("2/3 success → median from 2 with sample_count=2", async () => {
    createMock
      .mockResolvedValueOnce(mkResponse(6))
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(mkResponse(8))
      // Retry attempt also fails — but we already have 2 successes.
      .mockRejectedValueOnce(new Error("retry-fail"));

    const result = await analyzeEssay(TASK_TYPE, QUESTION, ESSAY);

    expect(result.overall_band).toBe(7); // median(6, 8) = 7
    expect(result._meta.sample_count).toBe(2);
    expect(cacheStub.insertEntry).toHaveBeenCalledWith(
      expect.objectContaining({ sampleCount: 2 })
    );
  });

  it("cache miss then hit: second call hits without touching OpenAI", async () => {
    // First call (miss) scores the essay.
    createMock
      .mockResolvedValueOnce(mkResponse(7))
      .mockResolvedValueOnce(mkResponse(7))
      .mockResolvedValueOnce(mkResponse(7));

    const first = await analyzeEssay(TASK_TYPE, QUESTION, ESSAY);
    expect(first._meta.cached).toBe(false);
    expect(createMock).toHaveBeenCalledTimes(3);

    // Second call: stub the cache to return the previous result.
    cacheStub.findByCacheKey.mockResolvedValueOnce({
      scoring_result: { ...first, _meta: undefined },
      sample_count: 3,
      hit_count: 2,
    });
    const second = await analyzeEssay(TASK_TYPE, QUESTION, ESSAY);
    expect(second._meta.cached).toBe(true);
    expect(second._meta.api_calls).toBe(0);
    // No new OpenAI calls beyond the original 3.
    expect(createMock).toHaveBeenCalledTimes(3);
  });

  it("parse-failure on one sample → median from the remaining two", async () => {
    createMock
      .mockResolvedValueOnce(mkResponse(6))
      .mockResolvedValueOnce({ choices: [{ message: { content: "not-json" } }] })
      .mockResolvedValueOnce(mkResponse(8))
      .mockRejectedValueOnce(new Error("retry-fail"));

    const result = await analyzeEssay(TASK_TYPE, QUESTION, ESSAY);
    expect(result.overall_band).toBe(7);
    expect(result._meta.sample_count).toBe(2);
  });

  it("all fail → throws and does NOT write cache", async () => {
    createMock.mockRejectedValue(new Error("boom"));

    await expect(analyzeEssay(TASK_TYPE, QUESTION, ESSAY)).rejects.toThrow(/failed/i);
    expect(cacheStub.insertEntry).not.toHaveBeenCalled();
  });

  it("corrupted cached row falls through to the miss path without crashing", async () => {
    cacheStub.findByCacheKey.mockResolvedValueOnce({
      // scoring_result is wrong shape — handler treats as miss.
      scoring_result: null,
      sample_count: 3,
      hit_count: 5,
    });
    createMock
      .mockResolvedValueOnce(mkResponse(7))
      .mockResolvedValueOnce(mkResponse(7))
      .mockResolvedValueOnce(mkResponse(7));

    const result = await analyzeEssay(TASK_TYPE, QUESTION, ESSAY);
    expect(result.overall_band).toBe(7);
    expect(result._meta.cached).toBe(false);
  });
});
