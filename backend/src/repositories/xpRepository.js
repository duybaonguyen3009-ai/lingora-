/**
 * repositories/xpRepository.js
 *
 * Raw SQL for the xp_ledger table.
 * Append-only: NEVER UPDATE or DELETE rows — the ledger is the source of truth.
 * A user's total XP is always computed as SUM(delta) over their rows.
 *
 * Idempotency: migration 0041 added a partial UNIQUE index
 *   (user_id, reason, ref_id) WHERE ref_id IS NOT NULL.
 * `insertXpEvent` uses ON CONFLICT DO NOTHING against that index, so a
 * caller passing the same (user_id, reason, ref_id) twice gets one ledger
 * row and two return values: { awarded: true } then { awarded: false }.
 * NULL ref_id is intentionally exempt from the unique check.
 */

const { query } = require('../config/db');

// ---------------------------------------------------------------------------
// Per-user queries
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} XpAwardResult
 * @property {boolean}     awarded   - true if a new ledger row was inserted
 * @property {number}      delta     - XP granted (0 if !awarded)
 * @property {string|null} ledgerId  - inserted row id, or null if !awarded
 * @property {string}      reason
 * @property {string|null} refId
 * @property {string}      userId
 * @property {Date|null}   createdAt
 */

/**
 * insertXpEvent
 *
 * Appends one XP event to the ledger, idempotent on (user_id, reason, ref_id)
 * when ref_id is non-null.
 *
 * @param {string}      userId
 * @param {number}      delta   - XP amount (positive = gain, negative = future penalty)
 * @param {string}      reason  - 'lesson_complete' | 'badge_award' | …
 * @param {string|null} [refId] - associated entity id, or null
 * @returns {Promise<XpAwardResult>}
 */
async function insertXpEvent(userId, delta, reason, refId = null) {
  const result = await query(
    `INSERT INTO xp_ledger (user_id, delta, reason, ref_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, reason, ref_id) WHERE ref_id IS NOT NULL DO NOTHING
     RETURNING id, user_id, delta, reason, ref_id, created_at`,
    [userId, delta, reason, refId],
  );

  if (result.rowCount === 0) {
    // Conflict: same (user_id, reason, ref_id) already exists — replay/race.
    console.warn(
      `[xp] duplicate award skipped userId=${userId} reason=${reason} refId=${refId}`,
    );
    return {
      awarded: false,
      delta: 0,
      ledgerId: null,
      reason,
      refId,
      userId,
      createdAt: null,
    };
  }

  const row = result.rows[0];
  return {
    awarded: true,
    delta: row.delta,
    ledgerId: row.id,
    reason: row.reason,
    refId: row.ref_id,
    userId: row.user_id,
    createdAt: row.created_at,
  };
}

/**
 * getTotalXp
 *
 * Returns the user's total XP as a single integer (SUM of all ledger deltas).
 * Returns 0 if the user has no ledger rows.
 *
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function getTotalXp(userId) {
  const result = await query(
    `SELECT COALESCE(SUM(delta), 0)::int AS total_xp
     FROM   xp_ledger
     WHERE  user_id = $1`,
    [userId],
  );
  return result.rows[0].total_xp;
}

module.exports = { insertXpEvent, getTotalXp };
