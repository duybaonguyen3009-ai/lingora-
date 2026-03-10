/**
 * services/progressService.js
 *
 * Business logic for lesson progress.
 */

const {
  ensureGuestUser,
  upsertProgress,
  getProgressByUserId,
} = require("../repositories/progressRepository");

/**
 * Record a lesson completion for a user.
 * Creates a guest user row if needed (satisfies FK without full auth).
 */
async function completeLesson(userId, lessonId, score) {
  await ensureGuestUser(userId);
  const row = await upsertProgress(userId, lessonId, score);
  return {
    userId:      row.user_id,
    lessonId:    row.lesson_id,
    score:       row.score,
    completed:   row.completed,
    completedAt: row.completed_at,
  };
}

/**
 * Return all completed lessons for a user.
 * Returns an empty array when the user has no progress yet.
 */
async function getProgress(userId) {
  const rows = await getProgressByUserId(userId);
  return rows.map((r) => ({
    lessonId:    r.lesson_id,
    score:       r.score,
    completed:   r.completed,
    completedAt: r.completed_at,
  }));
}

module.exports = { completeLesson, getProgress };
