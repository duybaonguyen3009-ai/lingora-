/* eslint-disable camelcase */

/**
 * Migration 0041 — xp_ledger idempotency
 *
 * Adds a partial UNIQUE index on (user_id, reason, ref_id) WHERE ref_id IS NOT NULL
 * so that callers can use `ON CONFLICT DO NOTHING` to make XP awards idempotent.
 *
 * NULL ref_id is intentionally allowed to repeat (e.g. daily_login bonuses
 * with no associated entity).
 *
 * STEP 1 — Dedup existing duplicate rows. Keeps the earliest created_at per
 *          (user_id, reason, ref_id). DELETE is irreversible on `down`.
 * STEP 2 — Create the partial UNIQUE INDEX CONCURRENTLY (avoids locking
 *          xp_ledger writes during deploy). IF NOT EXISTS makes retry safe.
 *
 * Closes 5 P0 vectors (Audit Wave 1):
 *   - Reading practice F5 double XP
 *   - Battle resolve race double XP / double rank delta
 *   - Badge unlock race double XP grant
 *   - Lesson completion replay infinite XP
 *   - Writing same-submission re-XP
 *
 * NOTE: CREATE INDEX CONCURRENTLY cannot run inside a transaction, hence
 *       pgm.noTransaction(). The DELETE is auto-committed per statement
 *       under noTransaction; if the migration aborts between steps the DB
 *       is still in a valid state and the migration can be re-applied
 *       (DELETE is no-op for already-deduped rows; CREATE INDEX uses
 *       IF NOT EXISTS).
 *
 * DOWN: drops only the index. Deduped rows are NOT restored — recovery
 *       relies on Railway PITR backup (auto-retained 7 days on Pro tier).
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.noTransaction();

  // ─── STEP 1: Dedup existing rows (keep earliest per group) ────────────────
  // Uses ROW_NUMBER() to rank rows within each (user_id, reason, ref_id)
  // group by created_at then id. Deletes rn > 1.
  pgm.sql(`
    WITH ranked AS (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY user_id, reason, ref_id
               ORDER BY created_at ASC, id ASC
             ) AS rn
      FROM xp_ledger
      WHERE ref_id IS NOT NULL
    )
    DELETE FROM xp_ledger
    WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
  `);

  // ─── STEP 2: Partial UNIQUE INDEX CONCURRENTLY ────────────────────────────
  // Predicate `WHERE ref_id IS NOT NULL` lets NULL ref_id repeat
  // (intentional: some reasons have no source entity, e.g. daily_login).
  pgm.sql(`
    CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS
      idx_xp_ledger_user_reason_ref_unique
    ON xp_ledger (user_id, reason, ref_id)
    WHERE ref_id IS NOT NULL;
  `);
};

exports.down = (pgm) => {
  pgm.noTransaction();
  pgm.sql(`DROP INDEX IF EXISTS idx_xp_ledger_user_reason_ref_unique;`);
};
