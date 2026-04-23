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

// ---------------------------------------------------------------------------
// Full Test (migration 0036)
// ---------------------------------------------------------------------------

// GET /api/v1/writing/full-test/start — auto-assigned pair + create run
router.get("/full-test/start", verifyToken, writingController.startFullTest);

// POST /api/v1/writing/full-test/:id/submit-task — score one task of the run
router.post("/full-test/:id/submit-task", verifyToken, ...writingLimiters, writingController.submitFullTestTask);

// POST /api/v1/writing/full-test/:id/finalize — compute weighted overall band
router.post("/full-test/:id/finalize", verifyToken, writingController.finalizeFullTest);

// GET /api/v1/writing/full-tests — list past runs
router.get("/full-tests", verifyToken, writingController.listFullTests);

// GET /api/v1/writing/full-tests/in-progress — resume-banner data source.
// MUST be registered before /full-tests/:id so the literal segment wins.
router.get("/full-tests/in-progress", verifyToken, writingController.getInProgressFullTest);

// GET /api/v1/writing/full-tests/:id — full aggregated result
router.get("/full-tests/:id", verifyToken, writingController.getFullTest);

// ---------------------------------------------------------------------------
// Progress + analytics
// ---------------------------------------------------------------------------

// GET /api/v1/writing/submissions/:id/progress-context — Style F feedback source
router.get("/submissions/:id/progress-context", verifyToken, writingController.getProgressContext);

// GET /api/v1/writing/analytics/trend?range=7d|30d|90d&breakdown=overall|criteria|by_task
router.get("/analytics/trend", verifyToken, writingController.getTrend);

// GET /api/v1/writing/analytics/self-compare — month-over-month diff
router.get("/analytics/self-compare", verifyToken, writingController.getSelfCompare);

module.exports = router;
