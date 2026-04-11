/**
 * controllers/socialController.js
 *
 * HTTP layer for social features: friends, profile, pings, notifications.
 */

const socialService = require("../services/socialService");
const { sendSuccess, sendError } = require("../response");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Friend requests
// ---------------------------------------------------------------------------

async function sendFriendRequest(req, res, next) {
  try {
    const senderId = req.user.id;
    const { targetUserId, username, qrToken } = req.body;

    if (!targetUserId && !username && !qrToken) {
      return sendError(res, { status: 400, message: "Provide targetUserId, username, or qrToken" });
    }

    const result = await socialService.sendFriendRequest(senderId, { targetUserId, username, qrToken });
    return sendSuccess(res, { data: result, status: 201, message: "Friend request sent" });
  } catch (err) {
    next(err);
  }
}

async function acceptRequest(req, res, next) {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(id)) return sendError(res, { status: 400, message: "Valid request ID required" });

    const result = await socialService.acceptFriendRequest(req.user.id, id);
    return sendSuccess(res, { data: result, message: "Friend request accepted" });
  } catch (err) {
    next(err);
  }
}

async function rejectRequest(req, res, next) {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(id)) return sendError(res, { status: 400, message: "Valid request ID required" });

    await socialService.rejectFriendRequest(req.user.id, id);
    return sendSuccess(res, { message: "Friend request rejected" });
  } catch (err) {
    next(err);
  }
}

async function cancelRequest(req, res, next) {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(id)) return sendError(res, { status: 400, message: "Valid request ID required" });

    await socialService.cancelFriendRequest(req.user.id, id);
    return sendSuccess(res, { message: "Friend request cancelled" });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Friends
// ---------------------------------------------------------------------------

async function listFriends(req, res, next) {
  try {
    const friends = await socialService.getFriends(req.user.id);
    return sendSuccess(res, { data: { friends }, message: "Friends retrieved" });
  } catch (err) {
    next(err);
  }
}

async function removeFriend(req, res, next) {
  try {
    const { friendUserId } = req.params;
    if (!UUID_RE.test(friendUserId)) return sendError(res, { status: 400, message: "Valid friend user ID required" });

    await socialService.removeFriend(req.user.id, friendUserId);
    return sendSuccess(res, { message: "Friend removed" });
  } catch (err) {
    next(err);
  }
}

async function listRequestsIncoming(req, res, next) {
  try {
    const repo = require("../repositories/socialRepository");
    const requests = await repo.getPendingRequestsReceived(req.user.id);
    return sendSuccess(res, { data: { requests }, message: "Incoming requests retrieved" });
  } catch (err) {
    next(err);
  }
}

async function listRequestsOutgoing(req, res, next) {
  try {
    const repo = require("../repositories/socialRepository");
    const requests = await repo.getPendingRequestsSent(req.user.id);
    return sendSuccess(res, { data: { requests }, message: "Outgoing requests retrieved" });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

async function getProfile(req, res, next) {
  try {
    const profile = await socialService.getSocialProfile(req.user.id);
    return sendSuccess(res, { data: profile, message: "Profile retrieved" });
  } catch (err) {
    next(err);
  }
}

async function setUsername(req, res, next) {
  try {
    const { username } = req.body;
    if (!username || typeof username !== "string") {
      return sendError(res, { status: 400, message: "username is required" });
    }

    const updated = await socialService.setUsernameValidated(req.user.id, username.trim());
    return sendSuccess(res, { data: updated, message: "Username set" });
  } catch (err) {
    next(err);
  }
}

async function getQrToken(req, res, next) {
  try {
    const qrToken = await socialService.getOrCreateQrToken(req.user.id);
    return sendSuccess(res, { data: { qrToken }, message: "QR token retrieved" });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Pings
// ---------------------------------------------------------------------------

async function sendPing(req, res, next) {
  try {
    const { receiverUserId, messageTemplateKey } = req.body;
    if (!receiverUserId || !messageTemplateKey) {
      return sendError(res, { status: 400, message: "receiverUserId and messageTemplateKey required" });
    }

    const ping = await socialService.sendPing(req.user.id, receiverUserId, messageTemplateKey);
    return sendSuccess(res, { data: ping, status: 201, message: "Ping sent" });
  } catch (err) {
    next(err);
  }
}

async function listPingsReceived(req, res, next) {
  try {
    const pings = await socialService.getPingsReceived(req.user.id);
    return sendSuccess(res, { data: { pings }, message: "Pings retrieved" });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

async function getNotifications(req, res, next) {
  try {
    const result = await socialService.getNotifications(req.user.id);
    return sendSuccess(res, { data: result, message: "Notifications retrieved" });
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(id)) return sendError(res, { status: 400, message: "Valid notification ID required" });

    await socialService.markNotificationRead(req.user.id, id);
    return sendSuccess(res, { message: "Notification marked as read" });
  } catch (err) {
    next(err);
  }
}

async function markAllRead(req, res, next) {
  try {
    await socialService.markAllNotificationsRead(req.user.id);
    return sendSuccess(res, { message: "All notifications marked as read" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  sendFriendRequest,
  acceptRequest,
  rejectRequest,
  cancelRequest,
  listFriends,
  removeFriend,
  listRequestsIncoming,
  listRequestsOutgoing,
  getProfile,
  setUsername,
  getQrToken,
  sendPing,
  listPingsReceived,
  getNotifications,
  markRead,
  markAllRead,
};
