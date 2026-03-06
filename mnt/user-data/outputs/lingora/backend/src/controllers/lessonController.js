/**
 * controllers/lessonController.js
 *
 * HTTP layer for lesson endpoints.
 *
 * Rules for this layer:
 *  - Reads from req, writes to res — nothing else.
 *  - Validates and sanitises incoming request data before passing to service.
 *  - Delegates all logic to lessonService.
 *  - Passes unexpected errors to next() so errorMiddleware handles them.
 */

const lessonService = require("../services/lessonService");
const { sendSuccess } = require("../utils/response");

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Basic UUID v4 format check.
 * Prevents obviously malformed IDs from reaching the database layer.
 * @param {string} value
 * @returns {boolean}
 */
function isValidUUID(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

// ---------------------------------------------------------------------------
// Controllers
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/lessons
 *
 * Returns an array of lesson summaries with content counts.
 * No query parameters supported at this stage.
 */
async function listLessons(req, res, next) {
  try {
    const lessons = await lessonService.getAllLessons();

    return sendSuccess(res, {
      data: { lessons },
      message: "Lessons retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/lessons/:lessonId
 *
 * Returns full lesson content (lesson metadata + vocab + quiz + speaking).
 * Responds 400 if :lessonId is not a valid UUID format.
 * Responds 404 if no lesson matches the given UUID.
 */
async function getLessonById(req, res, next) {
  try {
    const { lessonId } = req.params;

    // Guard: reject non-UUID values before hitting the DB.
    if (!isValidUUID(lessonId)) {
      const err = new Error("Invalid lesson ID format. Expected a UUID.");
      err.status = 400;
      return next(err);
    }

    const data = await lessonService.getLessonById(lessonId);

    return sendSuccess(res, {
      data,
      message: "Lesson retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listLessons,
  getLessonById,
};
