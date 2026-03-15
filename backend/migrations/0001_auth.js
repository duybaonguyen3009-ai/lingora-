/**
 * Migration 0001 – Auth & User model
 *
 * Adds the fields required for Phase 1 JWT authentication and COPPA compliance
 * to the existing `users` table, and creates the `refresh_tokens` table.
 *
 * Changes:
 *   users
 *     + role          TEXT NOT NULL DEFAULT 'kid'
 *     + password_hash TEXT              (NULL = guest / SSO user)
 *     + dob           DATE              (COPPA: age gate)
 *     + parent_id     UUID FK users     (links child → parent account)
 *     + consent_at    TIMESTAMPTZ       (parental consent timestamp)
 *     + updated_at    TIMESTAMPTZ       (auto-updated by trigger)
 *     + deleted_at    TIMESTAMPTZ       (soft delete)
 *   refresh_tokens (new table)
 */

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  // ─── 1. Shared trigger function (idempotent) ───────────────────────────────
  // Created once here; reused by any table that needs updated_at automation.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION trigger_set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // ─── 2. Add columns to users ───────────────────────────────────────────────
  pgm.addColumns('users', {
    // Role — referenced throughout the app; added here so it exists before auth
    role: {
      type: 'text',
      notNull: true,
      default: 'kid',
    },

    // Auth
    password_hash: {
      type: 'text',
      // nullable: guest users and future SSO users won't have a password hash
    },

    // COPPA compliance
    dob: {
      type: 'date',
      // nullable: existing guest rows have no DOB
    },
    parent_id: {
      type: 'uuid',
      references: '"users"',
      onDelete: 'SET NULL',
      // nullable: only child accounts (age < 13) are linked to a parent
    },
    consent_at: {
      type: 'timestamptz',
      // nullable: populated when the parent clicks the consent link
    },

    // Housekeeping
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    deleted_at: {
      type: 'timestamptz',
      // nullable: NULL = active user
    },
  });

  // Enforce the role enum at the DB level
  pgm.sql(`
    ALTER TABLE users
      ADD CONSTRAINT check_user_role
      CHECK (role IN ('kid', 'teacher', 'parent', 'admin'));
  `);

  // Auto-update updated_at on every UPDATE
  pgm.sql(`
    CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  `);

  // Index for soft-delete queries (list only active users)
  pgm.createIndex('users', 'deleted_at', {
    name: 'idx_users_deleted_at',
    where: 'deleted_at IS NULL',
  });

  // ─── 3. refresh_tokens ────────────────────────────────────────────────────
  // One row per issued refresh token.
  // token_hash stores SHA-256(token) — the plain token is never persisted.
  // family enables refresh-token rotation: when a token is used, all tokens
  // in the same family are revoked if the old token is replayed (reuse detection).
  pgm.createTable('refresh_tokens', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: '"users"',
      onDelete: 'CASCADE',
    },
    token_hash: {
      type: 'text',
      notNull: true,
      // SHA-256 hex digest of the raw token value
    },
    family: {
      type: 'uuid',
      notNull: true,
      // Groups the chain of rotated tokens; compromised family → revoke all
    },
    issued_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    expires_at: {
      type: 'timestamptz',
      notNull: true,
    },
    revoked_at: {
      type: 'timestamptz',
      // NULL = still valid
    },
  });

  // Partial index: only non-revoked tokens need fast user lookups
  pgm.createIndex('refresh_tokens', 'user_id', {
    name: 'idx_refresh_tokens_user_active',
    where: 'revoked_at IS NULL',
  });

  // Hash lookups during token validation
  pgm.createIndex('refresh_tokens', 'token_hash', {
    name: 'idx_refresh_tokens_hash',
    unique: true,
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  // Drop refresh_tokens first (references users)
  pgm.dropIndex('refresh_tokens', 'token_hash', { name: 'idx_refresh_tokens_hash' });
  pgm.dropIndex('refresh_tokens', 'user_id', { name: 'idx_refresh_tokens_user_active' });
  pgm.dropTable('refresh_tokens');

  // Remove trigger and constraint from users
  pgm.sql('DROP TRIGGER IF EXISTS set_users_updated_at ON users;');
  pgm.sql('ALTER TABLE users DROP CONSTRAINT IF EXISTS check_user_role;');
  pgm.dropIndex('users', 'deleted_at', { name: 'idx_users_deleted_at' });

  // Remove added columns
  pgm.dropColumns('users', [
    'role',
    'password_hash',
    'dob',
    'parent_id',
    'consent_at',
    'updated_at',
    'deleted_at',
  ]);

  // Note: trigger_set_updated_at() function is intentionally NOT dropped here
  // because future migrations may reuse it for other tables.
};
