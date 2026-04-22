/**
 * controllers/writingController.js
 *
 * HTTP layer for IELTS Writing feature.
 * All routes require JWT authentication.
 */

const writingService = require("../services/writingService");
const writingQuestionsService = require("../services/writingQuestionsService");
const { sendSuccess, sendError } = require("../response");

// UUID v4 pattern
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// POST /api/v1/writing/submit
// ---------------------------------------------------------------------------

/**
 * Submit an essay for AI scoring.
 *
 * Body: { taskType: 'task1'|'task2', questionText: string, essayText: string }
 */
async function submitEssay(req, res, next) {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const isPro = req.user.is_pro === true;
    const { taskType, questionText, essayText } = req.body;

    // Validate taskType
    if (!taskType || !["task1", "task2"].includes(taskType)) {
      return sendError(res, { status: 400, message: "taskType must be 'task1' or 'task2'" });
    }

    // Validate questionText
    if (!questionText || typeof questionText !== "string" || !questionText.trim()) {
      return sendError(res, { status: 400, message: "questionText is required" });
    }

    // Validate essayText
    if (!essayText || typeof essayText !== "string" || !essayText.trim()) {
      return sendError(res, { status: 400, message: "essayText is required" });
    }

    const result = await writingService.submitEssay(userId, role, isPro, {
      taskType,
      questionText: questionText.trim(),
      essayText: essayText.trim(),
    });

    return sendSuccess(res, {
      data: result,
      status: 201,
      message: "Essay submitted successfully",
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/writing/result/:submissionId
// ---------------------------------------------------------------------------

/**
 * Get a submission result (with scoring data if completed).
 */
async function getResult(req, res, next) {
  try {
    const { submissionId } = req.params;
    const userId = req.user.id;

    if (!UUID_RE.test(submissionId)) {
      return sendError(res, { status: 400, message: "Valid submissionId (UUID) is required" });
    }

    const submission = await writingService.getResult(userId, submissionId);

    return sendSuccess(res, {
      data: submission,
      message: "Submission retrieved",
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/writing/history
// ---------------------------------------------------------------------------

/**
 * Get the authenticated user's submission history.
 *
 * Query: ?page=1&limit=10
 */
async function getHistory(req, res, next) {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const submissions = await writingService.getUserHistory(userId, page, limit);

    return sendSuccess(res, {
      data: { submissions, page, limit },
      message: "History retrieved",
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/writing/questions
// ---------------------------------------------------------------------------

/**
 * List curated writing prompts with filters.
 *
 * Query: ?task_type=&topic=&difficulty=&excludeAttempted=true&page=1&limit=24
 */
async function listQuestions(req, res, next) {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 24));
    const offset = (page - 1) * limit;

    const rows = await writingQuestionsService.listQuestions(userId, {
      taskType: req.query.task_type,
      topic: req.query.topic,
      difficulty: req.query.difficulty,
      excludeAttempted: req.query.excludeAttempted === "true",
      limit,
      offset,
    });

    return sendSuccess(res, {
      data: { questions: rows, page, limit },
      message: "Questions retrieved",
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/writing/questions/topics
// ---------------------------------------------------------------------------

async function listQuestionTopics(req, res, next) {
  try {
    const topics = await writingQuestionsService.listTopics(req.query.task_type);
    return sendSuccess(res, { data: { topics } });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/writing/questions/:id
// ---------------------------------------------------------------------------

async function getQuestion(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    if (!UUID_RE.test(id)) {
      return sendError(res, { status: 400, message: "Valid question id (UUID) is required" });
    }
    const question = await writingQuestionsService.getQuestion(userId, id);
    if (!question) {
      return sendError(res, { status: 404, message: "Writing question not found" });
    }
    return sendSuccess(res, { data: question });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/writing/questions/:id/attempt
// ---------------------------------------------------------------------------

async function recordAttempt(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    if (!UUID_RE.test(id)) {
      return sendError(res, { status: 400, message: "Valid question id (UUID) is required" });
    }
    const result = await writingQuestionsService.recordAttempt(userId, id);
    return sendSuccess(res, { data: result, status: 201, message: "Attempt recorded" });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/writing/full-test/start
// ---------------------------------------------------------------------------

async function startFullTest(req, res, next) {
  try {
    const pair = await writingQuestionsService.startFullTest();
    return sendSuccess(res, { data: pair });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  submitEssay,
  getResult,
  getHistory,
  listQuestions,
  listQuestionTopics,
  getQuestion,
  recordAttempt,
  startFullTest,
};
