/**
 * routes/pronunciationRoutes.js
 *
 * Pronunciation practice endpoints.
 * All routes require JWT authentication.
 */

const { Router } = require("express");
const { verifyToken } = require("../middleware/auth");
const { pronLimiters } = require("../middleware/rateLimiters");
const pronunciationController = require("../controllers/pronunciationController");

const router = Router();

// POST /api/v1/pronunciation/upload-url
router.post("/upload-url", verifyToken, pronunciationController.getUploadUrl);

// POST /api/v1/pronunciation/assess
router.post("/assess", verifyToken, ...pronLimiters, pronunciationController.assess);

// GET /api/v1/pronunciation/history/:promptId
router.get("/history/:promptId", verifyToken, pronunciationController.getHistory);

module.exports = router;
