/**
 * repositories/battleRepository.js
 *
 * SQL queries for the IELTS Battle system: seasons, profiles, matches,
 * participants, submissions, rank transactions.
 */

const { query, pool } = require("../config/db");
const { sanitizeQuestionsForExam } = require("../utils/sanitize");

// ---------------------------------------------------------------------------
// Rank tier helpers
// ---------------------------------------------------------------------------

const RANK_TIERS = [
  { tier: "iron",       min: 0,    max: 199 },
  { tier: "bronze",     min: 200,  max: 399 },
  { tier: "silver",     min: 400,  max: 699 },
  { tier: "gold",       min: 700,  max: 999 },
  { tier: "platinum",   min: 1000, max: 1399 },
  { tier: "diamond",    min: 1400, max: 1799 },
  { tier: "challenger", min: 1800, max: Infinity },
];

function tierFromPoints(points) {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (points >= RANK_TIERS[i].min) return RANK_TIERS[i].tier;
  }
  return "iron";
}

// ---------------------------------------------------------------------------
// Seasons
// ---------------------------------------------------------------------------

async function getCurrentSeason() {
  const result = await query(
    `SELECT * FROM battle_seasons WHERE status = 'active' ORDER BY start_at DESC LIMIT 1`
  );
  return result.rows[0] || null;
}

// ---------------------------------------------------------------------------
// Player profiles
// ---------------------------------------------------------------------------

async function getOrCreatePlayerProfile(userId) {
  // Upsert: create if not exists, return existing if it does
  const result = await query(
    `INSERT INTO battle_player_profiles (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
     RETURNING *`,
    [userId]
  );
  return result.rows[0];
}

async function getPlayerProfile(userId) {
  const result = await query(
    `SELECT bpp.*, u.name, u.username
       FROM battle_player_profiles bpp
       JOIN users u ON u.id = bpp.user_id
      WHERE bpp.user_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function updatePlayerProfile(userId, updates) {
  const { rankPoints, rankTier, wins, losses, noSubmitLosses, placementCompleted } = updates;
  await query(
    `UPDATE battle_player_profiles SET
       current_rank_points = COALESCE($2, current_rank_points),
       current_rank_tier = COALESCE($3, current_rank_tier),
       wins = COALESCE($4, wins),
       losses = COALESCE($5, losses),
       no_submit_losses = COALESCE($6, no_submit_losses),
       placement_matches_completed = COALESCE($7, placement_matches_completed),
       updated_at = now()
     WHERE user_id = $1`,
    [userId, rankPoints, rankTier, wins, losses, noSubmitLosses, placementCompleted]
  );
}

// ---------------------------------------------------------------------------
// Matches — queue + creation
// ---------------------------------------------------------------------------

/**
 * Find a waiting match in the same rank tier range for matchmaking.
 */
async function findQueuedMatch(userId, mode, rankTier) {
  const result = await query(
    `SELECT bm.* FROM battle_matches bm
       JOIN battle_match_participants bmp ON bmp.match_id = bm.id
       JOIN battle_player_profiles bpp ON bpp.user_id = bmp.user_id
      WHERE bm.status = 'queued'
        AND bm.mode = $2
        AND bmp.user_id != $1
        AND bpp.current_rank_tier = $3
      ORDER BY bm.created_at ASC
      LIMIT 1`,
    [userId, mode, rankTier]
  );
  return result.rows[0] || null;
}

async function createMatch(data) {
  const { seasonId, mode, skillType, questionSetId } = data;
  const result = await query(
    `INSERT INTO battle_matches (season_id, mode, skill_type, question_set_id, status)
     VALUES ($1, $2, $3, $4, 'queued')
     RETURNING *`,
    [seasonId, mode, skillType || "reading", questionSetId]
  );
  return result.rows[0];
}

async function addParticipant(matchId, userId, rankPointsBefore) {
  const result = await query(
    `INSERT INTO battle_match_participants (match_id, user_id, rank_points_before)
     VALUES ($1, $2, $3)
     ON CONFLICT (match_id, user_id) DO NOTHING
     RETURNING *`,
    [matchId, userId, rankPointsBefore]
  );
  return result.rows[0];
}

async function updateMatchStatus(matchId, status, extra = {}) {
  const sets = ["status = $2"];
  const params = [matchId, status];
  let idx = 3;

  if (extra.startedAt) { sets.push(`started_at = $${idx}`); params.push(extra.startedAt); idx++; }
  if (extra.completedAt) { sets.push(`completed_at = $${idx}`); params.push(extra.completedAt); idx++; }
  if (extra.winnerUserId) { sets.push(`winner_user_id = $${idx}`); params.push(extra.winnerUserId); idx++; }
  if (extra.submissionDeadlineAt) { sets.push(`submission_deadline_at = $${idx}`); params.push(extra.submissionDeadlineAt); idx++; }

  await query(`UPDATE battle_matches SET ${sets.join(", ")} WHERE id = $1`, params);
}

async function getMatchById(matchId) {
  const result = await query(`SELECT * FROM battle_matches WHERE id = $1`, [matchId]);
  return result.rows[0] || null;
}

async function getMatchParticipants(matchId) {
  const result = await query(
    `SELECT bmp.*, u.name, u.username
       FROM battle_match_participants bmp
       JOIN users u ON u.id = bmp.user_id
      WHERE bmp.match_id = $1`,
    [matchId]
  );
  return result.rows;
}

async function getParticipant(matchId, userId) {
  const result = await query(
    `SELECT * FROM battle_match_participants WHERE match_id = $1 AND user_id = $2`,
    [matchId, userId]
  );
  return result.rows[0] || null;
}

async function updateParticipant(participantId, updates) {
  const { status, submittedAt, individualScore, rankPointsAfter, rankDelta, xpReward } = updates;
  await query(
    `UPDATE battle_match_participants SET
       status = COALESCE($2, status),
       submitted_at = COALESCE($3, submitted_at),
       individual_score = COALESCE($4, individual_score),
       rank_points_after = COALESCE($5, rank_points_after),
       rank_delta = COALESCE($6, rank_delta),
       xp_reward = COALESCE($7, xp_reward)
     WHERE id = $1`,
    [participantId, status, submittedAt, individualScore, rankPointsAfter, rankDelta, xpReward]
  );
}

// ---------------------------------------------------------------------------
// Submissions
// ---------------------------------------------------------------------------

async function createSubmission(matchId, participantId, answersJson, finalScore, timeSeconds) {
  const result = await query(
    `INSERT INTO battle_submissions (match_id, participant_id, answers_json, final_score, time_seconds)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [matchId, participantId, JSON.stringify(answersJson), finalScore, timeSeconds]
  );
  return result.rows[0];
}

// ---------------------------------------------------------------------------
// Rank transactions
// ---------------------------------------------------------------------------

async function addRankTransaction(userId, matchId, delta, reason) {
  await query(
    `INSERT INTO battle_rank_transactions (user_id, match_id, delta, reason)
     VALUES ($1, $2, $3, $4)`,
    [userId, matchId, delta, reason]
  );
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

async function getBattleLeaderboard(limit = 50) {
  const result = await query(
    `SELECT bpp.user_id, u.name, u.username,
            bpp.current_rank_points, bpp.current_rank_tier, bpp.wins, bpp.losses,
            RANK() OVER (ORDER BY bpp.current_rank_points DESC) AS rank
       FROM battle_player_profiles bpp
       JOIN users u ON u.id = bpp.user_id
      WHERE u.deleted_at IS NULL
      ORDER BY bpp.current_rank_points DESC
      LIMIT $1`,
    [limit]
  );
  return result.rows;
}

async function getUserBattleRank(userId) {
  const result = await query(
    `SELECT user_id, current_rank_points, current_rank_tier,
            (SELECT COUNT(*)::int + 1 FROM battle_player_profiles b2
              WHERE b2.current_rank_points > bpp.current_rank_points) AS rank
       FROM battle_player_profiles bpp
      WHERE bpp.user_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

// ---------------------------------------------------------------------------
// Recent matches for a user
// ---------------------------------------------------------------------------

async function getRecentMatches(userId, limit = 10) {
  const result = await query(
    `SELECT bm.id, bm.mode, bm.status, bm.skill_type, bm.winner_user_id,
            bm.completed_at, bm.created_at,
            bmp.individual_score, bmp.rank_delta, bmp.xp_reward,
            rp.passage_title
       FROM battle_match_participants bmp
       JOIN battle_matches bm ON bm.id = bmp.match_id
       LEFT JOIN reading_passages rp ON rp.id = bm.question_set_id
      WHERE bmp.user_id = $1 AND bm.status IN ('completed', 'expired')
      ORDER BY bm.completed_at DESC NULLS LAST
      LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

/**
 * Paginated full Battle history for the authenticated user (Wave 2.9).
 *
 * Joins each match to the OPPOSING participant + their user row to
 * surface opponent display info. LEFT JOIN to users so a deleted
 * opponent (Wave 2.7 anonymized — name = 'Người dùng đã xóa') still
 * appears in history with the anonymized name; we filter further to
 * exclude the deleting USER's own anonymized friend list later if
 * needed, but battle history retains the row by design (Wave 2.7
 * lock B — keep aggregate).
 *
 * Result derived in SQL so the FE doesn't have to compare scores
 * itself. Draws map to 'draw'; expired matches whose only submitter
 * won are 'won'/'lost' relative to viewer.
 *
 * @returns {Promise<Array<{
 *   id, played_at, status, result,
 *   my_score, opponent_score, rank_delta, xp_earned,
 *   opponent_username, opponent_avatar, opponent_name,
 *   passage_title
 * }>>}
 */
async function listUserHistory(userId, limit, offset) {
  const result = await query(
    `SELECT bm.id,
            COALESCE(bm.completed_at, bm.created_at) AS played_at,
            bm.status,
            my.individual_score    AS my_score,
            my.rank_delta,
            my.xp_reward           AS xp_earned,
            opp.individual_score   AS opponent_score,
            u.username             AS opponent_username,
            u.name                 AS opponent_name,
            u.avatar_url           AS opponent_avatar,
            rp.passage_title,
            CASE
              WHEN my.individual_score IS NULL OR opp.individual_score IS NULL
                THEN 'pending'
              WHEN my.individual_score > opp.individual_score THEN 'won'
              WHEN my.individual_score < opp.individual_score THEN 'lost'
              ELSE 'draw'
            END                    AS result
       FROM battle_matches bm
       JOIN battle_match_participants my  ON my.match_id  = bm.id AND my.user_id  = $1
       LEFT JOIN battle_match_participants opp ON opp.match_id = bm.id AND opp.user_id <> $1
       LEFT JOIN users u                 ON u.id = opp.user_id
       LEFT JOIN reading_passages rp     ON rp.id = bm.question_set_id
      WHERE bm.status IN ('completed', 'expired')
      ORDER BY COALESCE(bm.completed_at, bm.created_at) DESC NULLS LAST
      LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );
  return result.rows;
}

async function countUserHistory(userId) {
  const result = await query(
    `SELECT COUNT(*)::int AS n
       FROM battle_match_participants bmp
       JOIN battle_matches bm ON bm.id = bmp.match_id
      WHERE bmp.user_id = $1
        AND bm.status IN ('completed', 'expired')`,
    [userId],
  );
  return result.rows[0]?.n ?? 0;
}

// ---------------------------------------------------------------------------
// Expiry — find overdue matches
// ---------------------------------------------------------------------------

async function findOverdueMatches() {
  const result = await query(
    `SELECT id FROM battle_matches
      WHERE status IN ('active', 'awaiting_opponent')
        AND submission_deadline_at IS NOT NULL
        AND submission_deadline_at < NOW()`
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// Band-aware passage selection
// ---------------------------------------------------------------------------

/**
 * Map a user's estimated band to a difficulty tier.
 */
function bandToDifficulty(band) {
  if (band == null || band < 6.0) return "band_50_55";
  if (band < 7.0) return "band_60_65";
  if (band < 8.0) return "band_70_80";
  return "band_80_plus";
}

/**
 * Get a passage the user hasn't seen recently, matched to their band.
 * Falls back to any unseen passage, then any passage if all seen.
 */
async function getPassageForUser(userId) {
  // Get user's estimated band (default 5.0)
  const userRow = await query(
    `SELECT estimated_band FROM users WHERE id = $1`,
    [userId]
  );
  const band = userRow.rows[0]?.estimated_band ?? 5.0;
  const difficulty = bandToDifficulty(Number(band));

  // Try unseen passage in matching difficulty
  let result = await query(
    `SELECT rp.id FROM reading_passages rp
      WHERE rp.review_status != 'rejected'
        AND rp.difficulty = $2
        AND rp.id NOT IN (
          SELECT bm.question_set_id FROM battle_matches bm
            JOIN battle_match_participants bmp ON bmp.match_id = bm.id
           WHERE bmp.user_id = $1 AND bm.question_set_id IS NOT NULL
        )
      ORDER BY RANDOM() LIMIT 1`,
    [userId, difficulty]
  );
  if (result.rows[0]) return result.rows[0].id;

  // Fallback: any unseen passage (any difficulty)
  result = await query(
    `SELECT rp.id FROM reading_passages rp
      WHERE rp.review_status != 'rejected'
        AND rp.id NOT IN (
          SELECT bm.question_set_id FROM battle_matches bm
            JOIN battle_match_participants bmp ON bmp.match_id = bm.id
           WHERE bmp.user_id = $1 AND bm.question_set_id IS NOT NULL
        )
      ORDER BY RANDOM() LIMIT 1`,
    [userId]
  );
  if (result.rows[0]) return result.rows[0].id;

  // Final fallback: any passage (user has seen all)
  result = await query(
    `SELECT id FROM reading_passages WHERE review_status != 'rejected' ORDER BY RANDOM() LIMIT 1`
  );
  return result.rows[0]?.id || null;
}

/**
 * Legacy: random passage without band filtering.
 */
async function getRandomPassage() {
  const result = await query(
    `SELECT id FROM reading_passages WHERE review_status != 'rejected' ORDER BY RANDOM() LIMIT 1`
  );
  return result.rows[0]?.id || null;
}

// ---------------------------------------------------------------------------
// Questions for a passage
// ---------------------------------------------------------------------------

/**
 * getPassageWithQuestions — RAW data including answer keys.
 * Server-side scoring use only (battleService.scoreSubmission).
 * Do NOT return directly to clients.
 */
async function getPassageWithQuestions(passageId) {
  const [passage, questions] = await Promise.all([
    query(`SELECT * FROM reading_passages WHERE id = $1`, [passageId]),
    query(`SELECT * FROM reading_questions WHERE passage_id = $1 ORDER BY order_index`, [passageId]),
  ]);
  return {
    passage: passage.rows[0] || null,
    questions: questions.rows,
  };
}

/**
 * getPassageWithQuestionsForBattle — SAFE for pre-submit match payloads.
 * Strips correct_answer, explanation, acceptable_answers, and any nested
 * correct_* fields. Used by joinQueue (matched), getMatchStatus,
 * acceptChallenge — endpoints that ship a passage to the active player.
 */
async function getPassageWithQuestionsForBattle(passageId) {
  const data = await getPassageWithQuestions(passageId);
  return {
    passage: data.passage,
    questions: sanitizeQuestionsForExam(data.questions),
  };
}

// ---------------------------------------------------------------------------
// Cancel queued match
// ---------------------------------------------------------------------------

async function cancelQueuedMatchForUser(userId) {
  // Find user's queued match and cancel it
  const result = await query(
    `UPDATE battle_matches SET status = 'cancelled'
      WHERE id IN (
        SELECT bm.id FROM battle_matches bm
        JOIN battle_match_participants bmp ON bmp.match_id = bm.id
        WHERE bmp.user_id = $1 AND bm.status = 'queued'
      )
     RETURNING id`,
    [userId]
  );
  return result.rowCount > 0;
}

module.exports = {
  tierFromPoints,
  getCurrentSeason,
  getOrCreatePlayerProfile,
  getPlayerProfile,
  updatePlayerProfile,
  findQueuedMatch,
  createMatch,
  addParticipant,
  updateMatchStatus,
  getMatchById,
  getMatchParticipants,
  getParticipant,
  updateParticipant,
  createSubmission,
  addRankTransaction,
  getBattleLeaderboard,
  getUserBattleRank,
  getRecentMatches,
  listUserHistory,
  countUserHistory,
  findOverdueMatches,
  getPassageForUser,
  getRandomPassage,
  getPassageWithQuestions,
  getPassageWithQuestionsForBattle,
  cancelQueuedMatchForUser,
};
