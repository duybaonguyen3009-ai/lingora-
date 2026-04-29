/* eslint-disable camelcase */

/**
 * Migration 0053 — Drop dead schema from Wave 1 iterations (Wave 5.2).
 *
 * Phase 1 discovery confirmed three items have zero application
 * references in any wave; the feature work that would have used them
 * never landed. Pre-launch cleanup minimises the schema surface that
 * future migrations have to reason about.
 *
 * Dropped:
 *   - badge_progress (table) — created in 0025 with a UNIQUE
 *     constraint, never read or written by app code. The achievement
 *     system tracks progress directly off the underlying tables (xp,
 *     streak, etc.) and emits badges on threshold crossings; this
 *     intermediate row was never wired up.
 *
 *   - battle_season_profiles (table) — created in 0019, intended for
 *     per-season rank stats. The shipped battle code uses
 *     battle_player_profiles (lifetime stats) only; per-season slicing
 *     was never wired. No incoming FKs (only outgoing → battle_seasons,
 *     users), so a plain DROP is sufficient — no CASCADE.
 *
 *   - battle_seasons.soft_reset_factor (column) — only references are
 *     the column declaration in 0019 and a one-time seed INSERT
 *     (executed once at apply time, has no runtime effect). 0 reads
 *     from any service/repo. Safe to drop as a plain column.
 *
 * KEPT (active features — handoff misidentified as dead):
 *   - users.onboarding_skipped — read + written by onboardingController.
 *   - battle_player_profiles.placement_matches_completed — actively
 *     UPDATEd in battleRepository.js (ranked placement gate).
 *
 * Down migration restores structural shape only. Data is not
 * preserved — these tables/columns hold no meaningful runtime data
 * today, so a rollback that re-creates an empty table matches the
 * pre-migration state for any practical purpose.
 *
 * Lessons baked in:
 *   - No README in this directory (lesson 2.10 hotfix 3).
 *   - No inner-quote string defaults (lesson 0047). The down migration
 *     uses bare numeric default `0.85` and string defaults via
 *     pgm.func() / single-quote literal pattern matching 0019.
 *   - No now()/STABLE in index predicates (lesson 0049 — moot, no
 *     partial indexes in this migration).
 *   - DROP TABLE order: independent tables first; here both targets
 *     have no incoming FKs so order is incidental.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS badge_progress;`);
  pgm.sql(`DROP TABLE IF EXISTS battle_season_profiles;`);
  pgm.sql(`ALTER TABLE battle_seasons DROP COLUMN IF EXISTS soft_reset_factor;`);
};

exports.down = (pgm) => {
  // Restore the column on battle_seasons (default mirrors the original 0019 value).
  pgm.addColumns("battle_seasons", {
    soft_reset_factor: { type: "numeric", notNull: true, default: 0.85 },
  });

  // Restore battle_season_profiles structure from 0019:44.
  pgm.createTable("battle_season_profiles", {
    id:          { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    season_id:   { type: "uuid", notNull: true, references: '"battle_seasons"', onDelete: "CASCADE" },
    user_id:     { type: "uuid", notNull: true, references: '"users"', onDelete: "CASCADE" },
    rank_points: { type: "int",  notNull: true, default: 0 },
    rank_tier:   { type: "text", notNull: true, default: "'iron'" },
    wins:        { type: "int",  notNull: true, default: 0 },
    losses:      { type: "int",  notNull: true, default: 0 },
    created_at:  { type: "timestamptz", default: pgm.func("now()") },
  });
  pgm.addConstraint("battle_season_profiles", "unique_season_user", { unique: ["season_id", "user_id"] });

  // Restore badge_progress structure from 0025:30.
  pgm.createTable("badge_progress", {
    id:           { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    user_id:      { type: "uuid", notNull: true, references: '"users"', onDelete: "CASCADE" },
    badge_slug:   { type: "varchar(50)", notNull: true },
    current_value:{ type: "int", notNull: true, default: 0 },
    target_value: { type: "int", notNull: true, default: 0 },
    updated_at:   { type: "timestamptz", default: pgm.func("now()") },
  });
  pgm.addConstraint("badge_progress", "unique_user_badge_progress", { unique: ["user_id", "badge_slug"] });
};
