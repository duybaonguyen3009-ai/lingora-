/**
 * IELTS band score calculation and raw-to-band conversion.
 *
 * All formulas follow the official IELTS band descriptors and published
 * conversion tables. If IELTS changes the rubric, update this file and
 * bump tests in the same commit.
 *
 * @module domain/ielts/scoring
 */

// ════════════════════════════════════════════════════════════════
// IELTS ROUNDING
// ════════════════════════════════════════════════════════════════

/**
 * Rounds a raw band average to an official IELTS band score.
 *
 * IELTS rounding convention:
 *   [x.00, x.25) → x.0
 *   [x.25, x.75) → x.5
 *   [x.75, (x+1).00] → (x+1).0
 *
 * Examples:
 *   6.00 → 6.0
 *   6.124 → 6.0
 *   6.25 → 6.5   (boundary rounds up)
 *   6.49 → 6.5
 *   6.50 → 6.5
 *   6.74 → 6.5
 *   6.75 → 7.0   (boundary rounds up)
 *   6.99 → 7.0
 *
 * @param {number} raw Raw average in range [0, 9]
 * @returns {number} Official band score (0.0–9.0, step 0.5)
 * @throws {TypeError} If input is not a finite number
 * @throws {RangeError} If input is out of range
 */
function roundIELTSBand(raw) {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    throw new TypeError(`roundIELTSBand: expected finite number, got ${raw}`);
  }
  if (raw < 0 || raw > 9) {
    throw new RangeError(`roundIELTSBand: out of range [0,9]: ${raw}`);
  }

  const whole = Math.floor(raw);
  const fraction = raw - whole;

  if (fraction < 0.25) return whole;
  if (fraction < 0.75) return whole + 0.5;
  return whole + 1;
}

/**
 * Validates that a band is a valid IELTS score (0.0–9.0, step 0.5).
 *
 * @param {number} band
 * @returns {boolean}
 */
function isValidBand(band) {
  if (typeof band !== 'number' || !Number.isFinite(band)) return false;
  if (band < 0 || band > 9) return false;
  return band * 2 === Math.round(band * 2);
}

/**
 * Clamps any number to the nearest valid IELTS band.
 * Used as a post-processing safety net for LLM outputs.
 *
 * @param {number} band
 * @returns {number} A valid band in [0, 9] with step 0.5
 */
function clampToValidBand(band) {
  if (typeof band !== 'number' || !Number.isFinite(band)) return 0;
  if (band < 0) return 0;
  if (band > 9) return 9;
  return Math.round(band * 2) / 2;
}

// ════════════════════════════════════════════════════════════════
// OVERALL BAND
// ════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} FourSkillBands
 * @property {number} listening 0.0–9.0, step 0.5
 * @property {number} reading   0.0–9.0, step 0.5
 * @property {number} writing   0.0–9.0, step 0.5
 * @property {number} speaking  0.0–9.0, step 0.5
 */

/**
 * Computes overall IELTS band from 4 skill bands.
 * Overall = average of 4 skills, rounded with IELTS convention.
 *
 * @param {FourSkillBands} bands
 * @returns {number}
 */
function calculateOverallBand(bands) {
  if (!bands || typeof bands !== 'object') {
    throw new TypeError('calculateOverallBand: expected object');
  }
  const { listening, reading, writing, speaking } = bands;
  for (const [key, val] of Object.entries({ listening, reading, writing, speaking })) {
    if (!isValidBand(val)) {
      throw new RangeError(`calculateOverallBand: invalid ${key} band: ${val}`);
    }
  }
  const avg = (listening + reading + writing + speaking) / 4;
  return roundIELTSBand(avg);
}

// ════════════════════════════════════════════════════════════════
// WRITING CRITERIA
// ════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} WritingCriteria
 * @property {number} taskResponse Task Achievement (T1) / Task Response (T2)
 * @property {number} coherence    Coherence & Cohesion
 * @property {number} lexical      Lexical Resource
 * @property {number} grammar      Grammatical Range & Accuracy
 */

/**
 * @param {WritingCriteria} c
 * @returns {number}
 */
function calculateWritingBand(c) {
  if (!c || typeof c !== 'object') {
    throw new TypeError('calculateWritingBand: expected object');
  }
  const { taskResponse, coherence, lexical, grammar } = c;
  for (const [key, val] of Object.entries({ taskResponse, coherence, lexical, grammar })) {
    if (!isValidBand(val)) {
      throw new RangeError(`calculateWritingBand: invalid ${key}: ${val}`);
    }
  }
  const avg = (taskResponse + coherence + lexical + grammar) / 4;
  return roundIELTSBand(avg);
}

// ════════════════════════════════════════════════════════════════
// SPEAKING CRITERIA
// ════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} SpeakingCriteria
 * @property {number} fluency       Fluency & Coherence
 * @property {number} lexical       Lexical Resource
 * @property {number} grammar       Grammatical Range & Accuracy
 * @property {number} pronunciation Pronunciation
 */

/**
 * @param {SpeakingCriteria} c
 * @returns {number}
 */
function calculateSpeakingBand(c) {
  if (!c || typeof c !== 'object') {
    throw new TypeError('calculateSpeakingBand: expected object');
  }
  const { fluency, lexical, grammar, pronunciation } = c;
  for (const [key, val] of Object.entries({ fluency, lexical, grammar, pronunciation })) {
    if (!isValidBand(val)) {
      throw new RangeError(`calculateSpeakingBand: invalid ${key}: ${val}`);
    }
  }
  const avg = (fluency + lexical + grammar + pronunciation) / 4;
  return roundIELTSBand(avg);
}

// ════════════════════════════════════════════════════════════════
// RAW → BAND CONVERSION TABLES
// ════════════════════════════════════════════════════════════════

// Published by IDP/BC. Sparse tables — gaps filled by ceil-to-next-match rule.

/** @type {Readonly<Record<number, number>>} */
const READING_ACADEMIC_TABLE = Object.freeze({
  40: 9, 39: 9,
  38: 8.5, 37: 8.5,
  36: 8, 35: 8,
  34: 7.5, 33: 7.5,
  32: 7, 31: 7, 30: 7,
  29: 6.5, 28: 6.5, 27: 6.5,
  26: 6, 25: 6, 24: 6, 23: 6,
  22: 5.5, 21: 5.5, 20: 5.5, 19: 5.5,
  18: 5, 17: 5, 16: 5, 15: 5,
  14: 4.5, 13: 4.5,
  12: 4, 11: 4, 10: 4,
  9: 3.5, 8: 3.5,
  7: 3, 6: 3,
  5: 2.5, 4: 2.5,
  3: 2, 2: 2,
  1: 1, 0: 0,
});

/** @type {Readonly<Record<number, number>>} */
const READING_GENERAL_TABLE = Object.freeze({
  40: 9,
  39: 8.5,
  38: 8, 37: 8,
  36: 7.5,
  35: 7, 34: 7,
  33: 6.5, 32: 6.5,
  31: 6, 30: 6,
  29: 5.5, 28: 5.5, 27: 5.5,
  26: 5, 25: 5, 24: 5, 23: 5,
  22: 4.5, 21: 4.5, 20: 4.5, 19: 4.5,
  18: 4, 17: 4, 16: 4, 15: 4,
  14: 3.5, 13: 3.5, 12: 3.5,
  11: 3, 10: 3, 9: 3,
  8: 2.5, 7: 2.5,
  6: 2, 5: 2, 4: 2,
  3: 1.5, 2: 1.5, 1: 1,
  0: 0,
});

/** @type {Readonly<Record<number, number>>} */
const LISTENING_TABLE = Object.freeze({
  40: 9, 39: 9,
  38: 8.5, 37: 8.5,
  36: 8, 35: 8,
  34: 7.5, 33: 7.5, 32: 7.5,
  31: 7, 30: 7,
  29: 6.5, 28: 6.5, 27: 6.5, 26: 6.5,
  25: 6, 24: 6, 23: 6,
  22: 5.5, 21: 5.5, 20: 5.5, 19: 5.5, 18: 5.5,
  17: 5, 16: 5,
  15: 4.5, 14: 4.5, 13: 4.5,
  12: 4, 11: 4, 10: 4,
  9: 3.5, 8: 3.5, 7: 3.5,
  6: 3, 5: 3,
  4: 2.5,
  3: 2, 2: 2,
  1: 1, 0: 0,
});

/**
 * Converts raw Reading score to IELTS band.
 *
 * @param {number} rawScore Number of correct answers (0–40)
 * @param {'academic' | 'general_training'} [testType='academic']
 * @returns {number} Band 0.0–9.0
 */
function readingRawToBand(rawScore, testType = 'academic') {
  if (!Number.isInteger(rawScore) || rawScore < 0 || rawScore > 40) {
    throw new RangeError(`readingRawToBand: raw must be int 0-40, got ${rawScore}`);
  }
  const table = testType === 'general_training' ? READING_GENERAL_TABLE : READING_ACADEMIC_TABLE;
  return table[rawScore];
}

/**
 * @param {number} rawScore 0–40
 * @returns {number}
 */
function listeningRawToBand(rawScore) {
  if (!Number.isInteger(rawScore) || rawScore < 0 || rawScore > 40) {
    throw new RangeError(`listeningRawToBand: raw must be int 0-40, got ${rawScore}`);
  }
  return LISTENING_TABLE[rawScore];
}

// ════════════════════════════════════════════════════════════════
// BAND → BATTLE TIER
// ════════════════════════════════════════════════════════════════

/**
 * @typedef {'iron' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master' | 'challenger'} BattleTier
 */

/**
 * Maps band to Battle tier for matchmaking.
 * Matches CLAUDE.md rule: matchmaking is same-tier only.
 *
 * @param {number} band
 * @returns {BattleTier}
 */
function bandToTier(band) {
  if (!isValidBand(band)) {
    throw new RangeError(`bandToTier: invalid band ${band}`);
  }
  if (band < 4) return 'iron';
  if (band < 4.5) return 'bronze';
  if (band < 5) return 'silver';
  if (band < 5.5) return 'gold';
  if (band < 6) return 'platinum';
  if (band < 6.5) return 'diamond';
  if (band < 7) return 'master';
  return 'challenger';
}

// ════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════

module.exports = {
  roundIELTSBand,
  isValidBand,
  clampToValidBand,
  calculateOverallBand,
  calculateWritingBand,
  calculateSpeakingBand,
  readingRawToBand,
  listeningRawToBand,
  bandToTier,
};
