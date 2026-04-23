/**
 * providers/ai/writingScoringMedian.js
 *
 * Aggregates N (1–3) validated scoring samples into a single stable result
 * using the median on every numeric band and the "closest-to-median"
 * sample's copy for free-text fields. sentence_corrections are merged
 * across all samples, deduplicated by `original` sentence, to give the
 * learner the richest set of corrections without repeating the same one.
 *
 * Rounding: IELTS scores are in 0.5 increments. For odd sample counts the
 * middle element already conforms. For even counts (2 samples) we average
 * then round to the nearest 0.5 so the result still matches IELTS grain.
 */

"use strict";

// Round to the nearest 0.5 — IELTS band grain.
function roundHalf(value) {
  return Math.round(value * 2) / 2;
}

/**
 * Median of an array of numbers. Sorts in-place of a local copy.
 * Returns the middle for odd lengths, the rounded-half average for even
 * lengths. Empty array returns null.
 */
function median(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const n = sorted.length;
  if (n % 2 === 1) return sorted[(n - 1) / 2];
  return roundHalf((sorted[n / 2 - 1] + sorted[n / 2]) / 2);
}

function pickClosest(samples, key, target) {
  let best = samples[0];
  let bestDistance = Math.abs(samples[0][key] - target);
  for (let i = 1; i < samples.length; i++) {
    const d = Math.abs(samples[i][key] - target);
    if (d < bestDistance) {
      best = samples[i];
      bestDistance = d;
    }
  }
  return best;
}

function dedupeByOriginal(arrays) {
  const seen = new Set();
  const out = [];
  for (const arr of arrays) {
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      if (!item || typeof item.original !== "string") continue;
      const key = item.original.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

/**
 * Produce one stable result from an array of successful samples.
 *
 * Numeric fields (overall_band + criteria.{task,coherence,lexical,grammar}.score)
 * are replaced with the median across samples.
 * Free-text fields (feedback, strengths, weaknesses, improvements, sample_essay,
 * feedback_cards, top_3_priorities, word_count_feedback, paragraph_analysis,
 * language_detected) are copied verbatim from the sample whose overall_band
 * sits closest to the median; ties resolve to the earliest sample.
 * sentence_corrections are merged across all samples with duplicates removed.
 *
 * @param {object[]} samples – non-empty array of already validated scoring objects
 * @returns {object}
 */
function aggregateSamples(samples) {
  if (!Array.isArray(samples) || samples.length === 0) {
    throw new Error("writingScoringMedian: samples must be a non-empty array");
  }

  const overallMedian = median(samples.map((s) => s.overall_band));

  const source = pickClosest(samples, "overall_band", overallMedian);

  const taskMedian = median(samples.map((s) => s.criteria.task.score));
  const coherenceMedian = median(samples.map((s) => s.criteria.coherence.score));
  const lexicalMedian = median(samples.map((s) => s.criteria.lexical.score));
  const grammarMedian = median(samples.map((s) => s.criteria.grammar.score));

  const mergedCorrections = dedupeByOriginal(samples.map((s) => s.sentence_corrections));

  // Preserve every field the source has, then override numeric bands and
  // the merged corrections list. Unknown/forward-compat fields survive.
  return {
    ...source,
    overall_band: overallMedian,
    criteria: {
      task:      { score: taskMedian,      feedback: source.criteria.task.feedback },
      coherence: { score: coherenceMedian, feedback: source.criteria.coherence.feedback },
      lexical:   { score: lexicalMedian,   feedback: source.criteria.lexical.feedback },
      grammar:   { score: grammarMedian,   feedback: source.criteria.grammar.feedback },
    },
    sentence_corrections: mergedCorrections,
  };
}

module.exports = { aggregateSamples, median, roundHalf };
