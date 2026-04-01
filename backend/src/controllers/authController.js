/**
 * controllers/authController.js
 *
 * HTTP layer for the four auth endpoints:
 *   POST /auth/register
 *   POST /auth/login
 *   POST /auth/refresh
 *   POST /auth/logout
 *
 * Responsibilities:
 *  - Validate and sanitise request input.
 *  - Call authService — never repositories directly.
 *  - Set / clear the httpOnly refresh-token cookie.
 *  - Return the standard { success, message, data } envelope.
 *  - Forward unexpected errors to errorMiddleware via next().
 */

const authService   = require("../services/authService");
const { sendSuccess } = require("../response");
const config          = require("../config");

// ─── Cookie helpers ───────────────────────────────────────────────────────────

const REFRESH_COOKIE_NAME = "lingora_refresh";

/**
 * Build cookie options from config.
 * maxAge is set dynamically from the token's actual expiry.
 * @param {Date} expiresAt
 * @returns {object}
 */
function refreshCookieOptions(expiresAt) {
  return {
    httpOnly: true,
    secure:   config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path:     config.cookie.path,
    expires:  expiresAt,   // absolute expiry matches the DB record
  };
}

/**
 * Options to clear the refresh cookie (expire it immediately).
 * Path must match the setting cookie's path or the browser won't delete it.
 */
const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   config.cookie.secure,
  sameSite: config.cookie.sameSite,
  path:     config.cookie.path,
};

// ─── Input validation helpers ─────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Collect all validation errors in a request body.
 * Returns an array of error strings; empty array means valid.
 * @param {object} body
 * @param {string[]} required – field names that must be non-empty strings
 * @param {object}  [extra]   – additional checks { fieldName: (value) => errorString|null }
 * @returns {string[]}
 */
function validate(body, required, extra = {}) {
  const errors = [];

  for (const field of required) {
    if (!body[field] || typeof body[field] !== "string" || !body[field].trim()) {
      errors.push(`${field} is required.`);
    }
  }

  for (const [field, check] of Object.entries(extra)) {
    if (body[field]) {
      const msg = check(body[field]);
      if (msg) errors.push(msg);
    }
  }

  return errors;
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/register
 *
 * Body: { email, name, password, role?, dob? }
 *
 * Returns 201 with { user, accessToken } and sets the refresh cookie.
 * Returns 400 on validation failure.
 * Returns 409 if email is already taken.
 */
async function register(req, res, next) {
  try {
    const { email, name, password, role, dob } = req.body;

    const errors = validate(
      req.body,
      ["email", "name", "password"],
      {
        email: (v) => EMAIL_REGEX.test(v) ? null : "email must be a valid email address.",
        password: (v) => v.length >= 8 ? null : "password must be at least 8 characters.",
        role: (v) => {
          const valid = ["kid", "teacher", "parent"];
          return valid.includes(v) ? null : `role must be one of: ${valid.join(", ")}.`;
        },
        dob: (v) => {
          const d = new Date(v);
          return isNaN(d.getTime()) ? "dob must be a valid date (YYYY-MM-DD)." : null;
        },
      }
    );

    if (errors.length) {
      const err = new Error(errors.join(" "));
      err.status = 400;
      return next(err);
    }

    const result = await authService.register({
      email:    email.trim().toLowerCase(),
      name:     name.trim(),
      password,
      role:     role || "kid",
      dob:      dob  || null,
    });

    res.cookie(
      REFRESH_COOKIE_NAME,
      result.refreshToken,
      refreshCookieOptions(result.refreshExpiresAt)
    );

    return sendSuccess(res, {
      status:  201,
      message: "Account created successfully.",
      data: {
        user:        result.user,
        accessToken: result.accessToken,
        // Surface the COPPA flag so the frontend can show a "check your parent's email" banner
        needsParentalConsent: result.needsParentalConsent,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/login
 *
 * Body: { email, password }
 *
 * Returns 200 with { user, accessToken } and sets the refresh cookie.
 * Returns 400 on missing fields.
 * Returns 401 on wrong credentials (generic message — no email enumeration).
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const errors = validate(req.body, ["email", "password"]);
    if (errors.length) {
      const err = new Error(errors.join(" "));
      err.status = 400;
      return next(err);
    }

    const result = await authService.login({
      email:    email.trim().toLowerCase(),
      password,
    });

    res.cookie(
      REFRESH_COOKIE_NAME,
      result.refreshToken,
      refreshCookieOptions(result.refreshExpiresAt)
    );

    return sendSuccess(res, {
      message: "Logged in successfully.",
      data: {
        user:        result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/refresh
 *
 * Reads the refresh token from the httpOnly cookie — no body required.
 *
 * Returns 200 with a new { accessToken } and rotates the refresh cookie.
 * Returns 401 if the cookie is missing, invalid, expired, or already used.
 */
async function refresh(req, res, next) {
  try {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];

    const result = await authService.refreshTokens(rawToken);

    res.cookie(
      REFRESH_COOKIE_NAME,
      result.refreshToken,
      refreshCookieOptions(result.refreshExpiresAt)
    );

    return sendSuccess(res, {
      message: "Token refreshed successfully.",
      data: {
        user:        result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/logout
 *
 * Revokes the refresh token and clears the cookie.
 * Always returns 200 — even if the cookie was already absent or expired —
 * so the frontend can safely call this on every "sign out" action.
 */
async function logout(req, res, next) {
  try {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
    await authService.logout(rawToken);

    res.clearCookie(REFRESH_COOKIE_NAME, CLEAR_COOKIE_OPTIONS);

    return sendSuccess(res, { message: "Logged out successfully." });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout };
