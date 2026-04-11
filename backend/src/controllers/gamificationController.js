/**
 * controllers/gamificationController.js
 *
 * HTTP layer for per-user gamification data.
 * Returns XP summary, streak, and badge collection for a given user.
 */

const UUID_RE                = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const { getXpSummary }      = require('../services/xpService');
const { getStreakSummary }  = require('../services/streakService');
const { listUserBadges }    = require('../services/badgeService');
const { sendSuccess }       = require('../response');

/**
 * GET /api/v1/users/:userId/gamification
 *
 * Protected endpoint — requires a valid JWT (verifyToken applied in routes).
 * Users may only fetch their own gamification data (enforced here).
 */
async function getUserGamification(req, res, next) {
  try {
    const { userId } = req.params;

    if (!UUID_RE.test(userId)) {
      const err = new Error('Invalid userId — must be a UUID');
      err.status = 400;
      return next(err);
    }

    // Users can only read their own data.
    if (req.user.id !== userId) {
      const err = new Error('Forbidden — you may only read your own gamification data');
      err.status = 403;
      return next(err);
    }

    // Fetch XP, streak and badges in parallel — all go through the service layer.
    const [xp, streak, badges] = await Promise.all([
      getXpSummary(userId),
      getStreakSummary(userId),
      listUserBadges(userId),
    ]);

    return sendSuccess(res, {
      message: 'Gamification data',
      data:    { xp, streak, badges },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/users/:userId/band-progress
 *
 * Returns estimated band, band history, weekly delta, and per-skill averages.
 */
async function getBandProgress(req, res, next) {
  try {
    const { userId } = req.params;

    if (!UUID_RE.test(userId)) {
      const err = new Error("Invalid userId");
      err.status = 400;
      return next(err);
    }

    if (req.user.id !== userId) {
      const err = new Error("Forbidden");
      err.status = 403;
      return next(err);
    }

    const { query } = require("../config/db");
    const result = await query(
      `SELECT estimated_band, band_history FROM users WHERE id = $1`,
      [userId]
    );
    const user = result.rows[0];
    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      return next(err);
    }

    const history = user.band_history || [];
    const estimatedBand = user.estimated_band ? Number(user.estimated_band) : null;

    // Compute week delta from last 2 entries
    let weekDelta = 0;
    if (history.length >= 2) {
      weekDelta = Math.round((history[history.length - 1].band - history[history.length - 2].band) * 10) / 10;
    }

    // Compute per-skill averages
    const speakingEntries = history.filter((h) => h.skill === "speaking");
    const writingEntries = history.filter((h) => h.skill === "writing");
    const speakingAvg = speakingEntries.length > 0
      ? Math.round(speakingEntries.reduce((s, e) => s + e.band, 0) / speakingEntries.length * 10) / 10
      : null;
    const writingAvg = writingEntries.length > 0
      ? Math.round(writingEntries.reduce((s, e) => s + e.band, 0) / writingEntries.length * 10) / 10
      : null;

    // Target band: next whole number above current, or current + 1
    const targetBand = estimatedBand ? Math.ceil(estimatedBand + 0.1) : 6.0;

    return sendSuccess(res, {
      message: "Band progress",
      data: {
        estimated_band: estimatedBand,
        target_band: targetBand,
        band_history: history,
        week_delta: weekDelta,
        speaking_avg: speakingAvg,
        writing_avg: writingAvg,
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getUserGamification, getBandProgress };
