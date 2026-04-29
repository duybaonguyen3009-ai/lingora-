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
  refreshAllTimeLeaderboard,
} = require('../repositories/leaderboardRepository');

const LEADERBOARD_LIMIT = 50;

// All-time leaderboard reads from a materialised view (migration 0050).
// We refresh on-demand with a 5-minute debounce so a busy hour doesn't
// pin REFRESH MATERIALIZED VIEW CONCURRENTLY in a tight loop. State is
// in-memory and per-process; safe under the current single-replica
// deploy. If we scale to multiple replicas, swap this for a pg_advisory
// lock or a refresh row in a small bookkeeping table.
const REFRESH_DEBOUNCE_MS = 5 * 60 * 1000;
let _lastRefreshMs = 0;
let _refreshInFlight = false;

function maybeRefreshAllTime() {
  const now = Date.now();
  if (_refreshInFlight) return;
  if (now - _lastRefreshMs < REFRESH_DEBOUNCE_MS) return;

  _refreshInFlight = true;
  _lastRefreshMs = now; // claim the slot before the await so concurrent callers skip
  refreshAllTimeLeaderboard()
    .catch((err) => {
      // Reset the timestamp so the next caller retries instead of waiting
      // out the debounce window after a transient failure.
      _lastRefreshMs = 0;
      console.error('[leaderboard] refresh failed:', err.message);
    })
    .finally(() => {
      _refreshInFlight = false;
    });
}

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

  // Fire-and-forget refresh of the all-time materialised view. The current
  // request reads the existing snapshot (potentially up to ~5 min stale);
  // the next request that arrives after this refresh completes will see
  // the updated data. Eventually consistent, no read-path latency added.
  if (!isWeekly) maybeRefreshAllTime();

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
