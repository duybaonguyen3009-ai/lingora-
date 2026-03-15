/**
 * repositories/lessonRepository.js
 *
 * Responsible for all direct database access related to lessons.
 *
 * Rules for this layer:
 *  - Only SQL. No business logic, no response shaping.
 *  - Returns raw rows from pg exactly as the DB sends them.
 *  - Every public function is async and throws on DB error (caught upstream).
 */

const db = require("../config/db");

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Return all lessons with their content counts.
 *
 * Prefers the `lesson_summary` view defined in schema.sql.
 * The view already performs the LEFT JOINs and GROUP BY, so this stays cheap.
 *
 * Columns returned: id, title, description, level, order_index,
 *                   vocab_count, quiz_count, speaking_count
 */
const SQL_GET_ALL_LESSONS = `
  SELECT
    id,
    title,
    description,
    level,
    order_index,
    vocab_count,
    quiz_count,
    speaking_count
  FROM lesson_summary
  ORDER BY order_index ASC;
`;

/**
 * Return the core fields for one lesson by its UUID.
 * Columns returned: id, title, description, level, order_index, created_at
 */
const SQL_GET_LESSON_BY_ID = `
  SELECT id, title, description, level, order_index, created_at
  FROM lessons
  WHERE id = $1;
`;

/**
 * Return all vocab items for a lesson, ordered by insertion sequence.
 * Columns: id, word, meaning, example_sentence, pronunciation, created_at
 */
const SQL_GET_VOCAB_BY_LESSON = `
  SELECT id, word, meaning, example_sentence, pronunciation, created_at
  FROM vocab_items
  WHERE lesson_id = $1
  ORDER BY created_at ASC;
`;

/**
 * Return all quiz questions for a lesson.
 * Columns: id, question, option_a–d, correct_option, created_at
 */
const SQL_GET_QUIZ_BY_LESSON = `
  SELECT id, question, option_a, option_b, option_c, option_d,
         correct_option, created_at
  FROM quiz_items
  WHERE lesson_id = $1
  ORDER BY created_at ASC;
`;

/**
 * Return all speaking prompts for a lesson.
 * Columns: id, prompt_text, sample_answer, hint, created_at
 */
const SQL_GET_SPEAKING_BY_LESSON = `
  SELECT id, prompt_text, sample_answer, hint, created_at
  FROM speaking_prompts
  WHERE lesson_id = $1
  ORDER BY created_at ASC;
`;

/**
 * Return a single speaking prompt by its UUID.
 * Columns: id, lesson_id, prompt_text, sample_answer, hint
 */
const SQL_GET_SPEAKING_PROMPT_BY_ID = `
  SELECT id, lesson_id, prompt_text, sample_answer, hint
  FROM speaking_prompts
  WHERE id = $1;
`;

// ---------------------------------------------------------------------------
// Repository functions
// ---------------------------------------------------------------------------

/**
 * Fetch all lessons (with content counts) from the lesson_summary view.
 * @returns {Promise<object[]>}
 */
async function findAll() {
  const { rows } = await db.query(SQL_GET_ALL_LESSONS);
  return rows;
}

/**
 * Fetch a single lesson row by UUID.
 * Returns undefined when no lesson matches.
 * @param {string} lessonId – UUID
 * @returns {Promise<object|undefined>}
 */
async function findById(lessonId) {
  const { rows } = await db.query(SQL_GET_LESSON_BY_ID, [lessonId]);
  return rows[0];
}

/**
 * Fetch all vocab items belonging to a lesson.
 * @param {string} lessonId – UUID
 * @returns {Promise<object[]>}
 */
async function findVocabByLessonId(lessonId) {
  const { rows } = await db.query(SQL_GET_VOCAB_BY_LESSON, [lessonId]);
  return rows;
}

/**
 * Fetch all quiz items belonging to a lesson.
 * @param {string} lessonId – UUID
 * @returns {Promise<object[]>}
 */
async function findQuizByLessonId(lessonId) {
  const { rows } = await db.query(SQL_GET_QUIZ_BY_LESSON, [lessonId]);
  return rows;
}

/**
 * Fetch all speaking prompts belonging to a lesson.
 * @param {string} lessonId – UUID
 * @returns {Promise<object[]>}
 */
async function findSpeakingByLessonId(lessonId) {
  const { rows } = await db.query(SQL_GET_SPEAKING_BY_LESSON, [lessonId]);
  return rows;
}

/**
 * Fetch a single speaking prompt by its UUID.
 * Returns undefined when no prompt matches.
 * @param {string} promptId – UUID
 * @returns {Promise<object|undefined>}
 */
async function findSpeakingPromptById(promptId) {
  const { rows } = await db.query(SQL_GET_SPEAKING_PROMPT_BY_ID, [promptId]);
  return rows[0];
}

module.exports = {
  findAll,
  findById,
  findVocabByLessonId,
  findQuizByLessonId,
  findSpeakingByLessonId,
  findSpeakingPromptById,
};
