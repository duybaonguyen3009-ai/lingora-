/**
 * repositories/streakRepository.js
 *
 * Raw SQL for the user_streaks table.
 * One row per user; upserted on every lesson completion.
 */

const { query } = require('../config/db');

/**
 * getStreak
 *
 * Returns the streak row for a user, or null if the user has never
 * completed a lesson.
 *
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
async function getStreak(userId) {
  const result = await query(
    `SELECT user_id, current_streak, longest_streak, last_activity_at
     FROM   user_streaks
     WHERE  user_id = $1`,
    [userId],
  );
  return result.rows[0] ?? null;
}

/**
 * upsertStreak
 *
 * Inserts a new streak row or replaces all three mutable fields
 * for an existing one.
 *
 * @param {string} userId
 * @param {number} currentStreak
 * @param {number} longestStreak
 * @param {string} lastActivityAt - 'YYYY-MM-DD' date string (UTC)
 * @returns {Promise<object>} the upserted row
 */
async function upsertStreak(userId, currentStreak, longestStreak, lastActivityAt) {
  const result = await query(
    `INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE
       SET current_streak   = EXCLUDED.current_streak,
           longest_streak   = EXCLUDED.longest_streak,
           last_activity_at = EXCLUDED.last_activity_at
     RETURNING user_id, current_streak, longest_streak, last_activity_at`,
    [userId, currentStreak, longestStreak, lastActivityAt],
  );
  return result.rows[0];
}

module.exports = { getStreak, upsertStreak };
