/**
 * repositories/progressRepository.js
 *
 * Low-level database operations for user_progress.
 * Handles the FK constraint by auto-creating a guest user row before writes.
 */

const { query } = require("../config/db");

/**
 * Ensure a users row exists for the given UUID.
 * Guest users get email `guest-{uuid}@lingora.local` and name "Guest".
 * ON CONFLICT (id) DO NOTHING makes this safe to call on every request.
 */
async function ensureGuestUser(userId) {
  await query(
    `INSERT INTO users (id, email, name)
     VALUES ($1, $2, 'Guest')
     ON CONFLICT (id) DO NOTHING`,
    [userId, `guest-${userId}@lingora.local`]
  );
}

/**
 * Upsert a progress row.
 * - Keeps the BEST score (GREATEST).
 * - Preserves the original completed_at timestamp (COALESCE).
 */
async function upsertProgress(userId, lessonId, score) {
  const result = await query(
    `INSERT INTO user_progress (user_id, lesson_id, score, completed, completed_at)
     VALUES ($1, $2, $3, true, NOW())
     ON CONFLICT (user_id, lesson_id) DO UPDATE
       SET score        = GREATEST(user_progress.score, EXCLUDED.score),
           completed    = true,
           completed_at = COALESCE(user_progress.completed_at, NOW())
     RETURNING id, user_id, lesson_id, score, completed, completed_at`,
    [userId, lessonId, score]
  );
  return result.rows[0];
}

/**
 * Return all progress rows for a user, ordered by completion time.
 */
async function getProgressByUserId(userId) {
  const result = await query(
    `SELECT id, user_id, lesson_id, score, completed, completed_at
     FROM user_progress
     WHERE user_id = $1
     ORDER BY completed_at ASC NULLS LAST`,
    [userId]
  );
  return result.rows;
}

module.exports = { ensureGuestUser, upsertProgress, getProgressByUserId };
