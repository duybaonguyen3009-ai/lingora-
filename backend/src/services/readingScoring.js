/**
 * services/readingScoring.js
 *
 * Pure scoring functions for IELTS reading question types. No DB access.
 *
 * Type-specific scoring rules:
 *   mcq / tfng / ynng / matching       → 1 pt if exact normalized match.
 *   matching_headings, matching_information,
 *   matching_features, matching_sentence_endings
 *                                      → per-key correct_mapping. 1 pt per
 *                                        correctly placed key. Max = key count.
 *   sentence_completion                → per-blank, case-insensitive trim,
 *                                        rejects if tokens > max_words.
 *   summary_completion                 → per-blank. When mode='with_bank' the
 *                                        answer must also exist in word_bank.
 *   note_table_diagram_completion      → per-blank, identical to
 *                                        sentence_completion semantics.
 *   short_answer                       → per-sub-question, case-insensitive
 *                                        trim, max_words enforced.
 *
 * All string comparison is normalize(s) = s.trim().toLowerCase().
 * Word count: whitespace-split tokens (matches common IELTS convention where
 * digits and hyphenated forms count as one word).
 *
 * User-submitted answers arrive as strings. Complex-type answers (mapping,
 * blanks) are JSON-encoded strings; we JSON.parse leniently and treat parse
 * failures as "no answer".
 */

"use strict";

const normalize = (s) => String(s ?? "").trim().toLowerCase();
const countWords = (s) => String(s ?? "").trim().split(/\s+/).filter(Boolean).length;

const parseJsonLoose = (raw) => {
  if (raw == null) return {};
  if (typeof raw === "object") return raw;
  try { return JSON.parse(String(raw)); } catch { return {}; }
};

function scoreSingleChoice(question, userAnswerRaw) {
  const user = normalize(userAnswerRaw);
  const correct = normalize(question.correct_answer);
  const isCorrect = !!user && user === correct;
  return {
    points: isCorrect ? 1 : 0,
    max: 1,
    user_answer: userAnswerRaw ?? null,
    correct_answer: question.correct_answer,
    is_correct: isCorrect,
  };
}

/**
 * Generic per-key mapping scorer. Used by matching_headings,
 * matching_information, matching_features, matching_sentence_endings — all
 * share the {correct_mapping: {key: target}} payload contract.
 */
function scoreMappingQuestion(question, userAnswerRaw) {
  const mapping = (question.options && question.options.correct_mapping) || {};
  const keys = Object.keys(mapping);
  const user = parseJsonLoose(userAnswerRaw);
  let points = 0;
  const details = keys.map((k) => {
    const u = normalize(user[k]);
    const c = normalize(mapping[k]);
    const ok = !!u && u === c;
    if (ok) points += 1;
    return { key: k, user: user[k] ?? null, correct: mapping[k], is_correct: ok };
  });
  return {
    points,
    max: keys.length,
    user_answer: userAnswerRaw ?? null,
    correct_answer: mapping,
    is_correct: keys.length > 0 && points === keys.length,
    sub_results: details,
  };
}

function scoreBlanks(blanks, userAnswerRaw, { wordBank } = {}) {
  const user = parseJsonLoose(userAnswerRaw);
  const bankNorm = wordBank ? wordBank.map(normalize) : null;
  let points = 0;
  const details = blanks.map((b) => {
    const raw = user[b.id];
    const userNorm = normalize(raw);
    const acceptable = (b.correct_answers || []).map(normalize);
    const withinWords = b.max_words ? countWords(raw) <= b.max_words : true;
    const inBank = bankNorm ? bankNorm.includes(userNorm) : true;
    const matches = acceptable.includes(userNorm);
    const ok = !!userNorm && matches && withinWords && inBank;
    if (ok) points += 1;
    const entry = {
      blank: b.id,
      user: raw ?? null,
      accepted: b.correct_answers,
      is_correct: ok,
    };
    if (!withinWords) entry.reason = "exceeds_max_words";
    else if (!inBank) entry.reason = "not_in_word_bank";
    return entry;
  });
  return {
    points,
    max: blanks.length,
    user_answer: userAnswerRaw ?? null,
    is_correct: blanks.length > 0 && points === blanks.length,
    sub_results: details,
  };
}

function scoreSentenceCompletion(question, userAnswerRaw) {
  const sentences = (question.options && question.options.sentences) || [];
  const r = scoreBlanks(sentences, userAnswerRaw);
  r.correct_answer = sentences.map((s) => ({ id: s.id, accepted: s.correct_answers }));
  return r;
}

function scoreSummaryCompletion(question, userAnswerRaw) {
  const opts = question.options || {};
  const blanks = opts.blanks || [];
  const wordBank = opts.mode === "with_bank" ? (opts.word_bank || []) : null;
  const r = scoreBlanks(blanks, userAnswerRaw, { wordBank });
  r.correct_answer = blanks.map((b) => ({ id: b.id, accepted: b.correct_answers }));
  return r;
}

function scoreNoteTableDiagramCompletion(question, userAnswerRaw) {
  const blanks = (question.options && question.options.blanks) || [];
  const r = scoreBlanks(blanks, userAnswerRaw);
  r.correct_answer = blanks.map((b) => ({ id: b.id, accepted: b.correct_answers }));
  return r;
}

function scoreShortAnswer(question, userAnswerRaw) {
  // Each sub-question has the same shape as a blank: {id, max_words, correct_answers}.
  const items = (question.options && question.options.questions) || [];
  const r = scoreBlanks(items, userAnswerRaw);
  r.correct_answer = items.map((b) => ({ id: b.id, accepted: b.correct_answers }));
  return r;
}

function scoreQuestion(question, userAnswerRaw) {
  switch (question.type) {
    case "mcq":
    case "tfng":
    case "ynng":
    case "matching":
      return scoreSingleChoice(question, userAnswerRaw);
    case "matching_headings":
    case "matching_information":
    case "matching_features":
    case "matching_sentence_endings":
      return scoreMappingQuestion(question, userAnswerRaw);
    case "sentence_completion":
      return scoreSentenceCompletion(question, userAnswerRaw);
    case "summary_completion":
      return scoreSummaryCompletion(question, userAnswerRaw);
    case "note_table_diagram_completion":
      return scoreNoteTableDiagramCompletion(question, userAnswerRaw);
    case "short_answer":
      return scoreShortAnswer(question, userAnswerRaw);
    default:
      return {
        points: 0,
        max: 1,
        user_answer: userAnswerRaw ?? null,
        correct_answer: question.correct_answer,
        is_correct: false,
        unsupported_type: true,
      };
  }
}

/**
 * @param {Array} questions  Rows from reading_questions, ORDER BY order_index
 * @param {Array} answers    [{ question_id?, order_index?, answer: string }]
 * @returns {{correct: number, total: number, results: Array}}
 */
function scoreSubmission(questions, answers) {
  const findAnswer = (q) =>
    answers.find((a) => a.question_id === q.id || a.order_index === q.order_index);
  let correct = 0;
  let total = 0;
  const results = questions.map((q) => {
    const a = findAnswer(q);
    const scored = scoreQuestion(q, a?.answer);
    correct += scored.points;
    total += scored.max;
    return {
      question_id: q.id,
      order_index: q.order_index,
      type: q.type,
      explanation: q.explanation,
      ...scored,
    };
  });
  return { correct, total, results };
}

module.exports = {
  scoreQuestion,
  scoreSubmission,
  normalize,
  countWords,
};
