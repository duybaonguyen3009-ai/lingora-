/**
 * services/writingQuestionsService.js
 *
 * Thin orchestration over writingQuestionsRepository. Enforces
 * allow-listed filter vocab so arbitrary client strings never reach SQL.
 */

"use strict";

const writingQuestionsRepository = require("../repositories/writingQuestionsRepository");

const ALLOWED_TASK_TYPES = new Set(["task1", "task2"]);
const ALLOWED_DIFFICULTIES = new Set(["band_5_6", "band_6_7", "band_7_8"]);

function normaliseTaskType(value) {
  return ALLOWED_TASK_TYPES.has(value) ? value : null;
}

function normaliseDifficulty(value) {
  return ALLOWED_DIFFICULTIES.has(value) ? value : null;
}

async function listQuestions(userId, filters) {
  return writingQuestionsRepository.listQuestions({
    userId,
    taskType: normaliseTaskType(filters.taskType),
    topic: filters.topic || undefined,
    difficulty: normaliseDifficulty(filters.difficulty),
    excludeAttempted: filters.excludeAttempted === true,
    limit: filters.limit,
    offset: filters.offset,
  });
}

async function listTopics(taskType) {
  return writingQuestionsRepository.listTopics(normaliseTaskType(taskType));
}

async function getQuestion(userId, id) {
  return writingQuestionsRepository.getQuestionById(id, userId);
}

async function recordAttempt(userId, questionId) {
  const question = await writingQuestionsRepository.getQuestionById(questionId);
  if (!question) {
    const err = new Error("Writing question not found");
    err.status = 404;
    throw err;
  }
  await writingQuestionsRepository.upsertAttempt(userId, questionId);
  return { id: questionId };
}

/**
 * Pick one Task 1 + one Task 2 for Full Test. Random for now — Item 8 swaps
 * in user-band-aware selection.
 */
async function startFullTest() {
  const task1 = await writingQuestionsRepository.pickRandomQuestion("task1");
  const task2 = await writingQuestionsRepository.pickRandomQuestion("task2");
  if (!task1 || !task2) {
    const err = new Error("Writing bank is not seeded yet");
    err.status = 503;
    throw err;
  }
  return { task1, task2 };
}

module.exports = {
  listQuestions,
  listTopics,
  getQuestion,
  recordAttempt,
  startFullTest,
};
