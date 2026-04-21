/**
 * repositories/readingRepository.js
 *
 * SQL queries for reading passages, questions, and sessions.
 */

const { query } = require("../config/db");
const { scoreSubmission } = require("../services/readingScoring");

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

async function getPassageWithQuestions(passageId) {
  const [passage, questions] = await Promise.all([
    query(`SELECT * FROM reading_passages WHERE id = $1`, [passageId]),
    query(`SELECT * FROM reading_questions WHERE passage_id = $1 ORDER BY order_index`, [passageId]),
  ]);
  return { passage: passage.rows[0] || null, questions: questions.rows };
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

module.exports = {
  listPassages,
  getPassageWithQuestions,
  getPassagesByDifficulties,
  scoreAnswers,
};
