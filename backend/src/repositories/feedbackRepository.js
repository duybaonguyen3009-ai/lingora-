/**
 * repositories/feedbackRepository.js
 *
 * SQL queries for the user_feedback table.
 */

const { query } = require("../config/db");

/**
 * Insert a feedback entry.
 *
 * @param {string} userId
 * @param {string} activityType – 'speaking' | 'writing' | 'lesson'
 * @param {string|null} activityId
 * @param {number} rating – 1, 2, or 3
 * @param {string|null} comment
 * @param {string[]} tags
 * @returns {Promise<object>}
 */
async function createFeedback(userId, activityType, activityId, rating, comment, tags) {
  const result = await query(
    `INSERT INTO user_feedback (user_id, activity_type, activity_id, rating, comment, tags)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, activity_type, activity_id, rating, comment, tags, created_at`,
    [userId, activityType, activityId || null, rating, comment || null, JSON.stringify(tags || [])]
  );
  return result.rows[0];
}

/**
 * Get recent feedback for a user.
 *
 * @param {string} userId
 * @param {number} limit
 * @returns {Promise<object[]>}
 */
async function getUserFeedback(userId, limit = 20) {
  const result = await query(
    `SELECT id, activity_type, activity_id, rating, comment, tags, created_at
       FROM user_feedback
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

/**
 * Count feedback submitted by a user in the last hour.
 *
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function getRecentFeedbackCount(userId) {
  const result = await query(
    `SELECT COUNT(*)::int AS count FROM user_feedback
      WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
    [userId]
  );
  return result.rows[0].count;
}

module.exports = {
  createFeedback,
  getUserFeedback,
  getRecentFeedbackCount,
};
