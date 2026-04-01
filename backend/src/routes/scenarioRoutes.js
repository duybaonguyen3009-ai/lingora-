/**
 * routes/scenarioRoutes.js
 *
 * Scenario speaking practice endpoints.
 * Public: list and view scenarios.
 * Protected (JWT): session management and conversation turns.
 *
 * IMPORTANT: Named routes (/sessions, /tts) are mounted BEFORE /:scenarioId
 * to prevent them from being captured as a scenarioId param.
 */

const { Router } = require("express");
const { verifyToken } = require("../middleware/auth");
const { aiLimiters, ttsLimiters } = require("../middleware/rateLimiters");
const scenarioController = require("../controllers/scenarioController");

const router = Router();

// ---- Session routes (authenticated, MUST come before /:scenarioId) --------

// GET /api/v1/scenarios/sessions
router.get("/sessions", verifyToken, scenarioController.getUserSessions);

// GET /api/v1/scenarios/sessions/:sessionId
router.get("/sessions/:sessionId", verifyToken, scenarioController.getSession);

// POST /api/v1/scenarios/sessions/:sessionId/turns
router.post("/sessions/:sessionId/turns", verifyToken, ...aiLimiters, scenarioController.submitTurn);

// POST /api/v1/scenarios/sessions/:sessionId/end
router.post("/sessions/:sessionId/end", verifyToken, ...aiLimiters, scenarioController.endSession);

// ---- TTS (text-to-speech for examiner voice, MUST come before /:scenarioId) --

// POST /api/v1/scenarios/tts
router.post("/tts", verifyToken, ...ttsLimiters, scenarioController.synthesizeSpeech);

// ---- Scenario catalogue (public) -----------------------------------------

// GET /api/v1/scenarios
router.get("/", scenarioController.listScenarios);

// GET /api/v1/scenarios/:scenarioId
router.get("/:scenarioId", scenarioController.getScenario);

// ---- Start session (authenticated) ----------------------------------------

// POST /api/v1/scenarios/:scenarioId/start
router.post("/:scenarioId/start", verifyToken, ...aiLimiters, scenarioController.startSession);

module.exports = router;
