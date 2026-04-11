/**
 * routes/socialRoutes.js
 *
 * Social feature endpoints: friends, profile, pings, notifications.
 * All routes require JWT authentication.
 */

const { Router } = require("express");
const { verifyToken } = require("../middleware/auth");
const sc = require("../controllers/socialController");

const router = Router();

// ── Friend requests ──
router.post("/friends/request", verifyToken, sc.sendFriendRequest);
router.post("/friends/request/:id/accept", verifyToken, sc.acceptRequest);
router.post("/friends/request/:id/reject", verifyToken, sc.rejectRequest);
router.delete("/friends/request/:id", verifyToken, sc.cancelRequest);

// ── Friends ──
router.get("/friends", verifyToken, sc.listFriends);
router.delete("/friends/:friendUserId", verifyToken, sc.removeFriend);

// ── Requests listing ──
router.get("/friends/requests/incoming", verifyToken, sc.listRequestsIncoming);
router.get("/friends/requests/outgoing", verifyToken, sc.listRequestsOutgoing);

// ── Profile ──
router.get("/profile/me", verifyToken, sc.getProfile);
router.post("/profile/username", verifyToken, sc.setUsername);
router.get("/profile/qr", verifyToken, sc.getQrToken);

// ── Pings ──
router.post("/pings", verifyToken, sc.sendPing);
router.get("/pings/inbox", verifyToken, sc.listPingsReceived);

// ── Notifications ──
router.get("/notifications", verifyToken, sc.getNotifications);
router.post("/notifications/:id/read", verifyToken, sc.markRead);
router.post("/notifications/read-all", verifyToken, sc.markAllRead);

module.exports = router;
