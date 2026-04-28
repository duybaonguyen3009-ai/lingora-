/**
 * repositories/userRepository.js
 *
 * User-related queries beyond auth (band tracking, profile updates).
 */

const { query } = require("../config/db");
const { calculateEma, isValidSkill } = require("../domain/bandEstimate");

// Maps the skill string to the per-skill column added in migration 0044.
// Listening is intentionally NOT mapped: Phase 1B.2 (listening logic) is
// paused — no caller writes "listening", and the column stays NULL.
const SKILL_COLUMN = Object.freeze({
  reading:  "band_estimate_reading",
  writing:  "band_estimate_writing",
  speaking: "band_estimate_speaking",
});

/**
 * Update the user's band estimate after a scored session.
 *
 * Two writes happen in one statement:
 *   1. Legacy: append to band_history (last 10) and recompute estimated_band
 *      as the avg of the last 5 entries (any skill). Kept for backward
 *      compat — readers in profile/battle/passage selection still consume
 *      `estimated_band`.
 *   2. Per-skill: EMA-update the matching `band_estimate_<skill>` column
 *      so Reading scores no longer contaminate Writing/Speaking displays.
 *
 * Listening writes are silently skipped (column stays NULL) until the
 * listening feature ships.
 *
 * @param {string} userId
 * @param {number} newBand - the band score from this session (e.g., 6.5)
 * @param {string} skill   - 'reading' | 'writing' | 'speaking'
 * @param {string} refId   - submission or session UUID
 * @returns {Promise<{ estimatedBand: number, historyLength: number, skillBand: number|null }|undefined>}
 */
async function updateUserBand(userId, newBand, skill, refId) {
  if (newBand == null || Number.isNaN(Number(newBand))) return;

  const bandNum = Number(newBand);
  if (bandNum < 0 || bandNum > 9) return;

  // Fetch current history + per-skill column in a single round-trip.
  const skillCol = SKILL_COLUMN[skill] ?? null;
  const selectCols = skillCol
    ? `band_history, ${skillCol} AS skill_band`
    : `band_history, NULL::numeric AS skill_band`;

  const userRow = await query(
    `SELECT ${selectCols} FROM users WHERE id = $1`,
    [userId],
  );
  if (userRow.rows.length === 0) return;

  const currentHistory = userRow.rows[0].band_history || [];
  const oldSkillBand   = userRow.rows[0].skill_band == null
    ? null
    : Number(userRow.rows[0].skill_band);

  // Legacy aggregate (kept for FE displays + battle matchmaking).
  const newEntry = {
    band:       bandNum,
    skill,
    session_id: refId,
    scored_at:  new Date().toISOString(),
  };
  const updatedHistory = [...currentHistory, newEntry].slice(-10);
  const recentEntries  = updatedHistory.slice(-5);
  const avgBand        = recentEntries.reduce((s, e) => s + e.band, 0) / recentEntries.length;
  const estimatedBand  = Math.round(avgBand * 2) / 2; // nearest 0.5

  // Per-skill EMA — only when the skill is one we track (reading/writing/speaking).
  let nextSkillBand = null;
  if (skillCol && isValidSkill(skill)) {
    nextSkillBand = calculateEma(oldSkillBand, bandNum);
  }

  // Single UPDATE: legacy + (optional) per-skill column.
  if (skillCol) {
    await query(
      `UPDATE users SET
         estimated_band = $2,
         band_history   = $3,
         ${skillCol}    = $4,
         updated_at     = now()
       WHERE id = $1`,
      [userId, estimatedBand, JSON.stringify(updatedHistory), nextSkillBand],
    );
  } else {
    await query(
      `UPDATE users SET
         estimated_band = $2,
         band_history   = $3,
         updated_at     = now()
       WHERE id = $1`,
      [userId, estimatedBand, JSON.stringify(updatedHistory)],
    );
  }

  return {
    estimatedBand,
    historyLength: updatedHistory.length,
    skillBand:     nextSkillBand,
  };
}

module.exports = { updateUserBand };
