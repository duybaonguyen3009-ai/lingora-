/**
 * repositories/studyRoomRepository.js
 *
 * SQL queries for study rooms, members, goals, notes, feed, daily status.
 */

const { query } = require("../config/db");

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

async function createRoom(name, createdByUserId, maxMembers = 10) {
  const result = await query(
    `INSERT INTO study_rooms (name, created_by_user_id, max_members)
     VALUES ($1, $2, $3) RETURNING *`,
    [name, createdByUserId, maxMembers]
  );
  return result.rows[0];
}

async function getRoomById(roomId) {
  const result = await query(`SELECT * FROM study_rooms WHERE id = $1`, [roomId]);
  return result.rows[0] || null;
}

async function getUserRooms(userId) {
  const result = await query(
    `SELECT sr.* FROM study_rooms sr
       JOIN study_room_members srm ON srm.room_id = sr.id
      WHERE srm.user_id = $1 AND srm.status = 'active' AND sr.status = 'active'
      ORDER BY sr.created_at DESC`,
    [userId]
  );
  return result.rows;
}

async function updateRoomStreak(roomId, increment = true) {
  if (increment) {
    await query(`UPDATE study_rooms SET room_streak = room_streak + 1, updated_at = now() WHERE id = $1`, [roomId]);
  } else {
    await query(`UPDATE study_rooms SET room_streak = 0, updated_at = now() WHERE id = $1`, [roomId]);
  }
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

async function addMember(roomId, userId, role = "member", status = "invited") {
  const result = await query(
    `INSERT INTO study_room_members (room_id, user_id, role, status)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (room_id, user_id) DO UPDATE SET status = $4, role = $3
     RETURNING *`,
    [roomId, userId, role, status]
  );
  return result.rows[0];
}

async function acceptInvite(roomId, userId) {
  await query(
    `UPDATE study_room_members SET status = 'active', joined_at = now()
      WHERE room_id = $1 AND user_id = $2 AND status = 'invited'`,
    [roomId, userId]
  );
}

async function leaveRoom(roomId, userId) {
  await query(
    `UPDATE study_room_members SET status = 'left'
      WHERE room_id = $1 AND user_id = $2`,
    [roomId, userId]
  );
}

async function getRoomMembers(roomId) {
  const result = await query(
    `SELECT srm.user_id, u.name, u.username, srm.role,
            COALESCE(ds.has_practiced, false) AS practiced_today,
            COALESCE(ds.xp_today, 0) AS xp_today,
            COALESCE(ds.speaking_sessions_today, 0) AS speaking_sessions_today,
            COALESCE(ds.writing_sessions_today, 0) AS writing_sessions_today
       FROM study_room_members srm
       JOIN users u ON u.id = srm.user_id
       LEFT JOIN study_room_daily_status ds
         ON ds.room_id = srm.room_id AND ds.user_id = srm.user_id AND ds.date = CURRENT_DATE
      WHERE srm.room_id = $1 AND srm.status = 'active'
      ORDER BY srm.role = 'owner' DESC, u.name`,
    [roomId]
  );
  return result.rows;
}

async function getMemberCount(roomId) {
  const result = await query(
    `SELECT COUNT(*)::int AS count FROM study_room_members
      WHERE room_id = $1 AND status = 'active'`,
    [roomId]
  );
  return result.rows[0].count;
}

async function isRoomMember(roomId, userId) {
  const result = await query(
    `SELECT 1 FROM study_room_members
      WHERE room_id = $1 AND user_id = $2 AND status = 'active'`,
    [roomId, userId]
  );
  return result.rowCount > 0;
}

async function isRoomOwner(roomId, userId) {
  const result = await query(
    `SELECT 1 FROM study_room_members
      WHERE room_id = $1 AND user_id = $2 AND role = 'owner' AND status = 'active'`,
    [roomId, userId]
  );
  return result.rowCount > 0;
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

async function createGoal(roomId, goalType, targetValue, startDate, endDate, createdByUserId) {
  const result = await query(
    `INSERT INTO study_room_goals (room_id, goal_type, target_value, start_date, end_date, created_by_user_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [roomId, goalType, targetValue, startDate, endDate, createdByUserId]
  );
  return result.rows[0];
}

async function getActiveGoal(roomId) {
  const result = await query(
    `SELECT * FROM study_room_goals
      WHERE room_id = $1 AND status = 'active'
      ORDER BY created_at DESC LIMIT 1`,
    [roomId]
  );
  return result.rows[0] || null;
}

async function getRoomGoals(roomId, limit = 10) {
  const result = await query(
    `SELECT * FROM study_room_goals WHERE room_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [roomId, limit]
  );
  return result.rows;
}

async function updateGoalStatus(goalId, status) {
  await query(`UPDATE study_room_goals SET status = $2 WHERE id = $1`, [goalId, status]);
}

async function upsertContribution(goalId, userId, value) {
  await query(
    `INSERT INTO study_room_goal_contributions (goal_id, user_id, contribution_value)
     VALUES ($1, $2, $3)
     ON CONFLICT (goal_id, user_id)
     DO UPDATE SET contribution_value = study_room_goal_contributions.contribution_value + $3,
                   updated_at = now()`,
    [goalId, userId, value]
  );
}

async function getGoalProgress(goalId) {
  const result = await query(
    `SELECT gc.user_id, u.name, gc.contribution_value AS value
       FROM study_room_goal_contributions gc
       JOIN users u ON u.id = gc.user_id
      WHERE gc.goal_id = $1
      ORDER BY gc.contribution_value DESC`,
    [goalId]
  );
  const goal = await query(`SELECT target_value FROM study_room_goals WHERE id = $1`, [goalId]);
  const total = result.rows.reduce((sum, r) => sum + r.value, 0);
  return {
    total,
    target: goal.rows[0]?.target_value ?? 0,
    contributions: result.rows,
  };
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

async function createNote(roomId, userId, noteType, content) {
  const result = await query(
    `INSERT INTO study_room_notes (room_id, user_id, note_type, content)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [roomId, userId, noteType, content]
  );
  return result.rows[0];
}

async function getRoomNotes(roomId, limit = 20) {
  const result = await query(
    `SELECT n.*, u.name AS author_name
       FROM study_room_notes n
       JOIN users u ON u.id = n.user_id
      WHERE n.room_id = $1 AND n.deleted_at IS NULL
      ORDER BY n.is_pinned DESC, n.created_at DESC
      LIMIT $2`,
    [roomId, limit]
  );
  return result.rows;
}

async function pinNote(noteId, isPinned = true) {
  await query(`UPDATE study_room_notes SET is_pinned = $2 WHERE id = $1`, [noteId, isPinned]);
}

async function deleteNote(noteId, userId) {
  await query(
    `UPDATE study_room_notes SET deleted_at = now() WHERE id = $1 AND user_id = $2`,
    [noteId, userId]
  );
}

// ---------------------------------------------------------------------------
// Activity feed
// ---------------------------------------------------------------------------

async function addActivity(roomId, userId, activityType, metadata = {}) {
  await query(
    `INSERT INTO study_room_activity_feed (room_id, user_id, activity_type, metadata)
     VALUES ($1, $2, $3, $4)`,
    [roomId, userId, activityType, JSON.stringify(metadata)]
  );
}

async function getRoomFeed(roomId, limit = 20) {
  const result = await query(
    `SELECT f.*, u.name
       FROM study_room_activity_feed f
       JOIN users u ON u.id = f.user_id
      WHERE f.room_id = $1
      ORDER BY f.created_at DESC LIMIT $2`,
    [roomId, limit]
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// Daily status
// ---------------------------------------------------------------------------

async function upsertDailyStatus(roomId, userId, date, updates) {
  const { hasPracticed, xpToday, speakingSessions, writingSessions } = updates;
  await query(
    `INSERT INTO study_room_daily_status (room_id, user_id, date, has_practiced, xp_today, speaking_sessions_today, writing_sessions_today)
     VALUES ($1, $2, $3, $4, COALESCE($5, 0), COALESCE($6, 0), COALESCE($7, 0))
     ON CONFLICT (room_id, user_id, date)
     DO UPDATE SET
       has_practiced = COALESCE($4, study_room_daily_status.has_practiced),
       xp_today = study_room_daily_status.xp_today + COALESCE($5, 0),
       speaking_sessions_today = study_room_daily_status.speaking_sessions_today + COALESCE($6, 0),
       writing_sessions_today = study_room_daily_status.writing_sessions_today + COALESCE($7, 0),
       updated_at = now()`,
    [roomId, userId, date, hasPracticed ?? true, xpToday ?? 0, speakingSessions ?? 0, writingSessions ?? 0]
  );
}

async function getRoomDailyStatus(roomId, date) {
  const result = await query(
    `SELECT ds.*, u.name FROM study_room_daily_status ds
       JOIN users u ON u.id = ds.user_id
      WHERE ds.room_id = $1 AND ds.date = $2`,
    [roomId, date]
  );
  return result.rows;
}

module.exports = {
  createRoom, getRoomById, getUserRooms, updateRoomStreak,
  addMember, acceptInvite, leaveRoom, getRoomMembers, getMemberCount, isRoomMember, isRoomOwner,
  createGoal, getActiveGoal, getRoomGoals, updateGoalStatus, upsertContribution, getGoalProgress,
  createNote, getRoomNotes, pinNote, deleteNote,
  addActivity, getRoomFeed,
  upsertDailyStatus, getRoomDailyStatus,
};
