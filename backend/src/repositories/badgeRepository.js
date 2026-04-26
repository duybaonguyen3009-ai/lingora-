/**
 * repositories/badgeRepository.js
 *
 * Raw SQL for the badges and user_badges tables.
 * No business logic — just DB access.
 */

const { query } = require('../config/db');

/**
 * getBadgeBySlug
 *
 * Looks up a badge definition by its machine identifier (slug).
 * Returns null if no badge with that slug exists.
 *
 * @param {string} slug
 * @returns {Promise<object|null>}
 */
async function getBadgeBySlug(slug) {
  const result = await query(
    `SELECT id, slug, name, description, icon_url, xp_reward
     FROM   badges
     WHERE  slug = $1`,
    [slug],
  );
  return result.rows[0] ?? null;
}

/**
 * userHasBadge
 *
 * Returns true if the user already holds the specified badge.
 * Used to guard against duplicate awards (composite PK also prevents DB dups).
 *
 * @param {string} userId
 * @param {string} badgeId
 * @returns {Promise<boolean>}
 */
async function userHasBadge(userId, badgeId) {
  const result = await query(
    `SELECT 1
     FROM   user_badges
     WHERE  user_id  = $1
       AND  badge_id = $2`,
    [userId, badgeId],
  );
  return result.rowCount > 0;
}

/**
 * awardBadge
 *
 * Inserts a user_badges row. Returns the badge definition ONLY if a new row
 * was actually inserted; returns null if the row already existed (idempotent
 * skip). Callers MUST treat null as "do not award XP / achievement_score" —
 * this closes the badge-race double-grant vector (Audit Wave 1).
 *
 * @param {string} userId
 * @param {string} badgeId
 * @returns {Promise<object|null>} badge definition if inserted, null on conflict
 */
async function awardBadge(userId, badgeId) {
  const insertResult = await query(
    `INSERT INTO user_badges (user_id, badge_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING
     RETURNING badge_id`,
    [userId, badgeId],
  );
  if (insertResult.rowCount === 0) return null;

  const detail = await query(
    `SELECT id, slug, name, description, icon_url, xp_reward
     FROM   badges
     WHERE  id = $1`,
    [badgeId],
  );
  return detail.rows[0] ?? null;
}

/**
 * getUserBadges
 *
 * Returns all badges earned by a user, ordered by award time (oldest first).
 *
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
async function getUserBadges(userId) {
  const result = await query(
    `SELECT b.id, b.slug, b.name, b.description, b.icon_url, b.xp_reward,
            ub.awarded_at
     FROM   user_badges ub
     JOIN   badges b ON b.id = ub.badge_id
     WHERE  ub.user_id = $1
     ORDER  BY ub.awarded_at ASC`,
    [userId],
  );
  return result.rows;
}

module.exports = { getBadgeBySlug, userHasBadge, awardBadge, getUserBadges };
