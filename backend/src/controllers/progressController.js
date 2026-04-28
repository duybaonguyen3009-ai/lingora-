/**
 * controllers/progressController.js
 *
 * HTTP layer for progress endpoints.
 * Validates inputs, delegates to progressService, uses sendSuccess for envelope.
 */

const progressService = require("../services/progressService");
const { sendSuccess, sendError }  = require("../response");

// UUID v4 pattern — matches both standard and crypto.randomUUID() output.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// POST /api/v1/lessons/:lessonId/complete
// ---------------------------------------------------------------------------

/**
 * completeLesson
 *
 * Body: { score: number (0–100), timeTakenMs?: number }
 * userId is always derived from the verified JWT (req.user.id) — never from
 * the request body, which would allow one user to claim completions for another.
 * Upserts a user_progress row, runs gamification side-effects, and returns
 * an enriched record that includes XP, level, streak, and any new badges.
 */
/**
 * POST /api/v1/lessons/:lessonId/complete — DEPRECATED (Wave 1.8).
 *
 * Pre-Wave-1.8 this accepted a `score` field directly from the request
 * body and used it for XP + badge awards (perfect_score). A trusted
 * client could POST `{ score: 100 }` to farm achievements without
 * actually answering any quiz.
 *
 * The corresponding FE consumer (LessonModal/index.tsx) was orphaned
 * by the "speaking-first homepage" pivot (commit 7975c23), so the
 * endpoint is now reachable only via curl.
 *
 * Returns 410 Gone with a descriptive code. Existing user_progress
 * rows are NOT affected.
 *
 * Wave 5 cleanup will delete progressService.completeLesson and the
 * dead progressRepository entries; the route declaration in
 * progressRoutes.js stays for the 410 response surface until then.
 *
 * Closes 1 P0 (Audit Batch 4): quiz score client-trust → badge farming.
 */
async function completeLesson(req, res, _next) {
  console.warn(
    `[lesson-deprecated] complete endpoint hit user=${req.user?.id || "anon"} ` +
    `ip=${req.ip || "unknown"} path=${req.originalUrl}`,
  );
  return sendError(res, {
    status: 410,
    message: "Tính năng lesson đã ngừng hỗ trợ. Vui lòng dùng kỹ năng Speaking/Writing/Reading/Battle.",
    code: "LESSON_COMPLETE_DEPRECATED",
  });
}

// ---------------------------------------------------------------------------
// GET /api/v1/users/:userId/progress
// ---------------------------------------------------------------------------

/**
 * getProgress
 *
 * Returns all completed lessons for a user as an array.
 * Returns an empty array — not a 404 — when the user has no progress yet.
 */
async function getProgress(req, res, next) {
  try {
    const { userId } = req.params;

    if (!UUID_RE.test(userId)) {
      const err = new Error("Invalid user ID. Expected a UUID.");
      err.status = 400;
      return next(err);
    }

    if (req.user.id !== userId) {
      const err = new Error("You can only view your own progress.");
      err.status = 403;
      return next(err);
    }

    const progress = await progressService.getProgress(userId);

    return sendSuccess(res, {
      data:    { progress },
      message: "Progress retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/users/migrate-guest
// ---------------------------------------------------------------------------

/**
 * migrateGuest
 *
 * Body: { guestId: string (UUID) }
 * Migrates all user_progress rows owned by the guest UUID to the
 * authenticated user (req.user.id), then cleans up the guest stub.
 * Non-critical — returns 200 even when the guest had no progress.
 */
async function migrateGuest(req, res, next) {
  try {
    const { guestId } = req.body;
    const realUserId  = req.user.id;

    if (!guestId || !UUID_RE.test(String(guestId))) {
      const err = new Error("guestId is required and must be a valid UUID.");
      err.status = 400;
      return next(err);
    }

    const result = await progressService.migrateGuestProgress(realUserId, guestId);

    return sendSuccess(res, {
      data:    result,
      message: result.migratedCount > 0
        ? `Migrated ${result.migratedCount} lesson(s) from guest account.`
        : "No guest progress to migrate.",
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { completeLesson, getProgress, migrateGuest };
