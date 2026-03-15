/**
 * routes/gamificationRoutes.js
 *
 * Gamification endpoints (XP, streaks, badges) for individual users.
 */

const { Router }              = require('express');
const { getUserGamification } = require('../controllers/gamificationController');
const { verifyToken }         = require('../middleware/auth');

const router = Router();

// GET /api/v1/users/:userId/gamification
router.get('/:userId/gamification', verifyToken, getUserGamification);

module.exports = router;
