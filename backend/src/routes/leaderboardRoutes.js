/**
 * routes/leaderboardRoutes.js
 *
 * Leaderboard endpoints.
 * The GET route is public but optionally identifies the requester via JWT
 * so the response can include their own rank entry.
 */

const { Router } = require('express');
const { listLeaderboard } = require('../controllers/leaderboardController');
const { verifyToken }     = require('../middleware/auth');

const router = Router();

// Optional auth — verifyToken with `passThrough: true` so unauthenticated
// requests still succeed (req.user will be undefined).
// We implement this inline: catch the JWT error and call next() anyway.
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // no token → skip
  }
  // Use verifyToken but swallow auth errors so the route stays public.
  verifyToken(req, res, (err) => {
    if (err) req.user = undefined; // token invalid → treat as anonymous
    next();
  });
}

// GET /api/v1/leaderboard?scope=weekly|all-time
router.get('/', optionalAuth, listLeaderboard);

module.exports = router;
