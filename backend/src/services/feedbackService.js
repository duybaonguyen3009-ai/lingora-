/**
 * services/feedbackService.js
 *
 * Business logic for user feedback collection.
 */

"use strict";

const feedbackRepository = require("../repositories/feedbackRepository");

const VALID_ACTIVITY_TYPES = new Set(["speaking", "writing", "lesson"]);
const MAX_FEEDBACK_PER_HOUR = 10;

/**
 * Submit feedback for an activity.
 *
 * @param {string} userId
 * @param {object} input
 * @param {string} input.activityType
 * @param {string} [input.activityId]
 * @param {number} input.rating – 1, 2, or 3
 * @param {string} [input.comment]
 * @param {string[]} [input.tags]
 * @returns {Promise<object>}
 */
async function submitFeedback(userId, { activityType, activityId, rating, comment, tags }) {
  // Validate activityType
  if (!VALID_ACTIVITY_TYPES.has(activityType)) {
    const err = new Error("activityType must be 'speaking', 'writing', or 'lesson'");
    err.status = 400;
    throw err;
  }

  // Validate rating
  if (typeof rating !== "number" || rating < 1 || rating > 3) {
    const err = new Error("rating must be 1, 2, or 3");
    err.status = 400;
    throw err;
  }

  // Rate limit: max 10 feedbacks per hour per user
  const recentCount = await feedbackRepository.getRecentFeedbackCount(userId);
  if (recentCount >= MAX_FEEDBACK_PER_HOUR) {
    const err = new Error("Too many feedback submissions. Please try again later.");
    err.status = 429;
    throw err;
  }

  return feedbackRepository.createFeedback(
    userId,
    activityType,
    activityId || null,
    rating,
    comment || null,
    tags || []
  );
}

/**
 * Get user's feedback history.
 *
 * @param {string} userId
 * @param {number} [limit=20]
 * @returns {Promise<object[]>}
 */
async function getUserFeedback(userId, limit = 20) {
  return feedbackRepository.getUserFeedback(userId, limit);
}

module.exports = {
  submitFeedback,
  getUserFeedback,
};
