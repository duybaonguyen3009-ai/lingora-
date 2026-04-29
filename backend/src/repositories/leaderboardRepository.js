/**
 * repositories/leaderboardRepository.js
 *
 * SQL for leaderboard ranking queries.
 * All results are joined to users so we return a display name (never email/id).
 * Rankings are computed server-side using PostgreSQL window functions.
 */

const { query } = require('../config/db');

// ---------------------------------------------------------------------------
// Leaderboard queries
// ---------------------------------------------------------------------------

/**
 * getWeeklyRankings
 *
 * Top N users ranked by XP earned in the current ISO calendar week (UTC).
 * Only users with at least one XP event this week appear.
 *
 * @param {number} [limit=50]
 * @returns {Promise<Array<{ user_id, name, xp, rank }>>}
 */
async function getWeeklyRankings(limit = 50) {
  const result = await query(
    `SELECT u.id                                                              AS user_id,
            u.name,
            COALESCE(SUM(x.delta), 0)::int                                   AS xp,
            RANK() OVER (ORDER BY COALESCE(SUM(x.delta), 0) DESC)::int       AS rank
     FROM   users u
     JOIN   xp_ledger x ON x.user_id = u.id
                       AND date_trunc('week', x.created_at AT TIME ZONE 'UTC')
                         = date_trunc('week', NOW() AT TIME ZONE 'UTC')
     WHERE  u.deleted_at IS NULL
     GROUP  BY u.id, u.name
     ORDER  BY xp DESC
     LIMIT  $1`,
    [limit],
  );
  return result.rows;
}

/**
 * getAllTimeRankings
 *
 * Top N users ranked by all-time total XP. Reads the materialised view
 * leaderboard_xp_alltime (migration 0050) — see service-layer debounce
 * for refresh policy. Eventually consistent up to ~5 minutes.
 *
 * @param {number} [limit=50]
 * @returns {Promise<Array<{ user_id, name, xp, rank }>>}
 */
async function getAllTimeRankings(limit = 50) {
  const result = await query(
    `SELECT user_id, name, xp, rank
       FROM leaderboard_xp_alltime
      ORDER BY rank ASC
      LIMIT $1`,
    [limit],
  );
  return result.rows;
}

/**
 * getUserWeeklyRank
 *
 * Returns the rank and XP of a specific user for the current week.
 * Returns null if the user has no XP events this week.
 *
 * @param {string} userId
 * @returns {Promise<{ user_id, name, xp, rank }|null>}
 */
async function getUserWeeklyRank(userId) {
  const result = await query(
    `WITH weekly_totals AS (
       SELECT u.id       AS user_id,
              u.name,
              COALESCE(SUM(x.delta), 0)::int AS xp
       FROM   users u
       JOIN   xp_ledger x ON x.user_id = u.id
                         AND date_trunc('week', x.created_at AT TIME ZONE 'UTC')
                           = date_trunc('week', NOW() AT TIME ZONE 'UTC')
       WHERE  u.deleted_at IS NULL
       GROUP  BY u.id, u.name
     ),
     ranked AS (
       SELECT user_id, name, xp,
              RANK() OVER (ORDER BY xp DESC)::int AS rank
       FROM   weekly_totals
     )
     SELECT user_id, name, xp, rank
     FROM   ranked
     WHERE  user_id = $1`,
    [userId],
  );
  return result.rows[0] ?? null;
}

/**
 * getUserAllTimeRank
 *
 * Returns the rank and XP of a specific user across all time.
 * Returns null if the user has no XP events.
 *
 * @param {string} userId
 * @returns {Promise<{ user_id, name, xp, rank }|null>}
 */
async function getUserAllTimeRank(userId) {
  const result = await query(
    `SELECT user_id, name, xp, rank
       FROM leaderboard_xp_alltime
      WHERE user_id = $1`,
    [userId],
  );
  return result.rows[0] ?? null;
}

/**
 * refreshAllTimeLeaderboard
 *
 * REFRESH MATERIALIZED VIEW CONCURRENTLY — non-blocking for readers.
 * Cannot run inside a transaction; node-pg-migrate's wrapped pool
 * `query()` issues this as a top-level statement which is fine.
 * Caller (service layer) is responsible for debouncing.
 */
async function refreshAllTimeLeaderboard() {
  await query(`REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_xp_alltime`);
}

module.exports = {
  getWeeklyRankings,
  getAllTimeRankings,
  getUserWeeklyRank,
  getUserAllTimeRank,
  refreshAllTimeLeaderboard,
};
