/**
 * providers/ai/writingAnalyzer.js
 *
 * IELTS Writing essay scorer using OpenAI GPT-4o-mini.
 * Follows the same pattern as openaiProvider.js:
 *   - Lazy-init singleton client
 *   - Timeout wrapper (15s)
 *   - JSON response validation
 *   - Returns parsed object or throws on failure
 */

"use strict";

const OpenAI = require("openai");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OPENAI_TIMEOUT_MS = 30_000; // 30s — writing analysis produces longer responses

const SYSTEM_PROMPT = `You are a certified IELTS Writing examiner.
Evaluate the student's essay based on official IELTS band descriptors.

Score these 4 criteria (0-9 scale, 0.5 increments):
1. Task Achievement / Task Response
2. Coherence & Cohesion
3. Lexical Resource
4. Grammatical Range & Accuracy

Overall band = average of 4 criteria (round to nearest 0.5)

RULES:
- Be strict but fair (no score inflation)
- Be specific with examples from the essay
- Suggest improved sentences
- Provide full sample essay at Band 7.5+

OUTPUT: Valid JSON only, no markdown, no extra text.
{
  "overall_band": number,
  "language_detected": "en" | "vi" | "other",
  "criteria": {
    "task": { "score": number, "feedback": "string" },
    "coherence": { "score": number, "feedback": "string" },
    "lexical": { "score": number, "feedback": "string" },
    "grammar": { "score": number, "feedback": "string" }
  },
  "strengths": ["string"],
  "weaknesses": ["string"],
  "improvements": ["string"],
  "sentence_corrections": [
    { "original": "string", "corrected": "string", "explanation": "string" }
  ],
  "sample_essay": "string"
}`;

// ---------------------------------------------------------------------------
// OpenAI client (lazy-init, singleton)
// ---------------------------------------------------------------------------

let _client = null;
let _model = "gpt-4o-mini";

function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    _model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    console.log(`[writing-ai] OpenAI client initialized — model: ${_model}`);
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Timeout wrapper
// ---------------------------------------------------------------------------

function withTimeout(promise, ms = OPENAI_TIMEOUT_MS) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Writing analysis timed out after ${ms}ms`)),
      ms
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function isValidBand(n) {
  return typeof n === "number" && n >= 0 && n <= 9;
}

/**
 * Validate the parsed JSON from the scoring response.
 * Returns true if the object has all required fields.
 */
function validateResult(parsed) {
  if (!parsed || typeof parsed !== "object") return false;
  if (!isValidBand(parsed.overall_band)) return false;

  const c = parsed.criteria;
  if (!c || typeof c !== "object") return false;
  for (const key of ["task", "coherence", "lexical", "grammar"]) {
    if (!c[key] || !isValidBand(c[key].score) || typeof c[key].feedback !== "string") {
      return false;
    }
  }

  if (!Array.isArray(parsed.strengths)) return false;
  if (!Array.isArray(parsed.weaknesses)) return false;
  if (!Array.isArray(parsed.improvements)) return false;
  if (!Array.isArray(parsed.sentence_corrections)) return false;

  return true;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Analyze an IELTS essay and return structured scoring.
 *
 * @param {string} taskType – 'task1' | 'task2'
 * @param {string} questionText
 * @param {string} essayText
 * @returns {Promise<object>} – validated scoring object
 * @throws {Error} – if OpenAI is unavailable, times out, or returns invalid JSON
 */
async function analyzeEssay(taskType, questionText, essayText) {
  const client = getClient();
  if (!client) {
    throw new Error("OpenAI API key not configured — cannot analyze essay");
  }

  const taskLabel = taskType === "task1" ? "IELTS Writing Task 1" : "IELTS Writing Task 2";
  const userMessage = `${taskLabel}\nQuestion: ${questionText}\n\nEssay:\n${essayText}`;

  console.log(`[writing-ai] analyzing ${taskType} essay (${essayText.split(/\s+/).length} words)`);

  const response = await withTimeout(
    client.chat.completions.create({
      model: _model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    })
  );

  const raw = response.choices?.[0]?.message?.content?.trim() || "";
  if (!raw) {
    throw new Error("OpenAI returned empty response for writing analysis");
  }

  // Strip markdown code fences if present (```json ... ```)
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("[writing-ai] Failed to parse JSON response:", raw.slice(0, 200));
    throw new Error("OpenAI returned invalid JSON for writing analysis");
  }

  if (!validateResult(parsed)) {
    console.error("[writing-ai] Validation failed:", JSON.stringify(parsed).slice(0, 200));
    throw new Error("OpenAI returned invalid scoring structure");
  }

  console.log(`[writing-ai] status: OK — band ${parsed.overall_band}`);
  return parsed;
}

module.exports = { analyzeEssay };
