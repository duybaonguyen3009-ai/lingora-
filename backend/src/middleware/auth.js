/**
 * middleware/auth.js
 *
 * Three reusable middleware functions that protect routes:
 *
 *   verifyToken      – validates the Bearer JWT in the Authorization header
 *                      and attaches the decoded payload to req.user.
 *
 *   requireRole      – factory that returns a middleware enforcing that
 *                      req.user has one of the allowed roles.
 *
 *   logOwnership     – diagnostic middleware: logs token user vs route param
 *                      user on every /users/:userId/* request.
 *
 * Usage:
 *   const { verifyToken, requireRole, logOwnership } = require("../middleware/auth");
 *
 *   router.get("/:userId/gamification", verifyToken, logOwnership, controller.get);
 */

const jwt    = require("jsonwebtoken");
const config = require("../config");
const authRepository = require("../repositories/authRepository");

/**
 * Extract the Bearer token from an Authorization header.
 * Returns null when the header is missing or malformed.
 * @param {string|undefined} authHeader – req.headers.authorization
 * @returns {string|null}
 */
function extractBearerToken(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}

/**
 * verifyToken middleware
 *
 * Reads the Authorization: Bearer <token> header, verifies the JWT
 * signature and expiry, then re-checks the embedded password_version
 * claim against the live users.password_version. Mismatch → 401
 * TOKEN_INVALIDATED, which signals the FE to clear local session and
 * redirect to /login.
 *
 * Backward compat (migration 0042 grace window): tokens minted BEFORE
 * deploy carry no `pv` claim. We treat `pv === undefined` as a match
 * so existing logged-in users are not kicked out on the day of deploy.
 * After config.jwt.refreshTtlDays (~30d) every legacy access token
 * will have rotated; the grace branch can then be removed.
 *
 * Adds 1 cheap DB lookup per authenticated request. Acceptable at
 * Lingora scale; can layer an in-memory LRU later if profiling shows
 * pressure.
 *
 * Attaches:
 *   req.user = { id, role, name }
 */
async function verifyToken(req, res, next) {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      console.log(`[auth] 401 — no Bearer token | ${req.method} ${req.originalUrl}`);
      const err  = new Error("Authentication required. Please include a Bearer token.");
      err.status = 401;
      return next(err);
    }

    let payload;
    try {
      payload = jwt.verify(token, config.jwt.accessSecret);
    } catch (jwtErr) {
      console.log(`[auth] 401 — ${jwtErr.name} | ${req.method} ${req.originalUrl}`);
      const err  = new Error(
        jwtErr.name === "TokenExpiredError"
          ? "Access token has expired. Please refresh your session."
          : "Access token is invalid."
      );
      err.status = 401;
      return next(err);
    }

    // password_version binding — invalidates every outstanding access JWT
    // when the user changes their password (or future password reset).
    // Legacy tokens (pre-0042 deploy) have payload.pv === undefined; we
    // grace-match those for the refresh TTL window.
    if (payload.pv !== undefined) {
      let dbVersion;
      try {
        dbVersion = await authRepository.getPasswordVersion(payload.sub);
      } catch (dbErr) {
        // Fail-closed: if the DB is unreachable we cannot safely confirm
        // the token is still valid. 503 is the more honest signal but
        // FE handles 401 → /login better, and the user would be unable
        // to do anything anyway.
        console.error(`[auth] password_version check failed for sub=${payload.sub}:`, dbErr.message);
        const err  = new Error("Authentication temporarily unavailable. Please retry.");
        err.status = 503;
        err.code   = "AUTH_DB_UNAVAILABLE";
        return next(err);
      }
      if (dbVersion === null) {
        const err  = new Error("Account no longer exists.");
        err.status = 401;
        err.code   = "USER_NOT_FOUND";
        return next(err);
      }
      if (dbVersion !== payload.pv) {
        console.log(`[auth] 401 — password_version mismatch sub=${payload.sub} token=${payload.pv} db=${dbVersion} | ${req.method} ${req.originalUrl}`);
        const err  = new Error("Token invalidated by password change. Please log in again.");
        err.status = 401;
        err.code   = "TOKEN_INVALIDATED";
        return next(err);
      }
    }

    // Attach a clean user object — never expose the full raw JWT payload
    req.user = {
      id:   payload.sub,
      role: payload.role,
      name: payload.name,
    };

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * logOwnership middleware
 *
 * Diagnostic middleware for /users/:userId/* routes.
 * Logs the authenticated user ID from the JWT vs the userId from the
 * route params so identity mismatches are immediately visible.
 *
 * Must be placed AFTER verifyToken.
 */
function logOwnership(req, res, next) {
  const tokenUser = req.user?.id || "(none)";
  const routeUser = req.params.userId || "(none)";
  const match     = tokenUser === routeUser;

  // Capture response status after it's sent
  const origEnd = res.end;
  res.end = function (...args) {
    console.log(
      `[auth] token user: ${tokenUser} | route user: ${routeUser} | match: ${match} | status: ${res.statusCode} | ${req.method} ${req.originalUrl}`
    );
    origEnd.apply(this, args);
  };

  next();
}

/**
 * requireRole(...allowedRoles) → middleware
 *
 * Must be used AFTER verifyToken (depends on req.user being set).
 * Returns 403 Forbidden when the authenticated user's role is not in the
 * allowed list.
 *
 * @param {...string} allowedRoles – e.g. "admin", "teacher"
 * @returns {import("express").RequestHandler}
 */
function requireRole(...allowedRoles) {
  return function roleGuard(req, res, next) {
    if (!req.user) {
      // Should never happen if verifyToken is used first, but guard anyway.
      const err  = new Error("Authentication required.");
      err.status = 401;
      return next(err);
    }

    if (!allowedRoles.includes(req.user.role)) {
      const err  = new Error(
        `Access denied. Required role: ${allowedRoles.join(" or ")}.`
      );
      err.status = 403;
      return next(err);
    }

    next();
  };
}

module.exports = { verifyToken, requireRole, logOwnership };
