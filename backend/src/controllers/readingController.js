/**
 * controllers/readingController.js
 *
 * HTTP layer for IELTS Reading practice and full tests.
 */

const readingService = require("../services/readingService");
const { sendSuccess, sendError } = require("../response");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function listPassages(req, res, next) {
  try {
    const { difficulty, topic, limit } = req.query;
    const passages = await readingService.listPassages(req.user.id, {
      difficulty, topic, limit: limit ? parseInt(limit, 10) : 20,
    });
    return sendSuccess(res, { data: { passages }, message: "Passages retrieved" });
  } catch (err) { next(err); }
}

async function getPassage(req, res, next) {
  try {
    const { passageId } = req.params;
    if (!UUID_RE.test(passageId)) return sendError(res, { status: 400, message: "Valid passageId required" });
    const data = await readingService.getPassage(passageId);
    return sendSuccess(res, { data, message: "Passage retrieved" });
  } catch (err) { next(err); }
}

async function submitPractice(req, res, next) {
  try {
    const { passage_id, answers, time_seconds } = req.body;
    if (!passage_id || !answers || !Array.isArray(answers)) {
      return sendError(res, { status: 400, message: "passage_id and answers array required" });
    }
    const result = await readingService.submitPractice(req.user.id, passage_id, answers, time_seconds || 0);
    return sendSuccess(res, { data: result, message: "Practice submitted" });
  } catch (err) { next(err); }
}

async function listFullTests(req, res, next) {
  try {
    const tests = await readingService.listFullTests();
    return sendSuccess(res, { data: { tests }, message: "Tests retrieved" });
  } catch (err) { next(err); }
}

async function startFullTest(req, res, next) {
  try {
    const testId = req.body?.test_id ?? null;
    if (testId && !UUID_RE.test(testId)) {
      return sendError(res, { status: 400, message: "Valid test_id required" });
    }
    const result = await readingService.startFullTest(req.user.id, testId);
    return sendSuccess(res, { data: result, status: 201, message: "Full test started" });
  } catch (err) { next(err); }
}

async function submitFullTest(req, res, next) {
  try {
    const { passage_results, time_seconds, started_at } = req.body;
    if (!passage_results || !Array.isArray(passage_results)) {
      return sendError(res, { status: 400, message: "passage_results array required" });
    }
    const result = await readingService.submitFullTest(
      req.user.id,
      passage_results,
      time_seconds || 0,
      { startedAt: started_at || null }
    );
    return sendSuccess(res, { data: result, message: "Full test submitted" });
  } catch (err) { next(err); }
}

/**
 * GET /api/v1/reading/history?page=1&limit=20 (Wave 2.9, R1 scope)
 *
 * Owner-only paginated list. Per-attempt band/score is NOT available
 * for Reading until R2 ships a `reading_attempts` table — until then
 * each row carries timestamp, passage title, and XP earned only.
 */
async function getHistory(req, res, next) {
  try {
    const page  = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    if (page === null || limit === null) {
      return sendError(res, {
        status:  400,
        message: "Invalid pagination — page must be ≥ 1, limit must be 1–50.",
        code:    "INVALID_PAGINATION",
      });
    }

    const repo = require("../repositories/readingRepository");
    const offset = (page - 1) * limit;
    const [items, total] = await Promise.all([
      repo.listUserHistory(req.user.id, limit, offset),
      repo.countUserHistory(req.user.id),
    ]);

    return sendSuccess(res, {
      data: {
        items,
        total,
        page,
        limit,
        hasMore: page * limit < total,
      },
      message: "Reading history",
    });
  } catch (err) { next(err); }
}

function parsePage(raw) {
  if (raw === undefined) return 1;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}
function parseLimit(raw) {
  if (raw === undefined) return 20;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 50) return null;
  return n;
}

module.exports = { listPassages, getPassage, submitPractice, listFullTests, startFullTest, submitFullTest, getHistory };
