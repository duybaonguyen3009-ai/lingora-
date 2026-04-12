/**
 * server.js
 *
 * HTTP server entry point with Socket.IO for real-time chat.
 * Loads environment variables, creates the Express app, binds to a port,
 * and initializes WebSocket server.
 */

// dotenv must be loaded first so SENTRY_DSN is available before Sentry.init()
require("dotenv").config();

// Sentry must be initialised before any other requires that might throw.
const { initSentry } = require("./config/sentry");
initSentry();

const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const config = require("./config");
const createApp = require("./app");

const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || "development";

const app = createApp();
const server = http.createServer(app);

// ---------------------------------------------------------------------------
// Socket.IO setup
// ---------------------------------------------------------------------------

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Make io accessible to controllers via app.set
app.set("io", io);

// Auth middleware — verify JWT from handshake
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Authentication required"));

  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret);
    socket.userId = decoded.sub || decoded.id;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.userId;
  socket.join(`user:${userId}`);
  console.log(`[socket] ${userId} connected`);

  socket.on("typing_start", ({ receiverId }) => {
    io.to(`user:${receiverId}`).emit("typing", { userId, typing: true });
  });

  socket.on("typing_stop", ({ receiverId }) => {
    io.to(`user:${receiverId}`).emit("typing", { userId, typing: false });
  });

  socket.on("disconnect", () => {
    console.log(`[socket] ${userId} disconnected`);
  });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

server.listen(PORT, () => {
  console.log("─────────────────────────────────────────");
  console.log(`  Lingona API`);
  console.log(`  Env  : ${NODE_ENV}`);
  console.log(`  Port : ${PORT}`);
  console.log(`  WS   : Socket.IO enabled`);
  console.log(`  URL  : http://localhost:${PORT}`);
  console.log("─────────────────────────────────────────");
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

function shutdown(signal) {
  console.log(`\n[Server] ${signal} received. Shutting down gracefully…`);

  // Close Socket.IO first
  io.close(() => {
    console.log("[Server] Socket.IO closed");
  });

  server.close(async () => {
    console.log("[Server] HTTP server closed");

    if (app._battleExpiryInterval) {
      clearInterval(app._battleExpiryInterval);
      console.log("[Server] Battle expiry interval cleared");
    }

    try {
      const { pool } = require("./config/db");
      await pool.end();
      console.log("[Server] Database pool closed");
    } catch (err) {
      console.error("[Server] Error closing DB pool:", err.message);
    }

    console.log("[Server] Graceful shutdown complete");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("[Server] Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});

module.exports = server;
