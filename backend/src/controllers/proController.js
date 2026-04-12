/**
 * controllers/proController.js
 *
 * Pro subscription status, trial start, and placeholder payment.
 */

const { query } = require("../config/db");
const { sendSuccess, sendError } = require("../response");

const FREE_SPEAKING_LIMIT = 3;
const FREE_WRITING_LIMIT = 1;

async function getProStatus(req, res, next) {
  try {
    const userId = req.user.id;

    const [userRow, speakingRow, writingRow] = await Promise.all([
      query(`SELECT is_pro, trial_expires_at FROM users WHERE id = $1`, [userId]),
      query(
        `SELECT COUNT(*)::int AS count FROM scenario_sessions
          WHERE user_id = $1 AND started_at >= CURRENT_DATE`,
        [userId]
      ),
      query(
        `SELECT writing_count FROM writing_usage
          WHERE user_id = $1 AND date = CURRENT_DATE`,
        [userId]
      ),
    ]);

    const user = userRow.rows[0];
    if (!user) return sendError(res, { status: 404, message: "User not found" });

    // Check if trial is still active
    const trialActive = user.trial_expires_at && new Date(user.trial_expires_at) > new Date();
    const isPro = user.is_pro === true || trialActive;

    return sendSuccess(res, {
      data: {
        is_pro: isPro,
        is_trial: trialActive && !user.is_pro,
        trial_expires_at: user.trial_expires_at,
        daily_limits: {
          speaking_used: speakingRow.rows[0]?.count ?? 0,
          speaking_limit: isPro ? null : FREE_SPEAKING_LIMIT,
          writing_used: writingRow.rows[0]?.writing_count ?? 0,
          writing_limit: isPro ? null : FREE_WRITING_LIMIT,
        },
      },
      message: "Pro status retrieved",
    });
  } catch (err) { next(err); }
}

async function startTrial(req, res, next) {
  try {
    const userId = req.user.id;

    // Check if user already had a trial or is pro
    const userRow = await query(`SELECT is_pro, trial_expires_at FROM users WHERE id = $1`, [userId]);
    const user = userRow.rows[0];

    if (user.is_pro) return sendError(res, { status: 409, message: "Already a Pro user" });
    if (user.trial_expires_at) return sendError(res, { status: 409, message: "Trial already used" });

    // Start 3-day trial
    const trialEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    await query(
      `UPDATE users SET trial_expires_at = $2, updated_at = now() WHERE id = $1`,
      [userId, trialEnd]
    );

    return sendSuccess(res, {
      data: { trial_expires_at: trialEnd.toISOString(), is_pro: true, is_trial: true },
      status: 201,
      message: "Trial started — 3 days free",
    });
  } catch (err) { next(err); }
}

async function upgradePlaceholder(req, res, next) {
  try {
    const userId = req.user.id;

    // Placeholder: just set is_pro = true
    await query(`UPDATE users SET is_pro = true, updated_at = now() WHERE id = $1`, [userId]);

    return sendSuccess(res, {
      data: { is_pro: true },
      message: "Upgrade successful (placeholder)",
    });
  } catch (err) { next(err); }
}

async function getDailyLimits(req, res, next) {
  try {
    const { getDailyLimits: fetchLimits } = require("../services/limitService");
    const limits = await fetchLimits(req.user.id);
    return sendSuccess(res, { data: limits, message: "Daily limits retrieved" });
  } catch (err) { next(err); }
}

async function getAchievements(req, res, next) {
  try {
    const { getAchievementsData } = require("../services/badgeService");
    const data = await getAchievementsData(req.user.id);
    return sendSuccess(res, { data, message: "Achievements retrieved" });
  } catch (err) { next(err); }
}

module.exports = { getProStatus, startTrial, upgradePlaceholder, getDailyLimits, getAchievements };
