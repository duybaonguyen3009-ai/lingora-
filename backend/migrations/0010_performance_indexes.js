/**
 * Migration 0010 — Performance indexes for scale
 *
 * Adds indexes to support common query patterns that would otherwise
 * require full table scans as data grows:
 *
 *   - refresh_tokens(expires_at)       — cleanup of expired tokens
 *   - scenario_sessions(user_id, completed_at) — coach service: recent sessions
 *   - xp_ledger(created_at, user_id)   — weekly leaderboard SUM(delta) GROUP BY
 *   - pronunciation_attempts(created_at) — history queries ordered by time
 */

exports.up = (pgm) => {
  pgm.createIndex("refresh_tokens", ["expires_at"], {
    name: "idx_refresh_tokens_expires_at",
  });

  pgm.createIndex("scenario_sessions", ["user_id", "completed_at"], {
    name: "idx_scenario_sessions_user_completed",
  });

  pgm.createIndex("xp_ledger", ["created_at", "user_id"], {
    name: "idx_xp_ledger_created_user",
  });

  pgm.createIndex("pronunciation_attempts", ["created_at"], {
    name: "idx_pronunciation_attempts_created",
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("refresh_tokens", [], { name: "idx_refresh_tokens_expires_at" });
  pgm.dropIndex("scenario_sessions", [], { name: "idx_scenario_sessions_user_completed" });
  pgm.dropIndex("xp_ledger", [], { name: "idx_xp_ledger_created_user" });
  pgm.dropIndex("pronunciation_attempts", [], { name: "idx_pronunciation_attempts_created" });
};
