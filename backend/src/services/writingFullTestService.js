/**
 * services/writingFullTestService.js
 *
 * Orchestrates the exam-style Full Test lifecycle. Reuses the existing
 * writingService for single-essay scoring (multi-sampling + cache) and
 * wraps it with a parent "run" row so the pair can be finalized into a
 * weighted overall band.
 *
 * Weighting follows IELTS: Task 2 counts 2× Task 1. Overall is rounded
 * to the nearest 0.5 to match IELTS grain.
 */

"use strict";

const writingFullTestRepository = require("../repositories/writingFullTestRepository");
const writingQuestionsRepository = require("../repositories/writingQuestionsRepository");
const writingRepository = require("../repositories/writingRepository");
const writingService = require("./writingService");

const TASK2_WEIGHT = 2;
const TASK1_WEIGHT = 1;
const TOTAL_WEIGHT = TASK1_WEIGHT + TASK2_WEIGHT;

function roundHalf(value) {
  return Math.round(value * 2) / 2;
}

function ensureOwner(run, userId) {
  if (!run) {
    const err = new Error("Full test not found");
    err.status = 404;
    throw err;
  }
  if (run.user_id !== userId) {
    const err = new Error("You do not own this full test");
    err.status = 403;
    throw err;
  }
}

/**
 * Start a new Full Test run: pick one random task1 + task2 prompt and
 * persist a writing_full_tests row.
 */
async function start(userId) {
  const task1 = await writingQuestionsRepository.pickRandomQuestion("task1");
  const task2 = await writingQuestionsRepository.pickRandomQuestion("task2");
  if (!task1 || !task2) {
    const err = new Error("Writing bank is not seeded yet");
    err.status = 503;
    throw err;
  }
  const run = await writingFullTestRepository.createRun({
    userId,
    task1QuestionId: task1.id,
    task2QuestionId: task2.id,
  });
  return { full_test_id: run.id, task1, task2, started_at: run.started_at };
}

/**
 * Submit one of the two tasks as part of a Full Test run. Internally
 * calls writingService.submitEssay so scoring flows through the same
 * multi-sampling + cache pipeline the Practice flow uses.
 */
async function submitTask(userId, runId, { taskType, questionText, essayText, writingQuestionId, role, isPro }) {
  if (taskType !== "task1" && taskType !== "task2") {
    const err = new Error("taskType must be 'task1' or 'task2'");
    err.status = 400;
    throw err;
  }

  const run = await writingFullTestRepository.getRunById(runId);
  ensureOwner(run, userId);
  if (run.status !== "in_progress") {
    const err = new Error("Full test is already finalized");
    err.status = 409;
    throw err;
  }

  const alreadyLinked = taskType === "task1" ? run.task1_submission_id : run.task2_submission_id;
  if (alreadyLinked) {
    return {
      submissionId: alreadyLinked,
      status: "already_submitted",
      full_test: run,
      finalized: false,
    };
  }

  const submitResult = await writingService.submitEssay(userId, role, isPro, {
    taskType,
    questionText,
    essayText,
    writingQuestionId: writingQuestionId ?? null,
  });

  await writingFullTestRepository.linkSubmission(runId, taskType, submitResult.submissionId);

  // Refetch to see whether both slots are now populated.
  const refreshed = await writingFullTestRepository.getRunById(runId);
  const bothLinked = refreshed.task1_submission_id && refreshed.task2_submission_id;

  if (bothLinked) {
    const finalized = await finalize(userId, runId);
    return { ...submitResult, full_test: finalized, finalized: true };
  }

  return { ...submitResult, full_test: refreshed, finalized: false };
}

/**
 * Finalize — idempotent. Called either explicitly or automatically when
 * the second task gets linked. If both submissions have a scored band,
 * computes the weighted overall_band. Missing/still-pending submissions
 * fall back to whatever band is available (0 weight for nulls).
 */
async function finalize(userId, runId) {
  const run = await writingFullTestRepository.getRunById(runId);
  ensureOwner(run, userId);

  if (run.status === "submitted") {
    return run; // idempotent no-op
  }

  const [task1Sub, task2Sub] = await Promise.all([
    run.task1_submission_id ? writingRepository.getSubmissionById(run.task1_submission_id) : Promise.resolve(null),
    run.task2_submission_id ? writingRepository.getSubmissionById(run.task2_submission_id) : Promise.resolve(null),
  ]);

  const b1 = task1Sub?.overall_band != null ? Number(task1Sub.overall_band) : null;
  const b2 = task2Sub?.overall_band != null ? Number(task2Sub.overall_band) : null;

  let weightedSum = 0;
  let weightUsed = 0;
  if (b1 != null) { weightedSum += b1 * TASK1_WEIGHT; weightUsed += TASK1_WEIGHT; }
  if (b2 != null) { weightedSum += b2 * TASK2_WEIGHT; weightUsed += TASK2_WEIGHT; }

  const overallBand = weightUsed > 0 ? roundHalf(weightedSum / weightUsed) : null;

  const elapsedSeconds = Math.max(0, Math.round((Date.now() - new Date(run.started_at).getTime()) / 1000));

  const updated = await writingFullTestRepository.finalizeRun(runId, {
    overallBand,
    totalTimeSeconds: elapsedSeconds,
  });
  return updated ?? run; // updated null means status wasn't in_progress (raced); return original state
}

async function getRun(userId, runId) {
  const run = await writingFullTestRepository.getRunById(runId);
  ensureOwner(run, userId);

  const [task1Sub, task2Sub] = await Promise.all([
    run.task1_submission_id ? writingRepository.getSubmissionById(run.task1_submission_id) : Promise.resolve(null),
    run.task2_submission_id ? writingRepository.getSubmissionById(run.task2_submission_id) : Promise.resolve(null),
  ]);

  // Average the 4 criteria with the same 1:2 weight so analytics & UI can
  // show a single-glance breakdown.
  const criteriaSum = { task: 0, coherence: 0, lexical: 0, grammar: 0 };
  let totalWeight = 0;
  const addCriteria = (submission, weight) => {
    if (!submission) return;
    const { task_score, coherence_score, lexical_score, grammar_score } = submission;
    if (task_score == null || coherence_score == null) return;
    criteriaSum.task      += Number(task_score)      * weight;
    criteriaSum.coherence += Number(coherence_score) * weight;
    criteriaSum.lexical   += Number(lexical_score)   * weight;
    criteriaSum.grammar   += Number(grammar_score)   * weight;
    totalWeight += weight;
  };
  addCriteria(task1Sub, TASK1_WEIGHT);
  addCriteria(task2Sub, TASK2_WEIGHT);

  const perCriteriaAvg = totalWeight > 0
    ? {
        task:      roundHalf(criteriaSum.task      / totalWeight),
        coherence: roundHalf(criteriaSum.coherence / totalWeight),
        lexical:   roundHalf(criteriaSum.lexical   / totalWeight),
        grammar:   roundHalf(criteriaSum.grammar   / totalWeight),
      }
    : null;

  return {
    full_test: run,
    task1_submission: task1Sub,
    task2_submission: task2Sub,
    overall_band: run.overall_band != null ? Number(run.overall_band) : null,
    per_criteria_avg: perCriteriaAvg,
  };
}

async function listRuns(userId, page = 1, limit = 10) {
  const offset = (Math.max(1, page) - 1) * limit;
  const rows = await writingFullTestRepository.listForUser(userId, limit, offset);
  return { runs: rows, page, limit };
}

const FULL_TEST_TOTAL_SECONDS = 3600;

/**
 * Most recent in_progress Full Test for a user, hydrated with both prompt
 * questions and a time_remaining_seconds field. Returns null when the user
 * has no pending run or when the timer has already expired (defensive —
 * the expiry cron should have caught it, but the user shouldn't see a
 * "resume" banner for something already out of time).
 */
async function getInProgress(userId) {
  const writingQuestionsRepository = require("../repositories/writingQuestionsRepository");
  const run = await writingFullTestRepository.getInProgressForUser(userId);
  if (!run) return null;

  const elapsed = Math.max(0, Math.round((Date.now() - new Date(run.started_at).getTime()) / 1000));
  const timeRemaining = Math.max(0, FULL_TEST_TOTAL_SECONDS - elapsed);
  if (timeRemaining <= 0) return null;

  const [task1Question, task2Question] = await Promise.all([
    run.task1_question_id ? writingQuestionsRepository.getQuestionById(run.task1_question_id) : Promise.resolve(null),
    run.task2_question_id ? writingQuestionsRepository.getQuestionById(run.task2_question_id) : Promise.resolve(null),
  ]);

  return {
    id: run.id,
    started_at: run.started_at,
    task1_question: task1Question,
    task2_question: task2Question,
    task1_submitted: Boolean(run.task1_submission_id),
    task2_submitted: Boolean(run.task2_submission_id),
    time_remaining_seconds: timeRemaining,
  };
}

module.exports = {
  start,
  submitTask,
  finalize,
  getRun,
  listRuns,
  getInProgress,
};
