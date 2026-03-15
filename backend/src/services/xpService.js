/**
 * services/xpService.js
 *
 * XP award logic and level computation.
 * No DB access here — delegates to xpRepository.
 */

const { insertXpEvent, getTotalXp } = require('../repositories/xpRepository');

// ---------------------------------------------------------------------------
// Level thresholds
// ---------------------------------------------------------------------------

/**
 * XP required to *reach* each level.
 * Index = level number (0–10).  Value = cumulative XP floor for that level.
 * Level 10 is the cap; xpToNextLevel will be 0 at max level.
 */
const LEVEL_THRESHOLDS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000];

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * computeLevel
 *
 * Given a totalXp value, returns the current level and progress within it.
 * Pure function — no DB access.
 *
 * @param {number} totalXp
 * @returns {{ level: number, xpInLevel: number, xpToNextLevel: number }}
 */
function computeLevel(totalXp) {
  let level = 0;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) {
      level = i;
      break;
    }
  }

  const xpFloor   = LEVEL_THRESHOLDS[level];
  const xpCeiling = LEVEL_THRESHOLDS[level + 1] ?? null; // null = max level reached

  return {
    level,
    xpInLevel:    totalXp - xpFloor,
    xpToNextLevel: xpCeiling != null ? xpCeiling - totalXp : 0,
  };
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * awardXp
 *
 * Appends one XP event to the ledger and returns the inserted row.
 *
 * @param {string}      userId
 * @param {number}      delta
 * @param {string}      reason
 * @param {string|null} [refId]
 * @returns {Promise<object>}
 */
async function awardXp(userId, delta, reason, refId = null) {
  return insertXpEvent(userId, delta, reason, refId);
}

/**
 * getXpSummary
 *
 * Returns total XP plus level information for a user.
 *
 * @param {string} userId
 * @returns {Promise<{ totalXp: number, level: number, xpInLevel: number, xpToNextLevel: number }>}
 */
async function getXpSummary(userId) {
  const totalXp = await getTotalXp(userId);
  const { level, xpInLevel, xpToNextLevel } = computeLevel(totalXp);
  return { totalXp, level, xpInLevel, xpToNextLevel };
}

module.exports = { LEVEL_THRESHOLDS, computeLevel, awardXp, getXpSummary };
