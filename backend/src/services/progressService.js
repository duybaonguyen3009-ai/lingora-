/**
 * services/progressService.js
 *
 * Business logic for user progress.
 * On lesson completion, orchestrates gamification side-effects:
 *   1. XP award (lesson.xp_reward → xp_ledger)
 *   2. Learning event log (learning_events)
 *   3. Streak update (user_streaks)
 *   4. Badge checks (user_badges + badge XP bonus)
 *   5. Level computation from new total XP
 *
 * Returns an enriched response so the API can drive frontend animations.
 */

const progressRepository          = require('../repositories/progressRepository');
const { awardXp, computeLevel }   = require('./xpService');
const { updateStreak }            = require('./streakService');
const { checkAndAwardBadges }     = require('./badgeService');
const { insertEvent }             = require('../repositories/learningEventRepository');
const { getTotalXp }              = require('../repositories/xpRepository');

// ---------------------------------------------------------------------------
// Shape helpers
// ---------------------------------------------------------------------------

function formatProgressRow(row) {
  return {
    lessonId:    row.lesson_id,
    score:       row.score,
    completed:   row.completed,
    completedAt: row.completed_at,
  };
}

// ---------------------------------------------------------------------------
// Service methods
// ---------------------------------------------------------------------------

/**
 * completeLesson
 *
 * Upserts progress for (userId, lessonId), then runs all gamification
 * side-effects in parallel where possible.
 *
 * @param {string} userId
 * @param {string} lessonId
 * @param {number} score         - 0–100
 * @param {number} [timeTakenMs] - milliseconds the lesson took (enables speed_demon badge)
 * @returns {Promise<object>} enriched completion result
 */
async function completeLesson(userId, lessonId, score, timeTakenMs) {
  // Must run before the progress insert to satisfy the FK constraint.
  // No-op for real (already existing) users; creates a stub for guest UUIDs.
  await progressRepository.ensureGuestUser(userId);

  // Fetch lesson XP reward and upsert progress concurrently.
  const [row, xpReward] = await Promise.all([
    progressRepository.upsertProgress(userId, lessonId, score),
    progressRepository.getLessonXpReward(lessonId),
  ]);

  // Count how many completed lessons the user now has (post-upsert).
  const completedCount = await progressRepository.countCompletedLessons(userId);
  const isFirstLesson  = completedCount === 1;

  // ── Gamification side-effects ─────────────────────────────────────────────
  // Award XP + log learning event concurrently.
  await Promise.all([
    xpReward > 0
      ? awardXp(userId, xpReward, 'lesson_complete', lessonId)
      : Promise.resolve(null),
    insertEvent(userId, lessonId, 'lesson_completed', {
      score,
      xp_earned:     xpReward,
      time_taken_ms: timeTakenMs ?? null,
    }),
  ]);

  // Streak update must happen before badge check (badge needs currentStreak).
  const streakResult = await updateStreak(userId);

  // Fetch total XP (after award) + check badges concurrently.
  const [totalXp, newBadges] = await Promise.all([
    getTotalXp(userId),
    checkAndAwardBadges(userId, {
      isFirstLesson,
      score,
      currentStreak: streakResult.currentStreak,
      timeTakenMs,
    }),
  ]);

  // Compute level from updated total XP.
  const { level, xpInLevel, xpToNextLevel } = computeLevel(totalXp);

  // Detect level-up: compare level before this lesson's XP was added.
  const xpBefore              = Math.max(0, totalXp - xpReward);
  const { level: levelBefore } = computeLevel(xpBefore);
  const leveledUp             = level > levelBefore;

  // ── Build response ────────────────────────────────────────────────────────
  return {
    // Core progress fields (unchanged from before)
    userId:       row.user_id,
    lessonId:     row.lesson_id,
    score:        row.score,
    completed:    row.completed,
    completedAt:  row.completed_at,

    // Gamification enrichment
    xpEarned:     xpReward,
    totalXp,
    level,
    xpInLevel,
    xpToNextLevel,
    leveledUp,
    streak:       streakResult.currentStreak,
    longestStreak: streakResult.longestStreak,
    newBadges:    newBadges.map((b) => ({
      id:          b.id,
      slug:        b.slug,
      name:        b.name,
      description: b.description,
      icon_url:    b.icon_url,
      xp_reward:   b.xp_reward,
    })),
  };
}

/**
 * getProgress
 *
 * Returns all completed lessons for a user, shaped for the frontend hook.
 */
async function getProgress(userId) {
  const rows = await progressRepository.getProgressByUserId(userId);
  return rows.map(formatProgressRow);
}

/**
 * migrateGuestProgress
 *
 * Transfers guest-UUID progress to a real authenticated account.
 * Called immediately after login or registration when the browser
 * has a lingora_guest_id in localStorage.
 *
 * Guard: if realUserId === guestUserId (shouldn't happen, but defensive),
 * return immediately without touching the DB.
 *
 * @param {string} realUserId  – the authenticated user's UUID
 * @param {string} guestUserId – the guest UUID from the browser
 * @returns {Promise<{ migratedCount: number }>}
 */
async function migrateGuestProgress(realUserId, guestUserId) {
  if (realUserId === guestUserId) {
    return { migratedCount: 0 };
  }
  const migratedCount = await progressRepository.migrateGuestProgress(realUserId, guestUserId);
  return { migratedCount };
}

module.exports = { completeLesson, getProgress, migrateGuestProgress };
