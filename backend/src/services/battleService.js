/**
 * services/battleService.js
 *
 * Business logic for the IELTS Battle system: matchmaking, scoring,
 * rank point calculation, XP awards, and match expiry.
 */

"use strict";

const repo = require("../repositories/battleRepository");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const XP_WIN = 80;
const XP_LOSS = 30;
const RANK_WIN_BASE = 25;
const RANK_LOSS_BASE = -20;
const RANK_NO_SUBMIT = -30;
const SUBMISSION_DEADLINE_MINUTES = 30;

// ---------------------------------------------------------------------------
// Matchmaking
// ---------------------------------------------------------------------------

/**
 * Join the queue: find an existing queued match in same tier, or create one.
 */
async function joinQueue(userId, mode = "ranked") {
  const profile = await repo.getOrCreatePlayerProfile(userId);
  const tier = profile.current_rank_tier;
  const season = await repo.getCurrentSeason();
  const seasonId = mode === "ranked" && season ? season.id : null;

  // Check if user already in a queued/active match
  const existing = await checkActiveMatch(userId);
  if (existing) {
    return { status: "already_in_match", match: existing };
  }

  // Find a waiting match in same tier
  const waitingMatch = await repo.findQueuedMatch(userId, mode, tier);

  if (waitingMatch) {
    // Join existing match
    await repo.addParticipant(waitingMatch.id, userId, profile.current_rank_points);

    // Transition to active
    const deadline = new Date(Date.now() + SUBMISSION_DEADLINE_MINUTES * 60 * 1000);
    await repo.updateMatchStatus(waitingMatch.id, "active", {
      startedAt: new Date(),
      submissionDeadlineAt: deadline,
    });

    const match = await repo.getMatchById(waitingMatch.id);
    const content = match.question_set_id
      ? await repo.getPassageWithQuestions(match.question_set_id)
      : null;

    return { status: "matched", match, content };
  }

  // No match found — create one and wait (band-aware selection)
  const passageId = await repo.getPassageForUser(userId);
  if (!passageId) {
    const err = new Error("No reading passages available for battle");
    err.status = 503;
    throw err;
  }

  const match = await repo.createMatch({
    seasonId,
    mode,
    skillType: "reading",
    questionSetId: passageId,
  });
  await repo.addParticipant(match.id, userId, profile.current_rank_points);

  return { status: "queued", match };
}

/**
 * Leave queue: cancel user's queued match.
 */
async function leaveQueue(userId) {
  const cancelled = await repo.cancelQueuedMatchForUser(userId);
  return { cancelled };
}

/**
 * Check if user is already in an active/queued match.
 */
async function checkActiveMatch(userId) {
  const result = await require("../config/db").query(
    `SELECT bm.* FROM battle_matches bm
       JOIN battle_match_participants bmp ON bmp.match_id = bm.id
      WHERE bmp.user_id = $1 AND bm.status IN ('queued', 'active', 'awaiting_opponent')
      LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

// ---------------------------------------------------------------------------
// Submission + Scoring
// ---------------------------------------------------------------------------

/**
 * Submit answers for a battle match.
 */
async function submitBattle(userId, matchId, answers, timeSeconds) {
  const match = await repo.getMatchById(matchId);
  if (!match) { const e = new Error("Match not found"); e.status = 404; throw e; }
  if (!["active", "awaiting_opponent"].includes(match.status)) {
    const e = new Error("Match is not active"); e.status = 400; throw e;
  }

  const participant = await repo.getParticipant(matchId, userId);
  if (!participant) { const e = new Error("Not a participant"); e.status = 403; throw e; }
  if (participant.status === "submitted") { const e = new Error("Already submitted"); e.status = 409; throw e; }

  // Score the submission
  const score = await scoreSubmission(match.question_set_id, answers, timeSeconds);

  // Save submission
  await repo.createSubmission(matchId, participant.id, answers, score, timeSeconds);

  // Update participant
  await repo.updateParticipant(participant.id, {
    status: "submitted",
    submittedAt: new Date(),
    individualScore: score,
  });

  // Check if both players submitted
  const participants = await repo.getMatchParticipants(matchId);
  const allSubmitted = participants.every((p) => p.status === "submitted");

  if (allSubmitted) {
    await resolveMatch(matchId, match, participants);
    return { status: "completed", score, matchId };
  }

  // First to submit — wait for opponent
  await repo.updateMatchStatus(matchId, "awaiting_opponent");
  return { status: "awaiting_opponent", score, matchId };
}

/**
 * Score a submission: correct_answers * 1000 - time_seconds.
 */
async function scoreSubmission(passageId, answers, timeSeconds) {
  const { questions } = await repo.getPassageWithQuestions(passageId);
  let correct = 0;

  for (const ans of answers) {
    const question = questions.find((q) => q.id === ans.questionId || q.order_index === ans.orderIndex);
    if (question && question.correct_answer.toLowerCase() === String(ans.answer).toLowerCase()) {
      correct++;
    }
  }

  return correct * 1000 - (timeSeconds || 0);
}

/**
 * Resolve a completed match: determine winner, update ranks, award XP.
 */
async function resolveMatch(matchId, match, participants) {
  // Sort by score descending
  const sorted = [...participants].sort(
    (a, b) => Number(b.individual_score) - Number(a.individual_score)
  );

  const winner = sorted[0];
  const loser = sorted[1];
  const isDraw = Number(winner.individual_score) === Number(loser.individual_score);

  const winnerUserId = isDraw ? null : winner.user_id;

  // Calculate rank deltas
  const isRanked = match.mode === "ranked";

  for (const p of participants) {
    const isWinner = !isDraw && p.user_id === winnerUserId;
    const isLoser = !isDraw && p.user_id !== winnerUserId;
    const opponent = participants.find((x) => x.user_id !== p.user_id);

    let rankDelta = 0;
    let xpReward = 0;

    if (isRanked) {
      if (isDraw) {
        rankDelta = 0;
        xpReward = 50; // draw XP
      } else if (isWinner) {
        rankDelta = calculateWinDelta(
          p.rank_points_before || 0,
          opponent?.rank_points_before || 0
        );
        xpReward = XP_WIN;
      } else if (isLoser) {
        rankDelta = calculateLossDelta(
          p.rank_points_before || 0,
          opponent?.rank_points_before || 0
        );
        xpReward = XP_LOSS;
      }
    } else {
      // Unranked: XP only, no rank changes
      xpReward = isWinner ? XP_WIN : isDraw ? 50 : XP_LOSS;
    }

    const newPoints = Math.max(0, (p.rank_points_before || 0) + rankDelta);
    const newTier = repo.tierFromPoints(newPoints);

    await repo.updateParticipant(p.id, {
      rankPointsAfter: newPoints,
      rankDelta,
      xpReward,
    });

    if (isRanked && rankDelta !== 0) {
      await repo.addRankTransaction(
        p.user_id, matchId, rankDelta,
        isWinner ? "win" : "loss"
      );

      await repo.updatePlayerProfile(p.user_id, {
        rankPoints: newPoints,
        rankTier: newTier,
        wins: isWinner ? (await repo.getPlayerProfile(p.user_id))?.wins + 1 : undefined,
        losses: isLoser ? (await repo.getPlayerProfile(p.user_id))?.losses + 1 : undefined,
      });
    }

    // Award XP via xpService — idempotent on (user, "battle_result", matchId)
    // so a concurrent double-resolve cannot double-grant XP.
    try {
      const xpService = require("./xpService");
      const xpResult = await xpService.awardXp(p.user_id, xpReward, "battle_result", matchId);
      if (!xpResult.awarded) {
        console.warn(`[battle] duplicate xp award skipped match=${matchId} user=${p.user_id}`);
      }
    } catch (err) {
      console.error(`[battle] xp award failed match=${matchId} user=${p.user_id}:`, err.message);
    }
  }

  await repo.updateMatchStatus(matchId, "completed", {
    completedAt: new Date(),
    winnerUserId,
  });
}

/**
 * Win delta: +25 base, bonus if underdog.
 */
function calculateWinDelta(winnerRp, loserRp) {
  if (winnerRp < loserRp) {
    // Underdog win: +30 to +35
    return RANK_WIN_BASE + 5 + Math.min(5, Math.floor((loserRp - winnerRp) / 100));
  }
  // Favored win: +18 to +22
  const gap = Math.min(5, Math.floor((winnerRp - loserRp) / 100));
  return Math.max(18, RANK_WIN_BASE - gap);
}

/**
 * Loss delta: -20 base, less harsh for underdog.
 */
function calculateLossDelta(loserRp, winnerRp) {
  if (loserRp < winnerRp) {
    // Expected loss: -15 to -18
    return Math.max(-18, RANK_LOSS_BASE + 5);
  }
  // Upset loss: full -20
  return RANK_LOSS_BASE;
}

// ---------------------------------------------------------------------------
// Match status + results
// ---------------------------------------------------------------------------

async function getMatchStatus(userId, matchId) {
  const match = await repo.getMatchById(matchId);
  if (!match) { const e = new Error("Match not found"); e.status = 404; throw e; }

  const participant = await repo.getParticipant(matchId, userId);
  if (!participant) { const e = new Error("Not a participant"); e.status = 403; throw e; }

  const content = match.question_set_id
    ? await repo.getPassageWithQuestions(match.question_set_id)
    : null;

  return { match, participant, content };
}

async function getResult(userId, matchId) {
  const match = await repo.getMatchById(matchId);
  if (!match) { const e = new Error("Match not found"); e.status = 404; throw e; }

  const participants = await repo.getMatchParticipants(matchId);
  const myParticipant = participants.find((p) => p.user_id === userId);
  if (!myParticipant) { const e = new Error("Not a participant"); e.status = 403; throw e; }

  const opponent = participants.find((p) => p.user_id !== userId);

  return {
    match,
    myResult: myParticipant,
    opponentResult: opponent ? {
      name: opponent.name,
      username: opponent.username,
      score: opponent.individual_score,
      rankDelta: opponent.rank_delta,
    } : null,
    isWinner: match.winner_user_id === userId,
    isDraw: match.winner_user_id === null && match.status === "completed",
  };
}

// ---------------------------------------------------------------------------
// Profile + Leaderboard
// ---------------------------------------------------------------------------

async function getProfile(userId) {
  const profile = await repo.getOrCreatePlayerProfile(userId);
  const rank = await repo.getUserBattleRank(userId);
  const recentMatches = await repo.getRecentMatches(userId, 5);
  return { profile, rank: rank?.rank || null, recentMatches };
}

async function getLeaderboard(scope, userId) {
  const entries = await repo.getBattleLeaderboard(50);
  const myRank = userId ? await repo.getUserBattleRank(userId) : null;
  return { entries, myEntry: myRank };
}

async function getHome(userId) {
  const [profile, leaderboard, recentMatches] = await Promise.all([
    getProfile(userId),
    repo.getBattleLeaderboard(5),
    repo.getRecentMatches(userId, 5),
  ]);
  return { profile: profile.profile, rank: profile.rank, leaderboardPreview: leaderboard, recentMatches };
}

// ---------------------------------------------------------------------------
// Direct challenges
// ---------------------------------------------------------------------------

async function createDirectChallenge(userId, targetUserId) {
  if (userId === targetUserId) {
    const e = new Error("Cannot challenge yourself"); e.status = 400; throw e;
  }

  const passageId = await repo.getPassageForUser(userId);
  if (!passageId) { const e = new Error("No passages available"); e.status = 503; throw e; }

  const match = await repo.createMatch({
    seasonId: null,
    mode: "unranked",
    skillType: "reading",
    questionSetId: passageId,
  });

  const profile = await repo.getOrCreatePlayerProfile(userId);
  await repo.addParticipant(match.id, userId, profile.current_rank_points);

  // Notify target
  try {
    const socialRepo = require("../repositories/socialRepository");
    const user = await socialRepo.getUserById(userId);
    await socialRepo.createNotification(targetUserId, "battle_challenge", {
      matchId: match.id,
      challengerName: user?.name || "Someone",
    });
  } catch { /* silent */ }

  return { match, status: "challenge_sent" };
}

async function acceptChallenge(userId, matchId) {
  const match = await repo.getMatchById(matchId);
  if (!match) { const e = new Error("Match not found"); e.status = 404; throw e; }
  if (match.status !== "queued") { const e = new Error("Challenge no longer available"); e.status = 400; throw e; }

  const profile = await repo.getOrCreatePlayerProfile(userId);
  await repo.addParticipant(match.id, userId, profile.current_rank_points);

  const deadline = new Date(Date.now() + SUBMISSION_DEADLINE_MINUTES * 60 * 1000);
  await repo.updateMatchStatus(match.id, "active", {
    startedAt: new Date(),
    submissionDeadlineAt: deadline,
  });

  const updatedMatch = await repo.getMatchById(match.id);
  const content = updatedMatch.question_set_id
    ? await repo.getPassageWithQuestions(updatedMatch.question_set_id)
    : null;

  return { match: updatedMatch, content, status: "accepted" };
}

// ---------------------------------------------------------------------------
// Auto-expiry job
// ---------------------------------------------------------------------------

async function expireOverdueMatches() {
  const overdue = await repo.findOverdueMatches();
  let expired = 0;

  for (const { id: matchId } of overdue) {
    try {
      const match = await repo.getMatchById(matchId);
      if (!match || match.status === "completed" || match.status === "expired") continue;

      const participants = await repo.getMatchParticipants(matchId);

      for (const p of participants) {
        if (p.status === "active") {
          // No submit
          await repo.updateParticipant(p.id, { status: "no_submit" });

          if (match.mode === "ranked") {
            const newPoints = Math.max(0, (p.rank_points_before || 0) + RANK_NO_SUBMIT);
            const newTier = repo.tierFromPoints(newPoints);

            await repo.addRankTransaction(p.user_id, matchId, RANK_NO_SUBMIT, "no_submit");
            await repo.updatePlayerProfile(p.user_id, {
              rankPoints: newPoints,
              rankTier: newTier,
              noSubmitLosses: ((await repo.getPlayerProfile(p.user_id))?.no_submit_losses || 0) + 1,
            });
          }
        }
      }

      // If one submitted, they win by default
      const submittedParticipants = participants.filter((p) => p.status === "submitted");
      const winnerUserId = submittedParticipants.length === 1 ? submittedParticipants[0].user_id : null;

      if (winnerUserId && match.mode === "ranked") {
        const winner = submittedParticipants[0];
        const delta = RANK_WIN_BASE;
        const newPoints = Math.max(0, (winner.rank_points_before || 0) + delta);
        const newTier = repo.tierFromPoints(newPoints);

        await repo.updateParticipant(winner.id, { rankPointsAfter: newPoints, rankDelta: delta, xpReward: XP_WIN });
        await repo.addRankTransaction(winner.user_id, matchId, delta, "win");
        await repo.updatePlayerProfile(winner.user_id, {
          rankPoints: newPoints,
          rankTier: newTier,
          wins: ((await repo.getPlayerProfile(winner.user_id))?.wins || 0) + 1,
        });

        // Award XP — idempotent: if normal resolve already awarded XP for
        // this match (same matchId ref), expiry winner-path will be skipped.
        try {
          const xpService = require("./xpService");
          const xpResult = await xpService.awardXp(winner.user_id, XP_WIN, "battle_result", matchId);
          if (!xpResult.awarded) {
            console.warn(`[battle] duplicate xp award skipped (expiry) match=${matchId} user=${winner.user_id}`);
          }
        } catch (err) {
          console.error(`[battle] xp award failed (expiry) match=${matchId}:`, err.message);
        }
      }

      await repo.updateMatchStatus(matchId, "expired", { completedAt: new Date(), winnerUserId });
      expired++;
    } catch (err) {
      console.error(`[battle] expiry error for match ${matchId}:`, err.message);
    }
  }

  if (expired > 0) console.log(`[battle] expired ${expired} overdue matches`);
}

module.exports = {
  joinQueue,
  leaveQueue,
  submitBattle,
  getMatchStatus,
  getResult,
  getProfile,
  getLeaderboard,
  getHome,
  createDirectChallenge,
  acceptChallenge,
  expireOverdueMatches,
};
