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
async function createSubmission(userId, taskType, questionText, essayText, wordCount, writingQuestionId = null) {
  const result = await query(
    `INSERT INTO writing_submissions
       (user_id, task_type, question_text, essay_text, word_count, writing_question_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, task_type, question_text, essay_text, word_count,
               writing_question_id, status, created_at`,
    [userId, taskType, questionText, essayText, wordCount, writingQuestionId]
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

/**
 * Fetch the user's most recent N COMPLETED submissions with feedback_json
 * attached. Used by the progress-context service to walk error patterns.
 */
async function getRecentCompletedWithFeedback(userId, limit = 30) {
  const result = await query(
    `SELECT id, task_type, overall_band, feedback_json, created_at
       FROM writing_submissions
      WHERE user_id = $1
        AND status = 'completed'
        AND feedback_json IS NOT NULL
      ORDER BY created_at DESC
      LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

/**
 * Find an existing non-failed submission for this user + task type today.
 * Used for idempotency — prevents duplicate submissions on double-click.
 */
async function findTodaySubmission(userId, taskType) {
  const result = await query(
    `SELECT id, status FROM writing_submissions
      WHERE user_id = $1 AND task_type = $2
        AND created_at::date = CURRENT_DATE
        AND status != 'failed'
      ORDER BY created_at DESC LIMIT 1`,
    [userId, taskType]
  );
  return result.rows[0] || null;
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
  getRecentCompletedWithFeedback,
  findTodaySubmission,
  getTodayUsageCount,
  incrementUsageCount,
};
