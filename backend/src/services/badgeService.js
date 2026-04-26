/**
 * services/badgeService.js
 *
 * Badge/achievement award logic. All checks are idempotent.
 * Covers: lessons, streaks, XP, speaking, writing, reading, battle, social.
 */

const { getBadgeBySlug, userHasBadge, awardBadge, getUserBadges } = require("../repositories/badgeRepository");
const { awardXp } = require("./xpService");
const { query } = require("../config/db");

// ---------------------------------------------------------------------------
// Core helper
// ---------------------------------------------------------------------------

async function tryAwardBadge(userId, slug) {
  const badge = await getBadgeBySlug(slug);
  if (!badge) return null;

  // Fast-path early-out: skips a write when we know the user already has it.
  // The authoritative gate is awardBadge's INSERT ... ON CONFLICT below —
  // it closes the race where two concurrent calls both pass userHasBadge.
  const alreadyHas = await userHasBadge(userId, badge.id);
  if (alreadyHas) return null;

  const inserted = await awardBadge(userId, badge.id);
  if (!inserted) return null; // race lost — peer call already awarded

  if (badge.xp_reward > 0) {
    await awardXp(userId, badge.xp_reward, "badge_award", badge.id);
  }

  // Update achievement score (gated on actual insert above)
  if (badge.achievement_points > 0) {
    await query(`UPDATE users SET achievement_score = achievement_score + $2 WHERE id = $1`, [userId, badge.achievement_points]);
  }

  return badge;
}

// ---------------------------------------------------------------------------
// Lesson badges (existing — extended with new streaks)
// ---------------------------------------------------------------------------

async function checkAndAwardBadges(userId, { isFirstLesson, score, currentStreak, timeTakenMs }) {
  const checks = [];

  if (isFirstLesson) checks.push(tryAwardBadge(userId, "first_lesson"));
  if (currentStreak >= 3) checks.push(tryAwardBadge(userId, "streak_3"));
  if (currentStreak >= 7) checks.push(tryAwardBadge(userId, "streak_7"));
  if (currentStreak >= 14) checks.push(tryAwardBadge(userId, "streak_14"));
  if (currentStreak >= 30) checks.push(tryAwardBadge(userId, "streak_30"));
  if (currentStreak >= 60) checks.push(tryAwardBadge(userId, "streak_60"));
  if (currentStreak >= 100) checks.push(tryAwardBadge(userId, "streak_100"));
  if (score === 100) checks.push(tryAwardBadge(userId, "perfect_score"));
  if (timeTakenMs != null && timeTakenMs <= 120_000) checks.push(tryAwardBadge(userId, "speed_demon"));

  const results = await Promise.all(checks);
  return results.filter(Boolean);
}

// ---------------------------------------------------------------------------
// Speaking badges
// ---------------------------------------------------------------------------

async function checkSpeakingBadges(userId, sessionCount, bandScore) {
  const checks = [];
  if (sessionCount >= 1) checks.push(tryAwardBadge(userId, "speaking_first"));
  if (sessionCount >= 10) checks.push(tryAwardBadge(userId, "speaking_10"));
  if (sessionCount >= 50) checks.push(tryAwardBadge(userId, "speaking_50"));
  if (sessionCount >= 100) checks.push(tryAwardBadge(userId, "speaking_100"));
  if (bandScore != null && bandScore >= 7.0) checks.push(tryAwardBadge(userId, "speaking_band7"));
  return (await Promise.all(checks)).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Writing badges
// ---------------------------------------------------------------------------

async function checkWritingBadges(userId, submissionCount, bandScore) {
  const checks = [];
  if (submissionCount >= 1) checks.push(tryAwardBadge(userId, "writing_first"));
  if (submissionCount >= 10) checks.push(tryAwardBadge(userId, "writing_10"));
  if (submissionCount >= 50) checks.push(tryAwardBadge(userId, "writing_50"));
  if (bandScore != null && bandScore >= 7.0) checks.push(tryAwardBadge(userId, "writing_band7"));
  return (await Promise.all(checks)).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Reading badges
// ---------------------------------------------------------------------------

async function checkReadingBadges(userId, correctTotal) {
  const checks = [];
  if (correctTotal >= 1) checks.push(tryAwardBadge(userId, "reading_first"));
  if (correctTotal >= 50) checks.push(tryAwardBadge(userId, "reading_50"));
  if (correctTotal >= 100) checks.push(tryAwardBadge(userId, "reading_100"));
  if (correctTotal >= 300) checks.push(tryAwardBadge(userId, "reading_300"));
  return (await Promise.all(checks)).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Battle badges
// ---------------------------------------------------------------------------

async function checkBattleBadges(userId, { wins, rankTier }) {
  const checks = [];
  if (wins >= 1) checks.push(tryAwardBadge(userId, "battle_first"));
  if (wins >= 10) checks.push(tryAwardBadge(userId, "battle_10"));
  if (wins >= 50) checks.push(tryAwardBadge(userId, "battle_50"));
  if (wins >= 100) checks.push(tryAwardBadge(userId, "battle_100"));
  if (["gold", "platinum", "diamond", "challenger"].includes(rankTier)) checks.push(tryAwardBadge(userId, "rank_gold"));
  if (["diamond", "challenger"].includes(rankTier)) checks.push(tryAwardBadge(userId, "rank_diamond"));
  if (rankTier === "challenger") checks.push(tryAwardBadge(userId, "rank_challenger"));
  return (await Promise.all(checks)).filter(Boolean);
}

// ---------------------------------------------------------------------------
// XP badges
// ---------------------------------------------------------------------------

async function checkXpBadges(userId, totalXp) {
  const checks = [];
  if (totalXp >= 1000) checks.push(tryAwardBadge(userId, "xp_1k"));
  if (totalXp >= 5000) checks.push(tryAwardBadge(userId, "xp_5k"));
  if (totalXp >= 10000) checks.push(tryAwardBadge(userId, "xp_10k"));
  if (totalXp >= 50000) checks.push(tryAwardBadge(userId, "xp_50k"));
  if (totalXp >= 100000) checks.push(tryAwardBadge(userId, "xp_100k"));
  return (await Promise.all(checks)).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Social badges
// ---------------------------------------------------------------------------

async function checkSocialBadges(userId, { friendCount, hasCreatedRoom }) {
  const checks = [];
  if (friendCount >= 1) checks.push(tryAwardBadge(userId, "social_first_friend"));
  if (friendCount >= 5) checks.push(tryAwardBadge(userId, "social_5_friends"));
  if (friendCount >= 10) checks.push(tryAwardBadge(userId, "social_10_friends"));
  if (hasCreatedRoom) checks.push(tryAwardBadge(userId, "social_room_creator"));
  return (await Promise.all(checks)).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Streak badges (standalone)
// ---------------------------------------------------------------------------

async function checkStreakBadges(userId, currentStreak) {
  const checks = [];
  if (currentStreak >= 3) checks.push(tryAwardBadge(userId, "streak_3"));
  if (currentStreak >= 7) checks.push(tryAwardBadge(userId, "streak_7"));
  if (currentStreak >= 14) checks.push(tryAwardBadge(userId, "streak_14"));
  if (currentStreak >= 30) checks.push(tryAwardBadge(userId, "streak_30"));
  if (currentStreak >= 60) checks.push(tryAwardBadge(userId, "streak_60"));
  if (currentStreak >= 100) checks.push(tryAwardBadge(userId, "streak_100"));
  return (await Promise.all(checks)).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Achievements data for endpoint
// ---------------------------------------------------------------------------

async function getAchievementsData(userId) {
  const [earned, allBadgesResult, scoreRow] = await Promise.all([
    getUserBadges(userId),
    query(`SELECT slug, name, description, emoji, category, rarity, xp_reward, achievement_points FROM badges ORDER BY achievement_points DESC`),
    query(`SELECT achievement_score FROM users WHERE id = $1`, [userId]),
  ]);

  const earnedSlugs = new Set(earned.map((b) => b.slug));
  const recent = earned.slice(-5).reverse();

  return {
    earned,
    all_badges: allBadgesResult.rows,
    progress: {},
    achievement_score: scoreRow.rows[0]?.achievement_score ?? 0,
    recent,
  };
}

async function listUserBadges(userId) {
  return getUserBadges(userId);
}

module.exports = {
  tryAwardBadge,
  checkAndAwardBadges,
  checkSpeakingBadges,
  checkWritingBadges,
  checkReadingBadges,
  checkBattleBadges,
  checkXpBadges,
  checkSocialBadges,
  checkStreakBadges,
  getAchievementsData,
  listUserBadges,
};
