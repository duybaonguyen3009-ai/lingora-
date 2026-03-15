/**
 * controllers/leaderboardController.js
 *
 * HTTP layer for the leaderboard endpoints.
 * Validates query params, delegates to leaderboardService, returns envelope.
 */

const { getLeaderboard } = require('../services/leaderboardService');

const VALID_SCOPES = new Set(['weekly', 'all-time']);

/**
 * GET /api/v1/leaderboard?scope=weekly|all-time
 *
 * Public endpoint — no auth required to view.
 * If the request carries a verified JWT (req.user set by optional auth),
 * the response includes myEntry so the frontend can highlight the current user.
 */
async function listLeaderboard(req, res, next) {
  try {
    const scope = req.query.scope ?? 'all-time';
    if (!VALID_SCOPES.has(scope)) {
      return res.status(400).json({
        success: false,
        message: `Invalid scope. Must be one of: ${[...VALID_SCOPES].join(', ')}`,
        data:    null,
      });
    }

    // req.user is populated by verifyToken if the client sent a token,
    // but the route does NOT require auth — fall back to null gracefully.
    const requestingUserId = req.user?.id ?? null;

    const { entries, myEntry } = await getLeaderboard(scope, requestingUserId);

    return res.json({
      success: true,
      message: `${scope} leaderboard`,
      data:    { scope, entries, myEntry },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listLeaderboard };
