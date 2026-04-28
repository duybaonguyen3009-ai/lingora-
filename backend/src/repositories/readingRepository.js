/**
 * repositories/readingRepository.js
 *
 * SQL queries for reading passages, questions, and sessions.
 */

const { query } = require("../config/db");
const { scoreSubmission } = require("../services/readingScoring");
const { sanitizeQuestionsForExam } = require("../utils/sanitize");

async function listPassages({ difficulty, topic, limit = 20 } = {}) {
  let sql = `SELECT id, topic, difficulty, estimated_minutes, passage_title, created_at
     FROM reading_passages WHERE review_status != 'rejected'`;
  const params = [];
  let idx = 1;

  if (difficulty) { sql += ` AND difficulty = $${idx}`; params.push(difficulty); idx++; }
  if (topic) { sql += ` AND topic = $${idx}`; params.push(topic); idx++; }
  sql += ` ORDER BY RANDOM() LIMIT $${idx}`;
  params.push(limit);

  try {
    const result = await query(sql, params);
    return result.rows;
  } catch (err) {
    // Table may not exist if migrations haven't run yet
    if (err.message?.includes("does not exist")) {
      console.warn("[reading] reading_passages table not found — migrations pending");
      return [];
    }
    throw err;
  }
}

/**
 * getPassageWithQuestions — RAW data including answer keys.
 * Server-side use only. Do NOT return directly to clients.
 * Use getPassageWithQuestionsForExam for any pre-submit response.
 */
async function getPassageWithQuestions(passageId) {
  const [passage, questions] = await Promise.all([
    query(`SELECT * FROM reading_passages WHERE id = $1`, [passageId]),
    query(`SELECT * FROM reading_questions WHERE passage_id = $1 ORDER BY order_index`, [passageId]),
  ]);
  return { passage: passage.rows[0] || null, questions: questions.rows };
}

/**
 * getPassageWithQuestionsForExam — SAFE for pre-submit client responses.
 * Strips correct_answer, explanation, acceptable_answers, and any nested
 * correct_* fields (e.g. options.correct_mapping, blanks[].correct_answers).
 */
async function getPassageWithQuestionsForExam(passageId) {
  const data = await getPassageWithQuestions(passageId);
  return {
    passage: data.passage,
    questions: sanitizeQuestionsForExam(data.questions),
  };
}

async function getPassagesByDifficulties(difficulties, countPerDifficulty = 1) {
  const passages = [];
  for (const diff of difficulties) {
    const result = await query(
      `SELECT id FROM reading_passages WHERE difficulty = $1 AND review_status != 'rejected' ORDER BY RANDOM() LIMIT $2`,
      [diff, countPerDifficulty]
    );
    passages.push(...result.rows);
  }
  return passages;
}

async function scoreAnswers(passageId, answers) {
  const { rows: questions } = await query(
    `SELECT id, order_index, correct_answer, explanation, type, options
       FROM reading_questions
      WHERE passage_id = $1
      ORDER BY order_index`,
    [passageId]
  );
  return scoreSubmission(questions, answers);
}

async function listReadingTests() {
  try {
    const { rows } = await query(
      `SELECT t.id, t.title, t.difficulty_tier, t.created_at,
              t.passage_1_id, t.passage_2_id, t.passage_3_id
         FROM reading_tests t
        ORDER BY
          CASE t.difficulty_tier
            WHEN 'foundation' THEN 1
            WHEN 'standard'   THEN 2
            WHEN 'challenge'  THEN 3
            ELSE 4
          END,
          t.created_at`
    );
    return rows;
  } catch (err) {
    if (err.message?.includes("does not exist")) {
      console.warn("[reading] reading_tests table not found — migration 0031 pending");
      return [];
    }
    throw err;
  }
}

async function getReadingTestById(testId) {
  const { rows } = await query(
    `SELECT id, title, difficulty_tier, passage_1_id, passage_2_id, passage_3_id, created_at
       FROM reading_tests WHERE id = $1`,
    [testId]
  );
  return rows[0] || null;
}

/**
 * Per-attempt Reading practice history (Wave 2.9, R1 scope).
 *
 * Source: xp_ledger rows where reason='reading_practice_complete'.
 * Each row corresponds to one passage completion (idempotent on
 * (user_id, reason, ref_id) thanks to Wave 1 migration 0041 partial
 * UNIQUE). LEFT JOIN to reading_passages exposes the title — left
 * because a passage could be deleted/retired and we still want the
 * row in history (with passage_title = null) rather than dropping it.
 *
 * KNOWN LIMITATION (R2 follow-up): per-attempt band/score is NOT
 * persisted. submitPractice computes the score, returns it in the
 * HTTP response, and writes only the XP-earned ledger row. Surfacing
 * per-attempt band requires a new reading_attempts table + backfill,
 * tracked separately.
 *
 * @returns {Promise<Array<{ id, attempted_at, xp_earned, passage_title, passage_id }>>}
 */
async function listUserHistory(userId, limit, offset) {
  const result = await query(
    `SELECT xl.id,
            xl.created_at AS attempted_at,
            xl.delta      AS xp_earned,
            rp.passage_title,
            xl.ref_id     AS passage_id
       FROM xp_ledger xl
       LEFT JOIN reading_passages rp ON rp.id = xl.ref_id
      WHERE xl.user_id = $1
        AND xl.reason  = 'reading_practice_complete'
      ORDER BY xl.created_at DESC
      LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );
  return result.rows;
}

async function countUserHistory(userId) {
  const result = await query(
    `SELECT COUNT(*)::int AS n
       FROM xp_ledger
      WHERE user_id = $1
        AND reason  = 'reading_practice_complete'`,
    [userId],
  );
  return result.rows[0]?.n ?? 0;
}

module.exports = {
  listPassages,
  getPassageWithQuestions,
  getPassageWithQuestionsForExam,
  getPassagesByDifficulties,
  scoreAnswers,
  listReadingTests,
  getReadingTestById,
  listUserHistory,
  countUserHistory,
};
