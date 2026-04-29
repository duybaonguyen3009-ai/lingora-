"use strict";

/**
 * ioRegistry — singleton holder for the Socket.IO server instance.
 *
 * server.js owns Socket.IO setup but services/repositories that need to
 * push real-time events live elsewhere and have no direct access to the
 * server module. Threading io through every service signature would be
 * invasive; req.app.get("io") only works in the request lifecycle, not
 * in fire-and-forget background scoring jobs.
 *
 * This module is set once at boot (server.js) and read everywhere via
 * emitToUser(userId, event, payload). When the registry hasn't been set
 * (e.g. unit tests bootstrapping createApp without server.js) the emit
 * is a no-op — callers must still treat it as best-effort.
 */

let _io = null;

function setIo(io) {
  _io = io;
}

function getIo() {
  return _io;
}

/**
 * Emit `event` to every socket joined to room `user:${userId}`.
 * Safe to call from any layer; a missing registry or null userId is a no-op.
 */
function emitToUser(userId, event, payload) {
  if (!_io || !userId) return;
  try {
    _io.to(`user:${userId}`).emit(event, payload);
  } catch (err) {
    console.error(`[ioRegistry] emit failed user:${userId} event:${event}:`, err.message);
  }
}

module.exports = Object.freeze({ setIo, getIo, emitToUser });
