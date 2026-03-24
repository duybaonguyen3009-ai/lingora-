/**
 * speechAnalyzer.js
 *
 * Analyzes speech flow from transcript text and optional frontend timing metadata.
 * Extracts real signals: filler words, self-corrections, repetition, fragmentation.
 * When frontend provides speechMetrics (timing data), also uses: WPM, pause count,
 * speaking ratio.
 *
 * This is NOT fake audio intelligence — it operates on real measurable signals.
 */

"use strict";

// ---------------------------------------------------------------------------
// Filler word patterns — common English speech disfluencies
// ---------------------------------------------------------------------------

// These must be matched as standalone words (word boundaries)
const FILLER_WORDS = [
  "um", "uh", "uhh", "umm", "hmm",
  "er", "err", "ah", "ahh",
];

// These are filler PHRASES that indicate hesitation in speech context
const FILLER_PHRASES = [
  "you know",
  "I mean",
  "sort of",
  "kind of",
  "basically",
  "actually",
  "like",        // only counted in filler positions (see below)
];

// "like" is tricky — it's a filler when used as discourse marker, not comparison.
// We count it only when surrounded by commas or at start of clause.
const LIKE_FILLER_RE = /(?:^|,\s*)\blike\b(?:\s*,|$)/gi;

// ---------------------------------------------------------------------------
// Self-correction patterns
// ---------------------------------------------------------------------------

const SELF_CORRECTION_PATTERNS = [
  /\bI mean\b/gi,
  /\bsorry\b.*\bI meant\b/gi,
  /\bno(?:,| )?\s*(?:wait|actually)\b/gi,
  /\bwhat I (?:meant|mean) (?:is|was)\b/gi,
  /\blet me (?:rephrase|say that again)\b/gi,
];

// Repeated sentence starts: same 2+ words appearing at start of consecutive sentences
function countRepeatedStarts(sentences) {
  let count = 0;
  for (let i = 1; i < sentences.length; i++) {
    const prev = sentences[i - 1].trim().split(/\s+/).slice(0, 2).join(" ").toLowerCase();
    const curr = sentences[i].trim().split(/\s+/).slice(0, 2).join(" ").toLowerCase();
    if (prev && curr && prev === curr) count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Main analysis function
// ---------------------------------------------------------------------------

/**
 * Analyze speech flow from transcript and optional timing metadata.
 *
 * @param {string} text - The user's spoken text (transcript)
 * @param {object|null} speechMetrics - Optional frontend timing data:
 *   { totalDurationMs, wordsPerMinute, pauseCount, longestPauseMs, segmentCount, speakingRatio }
 * @returns {object} Speech flow analysis
 */
function analyzeSpeechFlow(text, speechMetrics = null) {
  if (!text || typeof text !== "string") {
    return {
      fillerCount: 0,
      fillerWords: [],
      selfCorrectionCount: 0,
      repetitionRatio: 1.0,
      avgSentenceLength: 0,
      fragmentCount: 0,
      wordsPerMinute: null,
      pauseCount: null,
      longestPauseMs: null,
      speakingRatio: null,
      hesitationLevel: "unknown",
      fluencyEstimate: 50,
    };
  }

  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // ── Filler word detection ──
  const fillerWords = [];
  let fillerCount = 0;

  for (const filler of FILLER_WORDS) {
    const re = new RegExp(`\\b${filler}\\b`, "gi");
    const matches = text.match(re);
    if (matches) {
      fillerCount += matches.length;
      fillerWords.push(`${filler} (×${matches.length})`);
    }
  }

  // Count "you know" as a filler phrase
  const youKnowMatches = text.match(/\byou know\b/gi);
  if (youKnowMatches) {
    fillerCount += youKnowMatches.length;
    fillerWords.push(`you know (×${youKnowMatches.length})`);
  }

  // Count "basically" / "actually" only when they start a clause
  for (const phrase of ["basically", "actually"]) {
    const re = new RegExp(`(?:^|[.,;]\\s*)\\b${phrase}\\b`, "gi");
    const matches = text.match(re);
    if (matches) {
      fillerCount += matches.length;
      fillerWords.push(`${phrase} (×${matches.length})`);
    }
  }

  // "like" as filler
  const likeFillers = text.match(LIKE_FILLER_RE);
  if (likeFillers) {
    fillerCount += likeFillers.length;
    fillerWords.push(`like (×${likeFillers.length})`);
  }

  // ── Self-correction detection ──
  let selfCorrectionCount = 0;
  for (const pattern of SELF_CORRECTION_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) selfCorrectionCount += matches.length;
  }

  // ── Sentence analysis ──
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = Math.max(sentences.length, 1);
  const avgSentenceLength = wordCount / sentenceCount;

  // Fragments: sentences with fewer than 4 words
  const fragmentCount = sentences.filter(s => s.trim().split(/\s+/).filter(Boolean).length < 4).length;

  // Repeated starts
  const repeatedStarts = countRepeatedStarts(sentences);
  selfCorrectionCount += repeatedStarts;

  // ── Repetition ratio ── (unique words / total words — lower = more repetitive)
  const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^a-z']/g, "")));
  const repetitionRatio = wordCount > 0 ? uniqueWords.size / wordCount : 1.0;

  // ── Words per minute (from frontend metrics or null) ──
  const wordsPerMinute = speechMetrics?.wordsPerMinute ?? null;
  const pauseCount = speechMetrics?.pauseCount ?? null;
  const longestPauseMs = speechMetrics?.longestPauseMs ?? null;
  const speakingRatio = speechMetrics?.speakingRatio ?? null;

  // ── Hesitation level ──
  let hesitationScore = 0;

  // Text-based signals
  if (fillerCount >= 6) hesitationScore += 3;
  else if (fillerCount >= 3) hesitationScore += 2;
  else if (fillerCount >= 1) hesitationScore += 1;

  if (selfCorrectionCount >= 3) hesitationScore += 2;
  else if (selfCorrectionCount >= 1) hesitationScore += 1;

  if (fragmentCount >= 3) hesitationScore += 1;

  if (repetitionRatio < 0.4) hesitationScore += 2;
  else if (repetitionRatio < 0.6) hesitationScore += 1;

  // Timing-based signals (only if available)
  if (speechMetrics) {
    if (pauseCount !== null && pauseCount > 5) hesitationScore += 2;
    else if (pauseCount !== null && pauseCount > 3) hesitationScore += 1;

    if (speakingRatio !== null && speakingRatio < 0.4) hesitationScore += 2;
    else if (speakingRatio !== null && speakingRatio < 0.6) hesitationScore += 1;

    if (wordsPerMinute !== null && wordsPerMinute < 80) hesitationScore += 1;
    if (wordsPerMinute !== null && wordsPerMinute > 180) hesitationScore += 1; // too fast = not fluent either
  }

  const hesitationLevel =
    hesitationScore >= 5 ? "high" :
    hesitationScore >= 3 ? "medium" : "low";

  // ── Fluency estimate (0-100) ──
  // Start at 70, adjust based on signals
  let fluencyEstimate = 70;

  // Positive signals
  if (avgSentenceLength >= 12) fluencyEstimate += 10;
  else if (avgSentenceLength >= 8) fluencyEstimate += 5;

  if (repetitionRatio >= 0.7) fluencyEstimate += 5;

  if (speechMetrics) {
    if (wordsPerMinute >= 120 && wordsPerMinute <= 160) fluencyEstimate += 10; // ideal range
    if (speakingRatio >= 0.8) fluencyEstimate += 5;
  }

  // Negative signals
  fluencyEstimate -= fillerCount * 2;
  fluencyEstimate -= selfCorrectionCount * 3;
  fluencyEstimate -= fragmentCount * 2;

  if (speechMetrics) {
    if (pauseCount > 5) fluencyEstimate -= 10;
    else if (pauseCount > 3) fluencyEstimate -= 5;

    if (speakingRatio !== null && speakingRatio < 0.5) fluencyEstimate -= 10;
  }

  fluencyEstimate = Math.max(0, Math.min(100, fluencyEstimate));

  return {
    fillerCount,
    fillerWords,
    selfCorrectionCount,
    repetitionRatio: Math.round(repetitionRatio * 100) / 100,
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    fragmentCount,
    wordsPerMinute,
    pauseCount,
    longestPauseMs,
    speakingRatio,
    hesitationLevel,
    fluencyEstimate,
  };
}

/**
 * Aggregate speech flow analysis across multiple turns.
 *
 * @param {Array<{text: string, speechMetrics?: object}>} turns
 * @returns {object} Aggregated speech analysis
 */
function aggregateSpeechFlow(turns) {
  if (!turns || turns.length === 0) {
    return {
      totalFillerCount: 0,
      totalSelfCorrections: 0,
      avgRepetitionRatio: 1.0,
      avgSentenceLength: 0,
      totalFragments: 0,
      avgWordsPerMinute: null,
      totalPauseCount: null,
      avgSpeakingRatio: null,
      hesitationLevel: "unknown",
      fluencyEstimate: 50,
      fillerSummary: [],
    };
  }

  const analyses = turns.map(t => analyzeSpeechFlow(t.text, t.speechMetrics || null));

  const totalFillerCount = analyses.reduce((s, a) => s + a.fillerCount, 0);
  const totalSelfCorrections = analyses.reduce((s, a) => s + a.selfCorrectionCount, 0);
  const avgRepetitionRatio = analyses.reduce((s, a) => s + a.repetitionRatio, 0) / analyses.length;
  const avgSentenceLength = analyses.reduce((s, a) => s + a.avgSentenceLength, 0) / analyses.length;
  const totalFragments = analyses.reduce((s, a) => s + a.fragmentCount, 0);

  // Aggregate timing metrics (only from turns that have them)
  const withTiming = analyses.filter(a => a.wordsPerMinute !== null);
  const avgWordsPerMinute = withTiming.length > 0
    ? Math.round(withTiming.reduce((s, a) => s + a.wordsPerMinute, 0) / withTiming.length)
    : null;

  const withPauses = analyses.filter(a => a.pauseCount !== null);
  const totalPauseCount = withPauses.length > 0
    ? withPauses.reduce((s, a) => s + a.pauseCount, 0)
    : null;

  const withRatio = analyses.filter(a => a.speakingRatio !== null);
  const avgSpeakingRatio = withRatio.length > 0
    ? Math.round((withRatio.reduce((s, a) => s + a.speakingRatio, 0) / withRatio.length) * 100) / 100
    : null;

  // Aggregate filler summary (deduplicate and sum)
  const fillerMap = new Map();
  for (const a of analyses) {
    for (const f of a.fillerWords) {
      const match = f.match(/^(.+?) \(×(\d+)\)$/);
      if (match) {
        const word = match[1];
        const count = parseInt(match[2], 10);
        fillerMap.set(word, (fillerMap.get(word) || 0) + count);
      }
    }
  }
  const fillerSummary = Array.from(fillerMap.entries())
    .map(([word, count]) => `${word} (×${count})`)
    .sort((a, b) => {
      const ca = parseInt(a.match(/×(\d+)/)?.[1] || "0", 10);
      const cb = parseInt(b.match(/×(\d+)/)?.[1] || "0", 10);
      return cb - ca;
    });

  // Overall hesitation and fluency
  const avgFluency = Math.round(analyses.reduce((s, a) => s + a.fluencyEstimate, 0) / analyses.length);

  const hesitationLevel =
    totalFillerCount >= 8 || totalSelfCorrections >= 4 ? "high" :
    totalFillerCount >= 4 || totalSelfCorrections >= 2 ? "medium" : "low";

  return {
    totalFillerCount,
    totalSelfCorrections,
    avgRepetitionRatio: Math.round(avgRepetitionRatio * 100) / 100,
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    totalFragments,
    avgWordsPerMinute,
    totalPauseCount,
    avgSpeakingRatio,
    hesitationLevel,
    fluencyEstimate: avgFluency,
    fillerSummary,
  };
}

module.exports = { analyzeSpeechFlow, aggregateSpeechFlow };
