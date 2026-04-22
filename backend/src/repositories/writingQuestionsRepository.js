/**
 * repositories/writingQuestionsRepository.js
 *
 * SQL queries for writing_questions (curated prompt bank) and
 * user_writing_attempts (per-user selection history).
 *
 * The list query deliberately omits sample_band_7_answer and chart_data
 * to keep payloads small — the detail endpoint fetches those on demand.
 */

"use strict";

const { query } = require("../config/db");

// ---------------------------------------------------------------------------
// writing_questions — list + detail
// ---------------------------------------------------------------------------

const LIST_COLUMNS = [
  "wq.id",
  "wq.task_type",
  "wq.chart_type",
  "wq.essay_type",
  "wq.topic",
  "wq.difficulty",
  "wq.title",
  "wq.question_text",
  "wq.created_at",
].join(", ");

/**
 * List approved writing questions with optional filters.
 *
 * @param {object} opts
 * @param {string}  [opts.userId]         – if provided, each row carries `attempted: boolean`
 * @param {string}  [opts.taskType]       – 'task1' | 'task2'
 * @param {string}  [opts.topic]          – exact match (nullable)
 * @param {string}  [opts.difficulty]     – 'band_5_6' | 'band_6_7' | 'band_7_8'
 * @param {boolean} [opts.excludeAttempted] – when true, requires userId; hides rows the user already attempted
 * @param {number}  [opts.limit=50]
 * @param {number}  [opts.offset=0]
 * @returns {Promise<object[]>}
 */
async function listQuestions(opts = {}) {
  const { userId, taskType, topic, difficulty, excludeAttempted, limit = 50, offset = 0 } = opts;

  const conditions = ["wq.review_status = 'approved'"];
  const params = [];

  if (taskType) {
    params.push(taskType);
    conditions.push(`wq.task_type = $${params.length}`);
  }
  if (topic) {
    params.push(topic);
    conditions.push(`wq.topic = $${params.length}`);
  }
  if (difficulty) {
    params.push(difficulty);
    conditions.push(`wq.difficulty = $${params.length}`);
  }

  let joinClause = "";
  let selectCols = LIST_COLUMNS + ", false AS attempted";
  if (userId) {
    params.push(userId);
    joinClause = `LEFT JOIN user_writing_attempts uwa ON uwa.writing_question_id = wq.id AND uwa.user_id = $${params.length}`;
    selectCols = LIST_COLUMNS + ", (uwa.id IS NOT NULL) AS attempted";
    if (excludeAttempted) conditions.push("uwa.id IS NULL");
  }

  params.push(limit);
  params.push(offset);
  const limitIdx = params.length - 1;
  const offsetIdx = params.length;

  const sql = `
    SELECT ${selectCols}
      FROM writing_questions wq
      ${joinClause}
     WHERE ${conditions.join(" AND ")}
     ORDER BY wq.created_at ASC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;
  const result = await query(sql, params);
  return result.rows;
}

/**
 * Distinct topic values currently present in the approved bank.
 * Used to populate filter dropdowns.
 */
async function listTopics(taskType) {
  const params = [];
  let where = "review_status = 'approved'";
  if (taskType) {
    params.push(taskType);
    where += ` AND task_type = $${params.length}`;
  }
  const result = await query(
    `SELECT DISTINCT topic FROM writing_questions WHERE ${where} ORDER BY topic ASC`,
    params
  );
  return result.rows.map((r) => r.topic);
}

/**
 * Full row by id — returns null if not found.
 * @param {string} id
 * @param {string} [userId] – optional; adds `attempted` flag
 */
async function getQuestionById(id, userId) {
  const params = [id];
  let extraSelect = ", false AS attempted";
  let joinClause = "";
  if (userId) {
    params.push(userId);
    joinClause = `LEFT JOIN user_writing_attempts uwa ON uwa.writing_question_id = wq.id AND uwa.user_id = $2`;
    extraSelect = ", (uwa.id IS NOT NULL) AS attempted";
  }
  const result = await query(
    `SELECT wq.*${extraSelect}
       FROM writing_questions wq
       ${joinClause}
      WHERE wq.id = $1 AND wq.review_status = 'approved'
      LIMIT 1`,
    params
  );
  return result.rows[0] || null;
}

// ---------------------------------------------------------------------------
// user_writing_attempts
// ---------------------------------------------------------------------------

/**
 * Upsert an attempt record. Safe to call multiple times — re-selects just
 * refresh `attempted_at`.
 */
async function upsertAttempt(userId, questionId, submissionId = null) {
  await query(
    `INSERT INTO user_writing_attempts (user_id, writing_question_id, submission_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, writing_question_id)
     DO UPDATE SET attempted_at = now(),
                   submission_id = COALESCE(EXCLUDED.submission_id, user_writing_attempts.submission_id)`,
    [userId, questionId, submissionId]
  );
}

/**
 * Pick one approved question at random for Full Test auto-assign.
 * Deliberately dumb — adaptive picking by user band history is Item 8.
 *
 * @param {string} taskType – 'task1' | 'task2'
 * @param {string[]} excludeIds – ids already picked in this session
 */
async function pickRandomQuestion(taskType, excludeIds = []) {
  const params = [taskType];
  let whereExtra = "";
  if (excludeIds.length > 0) {
    params.push(excludeIds);
    whereExtra = ` AND id <> ALL($2::uuid[])`;
  }
  const result = await query(
    `SELECT id, task_type, chart_type, essay_type, topic, difficulty,
            title, question_text, chart_data, sample_band_7_answer, supplementary
       FROM writing_questions
      WHERE review_status = 'approved' AND task_type = $1${whereExtra}
      ORDER BY random()
      LIMIT 1`,
    params
  );
  return result.rows[0] || null;
}

module.exports = {
  listQuestions,
  listTopics,
  getQuestionById,
  upsertAttempt,
  pickRandomQuestion,
};
