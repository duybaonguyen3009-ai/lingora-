/**
 * controllers/feedbackController.js
 *
 * HTTP layer for user feedback endpoints.
 */

const feedbackService = require("../services/feedbackService");
const { sendSuccess, sendError } = require("../response");

// ---------------------------------------------------------------------------
// POST /api/v1/feedback
// ---------------------------------------------------------------------------

async function submitFeedback(req, res, next) {
  try {
    const userId = req.user.id;
    const { activityType, activityId, rating, comment, tags } = req.body;

    if (!activityType || !rating) {
      return sendError(res, { status: 400, message: "activityType and rating are required" });
    }

    const feedback = await feedbackService.submitFeedback(userId, {
      activityType,
      activityId,
      rating: Number(rating),
      comment,
      tags,
    });

    return sendSuccess(res, {
      data: feedback,
      status: 201,
      message: "Feedback submitted",
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/feedback/me
// ---------------------------------------------------------------------------

async function getUserFeedback(req, res, next) {
  try {
    const userId = req.user.id;
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const feedback = await feedbackService.getUserFeedback(userId, limit);

    return sendSuccess(res, {
      data: { feedback },
      message: "Feedback retrieved",
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  submitFeedback,
  getUserFeedback,
};
