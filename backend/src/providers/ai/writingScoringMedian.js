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

function modeOf(values) {
  if (!values || values.length === 0) return null;
  const counts = new Map();
  let best = values[0];
  let bestCount = 0;
  for (const v of values) {
    if (v == null) continue;
    const n = (counts.get(v) ?? 0) + 1;
    counts.set(v, n);
    if (n > bestCount) { bestCount = n; best = v; }
  }
  return best;
}

/**
 * Merge sentence_corrections across samples, de-duplicated by the
 * original sentence (case-insensitive). For duplicates, the merged row
 * keeps the first sample's text fields but swaps in the most-common
 * error_type observed across all samples for that sentence.
 */
function mergeSentenceCorrections(arrays) {
  const groups = new Map(); // key → { first, errorTypes[] }
  for (const arr of arrays) {
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      if (!item || typeof item.original !== "string") continue;
      const key = item.original.trim().toLowerCase();
      if (!groups.has(key)) {
        groups.set(key, { first: item, errorTypes: [] });
      }
      if (typeof item.error_type === "string") {
        groups.get(key).errorTypes.push(item.error_type);
      }
    }
  }
  const out = [];
  for (const { first, errorTypes } of groups.values()) {
    const mostCommon = modeOf(errorTypes);
    out.push(mostCommon ? { ...first, error_type: mostCommon } : { ...first });
  }
  return out;
}

/**
 * Merge paragraph_analysis arrays across samples. The numeric score/feedback
 * come from the source sample (closest-to-median); the `icons` array is
 * unioned across all samples, deduplicated by (paragraph_number, icon.type),
 * so the learner sees every distinct signal the model noticed.
 */
function mergeParagraphAnalysis(sourceParagraphs, samples) {
  if (!Array.isArray(sourceParagraphs) || sourceParagraphs.length === 0) {
    return sourceParagraphs;
  }
  // Collect icons by paragraph_number across every sample.
  const iconsByPara = new Map(); // para# → Map<iconType, iconObj>
  for (const sample of samples) {
    const pas = Array.isArray(sample.paragraph_analysis) ? sample.paragraph_analysis : [];
    for (const para of pas) {
      if (!para || !Array.isArray(para.icons)) continue;
      const bucket = iconsByPara.get(para.paragraph_number) ?? new Map();
      for (const icon of para.icons) {
        if (!icon || typeof icon.type !== "string") continue;
        if (!bucket.has(icon.type)) bucket.set(icon.type, icon);
      }
      iconsByPara.set(para.paragraph_number, bucket);
    }
  }
  return sourceParagraphs.map((para) => {
    const bucket = iconsByPara.get(para?.paragraph_number);
    if (!bucket || bucket.size === 0) return para;
    return { ...para, icons: Array.from(bucket.values()) };
  });
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

  const mergedCorrections = mergeSentenceCorrections(samples.map((s) => s.sentence_corrections));
  const mergedParagraphs = mergeParagraphAnalysis(source.paragraph_analysis, samples);

  // Preserve every field the source has, then override numeric bands, the
  // merged corrections list, and the icon-enriched paragraph_analysis.
  // Unknown/forward-compat fields survive.
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
    paragraph_analysis: mergedParagraphs,
  };
}

module.exports = { aggregateSamples, median, roundHalf };
