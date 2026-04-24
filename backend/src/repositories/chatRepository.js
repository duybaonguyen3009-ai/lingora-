/**
 * repositories/chatRepository.js
 *
 * SQL queries for 1:1 friend chat messages.
 */

const { query } = require("../config/db");

async function getConversations(userId) {
  // For each friend, get the last message + unread count
  const result = await query(
    `WITH friend_ids AS (
       SELECT CASE WHEN user_low_id = $1 THEN user_high_id ELSE user_low_id END AS friend_id
       FROM friendships WHERE user_low_id = $1 OR user_high_id = $1
     ),
     last_msgs AS (
       SELECT DISTINCT ON (friend_id) f.friend_id,
              m.id, m.sender_id, m.type, m.content, m.audio_duration_seconds, m.created_at, m.seen_at
       FROM friend_ids f
       LEFT JOIN LATERAL (
         SELECT * FROM messages
         WHERE deleted_at IS NULL
           AND ((sender_id = $1 AND receiver_id = f.friend_id)
             OR (sender_id = f.friend_id AND receiver_id = $1))
         ORDER BY created_at DESC LIMIT 1
       ) m ON true
     ),
     unread_counts AS (
       SELECT sender_id AS friend_id, COUNT(*)::int AS unread
       FROM messages
       WHERE receiver_id = $1 AND seen_at IS NULL AND deleted_at IS NULL
       GROUP BY sender_id
     )
     SELECT lm.friend_id, u.name AS friend_name, u.username AS friend_username, u.avatar_url AS friend_avatar,
            lm.id AS last_message_id, lm.sender_id AS last_sender_id, lm.type AS last_type,
            lm.content AS last_content, lm.audio_duration_seconds AS last_audio_duration,
            lm.created_at AS last_message_at, lm.seen_at AS last_seen_at,
            COALESCE(uc.unread, 0) AS unread_count
     FROM last_msgs lm
     JOIN users u ON u.id = lm.friend_id
     LEFT JOIN unread_counts uc ON uc.friend_id = lm.friend_id
     WHERE u.deleted_at IS NULL
     ORDER BY lm.created_at DESC NULLS LAST`,
    [userId]
  );
  return result.rows;
}

async function getMessages(userId, friendId, limit = 50, before = null, after = null) {
  const params = [userId, friendId, limit];
  let sql = `SELECT * FROM messages
    WHERE deleted_at IS NULL
      AND ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))`;
  if (before) {
    sql += ` AND created_at < $${params.length + 1}`;
    params.push(before);
  }
  if (after) {
    sql += ` AND created_at > $${params.length + 1}`;
    params.push(after);
  }
  // `after` = delta polling: ASC so caller sees new messages in chronological order.
  // default/`before` = history pagination: DESC then reverse = oldest first for display.
  sql += ` ORDER BY created_at ${after ? "ASC" : "DESC"} LIMIT $3`;
  const result = await query(sql, params);
  return after ? result.rows : result.rows.reverse();
}

async function createMessage(
  senderId, receiverId, type, content, audioUrl, audioDuration,
  clientMessageId = null, waveformPeaks = null
) {
  try {
    const result = await query(
      `INSERT INTO messages
         (sender_id, receiver_id, type, content, audio_url, audio_duration_seconds,
          client_message_id, waveform_peaks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        senderId, receiverId, type, content || null, audioUrl || null,
        audioDuration || null, clientMessageId,
        waveformPeaks ? JSON.stringify(waveformPeaks) : null,
      ]
    );
    return { message: result.rows[0], created: true };
  } catch (err) {
    // Idempotent retry: if the same client_message_id was already persisted, return it
    // with created=false so callers can skip re-running side effects (e.g. socket emit).
    if (
      err.code === "23505" &&
      err.constraint === "idx_messages_client_message_id" &&
      clientMessageId
    ) {
      const existing = await query(
        `SELECT * FROM messages WHERE client_message_id = $1`,
        [clientMessageId]
      );
      if (existing.rows[0]) return { message: existing.rows[0], created: false };
    }
    throw err;
  }
}

async function markSeen(userId, friendId) {
  await query(
    `UPDATE messages SET seen_at = now()
      WHERE receiver_id = $1 AND sender_id = $2 AND seen_at IS NULL AND deleted_at IS NULL`,
    [userId, friendId]
  );
}

async function deleteMessage(messageId, userId) {
  // Soft delete — only for the user who owns/received the message
  await query(
    `UPDATE messages SET deleted_at = now()
      WHERE id = $1 AND (sender_id = $2 OR receiver_id = $2)`,
    [messageId, userId]
  );
}

async function getUnreadCount(userId) {
  const result = await query(
    `SELECT COUNT(*)::int AS count FROM messages
      WHERE receiver_id = $1 AND seen_at IS NULL AND deleted_at IS NULL`,
    [userId]
  );
  return result.rows[0].count;
}

module.exports = { getConversations, getMessages, createMessage, markSeen, deleteMessage, getUnreadCount };
