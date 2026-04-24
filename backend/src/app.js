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
  // Voice messages POST base64 audio in JSON body (~120KB for 30s opus).
  // Default 100kb would 413 — 5mb covers 60s + waveform_peaks payload.
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true, limit: "5mb" }));
  app.use(cookieParser());   // populates req.cookies — needed for refresh token

  // -------------------------------------------------------------------------
  // Passport (Google OAuth — stateless, no sessions)
  // -------------------------------------------------------------------------
  const { configurePassport, passport: pp } = require("./config/passport");
  configurePassport();
  app.use(pp.initialize());

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

  // AI Study Coach: GET /api/v1/users/:userId/coach/focus
  app.use("/api/v1/users",   require("./routes/coachRoutes"));

  // Leaderboard: GET /api/v1/leaderboard?scope=weekly|all-time
  app.use("/api/v1/leaderboard", require("./routes/leaderboardRoutes"));

  // Pronunciation practice: upload-url, assess, history
  app.use("/api/v1/pronunciation", require("./routes/pronunciationRoutes"));

  // Scenario speaking: AI role-play conversations
  app.use("/api/v1/scenarios", require("./routes/scenarioRoutes"));

  // IELTS Writing: essay submission + AI scoring
  app.use("/api/v1/writing", require("./routes/writingRoutes"));

  // IELTS Reading: practice + full test
  app.use("/api/v1/reading", require("./routes/readingRoutes"));

  // Pro subscription: status, trial, upgrade
  app.use("/api/v1/users", require("./routes/proRoutes"));

  // Onboarding: status, complete, skip
  app.use("/api/v1/users", require("./routes/onboardingRoutes"));

  // Profile: update, avatar, stats, public view
  app.use("/api/v1", require("./routes/profileRoutes"));

  // Serve avatar images + voice notes
  app.use("/avatars", require("express").static(require("path").join(__dirname, "..", "public", "avatars")));
  app.use("/voice-notes", require("express").static(require("path").join(__dirname, "..", "public", "voice-notes")));

  // Friend chat: conversations, messages, voice notes
  app.use("/api/v1/chat", require("./routes/chatRoutes"));

  // Subscription (GET status, toggle auto-renew, apply promo)
  app.use("/api/v1/users/subscription", require("./routes/subscriptionRoutes"));

  // User preferences (GET, PATCH — target_band, exam_date, daily_xp_goal, notifications)
  app.use("/api/v1/users/preferences", require("./routes/userPreferencesRoutes"));

  // User feedback: post-activity rating + comments
  app.use("/api/v1/feedback", require("./routes/feedbackRoutes"));

  // Social: friends, pings, notifications, profile
  app.use("/api/v1/social", require("./routes/socialRoutes"));

  // Study rooms: group study with goals, notes, activity feed
  app.use("/api/v1/study-rooms", require("./routes/studyRoomRoutes"));

  // Share cards: progress card generation
  app.use("/api/v1/share-cards", require("./routes/shareCardRoutes"));

  // IELTS Battle: 1v1 async reading battles with ranked matchmaking
  app.use("/api/v1/battle", require("./routes/battleRoutes"));

  // Admin (promo emails, announcements)
  app.use("/api/v1/admin", require("./routes/adminRoutes"));

  // ── Battle match expiry job (every 5 minutes) ──
  const { expireOverdueMatches } = require("./services/battleService");
  const battleExpiryInterval = setInterval(() => {
    expireOverdueMatches().catch((err) => {
      console.error("[battle] expiry job error:", err.message);
    });
  }, 5 * 60 * 1000);

  // Expose interval ID for graceful shutdown
  app._battleExpiryInterval = battleExpiryInterval;

  // ── Writing scoring-cache LRU eviction (daily, 03:00 VN / 20:00 UTC) ──
  // Skipped under Jest so the scheduler doesn't keep test runs alive.
  if (process.env.NODE_ENV !== "test") {
    const { scheduleEviction } = require("./jobs/scoringCacheEviction");
    app._scoringCacheEvictionTask = scheduleEviction();

    // ── Writing Full Test expiry sweep (hourly at :05 UTC) ──
    const { scheduleExpiry } = require("./jobs/fullTestExpiry");
    app._fullTestExpiryTask = scheduleExpiry();
  }

  // ── Mock storage route (development only) ──
  // When using the mock storage provider, the frontend PUTs audio blobs to
  // /mock-storage/:key.  This route accepts the binary body and stores it
  // in-memory so the mock speech provider can access it.
  if ((process.env.STORAGE_PROVIDER || "mock") === "mock" && process.env.NODE_ENV !== "production") {
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
