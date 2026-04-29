/* eslint-disable camelcase */

/**
 * Migration 0049 — Username change cooldown + redirect grace (Wave 2.11).
 *
 * Adds:
 *   1. users.last_username_change_at — TIMESTAMPTZ NULL. Drives the
 *      30-day cooldown. NULL = never changed; first-time setters bypass
 *      the cooldown gate.
 *   2. username_redirects — small audit/lookup table that lets profile
 *      lookups find a user via their PREVIOUS username for up to 7 days
 *      after a change. Keys are stored lowercased so case-insensitive
 *      lookups stay index-friendly without a functional index. Cleanup
 *      is lazy: every read filters `expires_at > NOW()`. A nightly
 *      `DELETE WHERE expires_at < NOW() - interval '30 days'` is the
 *      next-step optimization if the table ever bloats — not needed at
 *      Lingona scale today.
 *
 * Lessons baked in (Wave 2 history):
 *   - No README in this directory (lesson 2.10 hotfix 3 — node-pg-migrate
 *     scanner crashes on .md). Doc lives at backend/docs/MIGRATIONS.md.
 *   - No inner-quote string defaults (lesson 2.8 — 0047 incident).
 *   - CHECK constraints split from addColumns; this migration uses
 *     neither so the rule is moot but the discipline stays.
 *   - users.username column already exists with partial UNIQUE
 *     (Wave 2.7 0046, scoped to active users) — no constraint changes
 *     here. Validation rules (length, reserved, format) are app-layer.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns("users", {
    last_username_change_at: { type: "timestamptz" },
  });

  pgm.createTable("username_redirects", {
    // Stored lowercased (caller's responsibility) so PK lookups don't
    // need LOWER() — lets the unique index serve case-insensitive reads.
    old_username: { type: "text", primaryKey: true },
    user_id: {
      type: "uuid",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE",
    },
    expires_at: { type: "timestamptz", notNull: true },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  // Index on expires_at for the "find active redirect" lookup.
  //
  // Originally written as a partial index `WHERE expires_at > now()` so
  // expired rows were physically excluded — but Postgres rejects that
  // predicate (error 42P17 "functions in index predicate must be marked
  // IMMUTABLE"; now() is STABLE, not IMMUTABLE, because the planner
  // cannot cache the value). The full index is functionally equivalent
  // for our query pattern: WHERE expires_at > NOW() in the lookup uses
  // this index directly, simply scanning a few extra dead rows in the
  // tail. At Lingona scale (<100 redirect entries expected pre-launch),
  // the cost is negligible. If the table ever grows enough to matter,
  // the follow-up is either a nightly DELETE WHERE expires_at < now()
  // - interval '30 days' or BRIN partitioning by month — both kept as
  // backlog options.
  pgm.createIndex("username_redirects", "expires_at", {
    name: "idx_username_redirects_expires_at",
  });
};

exports.down = (pgm) => {
  pgm.dropTable("username_redirects");
  pgm.dropColumns("users", ["last_username_change_at"]);
};
