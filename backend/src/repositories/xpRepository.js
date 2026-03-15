/**
 * repositories/xpRepository.js
 *
 * Raw SQL for the xp_ledger table.
 * Append-only: NEVER UPDATE or DELETE rows — the ledger is the source of truth.
 * A user's total XP is always computed as SUM(delta) over their rows.
 */

const { query } = require('../config/db');

// ---------------------------------------------------------------------------
// Per-user queries
// ---------------------------------------------------------------------------

/**
 * insertXpEvent
 *
 * Appends one XP event to the ledger.
 *
 * @param {string}      userId
 * @param {number}      delta   - XP amount (positive = gain, negative = future penalty)
 * @param {string}      reason  - 'lesson_complete' | 'badge_award' | 'streak_bonus'
 * @param {string|null} refId   - associated entity id (lesson_id, badge_id, …) or null
 * @returns {Promise<object>} the inserted ledger row
 */
async function insertXpEvent(userId, delta, reason, refId = null) {
  const result = await query(
    `INSERT INTO xp_ledger (user_id, delta, reason, ref_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, delta, reason, ref_id, created_at`,
    [userId, delta, reason, refId],
  );
  return result.rows[0];
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
