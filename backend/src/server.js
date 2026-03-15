/**
 * server.js
 *
 * HTTP server entry point.
 * Loads environment variables, creates the Express app, and binds to a port.
 * Keep this file thin — all app logic lives in app.js.
 */

// dotenv must be loaded first so SENTRY_DSN is available before Sentry.init()
require("dotenv").config();

// Sentry must be initialised before any other requires that might throw.
const { initSentry } = require("./config/sentry");
initSentry();

const createApp = require("./app");

const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || "development";

const app = createApp();

const server = app.listen(PORT, () => {
  console.log("─────────────────────────────────────────");
  console.log(`  Lingora API`);
  console.log(`  Env  : ${NODE_ENV}`);
  console.log(`  Port : ${PORT}`);
  console.log(`  URL  : http://localhost:${PORT}`);
  console.log("─────────────────────────────────────────");
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully…`);
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

// Unhandled promise rejections — log and exit so the process doesn't silently
// continue in a broken state.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});

module.exports = server; // exported for integration tests
