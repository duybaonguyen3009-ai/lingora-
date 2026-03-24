/**
 * controllers/scenarioController.js
 *
 * HTTP layer for scenario speaking practice endpoints.
 * Public routes: list / get scenarios.
 * Protected routes (JWT): session management + conversation turns.
 */

const scenarioService = require("../services/scenarioService");
const { sendSuccess, sendError } = require("../response");

// UUID v4 pattern
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// GET /api/v1/scenarios
// ---------------------------------------------------------------------------

/**
 * List all scenarios, optionally filtered by ?category=...
 */
async function listScenarios(req, res, next) {
  try {
    const { category } = req.query;
    const scenarios = await scenarioService.listScenarios(category || undefined);

    return sendSuccess(res, {
      data: { scenarios },
      message: "Scenarios retrieved",
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/scenarios/:scenarioId
// ---------------------------------------------------------------------------

/**
 * Get a single scenario by ID.
 */
async function getScenario(req, res, next) {
  try {
    const { scenarioId } = req.params;

    if (!UUID_RE.test(scenarioId)) {
      return sendError(res, { status: 400, message: "Valid scenarioId (UUID) is required" });
    }

    const scenario = await scenarioService.getScenario(scenarioId);

    return sendSuccess(res, {
      data: scenario,
      message: "Scenario retrieved",
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/scenarios/:scenarioId/start
// ---------------------------------------------------------------------------

/**
 * Start a new conversation session.
 *
 * Response: { sessionId, title, emoji, category, turns }
 */
async function startSession(req, res, next) {
  try {
    const { scenarioId } = req.params;
    const userId = req.user.id;

    if (!UUID_RE.test(scenarioId)) {
      return sendError(res, { status: 400, message: "Valid scenarioId (UUID) is required" });
    }

    const result = await scenarioService.startSession(scenarioId, userId);

    return sendSuccess(res, {
      data: result,
      status: 201,
      message: "Session started",
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/scenarios/sessions/:sessionId/turns
// ---------------------------------------------------------------------------

/**
 * Submit a user turn and receive the AI response.
 *
 * Body: { content: string, speechMetrics?: object }
 * Response: { userTurn, aiTurn }
 */
async function submitTurn(req, res, next) {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const { content, speechMetrics } = req.body;

    if (!UUID_RE.test(sessionId)) {
      return sendError(res, { status: 400, message: "Valid sessionId (UUID) is required" });
    }
    if (!content || typeof content !== "string" || !content.trim()) {
      return sendError(res, { status: 400, message: "content is required" });
    }

    // Validate speechMetrics if provided (optional — frontend may not send it)
    const validMetrics = speechMetrics && typeof speechMetrics === "object"
      ? speechMetrics
      : null;

    const result = await scenarioService.submitTurn(sessionId, userId, content.trim(), validMetrics);

    return sendSuccess(res, {
      data: result,
      message: "Turn submitted",
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/scenarios/sessions/:sessionId/end
// ---------------------------------------------------------------------------

/**
 * End a session and get scores.
 *
 * Body: { durationMs?: number }
 * Response: scores + stats
 */
async function endSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const { durationMs } = req.body;

    if (!UUID_RE.test(sessionId)) {
      return sendError(res, { status: 400, message: "Valid sessionId (UUID) is required" });
    }

    const duration = durationMs != null ? Math.round(Number(durationMs)) : null;
    const result = await scenarioService.endSession(sessionId, userId, duration);

    return sendSuccess(res, {
      data: result,
      message: "Session completed",
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/scenarios/sessions/:sessionId
// ---------------------------------------------------------------------------

/**
 * Get session detail with all turns.
 */
async function getSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    if (!UUID_RE.test(sessionId)) {
      return sendError(res, { status: 400, message: "Valid sessionId (UUID) is required" });
    }

    const result = await scenarioService.getSessionDetail(sessionId, userId);

    return sendSuccess(res, {
      data: result,
      message: "Session retrieved",
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/scenarios/sessions
// ---------------------------------------------------------------------------

/**
 * Get the authenticated user's session history.
 */
async function getUserSessions(req, res, next) {
  try {
    const userId = req.user.id;
    const sessions = await scenarioService.getUserSessions(userId);

    return sendSuccess(res, {
      data: { sessions },
      message: "Sessions retrieved",
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/scenarios/tts
// ---------------------------------------------------------------------------

/**
 * Synthesize speech from text using the TTS provider.
 * Returns audio/mpeg binary or 204 if TTS is not available.
 */
async function synthesizeSpeech(req, res, next) {
  try {
    const { createTtsProvider } = require("../providers/tts/ttsProvider");
    const tts = createTtsProvider();

    const available = tts.isAvailable();
    console.log(`[tts] provider: ${process.env.TTS_PROVIDER || "mock"}`);
    console.log(`[tts] available: ${available}`);

    if (!available) {
      console.log(`[tts] status: FAILED — provider not available, returning 204`);
      return res.status(204).end();
    }

    const { text, voice } = req.body;
    if (!text || typeof text !== "string" || text.length > 2000) {
      return sendError(res, { status: 400, message: "text is required (max 2000 chars)" });
    }

    console.log(`[tts] chars: ${text.length}`);
    const audioBuffer = await tts.synthesize(text, { voice });
    console.log(`[tts] bytes: ${audioBuffer.length}`);
    console.log(`[tts] status: OK`);
    res.set("Content-Type", "audio/mpeg");
    res.set("Content-Length", audioBuffer.length);
    return res.send(audioBuffer);
  } catch (err) {
    console.log(`[tts] status: FAILED — ${err.message}`);
    next(err);
  }
}

module.exports = {
  listScenarios,
  getScenario,
  startSession,
  submitTurn,
  endSession,
  getSession,
  getUserSessions,
  synthesizeSpeech,
};
