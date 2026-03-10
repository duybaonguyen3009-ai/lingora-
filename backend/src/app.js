/**
 * app.js
 *
 * Express application factory.
 * Responsible for middleware registration and route mounting.
 * Kept separate from server.js so the app can be tested without
 * binding to a port.
 */

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");

const { notFound, errorHandler } = require("./errorMiddleware");
const healthRouter = require("./healthRoutes");

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------

function createApp() {
  const app = express();

  // -------------------------------------------------------------------------
  // Security & transport middleware
  // -------------------------------------------------------------------------
  app.use(helmet());                        // Sets secure HTTP headers
  app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  }));

  // -------------------------------------------------------------------------
  // Request parsing
  // -------------------------------------------------------------------------
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // -------------------------------------------------------------------------
  // Logging
  // -------------------------------------------------------------------------
  if (process.env.NODE_ENV !== "test") {
    app.use(morgan("dev"));
  }

  // -------------------------------------------------------------------------
  // Routes
  // -------------------------------------------------------------------------
  app.use("/health", healthRouter);

  // Future route groups (uncomment as features are built):
  // app.use("/api/v1/users",      require("./routes/userRoutes"));
  // app.use("/api/v1/vocabulary", require("./routes/vocabularyRoutes"));
  // app.use("/api/v1/quizzes",    require("./routes/quizRoutes"));
  const courseRoutes   = require("./routes/courseRoutes");
  const progressRoutes = require("./routes/progressRoutes");

  app.use("/api/v1/lessons", require("./routes/lessonRoutes"));
  app.use("/api/v1/courses", courseRoutes);
  // Progress: POST /api/v1/lessons/:id/complete  |  GET /api/v1/users/:id/progress
  app.use("/api/v1",         progressRoutes);

  // -------------------------------------------------------------------------
  // Error handling (must be registered last)
  // -------------------------------------------------------------------------
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
