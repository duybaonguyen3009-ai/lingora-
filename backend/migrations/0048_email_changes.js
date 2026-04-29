/* eslint-disable camelcase */

/**
 * Migration 0048 — email_changes audit + undo trail (Wave 2.10).
 *
 * Backs the TRIMMED+ email-change flow:
 *   1. POST /auth/email-change       — re-auth (current password) +
 *      atomic UPDATE users.email + bump password_version (revokes
 *      every outstanding access JWT) + INSERT one row here.
 *   2. GET  /auth/email-change/undo  — single-use undo via signed
 *      JWT. The JWT carries a jti that maps to this table's
 *      undo_token_jti UNIQUE column; setting undone_at NOT NULL
 *      enforces single-use semantics independently of the JWT
 *      expiry, defending against replay even if the link leaks.
 *
 * No OTP infrastructure is built here — see commit message for the
 * threat-model rationale. Re-auth + immediate notification email
 * + 7-day undo link is the locked Wave 2.10 design.
 *
 * Lesson 0047: avoid inner quotes in default values, split CHECK
 * constraints from addColumns.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("email_changes", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE",
    },
    // Plain old/new emails — these ARE PII but the row's purpose is
    // the audit trail required to honor the undo link. When the user
    // soft-deletes (Wave 2.7), CASCADE wipes these rows along with
    // them, satisfying PDPL.
    old_email: { type: "text", notNull: true },
    new_email: { type: "text", notNull: true },
    changed_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    // NULL while the change is still undoable; set to NOW() the
    // moment the undo link is consumed. The partial index below
    // exploits this for fast "find the live undo for user X" lookups.
    undone_at: { type: "timestamptz" },
    // Random unique JTI claim baked into the undo JWT. UNIQUE so a
    // collision is detected at the DB level even if the random
    // generator is somehow seeded twice.
    undo_token_jti: { type: "text", notNull: true, unique: true },
  });

  pgm.createIndex("email_changes", ["user_id", "changed_at"], {
    name: "idx_email_changes_user_active",
    where: "undone_at IS NULL",
  });
};

exports.down = (pgm) => {
  pgm.dropTable("email_changes");
};
