/**
 * repositories/learningEventRepository.js
 *
 * Append-only event log for analytics, streak computation, and the skills
 * heatmap.  NEVER UPDATE or DELETE rows.
 *
 * event_type discriminators (extend as new event types are added):
 *   'lesson_started'     | 'lesson_completed' | 'lesson_abandoned'
 *   'vocab_viewed'       | 'quiz_answered'    | 'speaking_submitted'
 */

const { query } = require('../config/db');

/**
 * insertEvent
 *
 * Appends one learning event to the log.
 *
 * @param {string}      userId
 * @param {string}      lessonId
 * @param {string}      eventType - see discriminator list above
 * @param {object|null} [payload] - JSONB data specific to the event type
 * @returns {Promise<object>} the inserted row
 */
async function insertEvent(userId, lessonId, eventType, payload = null) {
  const result = await query(
    `INSERT INTO learning_events (user_id, lesson_id, event_type, payload)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, lesson_id, event_type, payload, created_at`,
    [userId, lessonId, eventType, payload ? JSON.stringify(payload) : null],
  );
  return result.rows[0];
}

/**
 * getUserEventsByDay
 *
 * Returns daily event counts for a user — used for the skills heatmap.
 *
 * @param {string} userId
 * @param {number} [days=365] - how many calendar days to look back
 * @returns {Promise<Array<{ day: string, event_count: number }>>}
 */
async function getUserEventsByDay(userId, days = 365) {
  const result = await query(
    `SELECT date_trunc('day', created_at)::date AS day,
            COUNT(*)::int                        AS event_count
     FROM   learning_events
     WHERE  user_id    = $1
       AND  created_at >= NOW() - ($2 || ' days')::interval
     GROUP  BY 1
     ORDER  BY 1`,
    [userId, days],
  );
  return result.rows;
}

module.exports = { insertEvent, getUserEventsByDay };
