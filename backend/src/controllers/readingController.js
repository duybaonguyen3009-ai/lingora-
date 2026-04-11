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

async function startFullTest(req, res, next) {
  try {
    const result = await readingService.startFullTest(req.user.id);
    return sendSuccess(res, { data: result, status: 201, message: "Full test started" });
  } catch (err) { next(err); }
}

async function submitFullTest(req, res, next) {
  try {
    const { passage_results, time_seconds } = req.body;
    if (!passage_results || !Array.isArray(passage_results)) {
      return sendError(res, { status: 400, message: "passage_results array required" });
    }
    const result = await readingService.submitFullTest(req.user.id, passage_results, time_seconds || 0);
    return sendSuccess(res, { data: result, message: "Full test submitted" });
  } catch (err) { next(err); }
}

module.exports = { listPassages, getPassage, submitPractice, startFullTest, submitFullTest };
