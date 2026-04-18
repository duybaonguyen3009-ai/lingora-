/**
 * controllers/scenarioController.js
 *
 * HTTP layer for scenario speaking practice endpoints.
 * Public routes: list / get scenarios.
 * Protected routes (JWT): session management + conversation turns.
 */

const scenarioService = require("../services/scenarioService");
const mediaService = require("../services/mediaService");
const scenarioRepository = require("../repositories/scenarioRepository");
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

    // V2: Optional cueCardIndex for retry-same-topic
    const cueCardIndex = req.body.cueCardIndex != null ? Number(req.body.cueCardIndex) : undefined;
    // Optional IANA timezone — service normalizes invalid values to the VN default.
    const timezone = typeof req.body.timezone === "string" ? req.body.timezone : undefined;
    const result = await scenarioService.startSession(scenarioId, userId, { cueCardIndex, timezone });

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
    const { content, speechMetrics, part2Notes, storageKey } = req.body;

    if (!UUID_RE.test(sessionId)) {
      return sendError(res, { status: 400, message: "Valid sessionId (UUID) is required" });
    }
    // Accept EITHER text content (legacy / identity check / placeholders) OR
    // an R2 storageKey that the backend will transcribe via Whisper.
    const hasText = typeof content === "string" && content.trim().length > 0;
    const hasKey = typeof storageKey === "string" && storageKey.length > 0;
    if (!hasText && !hasKey) {
      return sendError(res, { status: 400, message: "content or storageKey is required" });
    }
    // Guard against obvious storageKey tampering. Our mediaService mints keys
    // under `scenarios/:userId/:sessionId/` — enforce the prefix so one user
    // can't point the transcription path at another user's audio.
    if (hasKey) {
      const expectedPrefix = `scenarios/${userId}/${sessionId}/`;
      if (!storageKey.startsWith(expectedPrefix)) {
        return sendError(res, { status: 403, message: "Invalid storageKey for this session" });
      }
    }

    // Validate speechMetrics if provided (optional — frontend may not send it)
    const validMetrics = speechMetrics && typeof speechMetrics === "object"
      ? speechMetrics
      : null;

    // Optional Part 2 prep notes. Frontend sends this only on the prep→speak
    // transition turn. Capped at 10k chars as a sanity bound (textarea is for
    // short jottings, not essays). Notes are persisted verbatim to session_meta
    // — they never reach the scoring prompt.
    const notes = typeof part2Notes === "string" ? part2Notes.slice(0, 10000) : undefined;

    // V2: Pass experimental flag from query param
    const experimental = req.query.experimental === "true";
    // If the client sent a storageKey, `content` is a placeholder — service
    // overwrites it with the Whisper transcript. Otherwise use submitted text.
    const initialContent = hasText ? content.trim() : "";
    const result = await scenarioService.submitTurn(
      sessionId,
      userId,
      initialContent,
      validMetrics,
      { experimental, part2Notes: notes, storageKey: hasKey ? storageKey : undefined },
    );

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
    // V2: Pass experimental flag from query param
    const experimental = req.query.experimental === "true";
    const result = await scenarioService.endSession(sessionId, userId, duration, { experimental });

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

    // Invalid/missing voice falls back to "alloy" — never 400, so TTS stays robust
    // when older clients (or clients with stale sessions) omit the field.
    const { normalizeVoice } = require("../domain/ielts/examinerPersona");
    const safeVoice = normalizeVoice(voice);

    console.log(`[tts] chars: ${text.length} | voice: ${safeVoice}`);
    const audioBuffer = await tts.synthesize(text, { voice: safeVoice });
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

// ---------------------------------------------------------------------------
// POST /api/v1/scenarios/sessions/:sessionId/audio/upload-url
// ---------------------------------------------------------------------------

/**
 * Generate a pre-signed R2 upload URL for a scenario/IELTS audio turn.
 * The browser PUTs the webm blob to the returned URL, then calls
 * POST /sessions/:sessionId/turns with the storageKey.
 *
 * Response: { uploadUrl: string, storageKey: string, expiresIn: number }
 */
async function getAudioUploadUrl(req, res, next) {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    if (!UUID_RE.test(sessionId)) {
      return sendError(res, { status: 400, message: "Valid sessionId (UUID) is required" });
    }

    // Session ownership check — don't let user A mint upload URLs against
    // user B's session. Mirrors the guard in submitTurn / endSession.
    const session = await scenarioRepository.findSessionById(sessionId);
    if (!session) {
      return sendError(res, { status: 404, message: "Session not found" });
    }
    if (session.user_id !== userId) {
      return sendError(res, { status: 403, message: "Not authorized to access this session" });
    }
    if (session.status !== "active") {
      return sendError(res, { status: 400, message: "Session is no longer active" });
    }

    const { contentType } = req.body || {};
    const safeContentType = contentType === "audio/webm" ? contentType : "audio/webm";

    const result = await mediaService.getScenarioAudioUploadUrl(userId, sessionId, safeContentType);

    return sendSuccess(res, {
      data: result,
      message: "Upload URL generated",
    });
  } catch (err) {
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
  getAudioUploadUrl,
  synthesizeSpeech,
};
