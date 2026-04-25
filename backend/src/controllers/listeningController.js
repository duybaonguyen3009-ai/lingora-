/**
 * controllers/listeningController.js
 *
 * HTTP layer for IELTS Listening practice and exam endpoints.
 *
 * Phase 0: each handler validates its inputs and then delegates to the
 * service, which currently throws "not implemented". The errorHandler
 * middleware converts that to a 500 — Phase 1 will wire real logic.
 */

const listeningService = require("../services/listeningService");
const { sendSuccess, sendError } = require("../response");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_MODES = new Set(["practice", "exam"]);
const VALID_ATTEMPT_MODES = new Set(["practice_strict", "practice_loose", "exam"]);

function parseCsvInts(value) {
  if (!value) return undefined;
  const parts = String(value).split(",").map((s) => parseInt(s.trim(), 10));
  return parts.every((n) => Number.isFinite(n)) ? parts : undefined;
}

function parseCsv(value) {
  if (!value) return undefined;
  return String(value).split(",").map((s) => s.trim()).filter(Boolean);
}

async function listTests(req, res, next) {
  try {
    const { mode, books, parts, types, limit, offset } = req.query;
    if (!mode || !VALID_MODES.has(mode)) {
      return sendError(res, { status: 400, message: "Query 'mode' must be 'practice' or 'exam'" });
    }
    const tests = await listeningService.listTests({
      mode,
      cambridgeBooks: parseCsvInts(books),
      parts: parseCsvInts(parts),
      questionTypes: parseCsv(types),
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    return sendSuccess(res, { data: { tests }, message: "Tests retrieved" });
  } catch (err) { next(err); }
}

async function getTest(req, res, next) {
  try {
    const { testId } = req.params;
    if (!UUID_RE.test(testId)) {
      return sendError(res, { status: 400, message: "Valid testId required" });
    }
    const data = await listeningService.getTestForPlay(testId);
    return sendSuccess(res, { data, message: "Test retrieved" });
  } catch (err) { next(err); }
}

async function getPart(req, res, next) {
  try {
    const { partId } = req.params;
    if (!UUID_RE.test(partId)) {
      return sendError(res, { status: 400, message: "Valid partId required" });
    }
    const data = await listeningService.getPartForPlay(partId);
    return sendSuccess(res, { data, message: "Part retrieved" });
  } catch (err) { next(err); }
}

async function startAttempt(req, res, next) {
  try {
    const { testId, mode, partId } = req.body || {};
    if (!testId || !UUID_RE.test(testId)) {
      return sendError(res, { status: 400, message: "Valid testId required" });
    }
    if (!mode || !VALID_ATTEMPT_MODES.has(mode)) {
      return sendError(res, {
        status: 400,
        message: "mode must be 'practice_strict', 'practice_loose', or 'exam'",
      });
    }
    if (mode !== "exam") {
      if (!partId || !UUID_RE.test(partId)) {
        return sendError(res, { status: 400, message: "partId required for practice mode" });
      }
    } else if (partId !== undefined && partId !== null) {
      return sendError(res, { status: 400, message: "partId must be omitted for exam mode" });
    }
    const result = await listeningService.startAttempt(req.user.id, { testId, mode, partId });
    return sendSuccess(res, { data: result, status: 201, message: "Attempt started" });
  } catch (err) { next(err); }
}

async function saveProgress(req, res, next) {
  try {
    const { attemptId } = req.params;
    if (!UUID_RE.test(attemptId)) {
      return sendError(res, { status: 400, message: "Valid attemptId required" });
    }
    const { answers } = req.body || {};
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      return sendError(res, { status: 400, message: "answers object required" });
    }
    await listeningService.saveProgress(req.user.id, attemptId, answers);
    return sendSuccess(res, { message: "Progress saved" });
  } catch (err) { next(err); }
}

async function submitAttempt(req, res, next) {
  try {
    const { attemptId } = req.params;
    if (!UUID_RE.test(attemptId)) {
      return sendError(res, { status: 400, message: "Valid attemptId required" });
    }
    const result = await listeningService.submitAttempt(req.user.id, attemptId);
    return sendSuccess(res, { data: result, message: "Attempt submitted" });
  } catch (err) { next(err); }
}

async function getAttemptResult(req, res, next) {
  try {
    const { attemptId } = req.params;
    if (!UUID_RE.test(attemptId)) {
      return sendError(res, { status: 400, message: "Valid attemptId required" });
    }
    const data = await listeningService.getAttemptResult(req.user.id, attemptId);
    return sendSuccess(res, { data, message: "Result retrieved" });
  } catch (err) { next(err); }
}

async function getStats(req, res, next) {
  try {
    const data = await listeningService.getListeningStats(req.user.id);
    return sendSuccess(res, { data, message: "Stats retrieved" });
  } catch (err) { next(err); }
}

module.exports = {
  listTests,
  getTest,
  getPart,
  startAttempt,
  saveProgress,
  submitAttempt,
  getAttemptResult,
  getStats,
};
