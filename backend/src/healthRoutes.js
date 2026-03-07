/**
 * healthRoutes.js
 *
 * Simple liveness/readiness endpoint.
 * Used by orchestration tools (Docker, k8s, load balancers) to verify
 * the service is up and responding.
 */

const { Router } = require("express");

const router = Router();

// GET /health
router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    service: "lingora-api",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
