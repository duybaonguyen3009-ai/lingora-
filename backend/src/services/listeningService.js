/**
 * services/listeningService.js
 *
 * Business logic for IELTS Listening practice and exam modes.
 *
 * Practice Mode (Cam 1–6, mode = 'practice_strict' | 'practice_loose'):
 *   - User picks ONE Part at a time (Part 1..4 of a chosen test).
 *   - Audio is pauseable. Strict = single play, Loose = unlimited replay.
 *   - Result screen shows transcript with answer-line highlights.
 *
 * Exam Mode (Cam 7–14, mode = 'exam'):
 *   - All 4 Parts play continuously (single audio file or stitched).
 *   - One pause allowed per attempt (pause_used flag).
 *   - Auto-submit on audio end + 2-minute transfer window.
 *
 * Phase 0: skeleton only — every method throws "not implemented". Wiring
 * matches readingService so Phase 1 can fill in logic without restructure.
 */

"use strict";

/* eslint-disable no-unused-vars */

const listeningRepo = require("../repositories/listeningRepository");

/**
 * @param {object} [filters]
 * @returns {Promise<Array<object>>}
 */
async function listTests(filters = {}) {
  throw new Error("not implemented");
}

/**
 * Build the payload the player needs to start a test (exam mode):
 * test row + all 4 parts + groups + questions + presigned audio URLs.
 *
 * @param {string} testId
 * @returns {Promise<object>}
 */
async function getTestForPlay(testId) {
  throw new Error("not implemented");
}

/**
 * Build the payload the player needs to start a single Part (practice mode):
 * part row + groups + questions + presigned audio URL.
 *
 * @param {string} partId
 * @returns {Promise<object>}
 */
async function getPartForPlay(partId) {
  throw new Error("not implemented");
}

/**
 * Create a new attempt row.
 *
 * @param {string} userId
 * @param {object} input
 * @param {string} input.testId
 * @param {'practice_strict'|'practice_loose'|'exam'} input.mode
 * @param {string} [input.partId]
 * @returns {Promise<{ attemptId: string }>}
 */
async function startAttempt(userId, { testId, mode, partId }) {
  throw new Error("not implemented");
}

/**
 * Persist autosave answer state. Caller must own the attempt.
 *
 * @param {string} userId
 * @param {string} attemptId
 * @param {Record<string,string>} answers
 * @returns {Promise<void>}
 */
async function saveProgress(userId, attemptId, answers) {
  throw new Error("not implemented");
}

/**
 * Score the attempt, persist results, award XP + update streak (wrap each
 * gamification call in try/catch so a non-fatal failure does not break
 * scoring — see readingService.submitPractice for the canonical pattern).
 *
 * @param {string} userId
 * @param {string} attemptId
 * @returns {Promise<{
 *   correctCount: number,
 *   totalCount:   number,
 *   bandScore:    number,
 *   perPart:      Array<{ partNumber: number, correct: number, total: number }>,
 *   transcript:   Array<{ partNumber: number, text: string }>
 * }>}
 */
async function submitAttempt(userId, attemptId) {
  throw new Error("not implemented");
}

/**
 * Re-fetch a previously submitted attempt's full result for review.
 *
 * @param {string} userId
 * @param {string} attemptId
 * @returns {Promise<object>}
 */
async function getAttemptResult(userId, attemptId) {
  throw new Error("not implemented");
}

/**
 * Listening dashboard stats (sections done, average band, time spent, streak).
 *
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function getListeningStats(userId) {
  throw new Error("not implemented");
}

module.exports = {
  listTests,
  getTestForPlay,
  getPartForPlay,
  startAttempt,
  saveProgress,
  submitAttempt,
  getAttemptResult,
  getListeningStats,
};
