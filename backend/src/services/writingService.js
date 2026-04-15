/**
 * services/writingService.js
 *
 * Business logic for IELTS Writing feature.
 *   - Essay submission with word-count validation + free-tier usage limits
 *   - Fire-and-forget AI analysis (background processing)
 *   - Result retrieval with ownership check
 *   - Paginated submission history
 */

"use strict";

const writingRepository = require("../repositories/writingRepository");
const writingAnalyzer = require("../providers/ai/writingAnalyzer");
const { updateStreak } = require("./streakService");
const { awardXp } = require("./xpService");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_WORDS = { task1: 150, task2: 250 };
const FREE_DAILY_LIMIT = 1;

// ---------------------------------------------------------------------------
// XP rewards
// ---------------------------------------------------------------------------
// Flat reward per writing submission. Highest effort of any practice flow
// (full essay with AI scoring), so scaled above scenario/reading.
const XP_REWARD_WRITING = 30;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Submit an essay for AI scoring.
 *
 * @param {string}  userId
 * @param {string}  role     – user role from JWT ('kid' | 'teacher' | 'parent' | 'admin')
 * @param {boolean} isPro    – from users.is_pro
 * @param {object}  input
 * @param {string}  input.taskType      – 'task1' | 'task2'
 * @param {string}  input.questionText
 * @param {string}  input.essayText
 * @returns {Promise<{ submissionId: string, status: string }>}
 */
async function submitEssay(userId, role, isPro, { taskType, questionText, essayText }) {
  // 1. Word count validation
  const wordCount = countWords(essayText);
  const minRequired = MIN_WORDS[taskType];

  if (wordCount < minRequired) {
    const err = new Error(
      `Essay too short. ${taskType === "task1" ? "Task 1" : "Task 2"} requires minimum ${minRequired} words. You wrote ${wordCount}.`
    );
    err.status = 400;
    throw err;
  }

  // 2. Daily writing limit (controlled by FREE_PERIOD flag)
  try {
    const { checkWritingLimit } = require("./limitService");
    const limit = await checkWritingLimit(userId);
    if (!limit.allowed) {
      const err = new Error("Daily writing limit reached. Upgrade to Pro for unlimited submissions.");
      err.status = 403;
      err.code = "WRITING_LIMIT_REACHED";
      err.limitData = { used: limit.used, limit: limit.limit };
      throw err;
    }
  } catch (e) {
    if (e.code === "WRITING_LIMIT_REACHED") throw e;
    // Fallback: if limitService fails, use legacy check
    const bypassLimit = role === "admin" || isPro === true;
    if (!bypassLimit) {
      const todayCount = await writingRepository.getTodayUsageCount(userId);
      if (todayCount >= FREE_DAILY_LIMIT) {
        const err = new Error("Daily limit reached. Upgrade to Pro for unlimited submissions.");
        err.status = 403;
        throw err;
      }
    }
  }

  // 3. Check for existing submission today (idempotency guard)
  const existing = await writingRepository.findTodaySubmission(userId, taskType);
  if (existing) {
    return { submissionId: existing.id, status: existing.status };
  }

  // 4. Create submission + increment usage
  const submission = await writingRepository.createSubmission(
    userId, taskType, questionText, essayText, wordCount
  );
  await writingRepository.incrementUsageCount(userId);

  // 4. Fire-and-forget AI analysis
  const submissionId = submission.id;
  (async () => {
    try {
      const result = await writingAnalyzer.analyzeEssay(taskType, questionText, essayText);

      await writingRepository.updateSubmissionResult(submissionId, {
        overallBand: result.overall_band,
        taskScore: result.criteria.task.score,
        coherenceScore: result.criteria.coherence.score,
        lexicalScore: result.criteria.lexical.score,
        grammarScore: result.criteria.grammar.score,
        feedbackJson: result,
        status: "completed",
        languageDetected: result.language_detected,
      });

      console.log(`[writing] Submission ${submissionId} scored — band ${result.overall_band}`);

      // Fire-and-forget: update user's estimated band
      try {
        const { updateUserBand } = require("../repositories/userRepository");
        updateUserBand(userId, result.overall_band, "writing", submissionId).catch(() => {});
      } catch { /* module load safety */ }

      // Fire-and-forget: update study room activity tracking
      try {
        const { onUserCompletedActivity } = require("./studyRoomService");
        onUserCompletedActivity(userId, "writing_tasks", 1).catch(() => {});
      } catch { /* module load safety */ }

      // ── Gamification: Award XP + update streak on writing completion ──
      // xp_ledger has no lesson_id column — we use the submissionId as ref_id.
      // updateStreak is idempotent for same-day calls (no double-counting).
      try {
        await awardXp(userId, XP_REWARD_WRITING, "writing_submission_complete", submissionId);
      } catch (xpErr) {
        // Non-fatal: XP award failure should not break submission scoring
        console.error(`[writing] XP award failed for user ${userId}:`, xpErr.message);
      }

      try {
        await updateStreak(userId);
      } catch (streakErr) {
        // Non-fatal: streak update failure should not break submission scoring
        console.error(`[writing] streak update failed for user ${userId}:`, streakErr.message);
      }

      // Fire-and-forget: check writing achievements (log errors, don't swallow)
      try {
        const { checkWritingBadges } = require("./badgeService");
        const countRow = await require("../config/db").query(
          `SELECT COUNT(*)::int AS c FROM writing_submissions WHERE user_id = $1 AND status = 'completed'`, [userId]
        );
        checkWritingBadges(userId, countRow.rows[0]?.c ?? 0, result.overall_band).catch((badgeErr) => {
          console.error(`[writing] badge check failed for user ${userId}:`, badgeErr.message);
        });
      } catch (badgeLoadErr) {
        console.error(`[writing] badge module load failed:`, badgeLoadErr.message);
      }
    } catch (err) {
      console.error(`[writing] Submission ${submissionId} failed:`, err.message);
      await writingRepository.updateSubmissionResult(submissionId, {
        status: "failed",
      }).catch((dbErr) => {
        console.error(`[writing] Failed to update status for ${submissionId}:`, dbErr.message);
      });
    }
  })();

  return { submissionId, status: "pending" };
}

/**
 * Get a single submission result. Enforces ownership.
 *
 * @param {string} userId
 * @param {string} submissionId
 * @returns {Promise<object>}
 */
async function getResult(userId, submissionId) {
  const submission = await writingRepository.getSubmissionById(submissionId);

  if (!submission) {
    const err = new Error("Submission not found");
    err.status = 404;
    throw err;
  }

  if (submission.user_id !== userId) {
    const err = new Error("You do not have access to this submission");
    err.status = 403;
    throw err;
  }

  return submission;
}

/**
 * Get paginated submission history for a user.
 *
 * @param {string} userId
 * @param {number} [page=1]
 * @param {number} [limit=10]
 * @returns {Promise<object[]>}
 */
async function getUserHistory(userId, page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  return writingRepository.getUserSubmissions(userId, limit, offset);
}

module.exports = {
  submitEssay,
  getResult,
  getUserHistory,
};
