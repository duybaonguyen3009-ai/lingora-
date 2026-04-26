/**
 * services/readingService.js
 *
 * Business logic for IELTS Reading practice and full tests.
 */

"use strict";

const readingRepo = require("../repositories/readingRepository");
const { updateStreak } = require("./streakService");
const { awardXp } = require("./xpService");
const { readingScoreToBand } = require("../domain/ielts");

// ---------------------------------------------------------------------------
// XP rewards
// ---------------------------------------------------------------------------
// Flat rewards per reading completion. Full test scales higher since it
// covers 3 passages and 24+ questions vs single-passage practice.
const XP_REWARD_READING_PASSAGE   = 10;
const XP_REWARD_READING_FULL_TEST = 30;

function bandToDifficulty(band) {
  if (band == null || band < 6.0) return "band_50_55";
  if (band < 7.0) return "band_60_65";
  if (band < 8.0) return "band_70_80";
  return "band_80_plus";
}

async function listPassages(userId, filters = {}) {
  // Auto-select difficulty from user's band if not specified
  if (!filters.difficulty) {
    const { query } = require("../config/db");
    const userRow = await query(`SELECT estimated_band FROM users WHERE id = $1`, [userId]);
    const band = userRow.rows[0]?.estimated_band;
    filters.difficulty = bandToDifficulty(band ? Number(band) : null);
  }
  return readingRepo.listPassages(filters);
}

async function getPassage(passageId) {
  const data = await readingRepo.getPassageWithQuestions(passageId);
  if (!data.passage) {
    const err = new Error("Passage not found");
    err.status = 404;
    throw err;
  }
  return data;
}

async function submitPractice(userId, passageId, answers, timeSeconds) {
  const { correct, total, results } = await readingRepo.scoreAnswers(passageId, answers);
  const bandEstimate = readingScoreToBand(correct, total);

  // Update user band
  try {
    const { updateUserBand } = require("../repositories/userRepository");
    await updateUserBand(userId, bandEstimate, "reading", passageId);
  } catch { /* silent */ }

  // Update study room activity
  try {
    const { onUserCompletedActivity } = require("./studyRoomService");
    onUserCompletedActivity(userId, "lessons", 1).catch(() => {});
  } catch { /* silent */ }

  // ── Gamification: Award XP + update streak on reading completion ──
  // xp_ledger has no lesson_id column — we use the passageId as ref_id.
  // awardXp is idempotent on (user, reason, passageId) — replay → awarded:false.
  // On replay, skip the streak/badge cascade (already fired on first submit).
  let xpAwarded = false;
  try {
    const result = await awardXp(userId, XP_REWARD_READING_PASSAGE, "reading_practice_complete", passageId);
    xpAwarded = result.awarded;
  } catch (err) {
    // Non-fatal: XP award failure should not break practice scoring
    console.error(`[reading] XP award failed for user ${userId}:`, err.message);
  }

  if (xpAwarded) {
    try {
      await updateStreak(userId);
    } catch (err) {
      // Non-fatal: streak update failure should not break practice scoring
      console.error(`[reading] streak update failed for user ${userId}:`, err.message);
    }

    // Fire-and-forget: check reading achievements (log errors, don't swallow)
    try {
      const { checkReadingBadges } = require("./badgeService");
      const countRow = await require("../config/db").query(
        `SELECT COALESCE(SUM(score), 0)::int AS c FROM user_progress WHERE user_id = $1`, [userId]
      );
      checkReadingBadges(userId, countRow.rows[0]?.c ?? correct).catch((err) => {
        console.error(`[reading] badge check failed for user ${userId}:`, err.message);
      });
    } catch (err) {
      console.error(`[reading] badge module load failed:`, err.message);
    }
  }

  return { score: correct, total, band_estimate: bandEstimate, time_seconds: timeSeconds, per_question_results: results };
}

// Strict 60-min budget for Full Test, with a 10-second grace window to
// absorb network round-trips on submit. Submissions outside the window
// are scored anyway but flagged `late: true` for the result UI.
const FULL_TEST_BUDGET_SECONDS = 3600;
const FULL_TEST_GRACE_SECONDS = 10;

async function listFullTests() {
  return readingRepo.listReadingTests();
}

async function startFullTest(userId, testId = null) {
  let passageIds;
  let testRow = null;

  if (testId) {
    testRow = await readingRepo.getReadingTestById(testId);
    if (!testRow) {
      const err = new Error("Reading test not found");
      err.status = 404;
      throw err;
    }
    passageIds = [testRow.passage_1_id, testRow.passage_2_id, testRow.passage_3_id];
  } else {
    // Legacy fallback: ad-hoc grouping for callers without a testId.
    const picked = await readingRepo.getPassagesByDifficulties(
      ["band_50_55", "band_60_65", "band_70_80"], 1
    );
    if (picked.length < 3) {
      const err = new Error("Not enough passages for full test");
      err.status = 503;
      throw err;
    }
    passageIds = picked.map((p) => p.id);
  }

  const passages = await Promise.all(
    passageIds.map((id) => readingRepo.getPassageWithQuestions(id))
  );

  return {
    test_id: testRow?.id ?? null,
    test_title: testRow?.title ?? null,
    difficulty_tier: testRow?.difficulty_tier ?? null,
    passages,
    time_limit: FULL_TEST_BUDGET_SECONDS,
    started_at: new Date().toISOString(),
  };
}

async function submitFullTest(userId, passageResults, timeSeconds, { startedAt = null } = {}) {
  let totalCorrect = 0;
  let totalQuestions = 0;
  const breakdowns = [];

  for (const pr of passageResults) {
    const { correct, total, results } = await readingRepo.scoreAnswers(pr.passage_id, pr.answers);
    totalCorrect += correct;
    totalQuestions += total;
    breakdowns.push({
      passage_id: pr.passage_id,
      score: correct,
      total,
      // Per-section band uses the canonical 40-Q proration so a 10/13
      // section maps to the same scale as the overall band.
      band: total > 0 ? readingScoreToBand(correct, total) : 0,
      per_question_results: results,
    });
  }

  const bandEstimate = readingScoreToBand(totalCorrect, totalQuestions);

  // Update user band
  try {
    const { updateUserBand } = require("../repositories/userRepository");
    await updateUserBand(userId, bandEstimate, "reading", "full-test");
  } catch { /* silent */ }

  // ── Gamification: Award XP + update streak on full-test completion ──
  // NOTE: refId is NULL because there is no full_test_attempt id (per Audit
  // Wave 2 backlog). The partial UNIQUE on xp_ledger exempts NULL — Full
  // Test XP is NOT replay-protected at the xp_ledger level. Caller-level
  // replay protection requires a `reading_full_test_sessions` row first.
  let xpAwarded = false;
  try {
    const result = await awardXp(userId, XP_REWARD_READING_FULL_TEST, "reading_full_test_complete", null);
    xpAwarded = result.awarded;
  } catch (err) {
    console.error(`[reading] XP award failed for user ${userId}:`, err.message);
  }

  if (xpAwarded) {
    try {
      await updateStreak(userId);
    } catch (err) {
      console.error(`[reading] streak update failed for user ${userId}:`, err.message);
    }

    // Fire-and-forget: check reading achievements (log errors, don't swallow)
    try {
      const { checkReadingBadges } = require("./badgeService");
      const countRow = await require("../config/db").query(
        `SELECT COALESCE(SUM(score), 0)::int AS c FROM user_progress WHERE user_id = $1`, [userId]
      );
      checkReadingBadges(userId, countRow.rows[0]?.c ?? totalCorrect).catch((err) => {
        console.error(`[reading] badge check failed for user ${userId}:`, err.message);
      });
    } catch (err) {
      console.error(`[reading] badge module load failed:`, err.message);
    }
  }

  // Lateness: server-trusted check against startedAt when present.
  // Frontend-reported timeSeconds is also flagged when it overruns (covers
  // requests with a missing startedAt).
  let late = false;
  let actualSeconds = Number(timeSeconds) || 0;
  if (startedAt) {
    const startMs = Date.parse(startedAt);
    if (!Number.isNaN(startMs)) {
      actualSeconds = Math.max(actualSeconds, Math.floor((Date.now() - startMs) / 1000));
    }
  }
  if (actualSeconds > FULL_TEST_BUDGET_SECONDS + FULL_TEST_GRACE_SECONDS) late = true;

  return {
    total_score: totalCorrect,
    total_questions: totalQuestions,
    band_estimate: bandEstimate,
    time_seconds: actualSeconds,
    passage_breakdowns: breakdowns,
    late,
  };
}

module.exports = {
  listPassages,
  getPassage,
  submitPractice,
  listFullTests,
  startFullTest,
  submitFullTest,
  FULL_TEST_BUDGET_SECONDS,
  FULL_TEST_GRACE_SECONDS,
};
