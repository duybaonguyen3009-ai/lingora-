/**
 * userRepository.updateUserBand integration-shape tests (Wave 2.2).
 *
 * The DB driver is mocked so we can verify:
 *   - Reading update only writes band_estimate_reading (not writing/speaking).
 *   - Writing update only writes band_estimate_writing.
 *   - Speaking update only writes band_estimate_speaking.
 *   - Listening (paused feature) is silently skipped — no per-skill write.
 *   - Cold start uses the new score; subsequent calls apply EMA.
 *   - Legacy estimated_band + band_history are still written every time.
 */

"use strict";

jest.mock("../src/config/db", () => ({ query: jest.fn() }));

const { query } = require("../src/config/db");
const { updateUserBand } = require("../src/repositories/userRepository");

beforeEach(() => {
  query.mockReset();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Stub the SELECT round-trip:
 *   { history, currentSkillBand }
 * Then stub the UPDATE round-trip as a no-op.
 */
function stubFetch({ history = [], currentSkillBand = null } = {}) {
  query
    .mockResolvedValueOnce({ rows: [{ band_history: history, skill_band: currentSkillBand }] })
    .mockResolvedValueOnce({ rowCount: 1, rows: [] });
}

function getSelectSql() { return query.mock.calls[0][0]; }
function getUpdateSql() { return query.mock.calls[1][0]; }
function getUpdateArgs() { return query.mock.calls[1][1]; }

// ---------------------------------------------------------------------------
// Per-skill column targeting
// ---------------------------------------------------------------------------

describe("updateUserBand — per-skill column isolation", () => {
  it("reading session writes only band_estimate_reading", async () => {
    stubFetch();

    await updateUserBand("u1", 6.0, "reading", "passage-1");

    expect(getSelectSql()).toMatch(/band_estimate_reading\s+AS\s+skill_band/i);
    const sql = getUpdateSql();
    expect(sql).toMatch(/band_estimate_reading\s*=\s*\$4/);
    expect(sql).not.toMatch(/band_estimate_writing/);
    expect(sql).not.toMatch(/band_estimate_speaking/);
    expect(sql).not.toMatch(/band_estimate_listening/);
  });

  it("writing session writes only band_estimate_writing", async () => {
    stubFetch();

    await updateUserBand("u1", 7.5, "writing", "sub-1");

    expect(getSelectSql()).toMatch(/band_estimate_writing\s+AS\s+skill_band/i);
    expect(getUpdateSql()).toMatch(/band_estimate_writing\s*=\s*\$4/);
    expect(getUpdateSql()).not.toMatch(/band_estimate_reading/);
  });

  it("speaking session writes only band_estimate_speaking", async () => {
    stubFetch();

    await updateUserBand("u1", 6.5, "speaking", "session-1");

    expect(getUpdateSql()).toMatch(/band_estimate_speaking\s*=\s*\$4/);
    expect(getUpdateSql()).not.toMatch(/band_estimate_writing/);
  });

  it("listening session does NOT touch any per-skill column (feature paused)", async () => {
    stubFetch();

    await updateUserBand("u1", 7.0, "listening", "lst-1");

    // SELECT still runs (we still need band_history for the legacy write),
    // but no per-skill column appears in the UPDATE.
    const sql = getUpdateSql();
    expect(sql).not.toMatch(/band_estimate_/);
    // Legacy fields are still updated.
    expect(sql).toMatch(/estimated_band\s*=/);
    expect(sql).toMatch(/band_history\s*=/);
  });
});

// ---------------------------------------------------------------------------
// EMA values
// ---------------------------------------------------------------------------

describe("updateUserBand — EMA semantics", () => {
  it("cold start adopts the latest score for the per-skill column", async () => {
    stubFetch({ currentSkillBand: null });

    await updateUserBand("u1", 6.0, "reading", "p1");

    const args = getUpdateArgs();
    // [userId, estimatedBand, history, perSkill]
    expect(args[3]).toBe(6.0);
  });

  it("subsequent score blends with alpha=0.3 (rounded to nearest 0.5)", async () => {
    // old reading band 7.0, new score 6.0 → 0.3*6 + 0.7*7 = 6.7 → 6.5
    stubFetch({ currentSkillBand: 7.0 });

    await updateUserBand("u1", 6.0, "reading", "p1");

    expect(getUpdateArgs()[3]).toBe(6.5);
  });

  it("rejects out-of-range scores without writing", async () => {
    await updateUserBand("u1", 99, "reading", "p1");
    await updateUserBand("u1", -1, "reading", "p1");
    expect(query).not.toHaveBeenCalled();
  });

  it("returns null perSkill when user row is missing (no UPDATE)", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    const result = await updateUserBand("u1", 6.0, "reading", "p1");

    expect(result).toBeUndefined();
    expect(query).toHaveBeenCalledTimes(1); // only SELECT
  });
});

// ---------------------------------------------------------------------------
// Legacy fields (backward compat)
// ---------------------------------------------------------------------------

describe("updateUserBand — legacy estimated_band + band_history", () => {
  it("still appends to band_history and recomputes estimated_band", async () => {
    stubFetch({
      history: [
        { band: 7.0, skill: "writing",  session_id: "w1", scored_at: "2026-04-01T00:00:00Z" },
        { band: 7.5, skill: "writing",  session_id: "w2", scored_at: "2026-04-02T00:00:00Z" },
      ],
      currentSkillBand: null,
    });

    await updateUserBand("u1", 6.0, "reading", "r1");

    const [, estimatedBand, historyJson] = getUpdateArgs();
    const parsed = JSON.parse(historyJson);

    expect(parsed).toHaveLength(3);
    expect(parsed[2]).toMatchObject({ band: 6.0, skill: "reading", session_id: "r1" });

    // avg of last 5 entries (only 3 here): (7.0+7.5+6.0)/3 = 6.83 → round 0.5 = 7.0
    expect(estimatedBand).toBe(7.0);
  });
});
