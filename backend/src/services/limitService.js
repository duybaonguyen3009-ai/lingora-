/**
 * services/limitService.js
 *
 * Daily usage limit checks for free-tier users.
 * Controlled by FREE_PERIOD flag — when true, all limits are bypassed.
 */

"use strict";

const config = require("../config");
const { query } = require("../config/db");

/**
 * Check if user can start a new speaking session today.
 */
async function checkSpeakingLimit(userId) {
  if (config.freePeriod) {
    return { allowed: true, used: 0, limit: config.speakingDailyLimit, free_period: true };
  }

  // Check Pro / trial status
  const userRow = await query(
    `SELECT is_pro, trial_expires_at FROM users WHERE id = $1`,
    [userId]
  );
  const user = userRow.rows[0];
  const isPro = user?.is_pro === true;
  const trialActive = user?.trial_expires_at && new Date(user.trial_expires_at) > new Date();

  if (isPro || trialActive) {
    return { allowed: true, used: 0, limit: null, free_period: false };
  }

  // Count today's speaking sessions
  const countRow = await query(
    `SELECT COUNT(*)::int AS count FROM scenario_sessions
      WHERE user_id = $1 AND started_at >= CURRENT_DATE AND status != 'abandoned'`,
    [userId]
  );
  const used = countRow.rows[0]?.count ?? 0;
  const allowed = used < config.speakingDailyLimit;

  return {
    allowed,
    used,
    limit: config.speakingDailyLimit,
    free_period: false,
  };
}

/**
 * Check if user can submit a new writing essay today.
 */
async function checkWritingLimit(userId) {
  if (config.freePeriod) {
    return { allowed: true, used: 0, limit: config.writingDailyLimit, free_period: true };
  }

  const userRow = await query(
    `SELECT is_pro, trial_expires_at FROM users WHERE id = $1`,
    [userId]
  );
  const user = userRow.rows[0];
  const isPro = user?.is_pro === true;
  const trialActive = user?.trial_expires_at && new Date(user.trial_expires_at) > new Date();

  if (isPro || trialActive) {
    return { allowed: true, used: 0, limit: null, free_period: false };
  }

  const countRow = await query(
    `SELECT COALESCE(writing_count, 0)::int AS count FROM writing_usage
      WHERE user_id = $1 AND date = CURRENT_DATE`,
    [userId]
  );
  const used = countRow.rows[0]?.count ?? 0;
  const allowed = used < config.writingDailyLimit;

  return {
    allowed,
    used,
    limit: config.writingDailyLimit,
    free_period: false,
  };
}

/**
 * Get full daily limits status for a user (for the API endpoint).
 */
async function getDailyLimits(userId) {
  const [speaking, writing] = await Promise.all([
    checkSpeakingLimit(userId),
    checkWritingLimit(userId),
  ]);

  const userRow = await query(`SELECT is_pro FROM users WHERE id = $1`, [userId]);
  const isPro = userRow.rows[0]?.is_pro === true;

  return {
    free_period: config.freePeriod,
    is_pro: isPro,
    speaking: { used: speaking.used, limit: speaking.limit, allowed: speaking.allowed },
    writing: { used: writing.used, limit: writing.limit, allowed: writing.allowed },
  };
}

module.exports = { checkSpeakingLimit, checkWritingLimit, getDailyLimits };
