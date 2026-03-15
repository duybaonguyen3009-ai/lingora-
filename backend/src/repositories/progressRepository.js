/**
 * repositories/progressRepository.js
 *
 * Raw SQL for user_progress and the guest-user helper.
 * No business logic here — just DB access.
 */

const { query, pool } = require("../config/db");

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

/**
 * migrateGuestProgress
 *
 * Merges all progress rows owned by a guest UUID into a real user account,
 * then cleans up the guest data — all within a single database transaction.
 *
 * Using an explicit transaction means all three mutations are atomic:
 * either every step succeeds and is committed, or a failure at any point
 * rolls back the entire operation, leaving the database in a consistent state.
 * Without a transaction, a crash between steps could leave progress rows
 * owned by both the guest and real user simultaneously.
 *
 * Merge strategy: best score wins (GREATEST), first completion timestamp
 * is preserved via COALESCE — identical to the upsertProgress policy.
 *
 * Transaction steps:
 *   1. INSERT … SELECT … ON CONFLICT DO UPDATE  → copy/merge progress rows
 *   2. DELETE the guest's now-redundant progress rows
 *   3. Soft-delete the guest user stub (only matches guest-*@lingora.local,
 *      so real user rows can never be accidentally affected)
 *
 * @param {string} realUserId  – authenticated user's UUID
 * @param {string} guestUserId – guest UUID from the browser's localStorage
 * @returns {Promise<number>}  – number of lessons migrated (0 when guest had none)
 */
async function migrateGuestProgress(realUserId, guestUserId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Copy/merge guest progress into the real user account.
    //    On conflict: keep the best score and the earliest completion timestamp.
    const { rowCount } = await client.query(
      `INSERT INTO user_progress (user_id, lesson_id, score, completed, completed_at)
       SELECT $1, lesson_id, score, completed, completed_at
       FROM   user_progress
       WHERE  user_id = $2
       ON CONFLICT (user_id, lesson_id) DO UPDATE
         SET score        = GREATEST(user_progress.score, EXCLUDED.score),
             completed    = true,
             completed_at = COALESCE(user_progress.completed_at, EXCLUDED.completed_at)`,
      [realUserId, guestUserId],
    );

    // 2. Remove the guest's now-migrated progress rows.
    await client.query(
      `DELETE FROM user_progress WHERE user_id = $1`,
      [guestUserId],
    );

    // 3. Soft-delete the guest user stub so the DB stays clean.
    //    The email LIKE guard ensures we never accidentally delete a real account.
    await client.query(
      `UPDATE users
       SET    deleted_at = NOW()
       WHERE  id         = $1
         AND  email      LIKE 'guest-%@lingora.local'
         AND  deleted_at IS NULL`,
      [guestUserId],
    );

    await client.query("COMMIT");
    return rowCount ?? 0;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    // Always release the client back to the pool — even on error.
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Gamification helpers
// ---------------------------------------------------------------------------

/**
 * getLessonXpReward
 *
 * Returns the xp_reward column for a given lesson.
 * Falls back to 0 if the lesson does not exist (defensive).
 *
 * @param {string} lessonId
 * @returns {Promise<number>}
 */
async function getLessonXpReward(lessonId) {
  const result = await query(
    `SELECT xp_reward FROM lessons WHERE id = $1`,
    [lessonId],
  );
  return result.rows[0]?.xp_reward ?? 0;
}

/**
 * countCompletedLessons
 *
 * Returns the total number of completed lessons for a user.
 * Called after upsertProgress so the count includes the current lesson.
 *
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function countCompletedLessons(userId) {
  const result = await query(
    `SELECT COUNT(*)::int AS count
     FROM   user_progress
     WHERE  user_id   = $1
       AND  completed = true`,
    [userId],
  );
  return result.rows[0].count;
}

module.exports = {
  ensureGuestUser,
  upsertProgress,
  getProgressByUserId,
  migrateGuestProgress,
  getLessonXpReward,
  countCompletedLessons,
};
