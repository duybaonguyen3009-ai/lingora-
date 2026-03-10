/**
 * controllers/progressController.js
 *
 * HTTP layer for progress endpoints.
 * Validates inputs, delegates to progressService, uses sendSuccess for envelope.
 */

const progressService = require("../services/progressService");
const { sendSuccess }  = require("../response");

// UUID v4 pattern — matches both standard and crypto.randomUUID() output.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// POST /api/v1/lessons/:lessonId/complete
// ---------------------------------------------------------------------------

/**
 * completeLesson
 *
 * Body: { userId: string (UUID), score: number (0–100) }
 * Upserts a user_progress row and returns the saved record.
 */
async function completeLesson(req, res, next) {
  try {
    const { lessonId } = req.params;
    const { userId, score } = req.body;

    // --- Validate lessonId ---
    if (!UUID_RE.test(lessonId)) {
      const err = new Error("Invalid lesson ID. Expected a UUID.");
      err.status = 400;
      return next(err);
    }

    // --- Validate userId ---
    if (!userId || !UUID_RE.test(String(userId))) {
      const err = new Error("userId is required and must be a valid UUID.");
      err.status = 400;
      return next(err);
    }

    // --- Validate score ---
    const scoreNum = Number(score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      const err = new Error("score must be a number between 0 and 100.");
      err.status = 400;
      return next(err);
    }

    const result = await progressService.completeLesson(userId, lessonId, Math.round(scoreNum));

    return sendSuccess(res, {
      data:    result,
      message: "Lesson completed successfully",
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/users/:userId/progress
// ---------------------------------------------------------------------------

/**
 * getProgress
 *
 * Returns all completed lessons for a user as an array.
 * Returns an empty array — not a 404 — when the user has no progress yet.
 */
async function getProgress(req, res, next) {
  try {
    const { userId } = req.params;

    if (!UUID_RE.test(userId)) {
      const err = new Error("Invalid user ID. Expected a UUID.");
      err.status = 400;
      return next(err);
    }

    const progress = await progressService.getProgress(userId);

    return sendSuccess(res, {
      data:    { progress },
      message: "Progress retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { completeLesson, getProgress };
