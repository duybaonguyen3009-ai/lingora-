/**
 * middleware/rateLimiters.js
 *
 * Shared rate-limiter definitions for expensive API operations
 * (AI conversation, TTS synthesis, pronunciation assessment).
 *
 * Each category exports a two-element middleware array:
 *   [shortWindowLimiter, dailyLimiter]
 *
 * Usage in routes:
 *   router.post("/tts", verifyToken, ...ttsLimiters, controller.synthesizeSpeech);
 *
 * Key strategy:
 *   - Authenticated users: keyed by "user:<userId>" (from req.user set by verifyToken)
 *   - Guests:              keyed by "ip:<req.ip>"
 *
 * IMPORTANT: verifyToken MUST be applied before these limiters so req.user is
 * available. All current routes already follow this order.
 *
 * NOTE: Uses the default in-memory MemoryStore, which is appropriate for a
 * single-instance deployment (e.g., one Railway container). If the app is
 * horizontally scaled to multiple instances, each instance will maintain its
 * own counters independently — effectively multiplying the allowed limits.
 * To enforce shared limits across instances, replace the default store with
 * rate-limit-redis (or similar) and point it at a shared Redis instance.
 */

const rateLimit = require("express-rate-limit");

// ---------------------------------------------------------------------------
// Shared key generator — prefixed to avoid collisions between user IDs and IPs
// ---------------------------------------------------------------------------

const keyGenerator = (req) =>
  req.user ? `user:${req.user.id}` : `ip:${req.ip}`;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Build a pair of rate limiters (short window + daily) for one category.
 *
 * @param {object} opts
 * @param {number} opts.shortAuthMax    – max requests per 15 min (authenticated)
 * @param {number} opts.shortGuestMax   – max requests per 15 min (guest)
 * @param {number} opts.dailyAuthMax    – max requests per 24 hours (authenticated)
 * @param {number} opts.dailyGuestMax   – max requests per 24 hours (guest)
 * @param {string} opts.shortMessage    – 429 message for the short window
 * @param {string} opts.dailyMessage    – 429 message for the daily window
 * @returns {import("express").RequestHandler[]}
 */
function createLimiterPair({
  shortAuthMax,
  shortGuestMax,
  dailyAuthMax,
  dailyGuestMax,
  shortMessage,
  dailyMessage,
}) {
  const shortLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: (req) => (req.user ? shortAuthMax : shortGuestMax),
    keyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: shortMessage },
  });

  const dailyLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: (req) => (req.user ? dailyAuthMax : dailyGuestMax),
    keyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: dailyMessage },
  });

  return [shortLimiter, dailyLimiter];
}

// ---------------------------------------------------------------------------
// Limiter definitions
// ---------------------------------------------------------------------------

/** AI conversation endpoints (scenario start, turns, end) */
const aiLimiters = createLimiterPair({
  shortAuthMax: 50,
  shortGuestMax: 20,
  dailyAuthMax: 200,
  dailyGuestMax: 60,
  shortMessage:
    "Too many speaking requests. Please try again in a few minutes.",
  dailyMessage:
    "Daily speaking limit reached. Please try again tomorrow.",
});

/** TTS (text-to-speech) synthesis */
const ttsLimiters = createLimiterPair({
  shortAuthMax: 100,
  shortGuestMax: 30,
  dailyAuthMax: 300,
  dailyGuestMax: 80,
  shortMessage:
    "Too many speech synthesis requests. Please try again in a few minutes.",
  dailyMessage:
    "Daily speech synthesis limit reached. Please try again tomorrow.",
});

/** Pronunciation assessment */
const pronLimiters = createLimiterPair({
  shortAuthMax: 50,
  shortGuestMax: 20,
  dailyAuthMax: 150,
  dailyGuestMax: 50,
  shortMessage:
    "Too many pronunciation requests. Please try again in a few minutes.",
  dailyMessage:
    "Daily pronunciation assessment limit reached. Please try again tomorrow.",
});

module.exports = { aiLimiters, ttsLimiters, pronLimiters };
