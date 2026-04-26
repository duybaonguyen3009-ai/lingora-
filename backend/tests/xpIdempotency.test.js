/**
 * XP idempotency unit tests (Wave 1, migration 0041).
 *
 * Layered:
 *   1. Repository — db.query mocked; verifies ON CONFLICT SQL shape and the
 *      awarded:true / awarded:false return contracts.
 *   2. Service     — xpService passes through; badgeService gates xp award
 *                    on awardBadge returning a real (non-null) row.
 *
 * Integration test against a real Postgres (DELETE-then-CREATE-INDEX-CONCURRENTLY +
 * partial UNIQUE WHERE ref_id IS NOT NULL semantics) is exercised by running
 * `npm run migrate:up` against the local DB. The unit tests below verify only
 * the contract shape — the DB enforces the actual uniqueness.
 */

"use strict";

// Mock only the DB driver. xpRepository + xpService run as real code so we
// exercise the actual ON CONFLICT SQL string and the return mapping.
jest.mock("../src/config/db", () => ({
  query: jest.fn(),
}));

// Mock badgeRepository so we can drive race-loss vs success scenarios for
// tryAwardBadge without touching badge tables.
jest.mock("../src/repositories/badgeRepository", () => ({
  getBadgeBySlug: jest.fn(),
  userHasBadge: jest.fn(),
  awardBadge: jest.fn(),
  getUserBadges: jest.fn(),
}));

const { query } = require("../src/config/db");
const badgeRepo = require("../src/repositories/badgeRepository");
const { insertXpEvent } = require("../src/repositories/xpRepository");
const { awardXp } = require("../src/services/xpService");
const { tryAwardBadge } = require("../src/services/badgeService");

beforeEach(() => {
  query.mockReset();
  badgeRepo.getBadgeBySlug.mockReset();
  badgeRepo.userHasBadge.mockReset();
  badgeRepo.awardBadge.mockReset();
});

// ---------------------------------------------------------------------------
// 1. Repository: insertXpEvent — ON CONFLICT shape + return contract
// ---------------------------------------------------------------------------

describe("xpRepository.insertXpEvent", () => {
  it("issues an INSERT ... ON CONFLICT with the partial-unique predicate", async () => {
    query.mockResolvedValue({
      rowCount: 1,
      rows: [{
        id: "ledger-1",
        user_id: "u1",
        delta: 30,
        reason: "writing_submission_complete",
        ref_id: "sub-1",
        created_at: new Date("2026-04-26T00:00:00Z"),
      }],
    });

    await insertXpEvent("u1", 30, "writing_submission_complete", "sub-1");

    expect(query).toHaveBeenCalledTimes(1);
    const sql = query.mock.calls[0][0];
    expect(sql).toMatch(/INSERT\s+INTO\s+xp_ledger/i);
    expect(sql).toMatch(/ON\s+CONFLICT\s*\(\s*user_id\s*,\s*reason\s*,\s*ref_id\s*\)\s+WHERE\s+ref_id\s+IS\s+NOT\s+NULL\s+DO\s+NOTHING/i);
    expect(sql).toMatch(/RETURNING/i);
    expect(query.mock.calls[0][1]).toEqual(["u1", 30, "writing_submission_complete", "sub-1"]);
  });

  it("returns awarded:true with row data when a new ledger row is inserted", async () => {
    query.mockResolvedValue({
      rowCount: 1,
      rows: [{
        id: "ledger-1",
        user_id: "u1",
        delta: 30,
        reason: "writing_submission_complete",
        ref_id: "sub-1",
        created_at: new Date("2026-04-26T00:00:00Z"),
      }],
    });

    const result = await insertXpEvent("u1", 30, "writing_submission_complete", "sub-1");

    expect(result).toEqual({
      awarded: true,
      delta: 30,
      ledgerId: "ledger-1",
      reason: "writing_submission_complete",
      refId: "sub-1",
      userId: "u1",
      createdAt: new Date("2026-04-26T00:00:00Z"),
    });
  });

  it("returns awarded:false with zero delta on ON CONFLICT skip (replay)", async () => {
    // Postgres reports rowCount=0 when the partial unique fires DO NOTHING.
    query.mockResolvedValue({ rowCount: 0, rows: [] });

    const result = await insertXpEvent("u1", 30, "writing_submission_complete", "sub-1");

    expect(result.awarded).toBe(false);
    expect(result.delta).toBe(0);
    expect(result.ledgerId).toBeNull();
    expect(result.refId).toBe("sub-1");
    expect(result.reason).toBe("writing_submission_complete");
    expect(result.userId).toBe("u1");
  });

  it("forwards NULL ref_id (the partial-unique exempts NULLs)", async () => {
    // Caller behavior: ref_id null → DB does NOT enforce uniqueness; the
    // repo just returns whatever rowCount Postgres reports for that path.
    query.mockResolvedValue({
      rowCount: 1,
      rows: [{ id: "l2", user_id: "u1", delta: 5, reason: "daily_login", ref_id: null, created_at: new Date() }],
    });

    const result = await insertXpEvent("u1", 5, "daily_login", null);

    expect(query.mock.calls[0][1]).toEqual(["u1", 5, "daily_login", null]);
    expect(result.awarded).toBe(true);
    expect(result.refId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2a. Service: xpService.awardXp passes through the repo result
// ---------------------------------------------------------------------------

describe("xpService.awardXp", () => {
  it("returns awarded:true on first award (rowCount=1 path)", async () => {
    query.mockResolvedValue({
      rowCount: 1,
      rows: [{
        id: "l1", user_id: "u1", delta: 30,
        reason: "writing_submission_complete", ref_id: "sub-1",
        created_at: new Date("2026-04-26T00:00:00Z"),
      }],
    });

    const result = await awardXp("u1", 30, "writing_submission_complete", "sub-1");

    expect(result.awarded).toBe(true);
    expect(result.delta).toBe(30);
    expect(result.ledgerId).toBe("l1");
  });

  it("returns awarded:false on replay (rowCount=0 path) so callers skip cascade", async () => {
    query.mockResolvedValue({ rowCount: 0, rows: [] });

    const result = await awardXp("u1", 30, "writing_submission_complete", "sub-1");

    expect(result.awarded).toBe(false);
    expect(result.delta).toBe(0);
    expect(result.ledgerId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2b. Service: badgeService.tryAwardBadge gates XP on awardBadge insert
// ---------------------------------------------------------------------------

describe("badgeService.tryAwardBadge — race protection", () => {
  it("awards XP + achievement_score when awardBadge returns a freshly-inserted badge", async () => {
    badgeRepo.getBadgeBySlug.mockResolvedValue({
      id: "b1", slug: "first_lesson", name: "First Lesson", xp_reward: 50, achievement_points: 10,
    });
    badgeRepo.userHasBadge.mockResolvedValue(false);
    badgeRepo.awardBadge.mockResolvedValue({ id: "b1", slug: "first_lesson", xp_reward: 50 });

    // First query call = xp_ledger INSERT (from awardXp inside tryAwardBadge).
    // Second query call = UPDATE users SET achievement_score.
    query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{
        id: "l1", user_id: "u1", delta: 50, reason: "badge_award", ref_id: "b1", created_at: new Date(),
      }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const result = await tryAwardBadge("u1", "first_lesson");

    expect(result).not.toBeNull();
    expect(result.id).toBe("b1");

    // 2 DB calls total (xp + achievement_score). userHasBadge + awardBadge
    // are mocked at the repo layer so they don't touch query().
    expect(query).toHaveBeenCalledTimes(2);

    // Verify xp call shape — reason="badge_award", refId=badge.id.
    const xpCall = query.mock.calls[0];
    expect(xpCall[0]).toMatch(/INSERT\s+INTO\s+xp_ledger/i);
    expect(xpCall[1]).toEqual(["u1", 50, "badge_award", "b1"]);

    // Verify achievement_score update shape.
    const scoreCall = query.mock.calls[1];
    expect(scoreCall[0]).toMatch(/UPDATE\s+users\s+SET\s+achievement_score/i);
    expect(scoreCall[1]).toEqual(["u1", 10]);
  });

  it("does NOT award XP or update achievement_score when awardBadge returns null (race lost)", async () => {
    badgeRepo.getBadgeBySlug.mockResolvedValue({
      id: "b1", slug: "first_lesson", name: "First Lesson", xp_reward: 50, achievement_points: 10,
    });
    badgeRepo.userHasBadge.mockResolvedValue(false); // both racers see false
    badgeRepo.awardBadge.mockResolvedValue(null);    // peer call won the INSERT

    const result = await tryAwardBadge("u1", "first_lesson");

    expect(result).toBeNull();
    // Zero DB calls — neither xp_ledger INSERT nor achievement_score UPDATE.
    expect(query).not.toHaveBeenCalled();
  });

  it("short-circuits when userHasBadge returns true (fast path)", async () => {
    badgeRepo.getBadgeBySlug.mockResolvedValue({ id: "b1", slug: "first_lesson", xp_reward: 50, achievement_points: 10 });
    badgeRepo.userHasBadge.mockResolvedValue(true);

    const result = await tryAwardBadge("u1", "first_lesson");

    expect(result).toBeNull();
    expect(badgeRepo.awardBadge).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it("returns null when badge slug is unknown", async () => {
    badgeRepo.getBadgeBySlug.mockResolvedValue(null);

    const result = await tryAwardBadge("u1", "no_such_badge");

    expect(result).toBeNull();
    expect(badgeRepo.userHasBadge).not.toHaveBeenCalled();
    expect(badgeRepo.awardBadge).not.toHaveBeenCalled();
  });
});
