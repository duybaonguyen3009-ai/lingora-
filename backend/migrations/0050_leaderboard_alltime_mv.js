/* eslint-disable camelcase */

/**
 * Migration 0050 — All-time leaderboard materialized view (Wave 4.7).
 *
 * Background: getAllTimeRankings + getUserAllTimeRank scan users JOIN
 * xp_ledger and GROUP BY user every request. At 7 prod users today the
 * cost is invisible; at 10K+ users with a year of XP events it would
 * walk hundreds of thousands of ledger rows on every leaderboard load.
 *
 * Strategy: pre-compute the full ranking into a materialized view,
 * refreshed on-demand with a 5-minute debounce from the service layer
 * (REFRESH MATERIALIZED VIEW CONCURRENTLY). Reads become indexed lookups
 * against a small denormalised table.
 *
 * Scope intentionally narrow:
 *   - Only the all-time scope is materialised. The weekly query uses a
 *     moving window (date_trunc('week', NOW())) that does not fit a
 *     materialised view cleanly — between the week boundary crossing
 *     and the next refresh, readers would see last week's data labelled
 *     as this week's. Pre-launch the weekly scan is fast; revisit if
 *     it ever shows up in latency.
 *
 * Lessons baked in:
 *   - No README in this directory (lesson 2.10 hotfix 3).
 *   - No inner-quote string defaults (lesson 2.8 — 0047).
 *   - No now()/non-IMMUTABLE functions in index predicates (lesson 0049
 *     — moot here, no partial indexes).
 *   - REFRESH MATERIALIZED VIEW CONCURRENTLY requires a UNIQUE index;
 *     idx_leaderboard_alltime_user_pk satisfies that contract. Do not
 *     drop it without also dropping the concurrent-refresh path.
 *   - CREATE MATERIALIZED VIEW populates immediately (no WITH NO DATA),
 *     so the first reader after deploy sees the snapshot rather than
 *     an empty result.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE MATERIALIZED VIEW leaderboard_xp_alltime AS
      SELECT u.id                                                             AS user_id,
             u.name,
             COALESCE(SUM(x.delta), 0)::int                                  AS xp,
             RANK() OVER (ORDER BY COALESCE(SUM(x.delta), 0) DESC)::int      AS rank
      FROM   users u
      JOIN   xp_ledger x ON x.user_id = u.id
      WHERE  u.deleted_at IS NULL
      GROUP  BY u.id, u.name;
  `);

  // UNIQUE INDEX is mandatory for REFRESH MATERIALIZED VIEW CONCURRENTLY.
  pgm.sql(`
    CREATE UNIQUE INDEX idx_leaderboard_alltime_user_pk
      ON leaderboard_xp_alltime (user_id);
  `);

  // Secondary index serves the top-N read path (ORDER BY rank LIMIT 50).
  pgm.sql(`
    CREATE INDEX idx_leaderboard_alltime_rank
      ON leaderboard_xp_alltime (rank);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP MATERIALIZED VIEW IF EXISTS leaderboard_xp_alltime;`);
};
