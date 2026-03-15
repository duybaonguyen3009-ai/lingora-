/**
 * pronunciationService.js
 *
 * Orchestrates the pronunciation assessment flow:
 *   1. Get a download URL for the stored audio
 *   2. Call the speech provider for pronunciation scoring
 *   3. Persist the attempt in pronunciation_attempts
 *   4. Return the formatted result
 */

const { createSpeechProvider } = require("../providers/speech/speechProvider");
const pronunciationRepository = require("../repositories/pronunciationRepository");
const mediaService = require("./mediaService");
const lessonService = require("./lessonService");

const speech = createSpeechProvider();

/**
 * Run pronunciation assessment for a recorded audio.
 *
 * @param {string} userId
 * @param {string} lessonId
 * @param {string} promptId
 * @param {string} storageKey
 * @param {number|null} [audioDurationMs]
 * @returns {Promise<object>} formatted attempt result
 */
async function assess(userId, lessonId, promptId, storageKey, audioDurationMs = null) {
  // 1. Look up the speaking prompt via lessonService (respects domain boundaries)
  const prompt = await lessonService.getSpeakingPromptById(promptId);
  if (!prompt) {
    throw { status: 404, message: "Speaking prompt not found" };
  }

  // Use sample_answer as reference text; fall back to prompt_text
  const referenceText = prompt.sample_answer || prompt.prompt_text;

  // 2. Get a download URL for the stored audio
  const audioUrl = await mediaService.getDownloadUrl(storageKey);

  // 3. Call the speech provider
  const result = await speech.assessPronunciation(audioUrl, referenceText, "en-US");

  // 4. Flatten phoneme details for storage
  const allPhonemes = result.words.flatMap((w) =>
    w.phonemes.map((p) => ({ ...p, word: w.word }))
  );

  // 5. Persist the attempt
  const row = await pronunciationRepository.insertAttempt({
    userId,
    speakingPromptId: promptId,
    lessonId,
    audioStorageKey: storageKey,
    audioDurationMs,
    overallScore: result.overallScore,
    accuracyScore: result.accuracyScore,
    fluencyScore: result.fluencyScore,
    completenessScore: result.completenessScore,
    pronunciationScore: result.pronunciationScore,
    phonemeDetails: allPhonemes,
    wordDetails: result.words,
  });

  // 6. Return formatted result
  return {
    attemptId: row.id,
    overallScore: result.overallScore,
    accuracyScore: result.accuracyScore,
    fluencyScore: result.fluencyScore,
    completenessScore: result.completenessScore,
    pronunciationScore: result.pronunciationScore,
    words: result.words,
  };
}

/**
 * Compute the average speaking score for a lesson.
 * Takes the best attempt per prompt and averages them.
 *
 * @param {string} userId
 * @param {string} lessonId
 * @returns {Promise<number>} 0-100
 */
async function getLessonSpeakingScore(userId, lessonId) {
  const bestAttempts = await pronunciationRepository.findBestByLessonAndUser(userId, lessonId);
  if (bestAttempts.length === 0) return 0;

  const sum = bestAttempts.reduce((acc, a) => acc + a.overall_score, 0);
  return Math.round(sum / bestAttempts.length);
}

/**
 * Get all pronunciation attempts for a user + prompt.
 *
 * @param {string} userId
 * @param {string} promptId
 * @returns {Promise<object[]>}
 */
async function getAttemptsByPrompt(userId, promptId) {
  const rows = await pronunciationRepository.findByUserAndPrompt(userId, promptId);
  return rows.map((r) => ({
    attemptId: r.id,
    overallScore: r.overall_score,
    accuracyScore: r.accuracy_score,
    fluencyScore: r.fluency_score,
    completenessScore: r.completeness_score,
    pronunciationScore: r.pronunciation_score,
    words: r.word_details || [],
    createdAt: r.created_at,
  }));
}

module.exports = {
  assess,
  getLessonSpeakingScore,
  getAttemptsByPrompt,
};
