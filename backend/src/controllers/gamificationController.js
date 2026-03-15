/**
 * controllers/gamificationController.js
 *
 * HTTP layer for per-user gamification data.
 * Returns XP summary, streak, and badge collection for a given user.
 */

const UUID_RE              = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const { getXpSummary }    = require('../services/xpService');
const { getStreakSummary } = require('../services/streakService');
const { getUserBadges }    = require('../repositories/badgeRepository');

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
      return res.status(400).json({
        success: false,
        message: 'Invalid userId — must be a UUID',
        data:    null,
      });
    }

    // Users can only read their own data.
    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden — you may only read your own gamification data',
        data:    null,
      });
    }

    // Fetch XP, streak and badges in parallel.
    const [xp, streak, badges] = await Promise.all([
      getXpSummary(userId),
      getStreakSummary(userId),
      getUserBadges(userId),
    ]);

    return res.json({
      success: true,
      message: 'Gamification data',
      data:    { xp, streak, badges },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getUserGamification };
