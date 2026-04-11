/**
 * services/readingService.js
 *
 * Business logic for IELTS Reading practice and full tests.
 */

"use strict";

const readingRepo = require("../repositories/readingRepository");

// Band estimation from score
function estimateBand(correct, total) {
  if (total <= 8) {
    if (correct <= 2) return 4.5;
    if (correct <= 4) return 5.5;
    if (correct <= 6) return 6.5;
    if (correct === 7) return 7.0;
    return 7.5;
  }
  // Full test (24 questions)
  if (correct <= 8) return 4.5 + (correct / 8) * 1.0;
  if (correct <= 14) return 5.5 + ((correct - 9) / 6) * 0.5;
  if (correct <= 18) return 6.5 + ((correct - 15) / 4) * 0.5;
  if (correct <= 22) return 7.0 + ((correct - 19) / 4) * 0.5;
  return 8.0;
}

function bandToDifficulty(band) {
  if (band == null || band < 6.0) return "band_50_55";
  if (band < 7.0) return "band_60_65";
  if (band < 8.0) return "band_70_80";
  return "band_80_plus";
}

async function listPassages(userId, filters = {}) {
  // Auto-select difficulty from user's band if not specified
  if (!filters.difficulty) {
    const { query } = require("../config/db");
    const userRow = await query(`SELECT estimated_band FROM users WHERE id = $1`, [userId]);
    const band = userRow.rows[0]?.estimated_band;
    filters.difficulty = bandToDifficulty(band ? Number(band) : null);
  }
  return readingRepo.listPassages(filters);
}

async function getPassage(passageId) {
  const data = await readingRepo.getPassageWithQuestions(passageId);
  if (!data.passage) {
    const err = new Error("Passage not found");
    err.status = 404;
    throw err;
  }
  return data;
}

async function submitPractice(userId, passageId, answers, timeSeconds) {
  const { correct, total, results } = await readingRepo.scoreAnswers(passageId, answers);
  const bandEstimate = Math.round(estimateBand(correct, total) * 2) / 2;

  // Update user band
  try {
    const { updateUserBand } = require("../repositories/userRepository");
    await updateUserBand(userId, bandEstimate, "reading", passageId);
  } catch { /* silent */ }

  // Update study room activity
  try {
    const { onUserCompletedActivity } = require("./studyRoomService");
    onUserCompletedActivity(userId, "lessons", 1).catch(() => {});
  } catch { /* silent */ }

  return { score: correct, total, band_estimate: bandEstimate, time_seconds: timeSeconds, per_question_results: results };
}

async function startFullTest(userId) {
  // Select 3 passages: one from each difficulty tier
  const passages = await readingRepo.getPassagesByDifficulties(
    ["band_50_55", "band_60_65", "band_70_80"], 1
  );

  if (passages.length < 3) {
    const err = new Error("Not enough passages for full test");
    err.status = 503;
    throw err;
  }

  // Fetch full content for each
  const fullPassages = await Promise.all(
    passages.map((p) => readingRepo.getPassageWithQuestions(p.id))
  );

  return {
    passages: fullPassages,
    time_limit: 3600, // 60 minutes
  };
}

async function submitFullTest(userId, passageResults, timeSeconds) {
  let totalCorrect = 0;
  let totalQuestions = 0;
  const breakdowns = [];

  for (const pr of passageResults) {
    const { correct, total, results } = await readingRepo.scoreAnswers(pr.passage_id, pr.answers);
    totalCorrect += correct;
    totalQuestions += total;
    breakdowns.push({
      passage_id: pr.passage_id,
      score: correct,
      total,
      per_question_results: results,
    });
  }

  const bandEstimate = Math.round(estimateBand(totalCorrect, totalQuestions) * 2) / 2;

  // Update user band
  try {
    const { updateUserBand } = require("../repositories/userRepository");
    await updateUserBand(userId, bandEstimate, "reading", "full-test");
  } catch { /* silent */ }

  return {
    total_score: totalCorrect,
    total_questions: totalQuestions,
    band_estimate: bandEstimate,
    time_seconds: timeSeconds,
    passage_breakdowns: breakdowns,
  };
}

module.exports = { listPassages, getPassage, submitPractice, startFullTest, submitFullTest };
