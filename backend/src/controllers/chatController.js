/**
 * controllers/chatController.js
 *
 * HTTP layer for friend chat.
 */

const chatService = require("../services/chatService");
const { sendSuccess, sendError } = require("../response");
const path = require("path");
const fs = require("fs");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getConversations(req, res, next) {
  try {
    const conversations = await chatService.getConversations(req.user.id);
    return sendSuccess(res, { data: { conversations }, message: "Conversations retrieved" });
  } catch (err) { next(err); }
}

async function getMessages(req, res, next) {
  try {
    const { friendId } = req.params;
    if (!UUID_RE.test(friendId)) return sendError(res, { status: 400, message: "Valid friendId required" });
    const { limit, before, after } = req.query;

    if (before && after) {
      return sendError(res, { status: 400, message: "Cannot specify both before and after" });
    }
    if (before && isNaN(Date.parse(before))) {
      return sendError(res, { status: 400, message: "Invalid before timestamp" });
    }
    if (after && isNaN(Date.parse(after))) {
      return sendError(res, { status: 400, message: "Invalid after timestamp" });
    }

    const result = await chatService.getMessages(req.user.id, friendId, {
      limit: limit ? parseInt(limit, 10) : 50,
      before: before || null,
      after: after || null,
    });
    return sendSuccess(res, { data: result, message: "Messages retrieved" });
  } catch (err) { next(err); }
}

async function sendTextMessage(req, res, next) {
  try {
    const { friendId } = req.params;
    if (!UUID_RE.test(friendId)) return sendError(res, { status: 400, message: "Valid friendId required" });
    const { content, client_message_id, clientMessageId } = req.body;
    if (!content || typeof content !== "string") return sendError(res, { status: 400, message: "content required" });

    const cid = client_message_id || clientMessageId || null;
    if (cid && !UUID_RE.test(cid)) {
      return sendError(res, { status: 400, message: "Invalid client_message_id" });
    }

    const { message, created } = await chatService.sendMessage(req.user.id, friendId, { type: "text", content, clientMessageId: cid });

    // Only emit on first insert — idempotent retries would double-deliver the bubble.
    if (created) {
      const io = req.app.get("io");
      if (io) {
        io.to(`user:${friendId}`).emit("new_message", message);
      }
    }

    return sendSuccess(res, { data: message, status: 201, message: "Message sent" });
  } catch (err) { next(err); }
}

async function sendVoiceMessage(req, res, next) {
  try {
    const { friendId } = req.params;
    if (!UUID_RE.test(friendId)) return sendError(res, { status: 400, message: "Valid friendId required" });
    const { audio, duration, client_message_id, clientMessageId, waveform_peaks, waveformPeaks } = req.body;
    if (!audio) return sendError(res, { status: 400, message: "audio (base64) required" });

    const cid = client_message_id || clientMessageId || null;
    if (cid && !UUID_RE.test(cid)) {
      return sendError(res, { status: 400, message: "Invalid client_message_id" });
    }

    const peaks = waveform_peaks ?? waveformPeaks ?? null;

    // Save voice note
    const voiceDir = path.join(__dirname, "..", "..", "public", "voice-notes");
    if (!fs.existsSync(voiceDir)) fs.mkdirSync(voiceDir, { recursive: true });

    const messageId = require("crypto").randomUUID();
    const filename = `${messageId}.webm`;
    const buffer = Buffer.from(audio.replace(/^data:audio\/\w+;base64,/, ""), "base64");
    fs.writeFileSync(path.join(voiceDir, filename), buffer);

    const audioUrl = `/voice-notes/${filename}`;
    const { message, created } = await chatService.sendMessage(req.user.id, friendId, {
      type: "voice", audioUrl, audioDuration: duration || 0, clientMessageId: cid, waveformPeaks: peaks,
    });

    if (created) {
      const io = req.app.get("io");
      if (io) {
        io.to(`user:${friendId}`).emit("new_message", message);
      }
    }

    return sendSuccess(res, { data: message, status: 201, message: "Voice note sent" });
  } catch (err) { next(err); }
}

async function markSeen(req, res, next) {
  try {
    const { friendId } = req.params;
    if (!UUID_RE.test(friendId)) return sendError(res, { status: 400, message: "Valid friendId required" });
    await chatService.markSeen(req.user.id, friendId);

    const io = req.app.get("io");
    if (io) {
      io.to(`user:${friendId}`).emit("messages_seen", { userId: req.user.id });
    }

    return sendSuccess(res, { message: "Marked as seen" });
  } catch (err) { next(err); }
}

async function deleteMsg(req, res, next) {
  try {
    const { messageId } = req.params;
    if (!UUID_RE.test(messageId)) return sendError(res, { status: 400, message: "Valid messageId required" });
    await chatService.deleteMessage(messageId, req.user.id);
    return sendSuccess(res, { message: "Message deleted" });
  } catch (err) { next(err); }
}

module.exports = { getConversations, getMessages, sendTextMessage, sendVoiceMessage, markSeen, deleteMessage: deleteMsg };
