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

const crypto = require("crypto");
const OpenAI = require("openai");
const { aggregateSamples } = require("./writingScoringMedian");
const writingScoringCacheRepository = require("../../repositories/writingScoringCacheRepository");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OPENAI_TIMEOUT_MS = 30_000; // 30s — writing analysis produces longer responses
const SAMPLE_COUNT = 3;           // three parallel scorings → median
const MIN_SAMPLES_FOR_RESULT = 2; // fall back to 2 if exactly one call fails
const MAX_TOTAL_API_CALLS = 4;    // hard cap: initial 3 + at most 1 retry

// Bump whenever the AI response shape changes. Cached rows with a lower
// version number are treated as misses so the new fields get filled.
//   v1 → Items 1-5 baseline
//   v2 → Item 7: band_context + pro_version + essay_type + paraphrase_suggestions
const WRITING_CACHE_VERSION = 2;

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
- For every sentence_corrections entry, tag error_type as one of: grammar (tense, agreement, articles, word form), vocabulary (wrong word choice, repetition, awkward collocation), coherence (transitions, referencing, paragraph flow)
- For each paragraph, include 0-3 icons chosen from: coherence (transition/flow issue), band_upgrade (specific lift to push band up), good_structure (the paragraph is well-organised), task_response (directly addresses the task prompt), lexical_highlight (notable vocabulary use or misuse). One short note per icon.
- For every sentence_corrections entry also provide band_context (anchor the error to the specific criterion + band using IELTS descriptors) and pro_version (rewrite at band 8+ lexical/grammar standard, not just the minimal fix).
- Set essay_type only for Task 2 essays; otherwise null. Choose the single type that best matches the prompt's question form.
- Provide 3-5 paraphrase_suggestions for words/phrases the student overused or could vary — each with 2-3 academic alternatives and a short context note on when to pick which.

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
    {
      "original": "string (the exact sentence from the essay)",
      "corrected": "string",
      "explanation": "string",
      "error_type": "grammar | vocabulary | coherence",
      "band_context": "string — 'This issue keeps {criterion} at band {N}. Band {N+1} needs: {official descriptor}.' Use IELTS public-band descriptors.",
      "pro_version": "string — the same sentence rewritten at band 8+ lexical/grammar level, not merely fixed"
    }
  ],
  "essay_type": "opinion | discussion | problem_solution | advantages_disadvantages | two_part_question | null (null for Task 1 or if not Task 2, or when genuinely unclear)",
  "paraphrase_suggestions": [
    {
      "phrase": "string — 1-4 word phrase the student overused or could vary",
      "alternatives": ["string", "string", "string"],
      "context": "string — when to use which alternative"
    }
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
      "highlight_phrase": "key phrase from this paragraph",
      "icons": [
        {
          "type": "coherence | band_upgrade | good_structure | task_response | lexical_highlight",
          "note": "one short sentence explaining why this icon applies here"
        }
      ]
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

// ---------------------------------------------------------------------------
// Cache key helpers — both inputs are normalised so trivial whitespace
// differences collapse onto the same key.
// ---------------------------------------------------------------------------

function normalize(text) {
  return String(text || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function computeEssayHash(essayText) {
  return sha256(normalize(essayText));
}

function computeCacheKey(essayText, questionText, writingQuestionId) {
  const essayHash = computeEssayHash(essayText);
  // Prefer the stable prompt id; fall back to a hash of the prompt text so
  // legacy paste-your-own-question submissions still cache coherently.
  const promptSig = writingQuestionId ? `q:${writingQuestionId}` : `t:${sha256(normalize(questionText))}`;
  return sha256(`${essayHash}:${promptSig}`);
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
 * Flow: cache lookup → on miss, fire {@link SAMPLE_COUNT} parallel scorings
 * and aggregate via median on every numeric band. Falls back to 2 samples
 * if one call fails and retries up to one failed call to stay at ≥2. Cache
 * writes are best-effort — a DB hiccup never breaks the user's score.
 *
 * @param {string} taskType – 'task1' | 'task2'
 * @param {string} questionText
 * @param {string} essayText
 * @param {object} [opts]
 * @param {string|null} [opts.writingQuestionId] – when present, used in the
 *        cache key instead of hashing the prompt text
 * @param {string|null} [opts.userId] – only for log context
 * @returns {Promise<object>} – validated scoring object (median-aggregated or cached)
 * @throws {Error} – if OpenAI is unavailable or <2 samples succeed
 */
async function analyzeEssay(taskType, questionText, essayText, opts = {}) {
  const { writingQuestionId = null, userId = null } = opts;

  const essayHash = computeEssayHash(essayText);
  const cacheKey = computeCacheKey(essayText, questionText, writingQuestionId);

  // ── 1. Cache lookup ──
  try {
    const hit = await writingScoringCacheRepository.findByCacheKey(cacheKey);
    if (hit && hit.scoring_result && typeof hit.scoring_result === "object") {
      const storedVersion = Number(hit.scoring_result.cache_version) || 1;
      if (storedVersion < WRITING_CACHE_VERSION) {
        // Stale shape — fall through to the miss path so new fields get filled.
        console.log(
          JSON.stringify({
            event: "scoring_cache_stale",
            user_id: userId,
            cache_key: cacheKey,
            stored_version: storedVersion,
            current_version: WRITING_CACHE_VERSION,
          })
        );
      } else {
        console.log(
          JSON.stringify({
            event: "scoring_cache_hit",
            user_id: userId,
            cache_key: cacheKey,
            hit_count: hit.hit_count,
            sample_count: hit.sample_count,
            cache_version: storedVersion,
          })
        );
        const cached = hit.scoring_result;
        cached._meta = { sample_count: hit.sample_count, api_calls: 0, cached: true };
        return cached;
      }
    }
  } catch (err) {
    // Corrupt row / DB hiccup → fall through to miss path; never crash the user.
    console.warn(`[writing-ai] cache lookup failed: ${err.message}`);
  }

  console.log(
    JSON.stringify({
      event: "scoring_cache_miss",
      user_id: userId,
      cache_key: cacheKey,
    })
  );

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
  aggregated.cache_version = WRITING_CACHE_VERSION;
  console.log(
    `[writing-ai] status: OK — band ${aggregated.overall_band} from ${successes.length}/${apiCalls} samples`
  );
  aggregated._meta = { sample_count: successes.length, api_calls: apiCalls, cached: false };

  // ── 2. Cache write — best effort, never blocks the return value on failure ──
  try {
    const inserted = await writingScoringCacheRepository.insertEntry({
      cacheKey,
      essayHash,
      writingQuestionId,
      taskType,
      scoringResult: aggregated,
      sampleCount: successes.length,
    });
    console.log(
      JSON.stringify({
        event: "scoring_cache_write",
        user_id: userId,
        cache_key: cacheKey,
        sample_count: successes.length,
        api_calls: apiCalls,
        inserted,
      })
    );
  } catch (err) {
    console.warn(`[writing-ai] cache write failed: ${err.message}`);
  }

  return aggregated;
}

module.exports = { analyzeEssay, WRITING_CACHE_VERSION };
