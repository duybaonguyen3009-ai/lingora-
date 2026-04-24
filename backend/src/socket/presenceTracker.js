"use strict";

/**
 * In-memory presence tracker. Tracks active socket connections per user.
 * Supports multi-device (user opens app on phone + browser simultaneously).
 *
 * Scale limit: single Node instance. Migrate to @socket.io/redis-adapter +
 * shared Redis when DAU > 2k or Railway horizontal scaling (2+ replicas) needed.
 */

// Map<userId, Set<socketId>>
const userSockets = new Map();

function addConnection(userId, socketId) {
  let sockets = userSockets.get(userId);
  if (!sockets) {
    sockets = new Set();
    userSockets.set(userId, sockets);
    sockets.add(socketId);
    return true;
  }
  sockets.add(socketId);
  return false;
}

function removeConnection(userId, socketId) {
  const sockets = userSockets.get(userId);
  if (!sockets) return false;
  sockets.delete(socketId);
  if (sockets.size === 0) {
    userSockets.delete(userId);
    return true;
  }
  return false;
}

function isOnline(userId) {
  const sockets = userSockets.get(userId);
  return !!sockets && sockets.size > 0;
}

function filterOnline(userIds) {
  return userIds.filter((id) => isOnline(id));
}

function onlineCount() {
  return userSockets.size;
}

module.exports = { addConnection, removeConnection, isOnline, filterOnline, onlineCount };
