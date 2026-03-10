/**
 * controllers/progressController.js
 */

const { sendSuccess } = require("../response");
const progressService = require("../services/progressService");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/v1/lessons/:lessonId/complete
 * Body: { userId: string, score: number (0-100) }
 */
async function completeLesson(req, res, next) {
  try {
    const { lessonId } = req.params;
    const { userId, score } = req.body;

    if (!userId || !UUID_RE.test(userId)) {
      return res.status(400).json({ success: false, message: "Invalid userId — must be a UUID" });
    }
    if (!UUID_RE.test(lessonId)) {
      return res.status(400).json({ success: false, message: "Invalid lessonId — must be a UUID" });
    }
    const numScore = Number(score);
    if (!Number.isFinite(numScore) || numScore < 0 || numScore > 100) {
      return res.status(400).json({ success: false, message: "score must be a number between 0 and 100" });
    }

    const result = await progressService.completeLesson(userId, lessonId, numScore);
    return sendSuccess(res, { data: result, message: "Progress saved" });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/users/:userId/progress
 */
async function getProgress(req, res, next) {
  try {
    const { userId } = req.params;
    if (!UUID_RE.test(userId)) {
      return res.status(400).json({ success: false, message: "Invalid userId — must be a UUID" });
    }

    const progress = await progressService.getProgress(userId);
    return sendSuccess(res, { data: { progress }, message: "OK" });
  } catch (err) {
    next(err);
  }
}

module.exports = { completeLesson, getProgress };
