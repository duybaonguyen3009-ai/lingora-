/**
 * routes/authRoutes.js
 *
 * Mounted at /api/v1/auth in app.js.
 *
 * Rate limiting is applied here (not at the app level) so the stricter
 * limit only affects auth endpoints, not the rest of the API.
 *
 *   POST /api/v1/auth/register
 *   POST /api/v1/auth/login
 *   POST /api/v1/auth/refresh
 *   POST /api/v1/auth/logout
 */

const { Router }    = require("express");
const rateLimit     = require("express-rate-limit");
const authController = require("../controllers/authController");

const router = Router();

// ─── Rate limiter ─────────────────────────────────────────────────────────────
// 10 requests per 15-minute window per IP.
// Brute-force attacks on /login and /register hit this limit first.
const authLimiter = rateLimit({
  windowMs:          15 * 60 * 1000, // 15 minutes
  max:               10,
  standardHeaders:   true,           // Return rate limit info in RateLimit-* headers
  legacyHeaders:     false,
  message: {
    success: false,
    message: "Too many requests. Please wait 15 minutes and try again.",
  },
});

router.use(authLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────

/** Create a new account */
router.post("/register", authController.register);

/** Log in with email + password */
router.post("/login",    authController.login);

/**
 * Silently exchange a refresh cookie for a new access token.
 * No body needed — reads the httpOnly cookie automatically.
 */
router.post("/refresh",  authController.refresh);

/** Revoke the refresh token and clear the cookie */
router.post("/logout",   authController.logout);

module.exports = router;
