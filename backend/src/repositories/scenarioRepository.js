/**
 * scenarioRepository.js
 *
 * SQL queries for the scenarios, scenario_sessions, and conversation_turns tables.
 */

const { query } = require("../config/db");

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

/**
 * List all scenarios, optionally filtered by category.
 *
 * @param {string} [category] – filter by category (e.g. "daily", "travel")
 * @returns {Promise<object[]>}
 */
async function findAllScenarios(category) {
  if (category) {
    const result = await query(
      `SELECT id, title, description, category, difficulty,
              emoji, tags, expected_turns, exam_type, created_at
         FROM scenarios
        WHERE category = $1
        ORDER BY title`,
      [category]
    );
    return result.rows;
  }

  const result = await query(
    `SELECT id, title, description, category, difficulty,
            emoji, tags, expected_turns, exam_type, created_at
       FROM scenarios
      ORDER BY category, title`
  );
  return result.rows;
}

/**
 * Find a single scenario by ID.
 *
 * @param {string} id – scenario UUID
 * @returns {Promise<object|null>}
 */
async function findScenarioById(id) {
  const result = await query(
    `SELECT id, title, description, category, difficulty,
            system_prompt, opening_message, emoji, tags,
            expected_turns, exam_type, created_at
       FROM scenarios
      WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

/**
 * Create a new scenario session and return it joined with scenario metadata.
 *
 * @param {string} scenarioId
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function createSession(scenarioId, userId) {
  const result = await query(
    `INSERT INTO scenario_sessions (scenario_id, user_id)
     VALUES ($1, $2)
     RETURNING *`,
    [scenarioId, userId]
  );
  const session = result.rows[0];

  // Join with scenario for title/emoji/system_prompt
  const scenarioResult = await query(
    `SELECT title, emoji, system_prompt, opening_message, category
       FROM scenarios
      WHERE id = $1`,
    [scenarioId]
  );
  const scenario = scenarioResult.rows[0];

  return { ...session, ...scenario };
}

/**
 * Find a session by ID, joined with scenario metadata.
 *
 * @param {string} id – session UUID
 * @returns {Promise<object|null>}
 */
async function findSessionById(id) {
  const result = await query(
    `SELECT ss.*, s.title, s.emoji, s.system_prompt, s.opening_message, s.category
       FROM scenario_sessions ss
       JOIN scenarios s ON s.id = ss.scenario_id
      WHERE ss.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Get a user's session history, newest first.
 *
 * @param {string} userId
 * @param {number} [limit=20]
 * @returns {Promise<object[]>}
 */
async function findSessionsByUser(userId, limit = 20) {
  const result = await query(
    `SELECT ss.id, ss.scenario_id, ss.status, ss.overall_score,
            ss.fluency_score, ss.vocabulary_score, ss.grammar_score,
            ss.turn_count AS total_turns, ss.word_count AS total_user_words, ss.duration_ms,
            ss.started_at, ss.completed_at,
            s.title, s.emoji, s.category, s.difficulty
       FROM scenario_sessions ss
       JOIN scenarios s ON s.id = ss.scenario_id
      WHERE ss.user_id = $1
      ORDER BY ss.started_at DESC
      LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

/**
 * Mark a session as completed with scores and stats.
 *
 * @param {string} id        – session UUID
 * @param {object} scores
 * @param {number} scores.overallScore
 * @param {number} scores.fluencyScore
 * @param {number} scores.vocabularyScore
 * @param {number} scores.grammarScore
 * @param {string} scores.coachFeedback
 * @param {number} scores.turnCount
 * @param {number} scores.wordCount
 * @param {number} scores.durationMs
 * @returns {Promise<object>}
 */
async function completeSession(id, scores) {
  const result = await query(
    `UPDATE scenario_sessions
        SET status = 'completed',
            overall_score = $2,
            fluency_score = $3,
            vocabulary_score = $4,
            grammar_score = $5,
            coach_feedback = $6,
            turn_count = $7,
            word_count = $8,
            duration_ms = $9,
            completed_at = NOW()
      WHERE id = $1
      RETURNING *`,
    [
      id,
      scores.overallScore,
      scores.fluencyScore,
      scores.vocabularyScore,
      scores.grammarScore,
      scores.coachFeedback,
      scores.turnCount,
      scores.wordCount,
      scores.durationMs,
    ]
  );
  return result.rows[0];
}

/**
 * Abandon any active session for a user (there should be at most one).
 *
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function abandonActiveSession(userId) {
  await query(
    `UPDATE scenario_sessions
        SET status = 'abandoned'
      WHERE user_id = $1 AND status = 'active'`,
    [userId]
  );
}

// ---------------------------------------------------------------------------
// Conversation turns
// ---------------------------------------------------------------------------

/**
 * Insert a conversation turn.
 *
 * @param {string} sessionId
 * @param {number} turnIndex
 * @param {string} role      – "user" or "assistant"
 * @param {string} content
 * @returns {Promise<object>}
 */
async function insertTurn(sessionId, turnIndex, role, content, options = {}) {
  const { audioStorageKey = null } = options;
  const result = await query(
    `INSERT INTO conversation_turns (session_id, turn_index, role, content, audio_storage_key)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [sessionId, turnIndex, role, content, audioStorageKey]
  );
  return result.rows[0];
}

/**
 * Get all turns for a session, ordered by turn_index.
 *
 * @param {string} sessionId
 * @returns {Promise<object[]>}
 */
async function findSessionTurns(sessionId) {
  const result = await query(
    `SELECT id, session_id, turn_index, role, content,
            audio_storage_key, scores, feedback, created_at
       FROM conversation_turns
      WHERE session_id = $1
      ORDER BY turn_index`,
    [sessionId]
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// Session metadata (persistent JSONB column — survives restarts)
// ---------------------------------------------------------------------------

/**
 * Update the session_meta JSONB column for a session.
 * @param {string} sessionId
 * @param {object} meta
 */
async function updateSessionMeta(sessionId, meta) {
  await query(
    `UPDATE scenario_sessions SET session_meta = $2 WHERE id = $1`,
    [sessionId, JSON.stringify(meta)]
  );
}

/**
 * Read the session_meta JSONB column for a session.
 * @param {string} sessionId
 * @returns {Promise<object|null>}
 */
async function getSessionMeta(sessionId) {
  const result = await query(
    `SELECT session_meta FROM scenario_sessions WHERE id = $1`,
    [sessionId]
  );
  const row = result.rows[0];
  return row?.session_meta || null;
}

/**
 * Clear session metadata (set to empty object).
 * @param {string} sessionId
 */
async function clearSessionMeta(sessionId) {
  await query(
    `UPDATE scenario_sessions SET session_meta = '{}'::jsonb WHERE id = $1`,
    [sessionId]
  );
}

module.exports = {
  findAllScenarios,
  findScenarioById,
  createSession,
  findSessionById,
  findSessionsByUser,
  completeSession,
  abandonActiveSession,
  insertTurn,
  findSessionTurns,
  updateSessionMeta,
  getSessionMeta,
  clearSessionMeta,
};
