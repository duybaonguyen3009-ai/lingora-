/**
 * routes/shareCardRoutes.js
 */

const { Router } = require("express");
const { verifyToken } = require("../middleware/auth");
const { socialLimiters } = require("../middleware/rateLimiters");
const c = require("../controllers/shareCardController");

const router = Router();

router.get("/preview-data", verifyToken, c.getPreviewData);
router.post("/generate", verifyToken, ...socialLimiters, c.generateCard);
router.get("/history", verifyToken, c.getHistory);

module.exports = router;
