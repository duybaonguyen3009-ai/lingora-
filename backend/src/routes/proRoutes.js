/**
 * routes/proRoutes.js
 *
 * Pro subscription endpoints.
 */

const { Router } = require("express");
const { verifyToken } = require("../middleware/auth");
const c = require("../controllers/proController");

const router = Router();

router.get("/pro-status", verifyToken, c.getProStatus);
router.get("/daily-limits", verifyToken, c.getDailyLimits);
router.get("/achievements", verifyToken, c.getAchievements);
router.post("/start-trial", verifyToken, c.startTrial);
router.post("/upgrade", verifyToken, c.upgradePlaceholder);

module.exports = router;
