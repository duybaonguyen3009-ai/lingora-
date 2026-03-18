/**
 * routes/progressRoutes.js
 *
 * Progress endpoints — mounted at /api/v1 in app.js.
 *
 *   POST /api/v1/lessons/:lessonId/complete   (protected)
 *   GET  /api/v1/users/:userId/progress        (protected)
 *   POST /api/v1/users/migrate-guest           (protected)
 *
 * All routes require a valid JWT access token.
 */

const { Router }     = require("express");
const { verifyToken, logOwnership } = require("../middleware/auth");
const progressController = require("../controllers/progressController");

const router = Router();

// Mark a lesson as completed for the authenticated user.
router.post("/lessons/:lessonId/complete", verifyToken, progressController.completeLesson);

// Retrieve all completed lessons for a user.
router.get("/users/:userId/progress",      verifyToken, logOwnership, progressController.getProgress);

// Migrate guest-UUID progress into the authenticated user's account.
// Called once, right after login/register, when the browser has a guest UUID.
// NOTE: must be declared before /users/:userId/progress to avoid route clash.
router.post("/users/migrate-guest",        verifyToken, progressController.migrateGuest);

module.exports = router;
