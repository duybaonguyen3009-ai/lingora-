/**
 * pronunciationRepository.js
 *
 * SQL queries for the pronunciation_attempts table.
 */

const { query } = require("../config/db");

/**
 * Insert a pronunciation attempt row.
 *
 * @param {object} data
 * @param {string} data.userId
 * @param {string} data.speakingPromptId
 * @param {string} data.lessonId
 * @param {string} data.audioStorageKey
 * @param {number|null} data.audioDurationMs
 * @param {number} data.overallScore
 * @param {number} data.accuracyScore
 * @param {number} data.fluencyScore
 * @param {number} data.completenessScore
 * @param {number} data.pronunciationScore
 * @param {Array} data.phonemeDetails
 * @param {Array} data.wordDetails
 * @returns {Promise<object>} the inserted row
 */
async function insertAttempt(data) {
  const result = await query(
    `INSERT INTO pronunciation_attempts
       (user_id, speaking_prompt_id, lesson_id, audio_storage_key,
        audio_duration_ms, overall_score, accuracy_score, fluency_score,
        completeness_score, pronunciation_score, phoneme_details, word_details)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      data.userId,
      data.speakingPromptId,
      data.lessonId,
      data.audioStorageKey,
      data.audioDurationMs ?? null,
      data.overallScore,
      data.accuracyScore,
      data.fluencyScore,
      data.completenessScore,
      data.pronunciationScore,
      JSON.stringify(data.phonemeDetails),
      JSON.stringify(data.wordDetails),
    ]
  );
  return result.rows[0];
}

/**
 * Get the best attempt (highest overall_score) per speaking_prompt for a user+lesson.
 * Used to compute average speaking score for lesson completion.
 *
 * @param {string} userId
 * @param {string} lessonId
 * @returns {Promise<object[]>}
 */
async function findBestByLessonAndUser(userId, lessonId) {
  const result = await query(
    `SELECT DISTINCT ON (speaking_prompt_id)
       id, user_id, speaking_prompt_id, lesson_id,
       overall_score, accuracy_score, fluency_score,
       completeness_score, pronunciation_score,
       word_details, phoneme_details, created_at
     FROM pronunciation_attempts
     WHERE user_id = $1 AND lesson_id = $2
     ORDER BY speaking_prompt_id, overall_score DESC, created_at DESC`,
    [userId, lessonId]
  );
  return result.rows;
}

/**
 * Get all attempts for a user+prompt, newest first.
 *
 * @param {string} userId
 * @param {string} promptId
 * @returns {Promise<object[]>}
 */
async function findByUserAndPrompt(userId, promptId) {
  const result = await query(
    `SELECT id, user_id, speaking_prompt_id, lesson_id,
       audio_storage_key, audio_duration_ms,
       overall_score, accuracy_score, fluency_score,
       completeness_score, pronunciation_score,
       word_details, phoneme_details, created_at
     FROM pronunciation_attempts
     WHERE user_id = $1 AND speaking_prompt_id = $2
     ORDER BY created_at DESC`,
    [userId, promptId]
  );
  return result.rows;
}

module.exports = {
  insertAttempt,
  findBestByLessonAndUser,
  findByUserAndPrompt,
};
