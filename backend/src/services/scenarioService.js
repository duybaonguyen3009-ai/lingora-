/**
 * scenarioService.js
 *
 * Orchestrates the scenario speaking practice flow:
 *   1. List / get scenario definitions
 *   2. Start a conversation session (AI opening turn)
 *   3. Accept user turns, generate AI responses
 *   4. End session with scoring and feedback
 */

const { createAiProvider } = require("../providers/ai/aiProvider");
const scenarioRepository = require("../repositories/scenarioRepository");

const ai = createAiProvider();

// ---------------------------------------------------------------------------
// Scenario catalogue
// ---------------------------------------------------------------------------

/**
 * List all scenarios, optionally filtered by category.
 *
 * @param {string} [category]
 * @returns {Promise<object[]>}
 */
async function listScenarios(category) {
  return scenarioRepository.findAllScenarios(category);
}

/**
 * Get a single scenario by ID.
 *
 * @param {string} id
 * @returns {Promise<object>}
 */
async function getScenario(id) {
  const scenario = await scenarioRepository.findScenarioById(id);
  if (!scenario) {
    const err = new Error("Scenario not found");
    err.status = 404;
    throw err;
  }
  return scenario;
}

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

/**
 * Start a new conversation session for a scenario.
 * Abandons any currently active session for the user.
 *
 * @param {string} scenarioId
 * @param {string} userId
 * @returns {Promise<object>} { sessionId, scenario metadata, turns }
 */
async function startSession(scenarioId, userId) {
  // Validate scenario exists
  const scenario = await scenarioRepository.findScenarioById(scenarioId);
  if (!scenario) {
    const err = new Error("Scenario not found");
    err.status = 404;
    throw err;
  }

  // Abandon any existing active session
  await scenarioRepository.abandonActiveSession(userId);

  // Create new session
  const session = await scenarioRepository.createSession(scenarioId, userId);

  // Insert the AI opening message as turn 0
  const openingTurn = await scenarioRepository.insertTurn(
    session.id,
    0,
    "assistant",
    scenario.opening_message
  );

  return {
    sessionId: session.id,
    title: session.title,
    emoji: session.emoji,
    category: session.category,
    turns: [
      {
        turnIndex: openingTurn.turn_index,
        role: openingTurn.role,
        content: openingTurn.content,
        createdAt: openingTurn.created_at,
      },
    ],
  };
}

/**
 * Submit a user turn and get an AI response.
 *
 * @param {string} sessionId
 * @param {string} userId
 * @param {string} content – the user's message text
 * @returns {Promise<object>} { userTurn, aiTurn }
 */
async function submitTurn(sessionId, userId, content) {
  // Validate session exists and belongs to this user
  const session = await scenarioRepository.findSessionById(sessionId);
  if (!session) {
    const err = new Error("Session not found");
    err.status = 404;
    throw err;
  }
  if (session.user_id !== userId) {
    const err = new Error("Not authorized to access this session");
    err.status = 403;
    throw err;
  }
  if (session.status !== "active") {
    const err = new Error("Session is no longer active");
    err.status = 400;
    throw err;
  }

  // Get existing turns to determine next index
  const existingTurns = await scenarioRepository.findSessionTurns(sessionId);
  const nextIndex = existingTurns.length;

  // Save the user turn
  const userTurn = await scenarioRepository.insertTurn(
    sessionId,
    nextIndex,
    "user",
    content
  );

  // Build conversation history for AI
  const conversationHistory = existingTurns.map((t) => ({
    role: t.role,
    content: t.content,
  }));
  conversationHistory.push({ role: "user", content });

  // Generate AI response
  console.log(`[ai] session: ${sessionId} | category: ${session.category} | turns: ${conversationHistory.length}`);
  const aiContent = await ai.generateResponse(
    session.system_prompt,
    conversationHistory,
    { category: session.category }
  );

  // Save the AI turn
  const aiTurn = await scenarioRepository.insertTurn(
    sessionId,
    nextIndex + 1,
    "assistant",
    aiContent
  );

  return {
    userTurn: {
      turnIndex: userTurn.turn_index,
      role: userTurn.role,
      content: userTurn.content,
      createdAt: userTurn.created_at,
    },
    aiTurn: {
      turnIndex: aiTurn.turn_index,
      role: aiTurn.role,
      content: aiTurn.content,
      createdAt: aiTurn.created_at,
    },
  };
}

/**
 * End a session: score the conversation and persist results.
 *
 * @param {string} sessionId
 * @param {string} userId
 * @param {number} durationMs – client-reported session duration
 * @returns {Promise<object>} scores + stats
 */
async function endSession(sessionId, userId, durationMs) {
  // Validate session
  const session = await scenarioRepository.findSessionById(sessionId);
  if (!session) {
    const err = new Error("Session not found");
    err.status = 404;
    throw err;
  }
  if (session.user_id !== userId) {
    const err = new Error("Not authorized to access this session");
    err.status = 403;
    throw err;
  }
  if (session.status !== "active") {
    const err = new Error("Session is no longer active");
    err.status = 400;
    throw err;
  }

  // Get all turns
  const turns = await scenarioRepository.findSessionTurns(sessionId);

  // Build conversation history
  const conversationHistory = turns.map((t) => ({
    role: t.role,
    content: t.content,
  }));

  // Score the conversation via AI provider
  console.log(`[ai] scoring session: ${sessionId} | turns: ${conversationHistory.length}`);
  const scoreResult = await ai.scoreConversation(
    session.system_prompt,
    conversationHistory
  );

  // Compute stats
  const userTurns = turns.filter((t) => t.role === "user");
  const turnCount = userTurns.length;
  const wordCount = userTurns.reduce(
    (sum, t) => sum + t.content.trim().split(/\s+/).filter(Boolean).length,
    0
  );

  // Persist scores
  await scenarioRepository.completeSession(sessionId, {
    overallScore: scoreResult.overallScore,
    fluencyScore: scoreResult.fluency,
    vocabularyScore: scoreResult.vocabulary,
    grammarScore: scoreResult.grammar,
    coachFeedback: scoreResult.coachFeedback,
    turnCount,
    wordCount,
    durationMs: durationMs || 0,
  });

  return {
    overallScore: scoreResult.overallScore,
    fluency: scoreResult.fluency,
    vocabulary: scoreResult.vocabulary,
    grammar: scoreResult.grammar,
    coachFeedback: scoreResult.coachFeedback,
    turnFeedback: scoreResult.turnFeedback,
    turnCount,
    wordCount,
    durationMs: durationMs || 0,
  };
}

// ---------------------------------------------------------------------------
// Session queries
// ---------------------------------------------------------------------------

/**
 * Get session detail including all turns.
 *
 * @param {string} sessionId
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function getSessionDetail(sessionId, userId) {
  const session = await scenarioRepository.findSessionById(sessionId);
  if (!session) {
    const err = new Error("Session not found");
    err.status = 404;
    throw err;
  }
  if (session.user_id !== userId) {
    const err = new Error("Not authorized to access this session");
    err.status = 403;
    throw err;
  }

  const turns = await scenarioRepository.findSessionTurns(sessionId);

  return {
    sessionId: session.id,
    scenarioId: session.scenario_id,
    title: session.title,
    emoji: session.emoji,
    category: session.category,
    status: session.status,
    overallScore: session.overall_score,
    fluencyScore: session.fluency_score,
    vocabularyScore: session.vocabulary_score,
    grammarScore: session.grammar_score,
    coachFeedback: session.feedback_summary,
    turnCount: session.total_turns,
    wordCount: session.total_user_words,
    durationMs: session.duration_ms,
    startedAt: session.started_at,
    completedAt: session.completed_at,
    turns: turns.map((t) => ({
      turnIndex: t.turn_index,
      role: t.role,
      content: t.content,
      createdAt: t.created_at,
    })),
  };
}

/**
 * Get a user's session history.
 *
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
async function getUserSessions(userId) {
  return scenarioRepository.findSessionsByUser(userId);
}

module.exports = {
  listScenarios,
  getScenario,
  startSession,
  submitTurn,
  endSession,
  getSessionDetail,
  getUserSessions,
};
