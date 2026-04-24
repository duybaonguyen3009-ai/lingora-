/**
 * services/chatService.js
 *
 * Business logic for 1:1 friend chat.
 */

"use strict";

const chatRepo = require("../repositories/chatRepository");
const { isFriend } = require("../repositories/socialRepository");

const MAX_PEAKS = 512;

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function validateWaveformPeaks(peaks) {
  if (!Array.isArray(peaks)) {
    throw httpError(400, "waveform_peaks must be array");
  }
  if (peaks.length === 0 || peaks.length > MAX_PEAKS) {
    throw httpError(400, `waveform_peaks length must be 1-${MAX_PEAKS}`);
  }
  for (const v of peaks) {
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1) {
      throw httpError(400, "waveform_peaks values must be finite numbers in [0, 1]");
    }
  }
}

async function getConversations(userId) {
  return chatRepo.getConversations(userId);
}

async function sendMessage(
  senderId, receiverId,
  { type, content, audioUrl, audioDuration, clientMessageId = null, waveformPeaks = null }
) {
  // Verify friendship
  if (!(await isFriend(senderId, receiverId))) {
    throw httpError(403, "Can only message friends");
  }

  if (type === "text" && (!content || !content.trim())) {
    throw httpError(400, "Message content required");
  }

  if (waveformPeaks !== null && type !== "voice") {
    throw httpError(400, "waveform_peaks chỉ áp dụng cho voice message");
  }
  if (waveformPeaks !== null) {
    validateWaveformPeaks(waveformPeaks);
  }

  return chatRepo.createMessage(
    senderId, receiverId, type,
    type === "text" ? content.trim() : null,
    audioUrl || null,
    audioDuration || null,
    clientMessageId,
    waveformPeaks
  );
}

async function getMessages(userId, friendId, { limit = 50, before = null, after = null } = {}) {
  if (!(await isFriend(userId, friendId))) {
    const err = new Error("Can only view messages with friends");
    err.status = 403;
    throw err;
  }

  // Mark as seen (idempotent — safe to run on each delta poll)
  await chatRepo.markSeen(userId, friendId);

  const messages = await chatRepo.getMessages(userId, friendId, limit + 1, before, after);
  const hasMore = messages.length > limit;
  if (hasMore) messages.pop();

  return { messages, hasMore };
}

async function markSeen(userId, friendId) {
  await chatRepo.markSeen(userId, friendId);
}

async function deleteMessage(messageId, userId) {
  await chatRepo.deleteMessage(messageId, userId);
}

async function getUnreadCount(userId) {
  return chatRepo.getUnreadCount(userId);
}

module.exports = { getConversations, sendMessage, getMessages, markSeen, deleteMessage, getUnreadCount };
