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
const { aggregateSamples } = require("./writingScoringMedian");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OPENAI_TIMEOUT_MS = 30_000; // 30s — writing analysis produces longer responses
const SAMPLE_COUNT = 3;           // three parallel scorings → median
const MIN_SAMPLES_FOR_RESULT = 2; // fall back to 2 if exactly one call fails
const MAX_TOTAL_API_CALLS = 4;    // hard cap: initial 3 + at most 1 retry

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
- Cite exact words/phrases from the essay in feedback_cards
- Limit feedback_cards to max 5 most important issues
- Always include at least 1 strength card in feedback_cards
- Keep top_3_priorities actionable and specific to THIS essay

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
  "sample_essay": "string",
  "feedback_cards": [
    {
      "type": "grammar_error|vocab_repetition|coherence|task_achievement|strength",
      "title": "concise issue/strength title quoting the essay",
      "impact": "how this affects the IELTS band score",
      "fix": ["alternative 1", "alternative 2", "alternative 3"],
      "example": "corrected sentence using the student's own words"
    }
  ],
  "top_3_priorities": [
    "Most important action to improve this essay, specific and actionable",
    "Second priority",
    "Third priority"
  ],
  "word_count_feedback": {
    "actual": number,
    "target": 250,
    "status": "good|too_short|too_long",
    "comment": "Brief assessment of word count adequacy"
  },
  "paragraph_analysis": [
    {
      "paragraph_number": 1,
      "type": "introduction|body|conclusion",
      "score": "strong|adequate|weak",
      "feedback": "specific feedback for this paragraph",
      "highlight_phrase": "key phrase from this paragraph"
    }
  ]
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
 * Run ONE scoring call against OpenAI. Throws on timeout, empty response,
 * unparseable JSON, or invalid shape. Never retries — the orchestrator
 * decides whether to.
 */
async function runSingleScoring(client, taskType, questionText, essayText) {
  const taskLabel = taskType === "task1" ? "IELTS Writing Task 1" : "IELTS Writing Task 2";
  const userMessage = `${taskLabel}\nQuestion: ${questionText}\n\nEssay:\n${essayText}`;

  const response = await withTimeout(
    client.chat.completions.create({
      model: _model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      max_tokens: 2500,
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

  return parsed;
}

/**
 * Analyze an IELTS essay and return stable scoring.
 *
 * Runs {@link SAMPLE_COUNT} (3) scoring calls in parallel and aggregates
 * them via median on every numeric band. Falls back to 2 samples if one
 * call fails and retries up to one failed call to stay at ≥2. Returns an
 * error only when fewer than 2 successful samples remain.
 *
 * @param {string} taskType – 'task1' | 'task2'
 * @param {string} questionText
 * @param {string} essayText
 * @returns {Promise<object>} – validated scoring object (median-aggregated)
 * @throws {Error} – if OpenAI is unavailable or <2 samples succeed
 */
async function analyzeEssay(taskType, questionText, essayText) {
  const client = getClient();
  if (!client) {
    throw new Error("OpenAI API key not configured — cannot analyze essay");
  }

  const wordCount = essayText.split(/\s+/).filter(Boolean).length;
  console.log(`[writing-ai] scoring ${taskType} essay (${wordCount} words) — ${SAMPLE_COUNT}x sampling`);

  // Fire all N scorings in parallel. allSettled so one failure doesn't abort the rest.
  let apiCalls = SAMPLE_COUNT;
  const initial = await Promise.allSettled(
    Array.from({ length: SAMPLE_COUNT }, () =>
      runSingleScoring(client, taskType, questionText, essayText)
    )
  );

  const successes = initial.filter((r) => r.status === "fulfilled").map((r) => r.value);
  const failures = initial.filter((r) => r.status === "rejected");

  // If we can still reach the minimum by retrying ONE failed call, do it.
  // Hard-capped by MAX_TOTAL_API_CALLS so a flaky key never loops.
  if (
    successes.length < MIN_SAMPLES_FOR_RESULT &&
    failures.length > 0 &&
    apiCalls < MAX_TOTAL_API_CALLS
  ) {
    apiCalls += 1;
    console.warn(
      `[writing-ai] only ${successes.length}/${SAMPLE_COUNT} samples succeeded — retrying one failed call`
    );
    try {
      const retry = await runSingleScoring(client, taskType, questionText, essayText);
      successes.push(retry);
    } catch (err) {
      console.warn(`[writing-ai] retry also failed: ${err.message}`);
    }
  }

  if (successes.length < MIN_SAMPLES_FOR_RESULT) {
    throw new Error(
      `Writing scoring failed — only ${successes.length}/${apiCalls} samples succeeded`
    );
  }

  const aggregated = aggregateSamples(successes);
  console.log(
    `[writing-ai] status: OK — band ${aggregated.overall_band} from ${successes.length}/${apiCalls} samples`
  );
  // Attach the sample count so the caller (service/cache writer) can record it.
  aggregated._meta = { sample_count: successes.length, api_calls: apiCalls };
  return aggregated;
}

module.exports = { analyzeEssay };
