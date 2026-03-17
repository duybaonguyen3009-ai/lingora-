/**
 * openaiProvider.js
 *
 * Real OpenAI AI provider using the Responses API (gpt-4o-mini by default).
 *
 * Safety guarantees:
 *  - If OPENAI_API_KEY is not set → auto-fallback to mock provider (no crash)
 *  - If any OpenAI call fails or times out → fallback to mock / safe defaults
 *  - generateResponse always returns a non-empty string
 *  - scoreConversation always returns a valid score object
 *  - App never crashes or hangs due to OpenAI issues
 */

"use strict";

const OpenAI = require("openai");
const mockAi = require("./mockAi");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OPENAI_TIMEOUT_MS = 5000; // 5-second max per request — no hanging

const SAFE_SCORE_DEFAULTS = {
  overallScore: 60,
  fluency: 60,
  vocabulary: 60,
  grammar: 60,
  coachFeedback: "Good effort! Keep practicing to improve your fluency.",
  turnFeedback: [],
};

// ---------------------------------------------------------------------------
// OpenAI client (lazy-init, singleton)
// ---------------------------------------------------------------------------

let _client = null;
let _model = "gpt-4o-mini";

/**
 * Returns the OpenAI client, or null if OPENAI_API_KEY is not set.
 * @returns {import("openai").OpenAI | null}
 */
function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    _model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Timeout wrapper — prevents hanging requests
// ---------------------------------------------------------------------------

/**
 * Race a promise against a timeout. Rejects with an error if timeout fires first.
 * @param {Promise<any>} promise
 * @param {number} ms
 * @returns {Promise<any>}
 */
function withTimeout(promise, ms = OPENAI_TIMEOUT_MS) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`OpenAI request timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

// ---------------------------------------------------------------------------
// Score validation helpers
// ---------------------------------------------------------------------------

function isValidScore(n) {
  return typeof n === "number" && n >= 0 && n <= 100;
}

/**
 * Validates the parsed JSON object returned by the scoring call.
 * All six fields must be present; numeric scores must be in 0–100 range.
 */
function validateScoreResult(parsed) {
  if (!parsed || typeof parsed !== "object") return false;
  const requiredKeys = ["overallScore", "fluency", "vocabulary", "grammar", "coachFeedback", "turnFeedback"];
  if (!requiredKeys.every((k) => k in parsed)) return false;
  if (!["overallScore", "fluency", "vocabulary", "grammar"].every((k) => isValidScore(parsed[k]))) return false;
  if (!Array.isArray(parsed.turnFeedback)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// generateResponse
// ---------------------------------------------------------------------------

/**
 * Generate a conversational AI response for a scenario turn.
 *
 * @param {string} systemPrompt       - scenario system prompt
 * @param {Array}  conversationHistory - array of { role, content }
 * @param {object} [options]
 * @param {string} [options.category]  - scenario category (unused by OpenAI, kept for interface parity)
 * @returns {Promise<string>}          - always returns a non-empty string
 */
async function generateResponse(systemPrompt, conversationHistory, options = {}) {
  const openai = getClient();

  if (!openai) {
    console.warn("[ai] OPENAI_API_KEY not set — falling back to mock provider for generateResponse");
    return mockAi.generateResponse(systemPrompt, conversationHistory, options);
  }

  try {
    // Prepend coaching instruction to keep responses short and natural
    const fullSystemPrompt =
      `${systemPrompt}\n\n` +
      `IMPORTANT: Keep your reply short and conversational — 1 to 3 sentences maximum. ` +
      `Speak naturally as your character. Do not break character.`;

    const input = [
      { role: "system", content: fullSystemPrompt },
      ...conversationHistory,
    ];

    const response = await withTimeout(
      openai.responses.create({ model: _model, input })
    );

    const text = response.output?.[0]?.content?.[0]?.text || "";

    if (!text) {
      console.warn("[ai] OpenAI returned empty response — falling back to mock for generateResponse");
      return mockAi.generateResponse(systemPrompt, conversationHistory, options);
    }

    return text;
  } catch (err) {
    console.warn(`[ai] generateResponse failed (${err.message}) — falling back to mock`);
    return mockAi.generateResponse(systemPrompt, conversationHistory, options);
  }
}

// ---------------------------------------------------------------------------
// scoreConversation
// ---------------------------------------------------------------------------

/**
 * Score a completed conversation using OpenAI.
 *
 * @param {string} systemPrompt       - scenario system prompt
 * @param {Array}  conversationHistory - array of { role, content }
 * @returns {Promise<object>} { overallScore, fluency, vocabulary, grammar, coachFeedback, turnFeedback }
 *                            Always returns a valid object — never throws.
 */
async function scoreConversation(systemPrompt, conversationHistory) {
  const openai = getClient();

  if (!openai) {
    console.warn("[ai] OPENAI_API_KEY not set — falling back to mock provider for scoreConversation");
    return mockAi.scoreConversation(systemPrompt, conversationHistory);
  }

  try {
    const scoringInstruction = `You are an English speaking coach evaluating a practice conversation. \
Analyze the LEARNER's messages (role: "user") in the conversation and return ONLY a valid JSON object \
with this exact structure — no extra text, no markdown:

{
  "overallScore": <integer 0-100>,
  "fluency": <integer 0-100>,
  "vocabulary": <integer 0-100>,
  "grammar": <integer 0-100>,
  "coachFeedback": "<1-2 sentence encouraging and specific feedback>",
  "turnFeedback": [
    { "turnIndex": <index in conversation array>, "tip": "<specific improvement tip for that turn>" }
  ]
}

Scoring guide:
- 0-40:  Very short, broken, or off-topic responses
- 41-64: Basic effort — simple sentences, limited vocabulary
- 65-79: Good communication — clear meaning, minor errors
- 80-100: Natural fluency — complex sentences, varied vocabulary

Rules:
- overallScore = average of fluency, vocabulary, grammar (rounded)
- turnFeedback: include 2-3 entries for user turns with the most room for improvement
- Be encouraging and constructive

Scenario context: ${systemPrompt}`;

    const input = [
      { role: "system", content: scoringInstruction },
      ...conversationHistory,
    ];

    const response = await withTimeout(
      openai.responses.create({
        model: _model,
        input,
        text: { format: { type: "json_object" } },
      })
    );

    const text = response.output?.[0]?.content?.[0]?.text || "";

    if (!text) {
      console.warn("[ai] OpenAI returned empty score response — using safe defaults");
      return { ...SAFE_SCORE_DEFAULTS };
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.warn("[ai] OpenAI score response is not valid JSON — using safe defaults");
      return { ...SAFE_SCORE_DEFAULTS };
    }

    if (!validateScoreResult(parsed)) {
      console.warn("[ai] OpenAI score response failed validation — using safe defaults");
      return { ...SAFE_SCORE_DEFAULTS };
    }

    return parsed;
  } catch (err) {
    console.warn(`[ai] scoreConversation failed (${err.message}) — using safe defaults`);
    return { ...SAFE_SCORE_DEFAULTS };
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = { generateResponse, scoreConversation };
