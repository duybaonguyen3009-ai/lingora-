/**
 * middleware/auth.js
 *
 * Two reusable middleware functions that protect routes:
 *
 *   verifyToken   – validates the Bearer JWT in the Authorization header
 *                   and attaches the decoded payload to req.user.
 *
 *   requireRole   – factory that returns a middleware enforcing that
 *                   req.user has one of the allowed roles.
 *
 * Usage:
 *   const { verifyToken, requireRole } = require("../middleware/auth");
 *
 *   // Require any authenticated user:
 *   router.get("/me", verifyToken, controller.getMe);
 *
 *   // Require a specific role:
 *   router.post("/admin/lessons", verifyToken, requireRole("admin"), controller.createLesson);
 *
 *   // Require one of several roles:
 *   router.get("/classrooms", verifyToken, requireRole("teacher", "admin"), controller.list);
 */

const jwt    = require("jsonwebtoken");
const config = require("../config");

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
 * signature and expiry, and attaches the decoded payload to req.user:
 *
 *   req.user = { id, role, name }
 *
 * Responds 401 when the token is absent, invalid, or expired.
 * Responds 500 on unexpected errors.
 */
function verifyToken(req, res, next) {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      const err  = new Error("Authentication required. Please include a Bearer token.");
      err.status = 401;
      return next(err);
    }

    let payload;
    try {
      payload = jwt.verify(token, config.jwt.accessSecret);
    } catch (jwtErr) {
      const err  = new Error(
        jwtErr.name === "TokenExpiredError"
          ? "Access token has expired. Please refresh your session."
          : "Access token is invalid."
      );
      err.status = 401;
      return next(err);
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

module.exports = { verifyToken, requireRole };
