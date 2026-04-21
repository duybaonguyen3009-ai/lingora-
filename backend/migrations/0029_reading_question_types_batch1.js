/* eslint-disable camelcase */

/**
 * Migration 0029 — Expand reading_questions.type enum (batch 1).
 *
 * Existing (from 0018): 'mcq', 'tfng', 'matching'
 * Added here:           'ynng', 'matching_headings',
 *                       'sentence_completion', 'summary_completion'
 *
 * Payload shapes (stored in reading_questions.options jsonb):
 *
 *   mcq (existing):
 *     options        = { A: "...", B: "...", C: "...", D: "..." }
 *     correct_answer = "A" | "B" | "C" | "D"
 *
 *   tfng (existing):
 *     options        = null
 *     correct_answer = "TRUE" | "FALSE" | "NOT GIVEN"
 *
 *   matching (existing):
 *     options        = { A: "...", B: "...", ... }
 *     correct_answer = "A"
 *
 *   ynng (new, opinions-style T/F/NG):
 *     options        = null
 *     correct_answer = "Y" | "N" | "NG"       (case-insensitive scoring)
 *
 *   matching_headings (new):
 *     options = {
 *       headings:   [{ letter: "i", text: "The effects of X" }, ...],
 *       paragraphs: [{ label: "A" }, { label: "B" }, ...],
 *       correct_mapping: { A: "i", B: "iii", C: "ii", ... }
 *     }
 *     correct_answer = JSON.stringify(correct_mapping)  // convenience copy
 *     Scoring: 1 point per paragraph correctly matched; question contributes
 *              Object.keys(correct_mapping).length to `total`.
 *
 *   sentence_completion (new):
 *     options = {
 *       sentences: [
 *         { id: "s1", text_with_blank: "The ___ is red.", max_words: 2,
 *           correct_answers: ["apple", "red apple"] },
 *         ...
 *       ]
 *     }
 *     correct_answer = first sentence's first accepted answer (NOT NULL stub)
 *     Scoring: case-insensitive, trim whitespace, server enforces max_words
 *              (split on whitespace, reject if token count > max_words).
 *
 *   summary_completion (new):
 *     options = {
 *       summary_text_with_blanks: "The {{b1}} moves in {{b2}}.",
 *       word_bank: ["train", "tracks"],    // required when mode = 'with_bank'
 *       blanks: [
 *         { id: "b1", correct_answers: ["train"], max_words: 1 },
 *         { id: "b2", correct_answers: ["tracks"], max_words: 1 }
 *       ],
 *       mode: "with_bank" | "without_bank"
 *     }
 *     correct_answer = first blank's first accepted answer (NOT NULL stub)
 *     Scoring: per-blank, case-insensitive, trim, max_words enforced.
 *              with_bank: answer must also be present in word_bank.
 *
 * No data migration — existing rows are unaffected. Only the CHECK
 * constraint is replaced.
 */

exports.shorthands = undefined;

const ALL_TYPES = [
  "mcq",
  "tfng",
  "matching",
  "ynng",
  "matching_headings",
  "sentence_completion",
  "summary_completion",
];

const OLD_TYPES = ["mcq", "tfng", "matching"];

const quoted = (arr) => arr.map((t) => `'${t}'`).join(", ");

exports.up = (pgm) => {
  pgm.dropConstraint("reading_questions", "reading_questions_type_check");
  pgm.addConstraint("reading_questions", "reading_questions_type_check", {
    check: `type IN (${quoted(ALL_TYPES)})`,
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint("reading_questions", "reading_questions_type_check");
  pgm.addConstraint("reading_questions", "reading_questions_type_check", {
    check: `type IN (${quoted(OLD_TYPES)})`,
  });
};
