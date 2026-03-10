/**
 * routes/progressRoutes.js
 *
 * Progress endpoints — mounted at /api/v1 in app.js.
 *
 *   POST /api/v1/lessons/:lessonId/complete
 *   GET  /api/v1/users/:userId/progress
 */

const { Router } = require("express");
const progressController = require("../controllers/progressController");

const router = Router();

// Mark a lesson as completed for a given user (guest or authenticated).
router.post("/lessons/:lessonId/complete", progressController.completeLesson);

// Retrieve all completed lessons for a user.
router.get("/users/:userId/progress", progressController.getProgress);

module.exports = router;
