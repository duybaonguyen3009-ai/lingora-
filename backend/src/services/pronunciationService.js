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
const { updateStreak } = require("./streakService");
const { awardXp } = require("./xpService");

const speech = createSpeechProvider();

// ---------------------------------------------------------------------------
// XP rewards
// ---------------------------------------------------------------------------
// Flat reward per pronunciation attempt. Lower than scenario because a
// single prompt is short effort and users can do many per session.
const XP_REWARD_PRONUNCIATION = 5;

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
    const err = new Error("Speaking prompt not found");
    err.status = 404;
    throw err;
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

  // ── Gamification: Award XP + update streak on pronunciation attempt ──
  // awardXp idempotent on (user, "pronunciation_attempt", row.id); since each
  // attempt creates a fresh row, awarded:false here only fires on retry of
  // the same INSERT — extremely rare, but we still gate cascade.
  let xpAwarded = false;
  let newBadges = []; // Wave 1.5b: surfaced in response for realtime FE toast.
  try {
    const xpResult = await awardXp(userId, XP_REWARD_PRONUNCIATION, "pronunciation_attempt", row.id);
    xpAwarded = xpResult.awarded;
  } catch (err) {
    // Non-fatal: XP award failure should not break pronunciation scoring
    console.error(`[pronunciation] XP award failed for user ${userId}:`, err.message);
  }

  if (xpAwarded) {
    try {
      await updateStreak(userId);
    } catch (err) {
      // Non-fatal: streak update failure should not break pronunciation scoring
      console.error(`[pronunciation] streak update failed for user ${userId}:`, err.message);
    }

    // Check speaking achievements + capture newly-unlocked badges so the
    // FE can fire BadgeToast in real time (Wave 1.5b Fix 2). Pronunciation
    // shares the "speaking_*" slug family with scenario sessions.
    try {
      const { checkSpeakingBadges } = require("./badgeService");
      const countRow = await require("../config/db").query(
        `SELECT COUNT(*)::int AS c FROM pronunciation_attempts WHERE user_id = $1`, [userId]
      );
      newBadges = await checkSpeakingBadges(userId, countRow.rows[0]?.c ?? 0, null);
    } catch (badgeErr) {
      console.error(`[pronunciation] badge check failed for user ${userId}:`, badgeErr.message);
    }
  }

  // 6. Return formatted result
  return {
    attemptId: row.id,
    overallScore: result.overallScore,
    accuracyScore: result.accuracyScore,
    fluencyScore: result.fluencyScore,
    completenessScore: result.completenessScore,
    pronunciationScore: result.pronunciationScore,
    words: result.words,
    newBadges,
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

/**
 * Get speaking metrics for a user over the last 30 days.
 * Returns daily score aggregates and computed summary stats.
 *
 * @param {string} userId
 * @returns {Promise<object>} { trend, totalAttempts, averageScore, bestScore, recentScore }
 */
async function getMetrics(userId) {
  const [trend, recentScore] = await Promise.all([
    pronunciationRepository.getMetricsByUser(userId, 30),
    pronunciationRepository.getLatestScore(userId),
  ]);

  const totalAttempts = trend.reduce((sum, d) => sum + d.attempt_count, 0);
  const allScores     = trend.map((d) => d.avg_score);
  const averageScore  = allScores.length
    ? Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length)
    : 0;
  const bestScore = allScores.length ? Math.round(Math.max(...allScores)) : 0;

  return {
    trend:          trend.map((d) => ({ date: d.date, avgScore: d.avg_score, attempts: d.attempt_count })),
    totalAttempts,
    averageScore,
    bestScore,
    recentScore:    recentScore !== null ? Math.round(recentScore) : null,
  };
}

module.exports = {
  assess,
  getLessonSpeakingScore,
  getAttemptsByPrompt,
  getMetrics,
};
