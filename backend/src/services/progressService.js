/**
 * services/progressService.js
 *
 * Business logic for user progress.
 * Orchestrates the guest-user creation and progress upsert in one transaction-safe call.
 */

const progressRepository = require("../repositories/progressRepository");

// ---------------------------------------------------------------------------
// Shape helpers
// ---------------------------------------------------------------------------

function formatProgressRow(row) {
  return {
    lessonId:    row.lesson_id,
    score:       row.score,
    completed:   row.completed,
    completedAt: row.completed_at,
  };
}

// ---------------------------------------------------------------------------
// Service methods
// ---------------------------------------------------------------------------

/**
 * completeLesson
 *
 * Ensures a guest-user row exists, then upserts progress for the given
 * (userId, lessonId) pair.  Score is stored as 0–100.
 */
async function completeLesson(userId, lessonId, score) {
  // Must run before the progress insert to satisfy the FK constraint.
  await progressRepository.ensureGuestUser(userId);

  const row = await progressRepository.upsertProgress(userId, lessonId, score);

  return {
    userId:      row.user_id,
    lessonId:    row.lesson_id,
    score:       row.score,
    completed:   row.completed,
    completedAt: row.completed_at,
  };
}

/**
 * getProgress
 *
 * Returns all completed lessons for a user, shaped for the frontend hook.
 */
async function getProgress(userId) {
  const rows = await progressRepository.getProgressByUserId(userId);
  return rows.map(formatProgressRow);
}

module.exports = { completeLesson, getProgress };
