/**
 * app.js
 *
 * Express application factory.
 * Responsible for middleware registration and route mounting.
 * Kept separate from server.js so the app can be tested without
 * binding to a port.
 */

const express      = require("express");
const helmet       = require("helmet");
const cors         = require("cors");
const morgan       = require("morgan");
const cookieParser = require("cookie-parser");

const { notFound, errorHandler } = require("./errorMiddleware");
const { getSentryErrorHandler }  = require("./config/sentry");
const healthRouter = require("./healthRoutes");

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------

function createApp() {
  const app = express();

  // -------------------------------------------------------------------------
  // Proxy trust
  // -------------------------------------------------------------------------
  // Railway (and most PaaS platforms) sit behind a reverse-proxy that sets
  // X-Forwarded-For.  Without this, req.ip is always the proxy's internal IP
  // rather than the real client IP — which breaks express-rate-limit because
  // every user appears to come from the same address.
  //
  // "1" means trust exactly one hop (the immediate proxy).  Do NOT set this to
  // true (trusts all proxies) or to an arbitrary number on a public server.
  app.set("trust proxy", 1);

  // -------------------------------------------------------------------------
  // Security & transport middleware
  // -------------------------------------------------------------------------
  app.use(helmet());
  app.use(cors({
    origin:      process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,   // required for cookies to be sent cross-origin
  }));

  // -------------------------------------------------------------------------
  // Request parsing
  // -------------------------------------------------------------------------
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());   // populates req.cookies — needed for refresh token

  // -------------------------------------------------------------------------
  // Logging
  // -------------------------------------------------------------------------
  if (process.env.NODE_ENV !== "test") {
    // "combined" (Apache format) in production gives Railway structured logs.
    // "dev" colourises output for local development.
    app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
  }

  // -------------------------------------------------------------------------
  // Routes
  // -------------------------------------------------------------------------
  app.use("/health", healthRouter);

  // Auth (register, login, refresh, logout)
  app.use("/api/v1/auth",    require("./routes/authRoutes"));

  // Content
  app.use("/api/v1/lessons", require("./routes/lessonRoutes"));
  app.use("/api/v1/courses", require("./routes/courseRoutes"));

  // Progress: POST /api/v1/lessons/:id/complete  |  GET /api/v1/users/:id/progress
  app.use("/api/v1",         require("./routes/progressRoutes"));

  // Gamification: GET /api/v1/users/:userId/gamification
  app.use("/api/v1/users",   require("./routes/gamificationRoutes"));

  // Leaderboard: GET /api/v1/leaderboard?scope=weekly|all-time
  app.use("/api/v1/leaderboard", require("./routes/leaderboardRoutes"));

  // Pronunciation practice: upload-url, assess, history
  app.use("/api/v1/pronunciation", require("./routes/pronunciationRoutes"));

  // ── Mock storage route (development only) ──
  // When using the mock storage provider, the frontend PUTs audio blobs to
  // /mock-storage/:key.  This route accepts the binary body and stores it
  // in-memory so the mock speech provider can access it.
  if ((process.env.STORAGE_PROVIDER || "mock") === "mock") {
    const mockStorage = require("./providers/storage/mockStorage");
    app.put("/mock-storage/:key", express.raw({ type: "*/*", limit: "10mb" }), (req, res) => {
      const key = decodeURIComponent(req.params.key);
      mockStorage._put(key, req.body);
      res.status(200).json({ success: true, message: "Stored (mock)" });
    });
    app.get("/mock-storage/:key", (req, res) => {
      const key = decodeURIComponent(req.params.key);
      const buf = mockStorage._get(key);
      if (!buf) return res.status(404).json({ success: false, message: "Not found" });
      res.set("Content-Type", "audio/webm");
      res.send(buf);
    });
  }

  // Future route groups (uncomment as features are built):
  // app.use("/api/v1/vocabulary", require("./routes/vocabularyRoutes"));
  // app.use("/api/v1/quizzes",    require("./routes/quizRoutes"));

  // -------------------------------------------------------------------------
  // Error handling (must be registered last)
  // -------------------------------------------------------------------------
  // Sentry error handler must come BEFORE our own errorHandler so Sentry
  // captures the error object before we convert it to a JSON response.
  const sentryErrorHandler = getSentryErrorHandler();
  if (sentryErrorHandler) app.use(sentryErrorHandler);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
