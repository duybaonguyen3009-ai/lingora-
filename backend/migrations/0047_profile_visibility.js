/* eslint-disable camelcase */

/**
 * Migration 0047 — Profile visibility toggle (Wave 2.8).
 *
 * Adds users.profile_visibility ENUM-like column to gate the public
 * profile endpoint. Three modes:
 *   - public   : non-friends see the always-tier fields; friends/self
 *                see everything; nobody outside the friends tier sees
 *                bio / location / band / joined_at (those are friends-
 *                only regardless of mode).
 *   - friends  : non-friends get 404. Friends/self see everything.
 *   - private  : only the owner. 404 for everyone else (same response
 *                as a non-existent username — does not leak existence).
 *
 * Default = 'friends' (privacy-by-default for new signups, GDPR-aligned
 * and Soul §1).
 *
 * Backfill: the 7 prod users were created BEFORE this column existed
 * and have an implicit "public" expectation (the endpoint was wide
 * open). Silently flipping them to 'friends' would surprise them. We
 * pin existing ACTIVE users to 'public' so behavior is unchanged for
 * them. Soft-deleted users are skipped (deleted_at filter) — they
 * have no profile to view.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // node-pg-migrate quirk: a string `default` is dollar-quoted as a
  // literal — `default: "'friends'"` would store the 8-char string
  // `'friends'` (with quotes), which then violates an inline CHECK
  // looking for the 7-char `friends`. The fix is twofold:
  //   1. default value WITHOUT inner quotes — pgm wraps it correctly.
  //   2. CHECK added separately via addConstraint (matches Wave 2.3
  //      0045 pattern: pgm.addConstraint after addColumns). This also
  //      avoids any ALTER-ADD-COLUMN ordering ambiguity around
  //      DEFAULT vs CHECK validation.
  pgm.addColumns("users", {
    profile_visibility: {
      type: "varchar(10)",
      notNull: true,
      default: "friends",
    },
  });

  pgm.addConstraint("users", "users_profile_visibility_check", {
    check: "profile_visibility IN ('public', 'friends', 'private')",
  });

  // Pin existing active users to 'public'. Excludes soft-deleted rows
  // explicitly — Wave 2.7 anonymized rows must not be revived as
  // public profiles.
  pgm.sql(`
    UPDATE users
       SET profile_visibility = 'public'
     WHERE deleted_at IS NULL;
  `);
};

exports.down = (pgm) => {
  pgm.dropConstraint("users", "users_profile_visibility_check", { ifExists: true });
  pgm.dropColumns("users", ["profile_visibility"]);
};
