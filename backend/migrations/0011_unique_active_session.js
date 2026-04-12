/**
 * Migration 0011 — Unique active session per user
 *
 * Prevents a race condition where rapid double-clicks on "Start Session"
 * could create two active sessions for the same user. The partial unique
 * index enforces at most one active session per user at the DB level,
 * complementing the application-level abandonActiveSession call.
 */

exports.up = (pgm) => {
  // Clean up any duplicate active sessions before creating the unique index.
  // Without this, the index creation fails if duplicates exist in prod data.
  pgm.sql(`
    UPDATE scenario_sessions
    SET status = 'abandoned'
    WHERE id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
        FROM scenario_sessions
        WHERE status = 'active'
      ) ranked
      WHERE rn > 1
    )
  `);

  pgm.createIndex("scenario_sessions", ["user_id"], {
    name: "idx_scenario_sessions_one_active_per_user",
    unique: true,
    where: "status = 'active'",
    ifNotExists: true,
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("scenario_sessions", [], {
    name: "idx_scenario_sessions_one_active_per_user",
  });
};
