/**
 * repositories/listeningRepository.js
 *
 * SQL queries for IELTS Listening tests, parts, question groups, questions,
 * and user attempts.
 *
 * Phase 0: skeleton only. All functions throw "not implemented". Wiring
 * exists so the route → controller → service → repository chain compiles
 * and Phase 1 can fill in queries without restructuring.
 */

"use strict";

/* eslint-disable no-unused-vars */

/**
 * List Listening tests, optionally filtered.
 *
 * @param {object} [filters]
 * @param {'practice'|'exam'} [filters.mode]
 * @param {number[]}          [filters.cambridgeBooks]
 * @param {number[]}          [filters.parts]              – Part numbers (1..4)
 * @param {string[]}          [filters.questionTypes]      – e.g. ['map_labelling']
 * @param {number}            [filters.limit]
 * @param {number}            [filters.offset]
 * @returns {Promise<Array<object>>}
 */
async function listTests({
  mode,
  cambridgeBooks,
  parts,
  questionTypes,
  limit,
  offset,
} = {}) {
  throw new Error("not implemented");
}

/**
 * Fetch a single test row by id.
 *
 * @param {string} testId
 * @returns {Promise<object|null>}
 */
async function getTestById(testId) {
  throw new Error("not implemented");
}

/**
 * Fetch a single part row by id.
 *
 * @param {string} partId
 * @returns {Promise<object|null>}
 */
async function getPartById(partId) {
  throw new Error("not implemented");
}

/**
 * Fetch a part with all its question groups + questions, joined and ordered
 * for the player UI.
 *
 * @param {string} partId
 * @returns {Promise<object|null>}
 */
async function getPartWithGroupsAndQuestions(partId) {
  throw new Error("not implemented");
}

/**
 * Fetch a full test (4 parts) with all groups + questions, for exam mode.
 *
 * @param {string} testId
 * @returns {Promise<object|null>}
 */
async function getTestWithAllPartsAndQuestions(testId) {
  throw new Error("not implemented");
}

/**
 * Insert a new attempt row (status = 'in_progress').
 *
 * @param {object} input
 * @param {string} input.userId
 * @param {string} input.testId
 * @param {'practice_strict'|'practice_loose'|'exam'} input.mode
 * @param {string} [input.partId]   – required for practice modes, NULL for exam
 * @returns {Promise<{ id: string }>}
 */
async function createAttempt({ userId, testId, mode, partId }) {
  throw new Error("not implemented");
}

/**
 * Fetch an attempt row by id.
 *
 * @param {string} attemptId
 * @returns {Promise<object|null>}
 */
async function getAttemptById(attemptId) {
  throw new Error("not implemented");
}

/**
 * Persist in-progress answer state (autosave).
 *
 * @param {string} attemptId
 * @param {Record<string,string>} answers   – e.g. { "1": "Davies", "2": "B" }
 * @returns {Promise<void>}
 */
async function updateAttemptAnswers(attemptId, answers) {
  throw new Error("not implemented");
}

/**
 * Mark an attempt submitted and persist final score.
 *
 * @param {string} attemptId
 * @param {object} result
 * @param {number} result.correctCount
 * @param {number} result.totalCount
 * @param {number} result.bandScore
 * @param {number} result.timeSpentSeconds
 * @returns {Promise<void>}
 */
async function submitAttempt(
  attemptId,
  { correctCount, totalCount, bandScore, timeSpentSeconds }
) {
  throw new Error("not implemented");
}

/**
 * Aggregate stats for the user's Listening dashboard card.
 *
 * @param {string} userId
 * @returns {Promise<{
 *   sectionsDone: number,
 *   averageBand: number|null,
 *   timeSpentSeconds: number,
 *   currentStreak: number
 * }>}
 */
async function getUserListeningStats(userId) {
  throw new Error("not implemented");
}

module.exports = {
  listTests,
  getTestById,
  getPartById,
  getPartWithGroupsAndQuestions,
  getTestWithAllPartsAndQuestions,
  createAttempt,
  getAttemptById,
  updateAttemptAnswers,
  submitAttempt,
  getUserListeningStats,
};
