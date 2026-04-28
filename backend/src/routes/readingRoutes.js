/**
 * routes/readingRoutes.js
 *
 * IELTS Reading practice and full test endpoints.
 */

const { Router } = require("express");
const { verifyToken } = require("../middleware/auth");
const c = require("../controllers/readingController");

const router = Router();

router.get("/passages", verifyToken, c.listPassages);
router.get("/passages/:passageId", verifyToken, c.getPassage);
router.post("/submit", verifyToken, c.submitPractice);
router.get("/full-tests", verifyToken, c.listFullTests);
router.post("/full-test/start", verifyToken, c.startFullTest);
router.post("/full-test/submit", verifyToken, c.submitFullTest);

// Wave 2.9: paginated owner-only Reading history.
router.get("/history", verifyToken, c.getHistory);

module.exports = router;
