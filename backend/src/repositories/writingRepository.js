/**
 * repositories/writingRepository.js
 *
 * SQL queries for writing_submissions and writing_usage tables.
 */

const { query } = require("../config/db");

// ---------------------------------------------------------------------------
// writing_submissions
// ---------------------------------------------------------------------------

/**
 * Insert a new writing submission (status defaults to 'pending').
 *
 * @param {string} userId
 * @param {string} taskType – 'task1' | 'task2'
 * @param {string} questionText
 * @param {string} essayText
 * @param {number} wordCount
 * @returns {Promise<object>} – the created row
 */
async function createSubmission(userId, taskType, questionText, essayText, wordCount) {
  const result = await query(
    `INSERT INTO writing_submissions (user_id, task_type, question_text, essay_text, word_count)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, task_type, question_text, essay_text, word_count, status, created_at`,
    [userId, taskType, questionText, essayText, wordCount]
  );
  return result.rows[0];
}

/**
 * Update a submission with scoring results.
 *
 * @param {string} id – submission UUID
 * @param {object} data
 * @param {number}  data.overallBand
 * @param {number}  data.taskScore
 * @param {number}  data.coherenceScore
 * @param {number}  data.lexicalScore
 * @param {number}  data.grammarScore
 * @param {object}  data.feedbackJson
 * @param {string}  data.status – 'completed' | 'failed'
 * @param {string}  [data.languageDetected]
 * @returns {Promise<object>} – the updated row
 */
async function updateSubmissionResult(id, data) {
  const result = await query(
    `UPDATE writing_submissions
        SET overall_band      = $2,
            task_score         = $3,
            coherence_score    = $4,
            lexical_score      = $5,
            grammar_score      = $6,
            feedback_json      = $7,
            status             = $8,
            language_detected  = COALESCE($9, language_detected),
            updated_at         = now()
      WHERE id = $1
      RETURNING *`,
    [
      id,
      data.overallBand ?? null,
      data.taskScore ?? null,
      data.coherenceScore ?? null,
      data.lexicalScore ?? null,
      data.grammarScore ?? null,
      data.feedbackJson ? JSON.stringify(data.feedbackJson) : null,
      data.status,
      data.languageDetected ?? null,
    ]
  );
  return result.rows[0];
}

/**
 * Find a submission by ID.
 *
 * @param {string} id – submission UUID
 * @returns {Promise<object|null>}
 */
async function getSubmissionById(id) {
  const result = await query(
    `SELECT * FROM writing_submissions WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Get a user's submissions (newest first), paginated.
 *
 * @param {string} userId
 * @param {number} limit
 * @param {number} offset
 * @returns {Promise<object[]>}
 */
async function getUserSubmissions(userId, limit = 10, offset = 0) {
  const result = await query(
    `SELECT id, task_type, question_text, word_count, overall_band,
            status, created_at
       FROM writing_submissions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// writing_usage — daily submission counts
// ---------------------------------------------------------------------------

/**
 * Get today's submission count for a user.
 *
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function getTodayUsageCount(userId) {
  const result = await query(
    `SELECT writing_count FROM writing_usage
      WHERE user_id = $1 AND date = CURRENT_DATE`,
    [userId]
  );
  return result.rows[0]?.writing_count ?? 0;
}

/**
 * Increment (or create) today's usage count for a user.
 *
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function incrementUsageCount(userId) {
  await query(
    `INSERT INTO writing_usage (user_id, date, writing_count)
     VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (user_id, date)
     DO UPDATE SET writing_count = writing_usage.writing_count + 1`,
    [userId]
  );
}

module.exports = {
  createSubmission,
  updateSubmissionResult,
  getSubmissionById,
  getUserSubmissions,
  getTodayUsageCount,
  incrementUsageCount,
};
