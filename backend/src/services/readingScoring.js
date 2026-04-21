/**
 * services/readingScoring.js
 *
 * Pure scoring functions for IELTS reading question types. No DB access.
 *
 * Type-specific scoring rules:
 *   mcq / tfng / ynng / matching  → 1 point if exact normalized match.
 *   matching_headings             → 1 point per paragraph correctly matched.
 *                                    Max = number of paragraphs in mapping.
 *   sentence_completion           → 1 point per blank. Accepts any string in
 *                                    correct_answers (case-insensitive, trim).
 *                                    Rejects if token count > max_words.
 *   summary_completion            → per-blank scoring. When mode='with_bank',
 *                                    answer must also be present in word_bank.
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

function scoreMatchingHeadings(question, userAnswerRaw) {
  const mapping = (question.options && question.options.correct_mapping) || {};
  const keys = Object.keys(mapping);
  const user = parseJsonLoose(userAnswerRaw);
  let points = 0;
  const details = keys.map((k) => {
    const u = normalize(user[k]);
    const c = normalize(mapping[k]);
    const ok = !!u && u === c;
    if (ok) points += 1;
    return { paragraph: k, user: user[k] ?? null, correct: mapping[k], is_correct: ok };
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

function scoreQuestion(question, userAnswerRaw) {
  switch (question.type) {
    case "mcq":
    case "tfng":
    case "ynng":
    case "matching":
      return scoreSingleChoice(question, userAnswerRaw);
    case "matching_headings":
      return scoreMatchingHeadings(question, userAnswerRaw);
    case "sentence_completion":
      return scoreSentenceCompletion(question, userAnswerRaw);
    case "summary_completion":
      return scoreSummaryCompletion(question, userAnswerRaw);
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
