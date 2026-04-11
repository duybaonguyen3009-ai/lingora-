/**
 * routes/feedbackRoutes.js
 *
 * User feedback endpoints. All routes require JWT authentication.
 */

const { Router } = require("express");
const { verifyToken } = require("../middleware/auth");
const feedbackController = require("../controllers/feedbackController");

const router = Router();

// POST /api/v1/feedback — submit feedback
router.post("/", verifyToken, feedbackController.submitFeedback);

// GET /api/v1/feedback/me — get user's feedback history
router.get("/me", verifyToken, feedbackController.getUserFeedback);

module.exports = router;
