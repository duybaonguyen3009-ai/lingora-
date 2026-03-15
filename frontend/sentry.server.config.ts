/**
 * sentry.server.config.ts
 *
 * Sentry initialisation for the Node.js server runtime (SSR, API routes).
 * Loaded by instrumentation.ts → register() on the server side.
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Never forward PII to Sentry (COPPA requirement — kids' app).
  sendDefaultPii: false,

  debug: false,
});
