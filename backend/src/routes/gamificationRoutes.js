/**
 * routes/gamificationRoutes.js
 *
 * Gamification endpoints (XP, streaks, badges) for individual users.
 */

const { Router }              = require('express');
const { getUserGamification } = require('../controllers/gamificationController');
const { getMetrics }          = require('../controllers/pronunciationController');
const { verifyToken, logOwnership } = require('../middleware/auth');

const router = Router();

// GET /api/v1/users/:userId/gamification
router.get('/:userId/gamification', verifyToken, logOwnership, getUserGamification);

// GET /api/v1/users/:userId/pronunciation/metrics
router.get('/:userId/pronunciation/metrics', verifyToken, logOwnership, getMetrics);

module.exports = router;
