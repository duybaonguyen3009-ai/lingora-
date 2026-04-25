/**
 * routes/listeningRoutes.js
 *
 * IELTS Listening practice and exam endpoints. All routes require auth.
 */

const { Router } = require("express");
const { verifyToken } = require("../middleware/auth");
const c = require("../controllers/listeningController");

const router = Router();

router.get("/tests", verifyToken, c.listTests);
router.get("/tests/:testId", verifyToken, c.getTest);
router.get("/parts/:partId", verifyToken, c.getPart);

router.post("/attempts", verifyToken, c.startAttempt);
router.patch("/attempts/:attemptId", verifyToken, c.saveProgress);
router.post("/attempts/:attemptId/submit", verifyToken, c.submitAttempt);
router.get("/attempts/:attemptId/result", verifyToken, c.getAttemptResult);

router.get("/stats", verifyToken, c.getStats);

module.exports = router;
