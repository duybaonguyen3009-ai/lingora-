/**
 * routes/studyRoomRoutes.js
 *
 * Study room endpoints. All routes require JWT authentication.
 */

const { Router } = require("express");
const { verifyToken } = require("../middleware/auth");
const { socialLimiters } = require("../middleware/rateLimiters");
const c = require("../controllers/studyRoomController");

const router = Router();

router.post("/", verifyToken, ...socialLimiters, c.createRoom);
router.get("/", verifyToken, c.getMyRooms);
router.get("/:roomId/dashboard", verifyToken, c.getDashboard);
router.post("/:roomId/accept", verifyToken, c.acceptInvite);
router.delete("/:roomId/leave", verifyToken, c.leaveRoom);
router.post("/:roomId/goals", verifyToken, c.createGoal);
router.get("/:roomId/notes", verifyToken, c.getNotes);
router.post("/:roomId/notes", verifyToken, c.createNote);
router.delete("/:roomId/notes/:noteId", verifyToken, c.deleteNote);
router.post("/:roomId/notes/:noteId/pin", verifyToken, c.pinNote);
router.get("/:roomId/feed", verifyToken, c.getFeed);
router.post("/:roomId/nudge", verifyToken, ...socialLimiters, c.sendNudge);

module.exports = router;
