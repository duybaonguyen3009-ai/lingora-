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
const { sendSuccess, sendError } = require("../response");

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
 * GET /api/v1/lessons/:lessonId — DEPRECATED (Wave 1.8).
 *
 * Pre-Wave-1.8 this returned full lesson content including quiz_items
 * with `correct_option` — clients could read the answer key via DevTools
 * before submitting. The corresponding FE consumer (LessonModal /
 * useLessonDetail) was orphaned by the "speaking-first homepage" pivot
 * (commit 7975c23), so the endpoint is now reachable only via curl.
 *
 * Returns 410 Gone with a descriptive code; the legitimate list
 * endpoint (/api/v1/lessons) remains so home-legacy dashboard stats
 * (vocabLearned, studyTime) keep working.
 *
 * Wave 5 cleanup will delete LessonModal/*, useLessonDetail,
 * lessonService.getLessonById, and the dead repository functions.
 *
 * Closes 1 P0 (Audit Batch 4): quiz answer key leak.
 */
async function getLessonById(req, res, _next) {
  console.warn(
    `[lesson-deprecated] detail endpoint hit user=${req.user?.id || "anon"} ` +
    `ip=${req.ip || "unknown"} path=${req.originalUrl}`,
  );
  return sendError(res, {
    status: 410,
    message: "Tính năng lesson detail đã ngừng hỗ trợ. Vui lòng dùng kỹ năng Speaking/Writing/Reading/Battle.",
    code: "LESSON_DETAIL_DEPRECATED",
  });
}

module.exports = {
  listLessons,
  getLessonById,
};
