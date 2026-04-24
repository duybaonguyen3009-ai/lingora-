/**
 * repositories/socialRepository.js
 *
 * SQL queries for social features: users (username/QR), friend requests,
 * friendships, notifications, and accountability pings.
 */

const { query } = require("../config/db");
const crypto = require("crypto");

// ---------------------------------------------------------------------------
// Users — username & QR token
// ---------------------------------------------------------------------------

async function findUserByUsername(username) {
  const result = await query(
    `SELECT id, name, username, friend_count FROM users
      WHERE username = $1 AND deleted_at IS NULL`,
    [username]
  );
  return result.rows[0] || null;
}

async function findUserByQrToken(qrToken) {
  const result = await query(
    `SELECT id, name, username, friend_count FROM users
      WHERE qr_token = $1 AND deleted_at IS NULL`,
    [qrToken]
  );
  return result.rows[0] || null;
}

async function getUserById(userId) {
  const result = await query(
    `SELECT id, name, username, qr_token, friend_count FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function setUsername(userId, username) {
  const result = await query(
    `UPDATE users SET username = $2, updated_at = now() WHERE id = $1
     RETURNING id, name, username, friend_count`,
    [userId, username]
  );
  return result.rows[0];
}

async function generateQrToken(userId) {
  const token = crypto.randomUUID();
  await query(
    `UPDATE users SET qr_token = $2, updated_at = now() WHERE id = $1`,
    [userId, token]
  );
  return token;
}

// ---------------------------------------------------------------------------
// Friend requests
// ---------------------------------------------------------------------------

async function createFriendRequest(senderUserId, receiverUserId) {
  const result = await query(
    `INSERT INTO friend_requests (sender_user_id, receiver_user_id)
     VALUES ($1, $2)
     RETURNING *`,
    [senderUserId, receiverUserId]
  );
  return result.rows[0];
}

async function getFriendRequest(id) {
  const result = await query(
    `SELECT fr.*,
            s.name AS sender_name, r.name AS receiver_name
       FROM friend_requests fr
       JOIN users s ON s.id = fr.sender_user_id
       JOIN users r ON r.id = fr.receiver_user_id
      WHERE fr.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function getFriendRequestBetween(userA, userB) {
  const result = await query(
    `SELECT * FROM friend_requests
      WHERE ((sender_user_id = $1 AND receiver_user_id = $2)
          OR (sender_user_id = $2 AND receiver_user_id = $1))
        AND status = 'pending'`,
    [userA, userB]
  );
  return result.rows[0] || null;
}

async function getPendingRequestsReceived(userId) {
  const result = await query(
    `SELECT fr.*, s.name AS sender_name, s.username AS sender_username
       FROM friend_requests fr
       JOIN users s ON s.id = fr.sender_user_id
      WHERE fr.receiver_user_id = $1 AND fr.status = 'pending'
      ORDER BY fr.created_at DESC`,
    [userId]
  );
  return result.rows;
}

async function getPendingRequestsSent(userId) {
  const result = await query(
    `SELECT fr.*, r.name AS receiver_name, r.username AS receiver_username
       FROM friend_requests fr
       JOIN users r ON r.id = fr.receiver_user_id
      WHERE fr.sender_user_id = $1 AND fr.status = 'pending'
      ORDER BY fr.created_at DESC`,
    [userId]
  );
  return result.rows;
}

async function updateFriendRequestStatus(id, status) {
  const result = await query(
    `UPDATE friend_requests
        SET status = $2, responded_at = now()
      WHERE id = $1
      RETURNING *`,
    [id, status]
  );
  return result.rows[0];
}

// ---------------------------------------------------------------------------
// Friendships
// ---------------------------------------------------------------------------

function orderedPair(a, b) {
  return a < b ? [a, b] : [b, a];
}

async function createFriendship(userAId, userBId) {
  const [low, high] = orderedPair(userAId, userBId);
  const result = await query(
    `INSERT INTO friendships (user_low_id, user_high_id)
     VALUES ($1, $2)
     ON CONFLICT (user_low_id, user_high_id) DO NOTHING
     RETURNING *`,
    [low, high]
  );
  // Increment friend_count for both
  await query(`UPDATE users SET friend_count = friend_count + 1 WHERE id IN ($1, $2)`, [low, high]);
  return result.rows[0];
}

async function deleteFriendship(userAId, userBId) {
  const [low, high] = orderedPair(userAId, userBId);
  const result = await query(
    `DELETE FROM friendships WHERE user_low_id = $1 AND user_high_id = $2 RETURNING *`,
    [low, high]
  );
  if (result.rowCount > 0) {
    await query(`UPDATE users SET friend_count = GREATEST(friend_count - 1, 0) WHERE id IN ($1, $2)`, [low, high]);
  }
  return result.rowCount > 0;
}

async function getFriends(userId, limit = 50) {
  const result = await query(
    `SELECT u.id, u.name, u.username,
            EXISTS(
              SELECT 1 FROM learning_events le
              WHERE le.user_id = u.id AND le.created_at >= CURRENT_DATE
            ) AS practiced_today
       FROM friendships f
       JOIN users u ON u.id = CASE
         WHEN f.user_low_id = $1 THEN f.user_high_id
         ELSE f.user_low_id
       END
      WHERE (f.user_low_id = $1 OR f.user_high_id = $1)
        AND u.deleted_at IS NULL
      ORDER BY u.name
      LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

async function isFriend(userAId, userBId) {
  const [low, high] = orderedPair(userAId, userBId);
  const result = await query(
    `SELECT 1 FROM friendships WHERE user_low_id = $1 AND user_high_id = $2`,
    [low, high]
  );
  return result.rowCount > 0;
}

/**
 * Return array of friend user IDs. Used by the Socket.IO presence layer to
 * join "friends-of:<id>" rooms and broadcast user_online / user_offline.
 *
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
async function getFriendIds(userId) {
  const result = await query(
    `SELECT CASE WHEN user_low_id = $1 THEN user_high_id ELSE user_low_id END AS friend_id
     FROM friendships
     WHERE user_low_id = $1 OR user_high_id = $1`,
    [userId]
  );
  return result.rows.map((r) => r.friend_id);
}

async function getFriendCount(userId) {
  const result = await query(
    `SELECT friend_count FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0]?.friend_count ?? 0;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

async function createNotification(userId, type, data) {
  const result = await query(
    `INSERT INTO notifications (user_id, type, data)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, type, JSON.stringify(data)]
  );
  return result.rows[0];
}

async function getNotifications(userId, limit = 20) {
  const result = await query(
    `SELECT * FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

async function markNotificationRead(id, userId) {
  await query(
    `UPDATE notifications SET read_at = now()
      WHERE id = $1 AND user_id = $2 AND read_at IS NULL`,
    [id, userId]
  );
}

async function markAllNotificationsRead(userId) {
  await query(
    `UPDATE notifications SET read_at = now()
      WHERE user_id = $1 AND read_at IS NULL`,
    [userId]
  );
}

async function getUnreadCount(userId) {
  const result = await query(
    `SELECT COUNT(*)::int AS count FROM notifications
      WHERE user_id = $1 AND read_at IS NULL`,
    [userId]
  );
  return result.rows[0].count;
}

// ---------------------------------------------------------------------------
// Accountability pings
// ---------------------------------------------------------------------------

async function createPing(senderUserId, receiverUserId, templateKey) {
  const result = await query(
    `INSERT INTO accountability_pings (sender_user_id, receiver_user_id, message_template_key)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [senderUserId, receiverUserId, templateKey]
  );
  return result.rows[0];
}

async function hasPingedToday(senderUserId, receiverUserId) {
  const result = await query(
    `SELECT 1 FROM accountability_pings
      WHERE sender_user_id = $1 AND receiver_user_id = $2
        AND ping_date = CURRENT_DATE`,
    [senderUserId, receiverUserId]
  );
  return result.rowCount > 0;
}

async function getPingsReceived(userId, limit = 20) {
  const result = await query(
    `SELECT ap.*, s.name AS sender_name
       FROM accountability_pings ap
       JOIN users s ON s.id = ap.sender_user_id
      WHERE ap.receiver_user_id = $1
      ORDER BY ap.created_at DESC
      LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

module.exports = {
  findUserByUsername,
  findUserByQrToken,
  getUserById,
  setUsername,
  generateQrToken,
  createFriendRequest,
  getFriendRequest,
  getFriendRequestBetween,
  getPendingRequestsReceived,
  getPendingRequestsSent,
  updateFriendRequestStatus,
  createFriendship,
  deleteFriendship,
  getFriends,
  isFriend,
  getFriendIds,
  getFriendCount,
  createNotification,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
  createPing,
  hasPingedToday,
  getPingsReceived,
};
