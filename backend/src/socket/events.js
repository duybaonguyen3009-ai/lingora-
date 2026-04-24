"use strict";

// Centralized Socket.IO event names. Snake_case convention, subject-first.
// Inbound = client -> server. Outbound = server -> client.

module.exports = Object.freeze({
  // Inbound
  TYPING_START: "typing_start",
  TYPING_STOP: "typing_stop",

  // Outbound
  NEW_MESSAGE: "new_message",
  MESSAGE_DELIVERED: "message_delivered",
  MESSAGES_SEEN: "messages_seen",
  TYPING: "typing",
  USER_ONLINE: "user_online",
  USER_OFFLINE: "user_offline",
  PRESENCE_SYNC: "presence_sync",
});
