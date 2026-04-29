/**
 * repositories/socialRepository.js
 *
 * SQL queries for social features: users (username/QR), friend requests,
 * friendships, notifications, and accountability pings.
 */

const { query, pool } = require("../config/db");
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

/**
 * Atomic username change (Wave 2.11). Inside one transaction:
 *   1. Lock the user row + read CURRENT username.
 *   2. Collision check against active users (case-insensitive) AND
 *      active redirect entries (still inside grace).
 *   3. If a previous username exists → INSERT it into username_redirects
 *      with the supplied expiry. First-time setters skip the INSERT.
 *   4. UPDATE users.username + last_username_change_at = now().
 *
 * Generic 400 EMAIL/USERNAME_UNAVAILABLE on collision — secure-code-
 * guardian rule, no enumeration leak.
 *
 * @param {string} userId
 * @param {string} newUsername — already format/reserved-validated by caller
 * @param {Date}   redirectExpiresAt — when to retire the OLD username's redirect
 * @returns {Promise<{ username, is_first_set, redirect_expires_at }>}
 */
async function changeUsernameAtomic(userId, newUsername, redirectExpiresAt) {
  const newLower = newUsername.toLowerCase();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lock the user row to serialize concurrent change attempts.
    const userRow = await client.query(
      `SELECT username FROM users
        WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [userId],
    );
    if (userRow.rows.length === 0) {
      await client.query("ROLLBACK");
      const err = new Error("Không tìm thấy tài khoản.");
      err.status = 404;
      throw err;
    }
    const oldUsername = userRow.rows[0].username; // may be NULL on first set

    // Same-as-current is a no-op (avoid a needless redirect row).
    if (oldUsername && oldUsername.toLowerCase() === newLower) {
      await client.query("ROLLBACK");
      const err = new Error("Username mới phải khác username hiện tại.");
      err.status = 400;
      err.code = "USERNAME_UNCHANGED";
      throw err;
    }

    // Collision: another active user already owns this username.
    const collideUser = await client.query(
      `SELECT 1 FROM users
        WHERE LOWER(username) = $1 AND deleted_at IS NULL AND id <> $2 LIMIT 1`,
      [newLower, userId],
    );
    if (collideUser.rowCount > 0) {
      await client.query("ROLLBACK");
      const err = new Error("Username không khả dụng.");
      err.status = 400;
      err.code = "USERNAME_UNAVAILABLE";
      throw err;
    }

    // Collision: another user's old username is still in redirect grace.
    const collideRedirect = await client.query(
      `SELECT 1 FROM username_redirects
        WHERE old_username = $1 AND user_id <> $2 AND expires_at > now() LIMIT 1`,
      [newLower, userId],
    );
    if (collideRedirect.rowCount > 0) {
      await client.query("ROLLBACK");
      const err = new Error("Username không khả dụng.");
      err.status = 400;
      err.code = "USERNAME_UNAVAILABLE";
      throw err;
    }

    // Insert redirect for the OLD username if there is one.
    let redirectRecorded = null;
    if (oldUsername) {
      // ON CONFLICT covers the rare case where THIS user reclaims their
      // OWN previous redirect — we just bump the expiry forward.
      await client.query(
        `INSERT INTO username_redirects (old_username, user_id, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (old_username) DO UPDATE
           SET user_id = EXCLUDED.user_id, expires_at = EXCLUDED.expires_at`,
        [oldUsername.toLowerCase(), userId, redirectExpiresAt],
      );
      redirectRecorded = redirectExpiresAt;
    }

    // Apply the change. Parameter binding ensures no SQL injection.
    const upd = await client.query(
      `UPDATE users
          SET username                = $2,
              last_username_change_at = now(),
              updated_at              = now()
        WHERE id = $1
        RETURNING username`,
      [userId, newUsername],
    );

    await client.query("COMMIT");

    return {
      username:            upd.rows[0].username,
      is_first_set:        oldUsername == null,
      redirect_expires_at: redirectRecorded,
    };
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Look up an active redirect for a (lowercased) old username. Returns
 * null when no row matches, the row is past expires_at, or the linked
 * user has been soft-deleted (Wave 2.7).
 *
 * @param {string} oldUsernameLower
 * @returns {Promise<{ id: string }|null>}
 */
async function findRedirectTarget(oldUsernameLower) {
  const r = await query(
    `SELECT u.id
       FROM username_redirects r
       JOIN users u ON u.id = r.user_id AND u.deleted_at IS NULL
      WHERE r.old_username = $1 AND r.expires_at > now()
      LIMIT 1`,
    [oldUsernameLower],
  );
  return r.rows[0] ?? null;
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
  // deleted_at filter ensures we never expose names of users who have
  // since deleted their accounts (Wave 2.7). The lifecycle hard-deletes
  // friend_requests rows for the deleting user, so this should be
  // unreachable for new requests, but historical rows + race conditions
  // are defended at read time.
  const result = await query(
    `SELECT fr.*,
            s.name AS sender_name, r.name AS receiver_name
       FROM friend_requests fr
       JOIN users s ON s.id = fr.sender_user_id   AND s.deleted_at IS NULL
       JOIN users r ON r.id = fr.receiver_user_id AND r.deleted_at IS NULL
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
       JOIN users s ON s.id = fr.sender_user_id AND s.deleted_at IS NULL
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
       JOIN users r ON r.id = fr.receiver_user_id AND r.deleted_at IS NULL
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
  const notification = result.rows[0];

  // Best-effort realtime push so NotificationBell can render without waiting
  // for its 60s fallback poll. Failure is silent — the next client poll will
  // pick the row up regardless.
  try {
    const { emitToUser } = require("../socket/ioRegistry");
    const events = require("../socket/events");
    emitToUser(userId, events.NOTIFICATION_NEW, notification);
  } catch { /* registry not booted (test env) — fallback poll covers it */ }

  return notification;
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
       JOIN users s ON s.id = ap.sender_user_id AND s.deleted_at IS NULL
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
  changeUsernameAtomic,
  findRedirectTarget,
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
