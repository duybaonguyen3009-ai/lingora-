/**
 * routes/lessonRoutes.js
 *
 * Defines URL patterns for lesson endpoints and maps them to controllers.
 * No logic lives here — this file is purely declarative.
 */

const { Router } = require("express");
const lessonController = require("../controllers/lessonController");

const router = Router();

/**
 * GET /api/v1/lessons
 * List all lessons with content counts.
 */
router.get("/", lessonController.listLessons);

/**
 * GET /api/v1/lessons/:lessonId
 * Fetch a single lesson's full content (vocab, quiz, speaking).
 */
router.get("/:lessonId", lessonController.getLessonById);

module.exports = router;
