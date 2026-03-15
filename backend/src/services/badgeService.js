/**
 * services/badgeService.js
 *
 * Badge award logic.  Each check is idempotent: userHasBadge guards against
 * duplicate awards (the DB composite PK is the final backstop).
 *
 * Badge slugs are defined in migration 0003_gamification — do not rename
 * them without a corresponding code change here.
 */

const { getBadgeBySlug, userHasBadge, awardBadge } = require('../repositories/badgeRepository');
const { awardXp } = require('./xpService');

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * tryAwardBadge
 *
 * Awards a badge (and its XP bonus) only if the user doesn't already hold it.
 * Returns the badge object when newly awarded, or null otherwise.
 *
 * @param {string} userId
 * @param {string} slug - badge machine identifier
 * @returns {Promise<object|null>}
 */
async function tryAwardBadge(userId, slug) {
  const badge = await getBadgeBySlug(slug);
  if (!badge) return null;

  const alreadyHas = await userHasBadge(userId, badge.id);
  if (alreadyHas) return null;

  await awardBadge(userId, badge.id);

  // Award the badge's XP bonus into the ledger (may be 0 — still idempotent).
  if (badge.xp_reward > 0) {
    await awardXp(userId, badge.xp_reward, 'badge_award', badge.id);
  }

  return badge;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * checkAndAwardBadges
 *
 * Evaluates all badge conditions after a lesson completion and awards any
 * badges the user just qualified for.  All checks run in parallel.
 *
 * @param {string}  userId
 * @param {object}  opts
 * @param {boolean} opts.isFirstLesson  - true when this is the user's very first completed lesson
 * @param {number}  opts.score          - quiz score (0–100)
 * @param {number}  opts.currentStreak  - streak AFTER this completion
 * @param {number}  [opts.timeTakenMs]  - milliseconds the lesson took (optional; enables speed_demon)
 * @returns {Promise<object[]>} array of newly-awarded badge objects (empty if none)
 */
async function checkAndAwardBadges(userId, { isFirstLesson, score, currentStreak, timeTakenMs }) {
  const checks = [];

  if (isFirstLesson)                              checks.push(tryAwardBadge(userId, 'first_lesson'));
  if (currentStreak >= 3)                          checks.push(tryAwardBadge(userId, 'streak_3'));
  if (currentStreak >= 7)                          checks.push(tryAwardBadge(userId, 'streak_7'));
  if (currentStreak >= 30)                         checks.push(tryAwardBadge(userId, 'streak_30'));
  if (score === 100)                               checks.push(tryAwardBadge(userId, 'perfect_score'));
  if (timeTakenMs != null && timeTakenMs <= 120_000) checks.push(tryAwardBadge(userId, 'speed_demon'));

  const results = await Promise.all(checks);
  return results.filter(Boolean); // strip nulls (already held or slug not found)
}

module.exports = { tryAwardBadge, checkAndAwardBadges };
