/**
 * routes/profileRoutes.js
 *
 * User profile endpoints: update, avatar, stats, public view.
 */

const { Router } = require("express");
const { verifyToken } = require("../middleware/auth");
const c = require("../controllers/profileController");

const router = Router();

// Private (auth required)
router.post("/users/profile", verifyToken, c.updateProfile);
router.post("/users/avatar", verifyToken, c.uploadAvatar);
router.get("/users/profile/stats", verifyToken, c.getProfileStats);

// Debug endpoint — temporarily public, remove after diagnosing production issue
router.get("/users/profile/stats/debug", async (req, res) => {
  const { query } = require("../config/db");
  const results = {};
  const errors = {};

  const testQueries = {
    users_basic: `SELECT id, name, email FROM users LIMIT 1`,
    users_profile_cols: `SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position`,
    xp_ledger: `SELECT COUNT(*)::int AS count FROM xp_ledger`,
    user_streaks: `SELECT COUNT(*)::int AS count FROM user_streaks`,
    badges: `SELECT COUNT(*)::int AS count FROM badges`,
    scenario_sessions: `SELECT COUNT(*)::int AS count FROM scenario_sessions`,
    writing_submissions: `SELECT COUNT(*)::int AS count FROM writing_submissions`,
    battle_player_profiles: `SELECT COUNT(*)::int AS count FROM battle_player_profiles`,
    migrations: `SELECT name FROM pgmigrations ORDER BY run_on DESC LIMIT 10`,
  };

  for (const [key, sql] of Object.entries(testQueries)) {
    try {
      const r = await query(sql);
      results[key] = r.rows.slice(0, 10);
    } catch (err) {
      errors[key] = err.message;
    }
  }

  res.json({ ok: Object.keys(errors).length === 0, results, errors });
});

// Public
router.get("/profile/:username", c.getPublicProfile);

module.exports = router;
