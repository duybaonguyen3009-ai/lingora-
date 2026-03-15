/**
 * services/leaderboardService.js
 *
 * Leaderboard business logic.
 * Fetches the top-N list plus the requesting user's own rank (may be outside
 * the top N), then merges them so the frontend can always show "you".
 */

const {
  getWeeklyRankings,
  getAllTimeRankings,
  getUserWeeklyRank,
  getUserAllTimeRank,
} = require('../repositories/leaderboardRepository');

const LEADERBOARD_LIMIT = 50;

/**
 * getLeaderboard
 *
 * @param {'weekly'|'all-time'} scope
 * @param {string|null} [requestingUserId] - include the user's own entry if not in top N
 * @returns {Promise<{
 *   entries:   Array<{ userId, name, xp, rank }>,
 *   myEntry:   { userId, name, xp, rank } | null,
 * }>}
 */
async function getLeaderboard(scope, requestingUserId = null) {
  const isWeekly = scope === 'weekly';

  // Fetch top list + user's own rank in parallel when a userId is provided.
  const [topRows, myRow] = await Promise.all([
    isWeekly ? getWeeklyRankings(LEADERBOARD_LIMIT) : getAllTimeRankings(LEADERBOARD_LIMIT),
    requestingUserId
      ? (isWeekly ? getUserWeeklyRank(requestingUserId) : getUserAllTimeRank(requestingUserId))
      : Promise.resolve(null),
  ]);

  const entries = topRows.map((r) => ({
    userId: r.user_id,
    name:   r.name,
    xp:     r.xp,
    rank:   r.rank,
  }));

  const myEntry = myRow
    ? { userId: myRow.user_id, name: myRow.name, xp: myRow.xp, rank: myRow.rank }
    : null;

  return { entries, myEntry };
}

module.exports = { getLeaderboard };
