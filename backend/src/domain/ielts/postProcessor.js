/**
 * LLM scoring output post-processor.
 *
 * Every AI scoring call passes through this module BEFORE the response
 * reaches the user. Enforces the "trust but verify" pattern from the
 * Examiner Hard Lock: LLM output is never shown raw.
 *
 * Pipeline:
 *   1. Safe JSON parse
 *   2. Schema validation (4 criteria present)
 *   3. Band clamping (0-9, step 0.5)
 *   4. Signal whitelist check (anti-hallucination)
 *   5. Evidence quote verification against source text
 *   6. Overall band recomputation
 *   7. Suggestion injection from rubric
 *
 * @module domain/ielts/postProcessor
 */

const {
  roundIELTSBand,
  clampToValidBand,
  calculateWritingBand,
  calculateSpeakingBand,
} = require('./scoring');
const {
  WRITING_CRITERIA,
  SPEAKING_CRITERIA,
  getAllValidSignals,
  getSuggestionsForBand,
} = require('./rubrics');

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} Evidence
 * @property {string}  quote     Exact substring from source
 * @property {string}  issue     Short issue description
 * @property {number}  [paragraph] 1-indexed paragraph number
 * @property {boolean} [invalid] True if quote not found in source
 */

/**
 * @typedef {Object} CriterionOutput
 * @property {number}            band
 * @property {string[]}          signals_triggered
 * @property {string[]}          suggestions
 * @property {Evidence[]}        evidence
 */

/**
 * @typedef {Object} WritingScoringOutput
 * @property {number}          overall
 * @property {CriterionOutput} TA
 * @property {CriterionOutput} CC
 * @property {CriterionOutput} LR
 * @property {CriterionOutput} GRA
 * @property {string}          lintopus_vi
 */

/**
 * @typedef {Object} SpeakingScoringOutput
 * @property {number}          overall
 * @property {CriterionOutput} FC
 * @property {CriterionOutput} LR
 * @property {CriterionOutput} GR
 * @property {CriterionOutput} P
 * @property {string}          lintopus_vi
 */

/**
 * @typedef {Object} ProcessResult
 * @property {boolean}                                         ok
 * @property {WritingScoringOutput | SpeakingScoringOutput}    [data]
 * @property {string}                                          [error]
 * @property {string[]}                                        [warnings]
 */

// ════════════════════════════════════════════════════════════════
// SAFE JSON PARSE
// ════════════════════════════════════════════════════════════════

/**
 * Parses LLM output, handling common wrappers (markdown code fences, leading text).
 *
 * @param {string} raw
 * @returns {object | null}
 */
function safeJsonParse(raw) {
  if (typeof raw !== 'string' || raw.trim().length === 0) return null;

  let text = raw.trim();

  // Strip markdown fences: ```json\n...\n``` or ```\n...\n```
  const fenceMatch = text.match(/^```(?:json)?\s*\n([\s\S]+?)\n```$/);
  if (fenceMatch) text = fenceMatch[1].trim();

  // Strip leading text before first { or [
  const firstBrace = text.search(/[{[]/);
  if (firstBrace > 0) text = text.slice(firstBrace);

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ════════════════════════════════════════════════════════════════
// SCHEMA VALIDATION
// ════════════════════════════════════════════════════════════════

/**
 * @param {unknown} data
 * @param {readonly string[]} criteriaCodes
 * @returns {string | null} Error message, or null if valid
 */
function validateSchema(data, criteriaCodes) {
  if (!data || typeof data !== 'object') return 'not_an_object';
  if (typeof data.lintopus_vi !== 'string' || data.lintopus_vi.length === 0) {
    return 'missing_lintopus_vi';
  }

  for (const code of criteriaCodes) {
    const c = data[code];
    if (!c || typeof c !== 'object') return `missing_criterion_${code}`;
    if (typeof c.band !== 'number') return `${code}_band_not_number`;
    if (!Array.isArray(c.signals_triggered)) return `${code}_signals_not_array`;
    if (!Array.isArray(c.evidence)) return `${code}_evidence_not_array`;
  }

  return null;
}

// ════════════════════════════════════════════════════════════════
// SIGNAL WHITELIST
// ════════════════════════════════════════════════════════════════

/**
 * Removes signals not in the rubric whitelist.
 * Returns { cleaned, hallucinated } — caller decides whether to warn.
 *
 * @param {string[]} signals
 * @returns {{ cleaned: string[], hallucinated: string[] }}
 */
function filterKnownSignals(signals) {
  const valid = getAllValidSignals();
  const cleaned = [];
  const hallucinated = [];
  for (const sig of signals) {
    if (typeof sig !== 'string') continue;
    if (valid.has(sig)) cleaned.push(sig);
    else hallucinated.push(sig);
  }
  return { cleaned, hallucinated };
}

// ════════════════════════════════════════════════════════════════
// EVIDENCE VERIFICATION
// ════════════════════════════════════════════════════════════════

/**
 * Verifies each evidence quote exists in the source text.
 * Normalizes whitespace before comparing (source and quote both).
 * Invalid quotes are MARKED, not removed — UI can still show the issue.
 *
 * @param {Evidence[]} evidence
 * @param {string}     sourceText
 * @returns {Evidence[]}
 */
function verifyEvidence(evidence, sourceText) {
  if (!Array.isArray(evidence)) return [];
  const normSource = normalizeForMatch(sourceText);
  return evidence.map((ev) => {
    if (!ev || typeof ev.quote !== 'string') {
      return { ...ev, invalid: true };
    }
    const normQuote = normalizeForMatch(ev.quote);
    const found = normQuote.length > 0 && normSource.includes(normQuote);
    return { ...ev, invalid: !found };
  });
}

/**
 * @param {string} s
 * @returns {string}
 */
function normalizeForMatch(s) {
  return String(s)
    .replace(/\s+/g, ' ')
    .replace(/[\u2018\u2019]/g, "'") // smart quotes
    .replace(/[\u201C\u201D]/g, '"')
    .trim()
    .toLowerCase();
}

// ════════════════════════════════════════════════════════════════
// MAIN PROCESSORS
// ════════════════════════════════════════════════════════════════

/**
 * Processes raw LLM output for Writing scoring.
 *
 * @param {string} rawLlmOutput
 * @param {string} sourceEssay
 * @returns {ProcessResult}
 */
function processWritingOutput(rawLlmOutput, sourceEssay) {
  const warnings = [];

  // Stage 1: parse
  const parsed = safeJsonParse(rawLlmOutput);
  if (!parsed) return { ok: false, error: 'json_parse_failed' };

  // Stage 2: schema
  const schemaErr = validateSchema(parsed, ['TA', 'CC', 'LR', 'GRA']);
  if (schemaErr) return { ok: false, error: schemaErr };

  // Stage 3-6: per-criterion processing
  const criteria = ['TA', 'CC', 'LR', 'GRA'];
  /** @type {Record<string, CriterionOutput>} */
  const result = {};

  for (const code of criteria) {
    const raw = parsed[code];
    const rubric = WRITING_CRITERIA[code];

    const clampedBand = clampToValidBand(raw.band);
    if (clampedBand !== raw.band) warnings.push(`${code}_band_clamped`);

    const { cleaned: validSignals, hallucinated } = filterKnownSignals(raw.signals_triggered);
    if (hallucinated.length > 0) {
      warnings.push(`${code}_hallucinated_signals:${hallucinated.join(',')}`);
    }

    const verifiedEvidence = verifyEvidence(raw.evidence, sourceEssay);
    const invalidCount = verifiedEvidence.filter((e) => e.invalid).length;
    if (invalidCount > 0) warnings.push(`${code}_invalid_quotes:${invalidCount}`);

    // Suggestions come from rubric, not LLM — deterministic
    const suggestions = getSuggestionsForBand(rubric, clampedBand);

    result[code] = {
      band: clampedBand,
      signals_triggered: validSignals,
      suggestions: [...suggestions],
      evidence: verifiedEvidence,
    };
  }

  // Stage 7: recompute overall
  const overall = calculateWritingBand({
    taskResponse: result.TA.band,
    coherence: result.CC.band,
    lexical: result.LR.band,
    grammar: result.GRA.band,
  });

  const lintopus = typeof parsed.lintopus_vi === 'string' ? parsed.lintopus_vi.trim() : '';

  return {
    ok: true,
    data: {
      overall,
      TA: result.TA,
      CC: result.CC,
      LR: result.LR,
      GRA: result.GRA,
      lintopus_vi: lintopus,
    },
    warnings,
  };
}

/**
 * Processes raw LLM output for Speaking scoring.
 *
 * @param {string} rawLlmOutput
 * @param {string} sourceTranscript
 * @returns {ProcessResult}
 */
function processSpeakingOutput(rawLlmOutput, sourceTranscript) {
  const warnings = [];

  const parsed = safeJsonParse(rawLlmOutput);
  if (!parsed) return { ok: false, error: 'json_parse_failed' };

  const schemaErr = validateSchema(parsed, ['FC', 'LR', 'GR', 'P']);
  if (schemaErr) return { ok: false, error: schemaErr };

  const criteria = ['FC', 'LR', 'GR', 'P'];
  const result = {};

  for (const code of criteria) {
    const raw = parsed[code];
    const rubric = SPEAKING_CRITERIA[code];

    const clampedBand = clampToValidBand(raw.band);
    if (clampedBand !== raw.band) warnings.push(`${code}_band_clamped`);

    const { cleaned: validSignals, hallucinated } = filterKnownSignals(raw.signals_triggered);
    if (hallucinated.length > 0) {
      warnings.push(`${code}_hallucinated_signals:${hallucinated.join(',')}`);
    }

    const verifiedEvidence = verifyEvidence(raw.evidence, sourceTranscript);
    const invalidCount = verifiedEvidence.filter((e) => e.invalid).length;
    if (invalidCount > 0) warnings.push(`${code}_invalid_quotes:${invalidCount}`);

    const suggestions = getSuggestionsForBand(rubric, clampedBand);

    result[code] = {
      band: clampedBand,
      signals_triggered: validSignals,
      suggestions: [...suggestions],
      evidence: verifiedEvidence,
    };
  }

  const overall = calculateSpeakingBand({
    fluency: result.FC.band,
    lexical: result.LR.band,
    grammar: result.GR.band,
    pronunciation: result.P.band,
  });

  const lintopus = typeof parsed.lintopus_vi === 'string' ? parsed.lintopus_vi.trim() : '';

  return {
    ok: true,
    data: {
      overall,
      FC: result.FC,
      LR: result.LR,
      GR: result.GR,
      P: result.P,
      lintopus_vi: lintopus,
    },
    warnings,
  };
}

// ════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════

module.exports = {
  safeJsonParse,
  validateSchema,
  filterKnownSignals,
  verifyEvidence,
  processWritingOutput,
  processSpeakingOutput,
};
