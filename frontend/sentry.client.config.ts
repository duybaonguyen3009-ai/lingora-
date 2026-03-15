/**
 * sentry.client.config.ts
 *
 * Sentry initialisation for the browser (client) bundle.
 * Loaded by instrumentation.ts → register() on the client side.
 *
 * See: https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 10% of transactions in production; 100% otherwise.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Capture 10% of sessions for session-replay in production.
  replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Always capture session replay on errors.
  replaysOnErrorSampleRate: 1.0,

  // Suppress noisy console output in development.
  debug: false,
});
