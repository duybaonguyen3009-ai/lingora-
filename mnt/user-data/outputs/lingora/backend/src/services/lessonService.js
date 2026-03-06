/**
 * services/lessonService.js
 *
 * Business logic layer for lessons.
 *
 * Rules for this layer:
 *  - Calls repository functions — never pg directly.
 *  - Owns response shaping: decides which fields are exposed and how they
 *    are named. The controller should not need to transform data.
 *  - Throws plain Error objects with a .status property so the global
 *    error handler in errorMiddleware.js can respond with the right HTTP code.
 */

const lessonRepository = require("../repositories/lessonRepository");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a 404 error with a consistent message format.
 * @param {string} lessonId
 * @returns {Error}
 */
function notFoundError(lessonId) {
  const err = new Error(`Lesson not found: ${lessonId}`);
  err.status = 404;
  return err;
}

/**
 * Shape a raw lesson_summary row into the public list item format.
 * Coerces pg's string counts to integers.
 *
 * @param {object} row
 * @returns {object}
 */
function formatLessonSummary(row) {
  return {
    id:             row.id,
    title:          row.title,
    description:    row.description,
    level:          row.level,
    order_index:    row.order_index,
    vocab_count:    parseInt(row.vocab_count,    10),
    quiz_count:     parseInt(row.quiz_count,     10),
    speaking_count: parseInt(row.speaking_count, 10),
  };
}

/**
 * Shape a vocab_items row for API output.
 * @param {object} row
 * @returns {object}
 */
function formatVocab(row) {
  return {
    id:               row.id,
    word:             row.word,
    meaning:          row.meaning,
    example_sentence: row.example_sentence,
    pronunciation:    row.pronunciation,
  };
}

/**
 * Shape a quiz_items row for API output.
 * Groups the four options into an `options` object for cleaner consumption
 * on the frontend.
 *
 * @param {object} row
 * @returns {object}
 */
function formatQuiz(row) {
  return {
    id:       row.id,
    question: row.question,
    options: {
      a: row.option_a,
      b: row.option_b,
      c: row.option_c,
      d: row.option_d,
    },
    correct_option: row.correct_option,
  };
}

/**
 * Shape a speaking_prompts row for API output.
 * @param {object} row
 * @returns {object}
 */
function formatSpeaking(row) {
  return {
    id:            row.id,
    prompt_text:   row.prompt_text,
    sample_answer: row.sample_answer,
    hint:          row.hint,
  };
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Return all lessons as summary objects (with content counts).
 * @returns {Promise<object[]>}
 */
async function getAllLessons() {
  const rows = await lessonRepository.findAll();
  return rows.map(formatLessonSummary);
}

/**
 * Return the full content for a single lesson.
 * Fetches the lesson, vocab, quiz, and speaking prompts in parallel to
 * minimise round-trip time to the database.
 *
 * Throws a 404 if the lesson UUID does not exist.
 *
 * @param {string} lessonId – UUID
 * @returns {Promise<{ lesson: object, vocab: object[], quiz: object[], speaking: object[] }>}
 */
async function getLessonById(lessonId) {
  // Fetch the lesson first — if it doesn't exist there is no point running
  // the three content queries.
  const lessonRow = await lessonRepository.findById(lessonId);

  if (!lessonRow) {
    throw notFoundError(lessonId);
  }

  // Fetch all content tables in parallel.
  const [vocabRows, quizRows, speakingRows] = await Promise.all([
    lessonRepository.findVocabByLessonId(lessonId),
    lessonRepository.findQuizByLessonId(lessonId),
    lessonRepository.findSpeakingByLessonId(lessonId),
  ]);

  return {
    lesson: {
      id:          lessonRow.id,
      title:       lessonRow.title,
      description: lessonRow.description,
      level:       lessonRow.level,
      order_index: lessonRow.order_index,
    },
    vocab:    vocabRows.map(formatVocab),
    quiz:     quizRows.map(formatQuiz),
    speaking: speakingRows.map(formatSpeaking),
  };
}

module.exports = {
  getAllLessons,
  getLessonById,
};
