/**
 * routes/writingRoutes.js
 *
 * IELTS Writing feature endpoints.
 * All routes require JWT authentication.
 */

const { Router } = require("express");
const { verifyToken } = require("../middleware/auth");
const { writingLimiters } = require("../middleware/rateLimiters");
const writingController = require("../controllers/writingController");

const router = Router();

// POST /api/v1/writing/submit — submit essay for AI scoring
router.post("/submit", verifyToken, ...writingLimiters, writingController.submitEssay);

// GET /api/v1/writing/result/:submissionId — get submission result
router.get("/result/:submissionId", verifyToken, writingController.getResult);

// GET /api/v1/writing/history — get submission history
router.get("/history", verifyToken, writingController.getHistory);

module.exports = router;
