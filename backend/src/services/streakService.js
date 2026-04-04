/**
 * services/streakService.js
 *
 * Streak update and retrieval logic.
 * Streaks are calendar-day based (UTC date comparison).
 *
 * Rules:
 *   - First ever activity        → streak = 1
 *   - Activity on the SAME day  → no change (idempotent)
 *   - Activity on the NEXT day  → streak + 1
 *   - Activity after a gap      → streak resets to 1
 */

const { getStreak, upsertStreak } = require('../repositories/streakRepository');

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * updateStreak
 *
 * Called after every lesson completion for an authenticated user.
 * Returns the updated streak values plus a `changed` flag that indicates
 * whether the streak counter was actually incremented (used by badgeService
 * to avoid redundant badge checks on same-day repeat completions).
 *
 * @param {string} userId
 * @returns {Promise<{
 *   currentStreak:  number,
 *   longestStreak:  number,
 *   lastActivityAt: string,
 *   changed:        boolean,
 * }>}
 */
async function updateStreak(userId) {
  // Use UTC date so streaks are timezone-consistent across deployments.
  const today    = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const existing = await getStreak(userId);

  // ── No existing row: first-ever lesson ──────────────────────────────────
  if (!existing) {
    const row = await upsertStreak(userId, 1, 1, today);
    return {
      currentStreak:  row.current_streak,
      longestStreak:  row.longest_streak,
      lastActivityAt: row.last_activity_at,
      changed:        true,
    };
  }

  // ── Already logged activity today — no change ────────────────────────────
  const lastDate = existing.last_activity_at; // PostgreSQL DATE → 'YYYY-MM-DD'
  if (lastDate === today) {
    return {
      currentStreak:  existing.current_streak,
      longestStreak:  existing.longest_streak,
      lastActivityAt: existing.last_activity_at,
      changed:        false,
    };
  }

  // ── Compute new streak based on day gap ──────────────────────────────────
  const diffMs   = new Date(today) - new Date(lastDate);
  const diffDays = Math.round(diffMs / 86_400_000); // ms → days

  const newStreak  = diffDays === 1 ? existing.current_streak + 1 : 1;
  const newLongest = Math.max(existing.longest_streak, newStreak);

  const row = await upsertStreak(userId, newStreak, newLongest, today);
  return {
    currentStreak:  row.current_streak,
    longestStreak:  row.longest_streak,
    lastActivityAt: row.last_activity_at,
    changed:        true,
  };
}

/**
 * getStreakSummary
 *
 * Returns streak information for a user (safe to call with no prior activity).
 *
 * Important: if the user's last activity was more than 1 day ago, the streak
 * is broken and we return 0 — even though the DB still holds the old value.
 * The DB value only resets on the NEXT activity (via updateStreak).
 *
 * @param {string} userId
 * @returns {Promise<{ currentStreak: number, longestStreak: number, lastActivityAt: string|null }>}
 */
async function getStreakSummary(userId) {
  const row = await getStreak(userId);
  if (!row) {
    return { currentStreak: 0, longestStreak: 0, lastActivityAt: null };
  }

  // Check if the streak is still alive.
  // Streak is alive if last activity was today or yesterday (UTC).
  const today  = new Date().toISOString().slice(0, 10);
  const diffMs = new Date(today) - new Date(row.last_activity_at);
  const diffDays = Math.round(diffMs / 86_400_000);

  const streakAlive = diffDays <= 1; // 0 = today, 1 = yesterday

  return {
    currentStreak:  streakAlive ? row.current_streak : 0,
    longestStreak:  row.longest_streak,
    lastActivityAt: row.last_activity_at,
  };
}

module.exports = { updateStreak, getStreakSummary };
