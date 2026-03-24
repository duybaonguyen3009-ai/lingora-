/**
 * openaiProvider.js
 *
 * Real OpenAI AI provider using the Chat Completions API (gpt-4o-mini by default).
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

const OPENAI_TIMEOUT_MS = 15_000; // 15-second max — OpenAI can be slow

const SAFE_SCORE_DEFAULTS = {
  overallScore: 60,
  fluency: 60,
  vocabulary: 60,
  grammar: 60,
  pronunciation: 60,
  coachFeedback: "Good effort! Keep practicing to improve your fluency.",
  turnFeedback: [],
  notableVocabulary: [],
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
    console.log(`[ai] OpenAI client initialized — model: ${_model}`);
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
  if (parsed.pronunciation !== undefined && !isValidScore(parsed.pronunciation)) return false;
  if (!Array.isArray(parsed.turnFeedback)) return false;
  // Optional new fields — validate if present but don't require
  if (parsed.criteriaFeedback !== undefined && typeof parsed.criteriaFeedback !== "object") return false;
  if (parsed.improvementVocabulary !== undefined && !Array.isArray(parsed.improvementVocabulary)) return false;
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

    const messages = [
      { role: "system", content: fullSystemPrompt },
      ...conversationHistory,
    ];

    console.log(`[ai] provider: openai`);
    console.log(`[ai] model: ${_model}`);
    console.log(`[ai] messages: ${messages.length} total (system + ${conversationHistory.length} conversation)`);
    console.log(`[ai] messages payload: ${JSON.stringify(messages.map(m => ({ role: m.role, content: m.content.slice(0, 120) + (m.content.length > 120 ? "..." : "") })))}`);

    const response = await withTimeout(
      openai.chat.completions.create({
        model: _model,
        messages,
        max_tokens: 200,
        temperature: 0.8,
      })
    );

    const text = response.choices?.[0]?.message?.content?.trim() || "";

    if (!text) {
      console.log(`[ai] response: (empty)`);
      console.log(`[ai] status: FAILED — empty response, falling back to mock`);
      return mockAi.generateResponse(systemPrompt, conversationHistory, options);
    }

    console.log(`[ai] response: ${text.slice(0, 200)}${text.length > 200 ? "..." : ""}`);
    console.log(`[ai] status: OK`);
    return text;
  } catch (err) {
    console.log(`[ai] response: (error)`);
    console.log(`[ai] status: FAILED — ${err.message}`);
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
 * @param {object} [options]
 * @param {boolean} [options.isIelts]  - use IELTS-specific scoring criteria
 * @returns {Promise<object>} { overallScore, fluency, vocabulary, grammar, pronunciation, coachFeedback, turnFeedback, notableVocabulary }
 *                            Always returns a valid object — never throws.
 */
async function scoreConversation(systemPrompt, conversationHistory, options = {}) {
  const openai = getClient();

  if (!openai) {
    console.warn("[ai] OPENAI_API_KEY not set — falling back to mock provider for scoreConversation");
    return mockAi.scoreConversation(systemPrompt, conversationHistory);
  }

  try {
    const isIelts = options.isIelts || false;
    const speechFlow = options.speechFlow || null;

    // Build speech flow context for the scorer (only if data available)
    let speechFlowContext = "";
    if (isIelts && speechFlow && speechFlow.hesitationLevel !== "unknown") {
      const parts = [];
      parts.push(`\nSPEECH FLOW ANALYSIS (measured from actual speaking session):`);
      parts.push(`- Hesitation level: ${speechFlow.hesitationLevel.toUpperCase()}`);
      parts.push(`- Filler words detected: ${speechFlow.totalFillerCount}${speechFlow.fillerSummary?.length ? ` (${speechFlow.fillerSummary.join(", ")})` : ""}`);
      parts.push(`- Self-corrections: ${speechFlow.totalSelfCorrections}`);
      if (speechFlow.avgWordsPerMinute) {
        parts.push(`- Average speaking rate: ${speechFlow.avgWordsPerMinute} words/minute`);
      }
      if (speechFlow.avgSpeakingRatio !== null && speechFlow.avgSpeakingRatio !== undefined) {
        const ratioPercent = Math.round(speechFlow.avgSpeakingRatio * 100);
        parts.push(`- Speaking ratio: ${ratioPercent}% of time was active speech (${ratioPercent < 50 ? "very fragmented — many long pauses" : ratioPercent < 70 ? "some noticeable pauses" : "generally continuous"})`);
      }
      parts.push(`- Fluency estimate (system): ${speechFlow.fluencyEstimate}/100`);
      parts.push(`\nUSE THIS DATA to inform your Fluency & Coherence score. Mention relevant speech flow observations in criteriaFeedback.fluency and coachFeedback.`);
      speechFlowContext = parts.join("\n");
    }

    const scoringInstruction = isIelts
      ? `You are a certified IELTS Speaking examiner producing a detailed score report for a completed IELTS Speaking test. \
Analyze ONLY the candidate's messages (role: "user") and return a valid JSON object with this exact structure — no extra text, no markdown:

{
  "overallScore": <integer 0-100>,
  "fluency": <integer 0-100>,
  "vocabulary": <integer 0-100>,
  "grammar": <integer 0-100>,
  "pronunciation": <integer 0-100>,
  "criteriaFeedback": {
    "fluency": "<1-2 sentences explaining the fluency score, citing specific evidence from the candidate's answers>",
    "vocabulary": "<1-2 sentences explaining the vocabulary score, citing specific words/phrases>",
    "grammar": "<1-2 sentences explaining the grammar score, citing specific structures or errors>",
    "pronunciation": "<1-2 sentences explaining the pronunciation score based on phrasing patterns>"
  },
  "coachFeedback": "<2-3 sentences of specific, actionable advice for improving their band score. Reference their actual performance.>",
  "turnFeedback": [
    { "turnIndex": <index in conversation array>, "tip": "<specific improvement tip referencing what they actually said>" }
  ],
  "notableVocabulary": ["<strong word/phrase 1>", "<strong word/phrase 2>", ...],
  "improvementVocabulary": ["<weak/repeated word 1>", "<weak/repeated word 2>", ...]
}

IELTS BAND DESCRIPTOR MAPPING (0-100 scale):

**Fluency & Coherence** (fluency):
- 0-30 (Band 2-3): Long pauses, minimal responses, no coherent connection between ideas
- 31-50 (Band 4-4.5): Noticeable hesitation, simple linking only ("and", "but"), limited development
- 51-65 (Band 5-5.5): Willing to speak at length but with repetition, some discourse markers, occasional loss of coherence
- 66-78 (Band 6-6.5): Generally fluent, uses connectors ("however", "on the other hand"), develops ideas with some prompting
- 79-88 (Band 7-7.5): Fluent with only occasional hesitation, good use of discourse markers, coherent extended responses
- 89-100 (Band 8-9): Effortless fluency, sophisticated discourse management, fully developed responses with no noticeable effort

**Lexical Resource** (vocabulary):
- 0-30 (Band 2-3): Basic vocabulary only, frequent repetition, unable to discuss topics beyond simple terms
- 31-50 (Band 4-4.5): Limited range, noticeable repetition, some inappropriate word choices
- 51-65 (Band 5-5.5): Adequate vocabulary for familiar topics, limited paraphrasing, occasional errors in word choice
- 66-78 (Band 6-6.5): Good range including some less common items, able to discuss topics with some precision, some paraphrasing
- 79-88 (Band 7-7.5): Wide vocabulary range, flexible use of less common items, effective paraphrasing, idiomatic language
- 89-100 (Band 8-9): Sophisticated, precise vocabulary, natural idiomatic usage, skilful paraphrasing throughout

**Grammatical Range & Accuracy** (grammar):
- 0-30 (Band 2-3): Very limited structures, errors impede communication
- 31-50 (Band 4-4.5): Simple structures dominant, frequent errors, meaning sometimes unclear
- 51-65 (Band 5-5.5): Mix of simple and attempted complex structures, errors frequent but meaning usually clear
- 66-78 (Band 6-6.5): Mix of structures with reasonable accuracy, complex structures attempted with some success
- 79-88 (Band 7-7.5): Varied structures, majority error-free, good control of complex forms
- 89-100 (Band 8-9): Full range of structures used naturally, rare errors, precise and natural

**Pronunciation** (pronunciation):
- Score based on written evidence: natural contractions ("I'd", "it's"), phrasal verbs, idiomatic phrasing, natural word order.
  Higher = natural English rhythm. Lower = awkward/non-native phrasing patterns.

EVIDENCE REQUIREMENT (CRITICAL):
- criteriaFeedback MUST cite specific examples from the candidate's actual responses. Quote their words.
- coachFeedback MUST reference what the candidate actually said, not generic advice.
- turnFeedback tips MUST reference the specific content of each turn.
- notableVocabulary: 3-8 genuinely strong words/phrases/collocations the candidate used. NOT basic words.
- improvementVocabulary: 2-5 words/phrases that were weak, overused, or incorrect. Examples: overusing "very", misusing a collocation, etc.

PART WEIGHTING (CRITICAL):
- User messages are tagged with part labels like [Part 1, Q2], [Part 2 — Long Turn], [Part 3, Q1].
- Part 2 (Long Turn) and Part 3 answers demonstrate the candidate's true ability and should carry MORE weight in scoring.
- Part 1 answers are short and introductory — they contribute less to the overall assessment.
- If the Part 2 Long Turn is very short or missing, this should significantly lower Fluency & Coherence.

Rules:
- overallScore = average of fluency, vocabulary, grammar, pronunciation (rounded)
- turnFeedback: include 2-4 entries for user turns with the most room for improvement
- If a criterion has no clear evidence, default to 55 and explain why evidence was limited
${speechFlowContext}`
      : `You are an English speaking coach evaluating a practice conversation. \
Analyze the LEARNER's messages (role: "user") in the conversation and return ONLY a valid JSON object \
with this exact structure — no extra text, no markdown:

{
  "overallScore": <integer 0-100>,
  "fluency": <integer 0-100>,
  "vocabulary": <integer 0-100>,
  "grammar": <integer 0-100>,
  "pronunciation": <integer 0-100>,
  "coachFeedback": "<1-2 sentence encouraging and specific feedback>",
  "turnFeedback": [
    { "turnIndex": <index in conversation array>, "tip": "<specific improvement tip for that turn>" }
  ],
  "notableVocabulary": ["<word or phrase 1>", "<word or phrase 2>", ...]
}

Scoring guide:
- 0-40:  Very short, broken, or off-topic responses
- 41-64: Basic effort — simple sentences, limited vocabulary
- 65-79: Good communication — clear meaning, minor errors
- 80-100: Natural fluency — complex sentences, varied vocabulary

Rules:
- overallScore = average of fluency, vocabulary, grammar, pronunciation (rounded)
- turnFeedback: include 2-3 entries for user turns with the most room for improvement
- notableVocabulary: list 0-5 strong words or phrases the learner used well
- Be encouraging and constructive

Scenario context: ${systemPrompt}`;

    const messages = [
      { role: "system", content: scoringInstruction },
      ...conversationHistory,
    ];

    console.log(`[ai] provider: openai (scoring)`);
    console.log(`[ai] model: ${_model}`);
    console.log(`[ai] messages: ${messages.length} total for scoring`);

    const response = await withTimeout(
      openai.chat.completions.create({
        model: _model,
        messages,
        max_tokens: 800,
        temperature: 0.3,
        response_format: { type: "json_object" },
      })
    );

    const text = response.choices?.[0]?.message?.content?.trim() || "";

    if (!text) {
      console.log(`[ai] response: (empty)`);
      console.log(`[ai] status: FAILED — empty score response, using defaults`);
      return { ...SAFE_SCORE_DEFAULTS };
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.log(`[ai] response: ${text.slice(0, 200)}`);
      console.log(`[ai] status: FAILED — invalid JSON, using defaults`);
      return { ...SAFE_SCORE_DEFAULTS };
    }

    if (!validateScoreResult(parsed)) {
      console.log(`[ai] response: ${text.slice(0, 200)}`);
      console.log(`[ai] status: FAILED — validation failed, using defaults`);
      return { ...SAFE_SCORE_DEFAULTS };
    }

    console.log(`[ai] response: overall=${parsed.overallScore} fluency=${parsed.fluency} vocab=${parsed.vocabulary} grammar=${parsed.grammar}`);
    console.log(`[ai] status: OK`);
    return parsed;
  } catch (err) {
    console.log(`[ai] response: (error)`);
    console.log(`[ai] status: FAILED — ${err.message}`);
    return { ...SAFE_SCORE_DEFAULTS };
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = { generateResponse, scoreConversation };
