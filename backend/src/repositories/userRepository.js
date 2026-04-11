/**
 * repositories/userRepository.js
 *
 * User-related queries beyond auth (band tracking, profile updates).
 */

const { query } = require("../config/db");

/**
 * Update user's estimated band score and band history.
 *
 * - Appends new entry to band_history (keeps last 10)
 * - Recomputes estimated_band as average of last 5 entries
 *
 * @param {string} userId
 * @param {number} newBand — the band score from this session (e.g., 6.5)
 * @param {string} skill — 'writing' | 'speaking'
 * @param {string} refId — submission or session UUID
 */
async function updateUserBand(userId, newBand, skill, refId) {
  if (newBand == null || isNaN(newBand)) return;

  const bandNum = Number(newBand);
  if (bandNum < 0 || bandNum > 9) return;

  // Fetch current band_history
  const userRow = await query(
    `SELECT band_history FROM users WHERE id = $1`,
    [userId]
  );
  const currentHistory = userRow.rows[0]?.band_history || [];

  // Append new entry, keep last 10
  const newEntry = {
    band: bandNum,
    skill,
    session_id: refId,
    scored_at: new Date().toISOString(),
  };
  const updatedHistory = [...currentHistory, newEntry].slice(-10);

  // Compute estimated band from last 5 entries
  const recentEntries = updatedHistory.slice(-5);
  const avgBand = recentEntries.reduce((sum, e) => sum + e.band, 0) / recentEntries.length;
  const estimatedBand = Math.round(avgBand * 2) / 2; // Round to nearest 0.5

  await query(
    `UPDATE users SET
       estimated_band = $2,
       band_history = $3,
       updated_at = now()
     WHERE id = $1`,
    [userId, estimatedBand, JSON.stringify(updatedHistory)]
  );

  return { estimatedBand, historyLength: updatedHistory.length };
}

module.exports = { updateUserBand };
