/**
 * repositories/coachRepository.js
 *
 * Data access layer for the AI Study Coach.
 * Returns raw rows — no business logic here.
 *
 * Queries cross pronunciation_attempts and scenario_sessions to surface
 * weak spots that the coaching engine converts into recommendations.
 */

const db = require('../db');

// ---------------------------------------------------------------------------
// Pronunciation data
// ---------------------------------------------------------------------------

/**
 * Total number of pronunciation attempts for a user.
 * Used to detect new users (no pronunciation history yet).
 *
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function getPronunciationAttemptCount(userId) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS count FROM pronunciation_attempts WHERE user_id = $1`,
    [userId],
  );
  return rows[0].count;
}

/**
 * Returns the single speaking prompt where the user has the lowest average score.
 * Useful for identifying the weakest pronunciation area to practice next.
 *
 * Returns null if the user has no pronunciation attempts.
 *
 * @param {string} userId
 * @returns {Promise<{ promptId: string, promptText: string, avgScore: number, lessonId: string } | null>}
 */
async function getWeakestPronunciationPrompt(userId) {
  const { rows } = await db.query(
    `SELECT
       sp.id           AS prompt_id,
       sp.lesson_id    AS lesson_id,
       sp.prompt_text  AS prompt_text,
       AVG(pa.overall_score)::numeric(5,1) AS avg_score
     FROM pronunciation_attempts pa
     JOIN speaking_prompts sp ON pa.prompt_id = sp.id
     WHERE pa.user_id = $1
     GROUP BY sp.id, sp.lesson_id, sp.prompt_text
     ORDER BY avg_score ASC
     LIMIT 1`,
    [userId],
  );
  if (rows.length === 0) return null;
  return {
    promptId:   rows[0].prompt_id,
    lessonId:   rows[0].lesson_id,
    promptText: rows[0].prompt_text,
    avgScore:   parseFloat(rows[0].avg_score),
  };
}

// ---------------------------------------------------------------------------
// Scenario data
// ---------------------------------------------------------------------------

/**
 * Total completed scenario sessions for a user.
 * Used to detect new users (no speaking practice yet).
 *
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function getCompletedScenarioCount(userId) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM scenario_sessions
     WHERE user_id = $1 AND completed_at IS NOT NULL`,
    [userId],
  );
  return rows[0].count;
}

/**
 * Returns completed scenario sessions from the past N days, newest first.
 * Used to check recency of speaking practice and average performance.
 *
 * @param {string} userId
 * @param {number} days  – look-back window (default 7)
 * @returns {Promise<Array<{ scenarioId: string, overallScore: number|null, category: string, title: string, emoji: string }>>}
 */
async function getRecentScenarioSessions(userId, days = 7) {
  const { rows } = await db.query(
    `SELECT
       ss.scenario_id    AS scenario_id,
       ss.overall_score  AS overall_score,
       s.category        AS category,
       s.title           AS title,
       s.emoji           AS emoji
     FROM scenario_sessions ss
     JOIN scenarios s ON ss.scenario_id = s.id
     WHERE ss.user_id      = $1
       AND ss.completed_at IS NOT NULL
       AND ss.completed_at > NOW() - ($2 * INTERVAL '1 day')
     ORDER BY ss.completed_at DESC
     LIMIT 10`,
    [userId, days],
  );
  return rows.map((r) => ({
    scenarioId:   r.scenario_id,
    overallScore: r.overall_score != null ? parseFloat(r.overall_score) : null,
    category:     r.category,
    title:        r.title,
    emoji:        r.emoji,
  }));
}

module.exports = {
  getPronunciationAttemptCount,
  getWeakestPronunciationPrompt,
  getCompletedScenarioCount,
  getRecentScenarioSessions,
};
