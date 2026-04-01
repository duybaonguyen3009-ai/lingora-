/**
 * controllers/progressController.js
 *
 * HTTP layer for progress endpoints.
 * Validates inputs, delegates to progressService, uses sendSuccess for envelope.
 */

const progressService = require("../services/progressService");
const { sendSuccess }  = require("../response");

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
async function completeLesson(req, res, next) {
  try {
    const { lessonId } = req.params;
    const userId = req.user.id; // always from verified JWT — never from body
    const { score, timeTakenMs } = req.body;

    // --- Validate lessonId ---
    if (!UUID_RE.test(lessonId)) {
      const err = new Error("Invalid lesson ID. Expected a UUID.");
      err.status = 400;
      return next(err);
    }

    // --- Validate score ---
    const scoreNum = Number(score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      const err = new Error("score must be a number between 0 and 100.");
      err.status = 400;
      return next(err);
    }

    // --- Validate timeTakenMs (optional) ---
    const timeTakenNum = timeTakenMs != null ? Number(timeTakenMs) : undefined;
    if (timeTakenNum !== undefined && (isNaN(timeTakenNum) || timeTakenNum < 0)) {
      const err = new Error("timeTakenMs must be a non-negative number.");
      err.status = 400;
      return next(err);
    }

    const result = await progressService.completeLesson(
      userId,
      lessonId,
      Math.round(scoreNum),
      timeTakenNum,
    );

    return sendSuccess(res, {
      data:    result,
      message: "Lesson completed successfully",
    });
  } catch (err) {
    next(err);
  }
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
