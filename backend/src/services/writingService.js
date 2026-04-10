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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_WORDS = { task1: 150, task2: 250 };
const FREE_DAILY_LIMIT = 1;

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

  // 2. Free-tier usage limit (admin + pro bypass)
  const bypassLimit = role === "admin" || isPro === true;
  if (!bypassLimit) {
    const todayCount = await writingRepository.getTodayUsageCount(userId);
    if (todayCount >= FREE_DAILY_LIMIT) {
      const err = new Error(
        "Daily limit reached. Upgrade to Pro for unlimited submissions."
      );
      err.status = 403;
      throw err;
    }
  }

  // 3. Create submission + increment usage
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
