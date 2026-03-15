/**
 * mockSpeech.js
 *
 * Deterministic mock pronunciation scorer for development.
 * Generates realistic-looking scores based on the reference text.
 * No external APIs called — fully offline.
 */

// Simple phoneme map for common English sounds (simplified).
const PHONEME_MAP = {
  a: ["ae"],
  b: ["b"],
  c: ["k"],
  d: ["d"],
  e: ["eh"],
  f: ["f"],
  g: ["g"],
  h: ["hh"],
  i: ["ih"],
  j: ["jh"],
  k: ["k"],
  l: ["l"],
  m: ["m"],
  n: ["n"],
  o: ["ao"],
  p: ["p"],
  q: ["k", "w"],
  r: ["r"],
  s: ["s"],
  t: ["t"],
  u: ["ah"],
  v: ["v"],
  w: ["w"],
  x: ["k", "s"],
  y: ["y"],
  z: ["z"],
  th: ["th"],
  sh: ["sh"],
  ch: ["ch"],
  ng: ["ng"],
};

/**
 * Deterministic hash from a string → number in [0, 1).
 * @param {string} str
 * @param {number} seed
 * @returns {number}
 */
function hash(str, seed = 0) {
  let h = seed;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h % 1000) / 1000;
}

/**
 * Generate simplified phonemes for a word.
 * @param {string} word
 * @returns {string[]}
 */
function wordToPhonemes(word) {
  const lower = word.toLowerCase().replace(/[^a-z]/g, "");
  const phonemes = [];
  let i = 0;
  while (i < lower.length) {
    // Check two-char phonemes first
    const digraph = lower.slice(i, i + 2);
    if (PHONEME_MAP[digraph]) {
      phonemes.push(...PHONEME_MAP[digraph]);
      i += 2;
    } else if (PHONEME_MAP[lower[i]]) {
      phonemes.push(...PHONEME_MAP[lower[i]]);
      i += 1;
    } else {
      i += 1;
    }
  }
  return phonemes.length > 0 ? phonemes : ["ah"];
}

/**
 * @param {string} _audioUrl   – ignored in mock
 * @param {string} referenceText
 * @param {string} [_language]
 * @returns {Promise<import('./speechProvider').PronunciationResult>}
 */
async function assessPronunciation(_audioUrl, referenceText, _language = "en-US") {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 200));

  const rawWords = referenceText.trim().split(/\s+/).filter(Boolean);

  let offsetMs = 0;
  const words = rawWords.map((word, wi) => {
    const phonemes = wordToPhonemes(word);
    const phonemeDetails = phonemes.map((phoneme, pi) => {
      const seed = wi * 100 + pi;
      const score = Math.round(60 + hash(word + phoneme, seed) * 40);
      const duration = Math.round(40 + hash(phoneme, seed + 1) * 80);
      const detail = { phoneme, score, offset: offsetMs, duration };
      offsetMs += duration;
      return detail;
    });

    const wordScore = Math.round(
      phonemeDetails.reduce((sum, p) => sum + p.score, 0) / phonemeDetails.length
    );

    return { word, score: wordScore, phonemes: phonemeDetails };
  });

  // Compute subscores deterministically
  const avgWordScore =
    words.reduce((sum, w) => sum + w.score, 0) / (words.length || 1);

  const baseScore = Math.round(avgWordScore);
  const accuracyScore = Math.min(100, Math.round(baseScore + hash(referenceText, 1) * 10 - 5));
  const fluencyScore = Math.min(100, Math.round(baseScore + hash(referenceText, 2) * 12 - 6));
  const completenessScore = Math.min(100, Math.round(baseScore + hash(referenceText, 3) * 8));
  const pronunciationScore = Math.min(100, Math.round(baseScore + hash(referenceText, 4) * 10 - 3));
  const overallScore = Math.round(
    (accuracyScore + fluencyScore + completenessScore + pronunciationScore) / 4
  );

  return {
    overallScore,
    accuracyScore,
    fluencyScore,
    completenessScore,
    pronunciationScore,
    words,
  };
}

module.exports = { assessPronunciation };
