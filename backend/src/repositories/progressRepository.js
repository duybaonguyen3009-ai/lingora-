/**
 * repositories/progressRepository.js
 *
 * Raw SQL for user_progress and the guest-user helper.
 * No business logic here — just DB access.
 */

const { query } = require("../config/db");

// ---------------------------------------------------------------------------
// Guest user helper
// ---------------------------------------------------------------------------

/**
 * ensureGuestUser
 *
 * Creates a minimal users row for a guest UUID if one does not already exist.
 * This satisfies the FK constraint on user_progress.user_id without requiring
 * a full auth system.  The INSERT is a no-op if the id already exists.
 *
 * Email format: guest-<uuid>@lingora.local (always unique because uuid is unique).
 */
async function ensureGuestUser(userId) {
  await query(
    `INSERT INTO users (id, email, name)
     VALUES ($1, $2, 'Guest')
     ON CONFLICT (id) DO NOTHING`,
    [userId, `guest-${userId}@lingora.local`]
  );
}

// ---------------------------------------------------------------------------
// Progress queries
// ---------------------------------------------------------------------------

/**
 * upsertProgress
 *
 * Inserts a new progress row or updates the existing one for (user_id, lesson_id).
 * Score is always kept at the HIGHEST value seen (best attempt wins).
 * completed_at is set only on the FIRST completion.
 *
 * Returns the upserted row.
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
 * getProgressByUserId
 *
 * Returns all progress rows for a given user, ordered by completion time.
 * Used by GET /api/v1/users/:userId/progress.
 */
async function getProgressByUserId(userId) {
  const result = await query(
    `SELECT lesson_id, score, completed, completed_at
     FROM   user_progress
     WHERE  user_id = $1
     ORDER  BY completed_at ASC NULLS LAST`,
    [userId]
  );
  return result.rows;
}

module.exports = { ensureGuestUser, upsertProgress, getProgressByUserId };
