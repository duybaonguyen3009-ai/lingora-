/**
 * config/sentry.js
 *
 * Sentry initialisation for the Express backend.
 *
 * Behaviour:
 *   - No-op when SENTRY_DSN is not set (local dev, CI without secrets).
 *   - Warns to stdout in production when the DSN is missing.
 *   - Exports getSentryErrorHandler() so app.js can add it conditionally —
 *     the Sentry Express error handler must be registered BEFORE our own
 *     errorHandler so Sentry captures the error before we swallow it.
 *
 * Usage:
 *   server.js  → initSentry()          (call before everything else)
 *   app.js     → app.use(getSentryErrorHandler())   (just before notFound)
 */

const Sentry = require("@sentry/node");

let initialized = false;

/**
 * Initialise Sentry.  Must be called once, as early as possible in server.js,
 * before any other requires that might throw.
 */
function initSentry() {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[Sentry] SENTRY_DSN not set — error tracking disabled in production.");
    }
    return;
  }

  Sentry.init({
    dsn,
    environment:      process.env.NODE_ENV || "development",
    // Capture 10 % of transactions in production; 100 % in dev/staging.
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    // Never send personal data to Sentry.
    sendDefaultPii: false,
  });

  initialized = true;
  console.log(`[Sentry] Initialised (env: ${process.env.NODE_ENV || "development"})`);
}

/**
 * Returns the Sentry Express error-handler middleware, or null when Sentry
 * was not initialised (missing DSN).  app.js must check before registering.
 */
function getSentryErrorHandler() {
  if (!initialized) return null;
  return Sentry.expressErrorHandler();
}

module.exports = { initSentry, getSentryErrorHandler };
