/**
 * routes/gamificationRoutes.js
 *
 * Gamification endpoints (XP, streaks, badges) for individual users.
 */

const { Router }              = require('express');
const { getUserGamification, getBandProgress } = require('../controllers/gamificationController');
const { getMetrics }          = require('../controllers/pronunciationController');
const { verifyToken, logOwnership } = require('../middleware/auth');

const router = Router();

// GET /api/v1/users/:userId/gamification
router.get('/:userId/gamification', verifyToken, logOwnership, getUserGamification);

// GET /api/v1/users/:userId/pronunciation/metrics
router.get('/:userId/pronunciation/metrics', verifyToken, logOwnership, getMetrics);

// GET /api/v1/users/:userId/band-progress
router.get('/:userId/band-progress', verifyToken, logOwnership, getBandProgress);

module.exports = router;
