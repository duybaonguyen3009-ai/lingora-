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

// ---------------------------------------------------------------------------
// Prompt bank (migration 0032)
// ---------------------------------------------------------------------------

// GET /api/v1/writing/questions/topics — list distinct topics for filters
router.get("/questions/topics", verifyToken, writingController.listQuestionTopics);

// GET /api/v1/writing/questions — filter-able list for PromptSelector
router.get("/questions", verifyToken, writingController.listQuestions);

// GET /api/v1/writing/questions/:id — full detail incl. chart_data
router.get("/questions/:id", verifyToken, writingController.getQuestion);

// POST /api/v1/writing/questions/:id/attempt — mark a prompt as opened
router.post("/questions/:id/attempt", verifyToken, writingController.recordAttempt);

// GET /api/v1/writing/full-test/start — auto-assigned Task 1 + Task 2 pair
router.get("/full-test/start", verifyToken, writingController.startFullTest);

module.exports = router;
