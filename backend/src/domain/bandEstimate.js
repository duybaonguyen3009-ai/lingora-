/**
 * domain/bandEstimate.js
 *
 * Pure functions for IELTS band estimation. No DB, no API, no I/O.
 *
 * Why EMA (Exponential Moving Average) and not last-N average:
 *   - Reacts faster to genuine improvement than a fixed-window average.
 *   - Old scores fade smoothly instead of dropping out abruptly.
 *   - One number to persist per skill instead of a JSONB array.
 *
 * Formula:
 *   newBand = alpha * latestScore + (1 - alpha) * oldBand
 *   alpha = 0.3 → 30 % weight on the new attempt, 70 % on history.
 *
 * Cold start: when oldBand is null/undefined, the new estimate IS the
 * latest score (no smoothing yet — there is nothing to smooth against).
 *
 * Output is rounded to the nearest 0.5 (IELTS reports half-bands) and
 * clamped to [0, 9] (IELTS scale).
 */

const VALID_SKILLS = Object.freeze(["reading", "writing", "speaking", "listening"]);
const DEFAULT_ALPHA = 0.3;

/**
 * @param {number|null|undefined} oldBand  - previous EMA estimate, or null on cold start
 * @param {number}                newScore - latest band score from this session (0..9)
 * @param {number}                [alpha]  - smoothing factor in (0, 1]; default 0.3
 * @returns {number} rounded to nearest 0.5, clamped to [0, 9]
 */
function calculateEma(oldBand, newScore, alpha = DEFAULT_ALPHA) {
  if (newScore == null || Number.isNaN(Number(newScore))) {
    throw new Error("calculateEma: newScore must be a number");
  }
  if (!(alpha > 0 && alpha <= 1)) {
    throw new Error("calculateEma: alpha must be in (0, 1]");
  }

  const latest = clamp(Number(newScore), 0, 9);

  // Cold start — adopt the new score as the starting estimate.
  if (oldBand == null || Number.isNaN(Number(oldBand))) {
    return roundHalf(latest);
  }

  const old   = clamp(Number(oldBand), 0, 9);
  const blend = alpha * latest + (1 - alpha) * old;
  return roundHalf(clamp(blend, 0, 9));
}

function isValidSkill(skill) {
  return VALID_SKILLS.includes(skill);
}

// Internal helpers.
function clamp(n, lo, hi) {
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}
function roundHalf(n) {
  return Math.round(n * 2) / 2;
}

module.exports = {
  calculateEma,
  isValidSkill,
  VALID_SKILLS,
  DEFAULT_ALPHA,
};
