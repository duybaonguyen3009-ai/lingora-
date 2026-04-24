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
const presenceTracker = require("./socket/presenceTracker");
const events = require("./socket/events");
const socialRepository = require("./repositories/socialRepository");

// NOTE: Socket.IO runs single-instance. Migrate to @socket.io/redis-adapter
// when DAU > 2k or Railway horizontal scale (2+ replicas) needed.
// Presence tracker currently in-memory (socket/presenceTracker.js).

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

io.on("connection", async (socket) => {
  const userId = socket.userId;
  console.log(`[socket] ${userId} connected (${socket.id})`);

  socket.join(`user:${userId}`);

  let friendIds = [];
  try {
    friendIds = await socialRepository.getFriendIds(userId);
  } catch (err) {
    console.error(`[socket] Failed to load friends for ${userId}:`, err.message);
    // Continue — user can still chat, they just won't see friend presence.
  }

  // Join own friends-of room (so our friends broadcasting to this room reach us)
  // plus every friend's friends-of room (so when a friend connects we receive
  // their user_online on their own room — symmetric).
  socket.join(`friends-of:${userId}`);
  for (const fid of friendIds) socket.join(`friends-of:${fid}`);

  // First socket for this user → broadcast user_online to all friends.
  const wasFirst = presenceTracker.addConnection(userId, socket.id);
  if (wasFirst) {
    io.to(`friends-of:${userId}`).emit(events.USER_ONLINE, { userId });
  }

  // Initial presence sync for this socket: which of my friends are online right now.
  const onlineFriends = presenceTracker.filterOnline(friendIds);
  socket.emit(events.PRESENCE_SYNC, { online: onlineFriends });

  socket.on(events.TYPING_START, ({ receiverId }) => {
    // TODO: server-side throttle 1/sec per (userId, receiverId) if abuse shows up.
    io.to(`user:${receiverId}`).emit(events.TYPING, { userId, typing: true });
  });
  socket.on(events.TYPING_STOP, ({ receiverId }) => {
    io.to(`user:${receiverId}`).emit(events.TYPING, { userId, typing: false });
  });

  socket.on("disconnect", () => {
    console.log(`[socket] ${userId} disconnected (${socket.id})`);
    const wasLast = presenceTracker.removeConnection(userId, socket.id);
    if (wasLast) {
      io.to(`friends-of:${userId}`).emit(events.USER_OFFLINE, { userId });
    }
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
