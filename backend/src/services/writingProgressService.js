/**
 * services/writingProgressService.js
 *
 * Style F (progress-aware feedback) data source. Scans the user's last
 * N completed submissions for recurring error patterns so the drawer
 * can show things like "You've flagged this tense issue 8 times in
 * the last month."
 *
 * Two pattern kinds:
 *   - error_type — count distinct submissions featuring each
 *     sentence_correction.error_type. Threshold: ≥ 5 submissions.
 *   - issue     — stem the first chunk of `explanation` text; count
 *     distinct submissions featuring each stem. Threshold: ≥ 3.
 *
 * Returns up to 3 patterns ranked by occurrences DESC. If the user has
 * fewer than 10 completed submissions, returns insufficient_data=true
 * with an empty patterns array.
 */

"use strict";

const writingRepository = require("../repositories/writingRepository");

const HISTORY_LIMIT = 30;
const MIN_SUBMISSIONS_FOR_ANALYSIS = 10;
const ERROR_TYPE_THRESHOLD = 5;
const ISSUE_STEM_THRESHOLD = 3;
const TOP_N = 3;

function normalizeStem(text) {
  if (typeof text !== "string") return "";
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join(" ");
}

/**
 * Build the progress context for a user.
 *
 * @param {string} userId
 * @returns {Promise<{insufficient_data: boolean, patterns: object[], sample_size: number}>}
 */
async function getProgressContext(userId) {
  const submissions = await writingRepository.getRecentCompletedWithFeedback(userId, HISTORY_LIMIT);

  if (submissions.length < MIN_SUBMISSIONS_FOR_ANALYSIS) {
    return { insufficient_data: true, patterns: [], sample_size: submissions.length };
  }

  // Per error_type: submissions seen, first/last date, example explanation.
  const errorStats = new Map();
  // Per issue stem.
  const stemStats = new Map();

  for (const sub of submissions) {
    const corrections = Array.isArray(sub.feedback_json?.sentence_corrections)
      ? sub.feedback_json.sentence_corrections
      : [];
    if (corrections.length === 0) continue;

    const seenTypes = new Set();
    const seenStems = new Set();

    for (const c of corrections) {
      if (c?.error_type && typeof c.error_type === "string") seenTypes.add(c.error_type);
      const stem = normalizeStem(c?.explanation);
      if (stem && stem.split(/\s+/).length >= 2) seenStems.add(stem);
    }

    for (const t of seenTypes) {
      const s = errorStats.get(t) ?? { type: t, occurrences: 0, first: sub.created_at, last: sub.created_at, example: null };
      s.occurrences += 1;
      if (new Date(sub.created_at) < new Date(s.first)) s.first = sub.created_at;
      if (new Date(sub.created_at) > new Date(s.last)) s.last = sub.created_at;
      if (!s.example) {
        const match = corrections.find((c) => c?.error_type === t && typeof c.explanation === "string");
        if (match) s.example = match.explanation;
      }
      errorStats.set(t, s);
    }

    for (const stem of seenStems) {
      const s = stemStats.get(stem) ?? { stem, occurrences: 0, first: sub.created_at, last: sub.created_at, example: null };
      s.occurrences += 1;
      if (new Date(sub.created_at) < new Date(s.first)) s.first = sub.created_at;
      if (new Date(sub.created_at) > new Date(s.last)) s.last = sub.created_at;
      if (!s.example) {
        const match = corrections.find((c) => normalizeStem(c?.explanation) === stem);
        if (match) s.example = match.explanation;
      }
      stemStats.set(stem, s);
    }
  }

  const errorPatterns = [...errorStats.values()]
    .filter((s) => s.occurrences >= ERROR_TYPE_THRESHOLD)
    .map((s) => ({
      pattern_type: "error_type",
      error_type: s.type,
      occurrences: s.occurrences,
      first_seen_date: s.first,
      last_seen_date: s.last,
      example_issue: s.example,
    }));

  const stemPatterns = [...stemStats.values()]
    .filter((s) => s.occurrences >= ISSUE_STEM_THRESHOLD)
    .map((s) => ({
      pattern_type: "issue",
      stem: s.stem,
      occurrences: s.occurrences,
      first_seen_date: s.first,
      last_seen_date: s.last,
      example_issue: s.example,
    }));

  const patterns = [...errorPatterns, ...stemPatterns]
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, TOP_N);

  return { insufficient_data: false, patterns, sample_size: submissions.length };
}

module.exports = {
  getProgressContext,
  // exported for tests
  MIN_SUBMISSIONS_FOR_ANALYSIS,
  ERROR_TYPE_THRESHOLD,
  ISSUE_STEM_THRESHOLD,
};
