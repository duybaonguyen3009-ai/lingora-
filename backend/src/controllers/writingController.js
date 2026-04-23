/**
 * controllers/writingController.js
 *
 * HTTP layer for IELTS Writing feature.
 * All routes require JWT authentication.
 */

const writingService = require("../services/writingService");
const writingQuestionsService = require("../services/writingQuestionsService");
const writingProgressService = require("../services/writingProgressService");
const writingFullTestService = require("../services/writingFullTestService");
const writingRepository = require("../repositories/writingRepository");
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
    const { taskType, questionText, essayText, writingQuestionId } = req.body;

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

    // Validate optional writingQuestionId — must be UUID if present
    if (writingQuestionId !== undefined && writingQuestionId !== null && !UUID_RE.test(writingQuestionId)) {
      return sendError(res, { status: 400, message: "writingQuestionId must be a valid UUID" });
    }

    const result = await writingService.submitEssay(userId, role, isPro, {
      taskType,
      questionText: questionText.trim(),
      essayText: essayText.trim(),
      writingQuestionId: writingQuestionId || null,
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
    const userId = req.user.id;
    const run = await writingFullTestService.start(userId);
    return sendSuccess(res, { data: run, status: 201, message: "Full test started" });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/writing/full-test/:id/submit-task
// ---------------------------------------------------------------------------

async function submitFullTestTask(req, res, next) {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const isPro = req.user.is_pro === true;
    const { id } = req.params;
    if (!UUID_RE.test(id)) {
      return sendError(res, { status: 400, message: "Valid full-test id (UUID) is required" });
    }
    const { taskType, questionText, essayText, writingQuestionId } = req.body;
    if (!taskType || !["task1", "task2"].includes(taskType)) {
      return sendError(res, { status: 400, message: "taskType must be 'task1' or 'task2'" });
    }
    if (!questionText || typeof questionText !== "string" || !questionText.trim()) {
      return sendError(res, { status: 400, message: "questionText is required" });
    }
    if (!essayText || typeof essayText !== "string" || !essayText.trim()) {
      return sendError(res, { status: 400, message: "essayText is required" });
    }
    if (writingQuestionId !== undefined && writingQuestionId !== null && !UUID_RE.test(writingQuestionId)) {
      return sendError(res, { status: 400, message: "writingQuestionId must be a valid UUID" });
    }
    const result = await writingFullTestService.submitTask(userId, id, {
      taskType,
      questionText: questionText.trim(),
      essayText: essayText.trim(),
      writingQuestionId: writingQuestionId || null,
      role,
      isPro,
    });
    return sendSuccess(res, { data: result, status: 201 });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/writing/full-test/:id/finalize
// ---------------------------------------------------------------------------

async function finalizeFullTest(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    if (!UUID_RE.test(id)) {
      return sendError(res, { status: 400, message: "Valid full-test id (UUID) is required" });
    }
    const run = await writingFullTestService.finalize(userId, id);
    return sendSuccess(res, { data: { full_test: run } });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/writing/full-tests/:id
// ---------------------------------------------------------------------------

async function getFullTest(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    if (!UUID_RE.test(id)) {
      return sendError(res, { status: 400, message: "Valid full-test id (UUID) is required" });
    }
    const run = await writingFullTestService.getRun(userId, id);
    return sendSuccess(res, { data: run });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/writing/full-tests
// ---------------------------------------------------------------------------

async function listFullTests(req, res, next) {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const data = await writingFullTestService.listRuns(userId, page, limit);
    return sendSuccess(res, { data });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/writing/full-tests/in-progress
// ---------------------------------------------------------------------------

/**
 * Most-recent in-progress Full Test for the authenticated user, hydrated
 * with both prompt questions + time_remaining_seconds. Returns null when
 * the user has no pending run.
 */
async function getInProgressFullTest(req, res, next) {
  try {
    const userId = req.user.id;
    const data = await writingFullTestService.getInProgress(userId);
    return sendSuccess(res, { data });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/writing/submissions/:id/progress-context
// ---------------------------------------------------------------------------

/**
 * Style F (progress-aware) feedback source. Owner-checks the submission
 * then scans the user's last 30 completed submissions for recurring
 * error patterns.
 */
async function getProgressContext(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    if (!UUID_RE.test(id)) {
      return sendError(res, { status: 400, message: "Valid submissionId (UUID) is required" });
    }

    const submission = await writingRepository.getSubmissionById(id);
    if (!submission) {
      return sendError(res, { status: 404, message: "Submission not found" });
    }
    if (submission.user_id !== userId) {
      return sendError(res, { status: 403, message: "You do not own this submission" });
    }

    const context = await writingProgressService.getProgressContext(userId);

    // Per-user progress changes slowly — 1h private cache is safe.
    res.set("Cache-Control", "private, max-age=3600");
    return sendSuccess(res, { data: context });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/writing/analytics/trend
// ---------------------------------------------------------------------------

async function getTrend(req, res, next) {
  try {
    const userId = req.user.id;
    const range = ["7d", "30d", "90d"].includes(req.query.range) ? req.query.range : "30d";
    const breakdown = ["overall", "criteria", "by_task"].includes(req.query.breakdown)
      ? req.query.breakdown
      : "overall";
    const writingAnalyticsService = require("../services/writingAnalyticsService");
    const data = await writingAnalyticsService.getTrend(userId, range, breakdown);
    res.set("Cache-Control", "private, max-age=600");
    return sendSuccess(res, { data });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/writing/analytics/self-compare
// ---------------------------------------------------------------------------

async function getSelfCompare(req, res, next) {
  try {
    const userId = req.user.id;
    const writingAnalyticsService = require("../services/writingAnalyticsService");
    const data = await writingAnalyticsService.getSelfCompare(userId);
    res.set("Cache-Control", "private, max-age=3600");
    return sendSuccess(res, { data });
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
  submitFullTestTask,
  finalizeFullTest,
  getFullTest,
  listFullTests,
  getInProgressFullTest,
  getProgressContext,
  getTrend,
  getSelfCompare,
};
