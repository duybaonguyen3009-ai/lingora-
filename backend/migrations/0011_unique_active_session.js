/**
 * Migration 0011 — Unique active session per user
 *
 * Prevents a race condition where rapid double-clicks on "Start Session"
 * could create two active sessions for the same user. The partial unique
 * index enforces at most one active session per user at the DB level,
 * complementing the application-level abandonActiveSession call.
 */

exports.up = (pgm) => {
  pgm.createIndex("scenario_sessions", ["user_id"], {
    name: "idx_scenario_sessions_one_active_per_user",
    unique: true,
    where: "status = 'active'",
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("scenario_sessions", [], {
    name: "idx_scenario_sessions_one_active_per_user",
  });
};
