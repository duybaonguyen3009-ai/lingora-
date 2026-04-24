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
const { verifyToken } = require("../middleware/auth");

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

/** Change password (authenticated). Handles both SSO-only users setting
 *  initial pass and existing-pass users rotating. */
router.post("/change-password", verifyToken, authController.handleChangePassword);

// ─── Google OAuth ────────────────────────────────────────────────────────────

const { passport } = require("../config/passport");
const authService = require("../services/authService");
const config = require("../config");

const REFRESH_COOKIE_NAME = "lingora_refresh";

/**
 * GET /api/v1/auth/google — redirect to Google consent screen.
 * Only registered if GOOGLE_CLIENT_ID is set.
 */
if (process.env.GOOGLE_CLIENT_ID) {
  router.get("/google", passport.authenticate("google", {
    session: false,
    scope: ["profile", "email"],
  }));

  /**
   * GET /api/v1/auth/google/callback — handle Google redirect.
   * Issues JWT + refresh cookie, then redirects to frontend callback page.
   */
  router.get("/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: "/login?error=google_failed" }),
    async (req, res, next) => {
      try {
        const profile = req.user;
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName || "User";
        const googleId = profile.id;
        const avatarUrl = profile.photos?.[0]?.value || null;

        if (!email) {
          return res.redirect("/login?error=no_email");
        }

        const result = await authService.googleAuth({ googleId, email, name, avatarUrl });

        // Set refresh cookie (same as login)
        res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, {
          httpOnly: true,
          secure: config.cookie.secure,
          sameSite: config.cookie.sameSite,
          path: config.cookie.path,
          expires: result.refreshExpiresAt,
        });

        // Redirect to frontend callback with access token in URL
        const frontendUrl = process.env.FRONTEND_URL || "https://lingona.app";
        const callbackUrl = `${frontendUrl}/auth/google/callback?token=${encodeURIComponent(result.accessToken)}&user=${encodeURIComponent(JSON.stringify(result.user))}`;
        res.redirect(callbackUrl);
      } catch (err) {
        next(err);
      }
    }
  );
}

module.exports = router;
