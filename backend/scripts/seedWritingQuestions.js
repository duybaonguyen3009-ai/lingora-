/**
 * backend/scripts/seedWritingQuestions.js
 *
 * Seeds the writing_questions table from backend/scripts/writing-prompts-bank.json
 * (curated pool of ~98 prompts — 48 Task 1 + 50 Task 2).
 *
 * Idempotent: skips entries whose question_text already exists. Run it as
 * many times as you like — existing rows are preserved untouched.
 *
 * Usage (from backend/):
 *   node scripts/seedWritingQuestions.js
 *
 * Railway-safe: uses `override: false` so the script does not clobber
 * environment variables already set by the container runtime.
 */

"use strict";

const path = require("path");
const fs = require("fs");

const BACKEND_DIR = path.resolve(__dirname, "..");
require("dotenv").config({ path: path.join(BACKEND_DIR, ".env"), override: false });

const { pool } = require(path.join(BACKEND_DIR, "src", "config", "db.js"));

const PROMPTS_FILE = path.join(__dirname, "writing-prompts-bank.json");

function buildTask1Row(entry) {
  return {
    task_type: "task1",
    chart_type: entry.chart_type,
    essay_type: null,
    topic: entry.topic,
    difficulty: entry.difficulty,
    title: entry.title ?? null,
    question_text: entry.question_text,
    chart_data: entry.data ?? null,
    sample_band_7_answer: entry.sample_band_7_answer,
    supplementary: {
      feature_hints: entry.feature_hints ?? [],
      key_vocabulary: entry.key_vocabulary ?? [],
    },
  };
}

function buildTask2Row(entry) {
  return {
    task_type: "task2",
    chart_type: null,
    essay_type: entry.essay_type,
    topic: entry.topic,
    difficulty: entry.difficulty,
    title: null,
    question_text: entry.question_text,
    chart_data: null,
    sample_band_7_answer: entry.sample_band_7_answer,
    supplementary: {
      key_vocabulary: entry.key_vocabulary ?? [],
      key_ideas: entry.key_ideas ?? [],
    },
  };
}

async function insertIfAbsent(client, row) {
  const existing = await client.query(
    "SELECT id FROM writing_questions WHERE question_text = $1 LIMIT 1",
    [row.question_text]
  );
  if (existing.rowCount > 0) return { inserted: false };

  await client.query(
    `INSERT INTO writing_questions
       (task_type, chart_type, essay_type, topic, difficulty,
        title, question_text, chart_data, sample_band_7_answer, supplementary)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      row.task_type,
      row.chart_type,
      row.essay_type,
      row.topic,
      row.difficulty,
      row.title,
      row.question_text,
      row.chart_data === null ? null : JSON.stringify(row.chart_data),
      row.sample_band_7_answer,
      JSON.stringify(row.supplementary),
    ]
  );
  return { inserted: true };
}

async function main() {
  if (!fs.existsSync(PROMPTS_FILE)) {
    console.error(
      `[seedWritingQuestions] Missing content file: ${PROMPTS_FILE}\n` +
        "Place writing-prompts-bank.json in backend/scripts/ and re-run."
    );
    process.exit(1);
  }

  const raw = fs.readFileSync(PROMPTS_FILE, "utf8");
  let entries;
  try {
    entries = JSON.parse(raw);
  } catch (err) {
    console.error(`[seedWritingQuestions] JSON parse error: ${err.message}`);
    process.exit(1);
  }
  if (!Array.isArray(entries)) {
    console.error("[seedWritingQuestions] Expected top-level JSON array.");
    process.exit(1);
  }

  const client = await pool.connect();
  const counters = { task1New: 0, task1Skip: 0, task2New: 0, task2Skip: 0, errors: 0 };

  try {
    for (const entry of entries) {
      if (entry.task_type !== "task1" && entry.task_type !== "task2") {
        console.warn(`[skip] unknown task_type: ${entry.task_type}`);
        counters.errors += 1;
        continue;
      }
      const row = entry.task_type === "task1" ? buildTask1Row(entry) : buildTask2Row(entry);
      try {
        const { inserted } = await insertIfAbsent(client, row);
        if (entry.task_type === "task1") {
          inserted ? (counters.task1New += 1) : (counters.task1Skip += 1);
        } else {
          inserted ? (counters.task2New += 1) : (counters.task2Skip += 1);
        }
      } catch (err) {
        counters.errors += 1;
        console.error(`[error] ${entry.task_type} "${entry.title ?? entry.question_text.slice(0, 60)}": ${err.message}`);
      }
    }
  } finally {
    client.release();
  }

  console.log(
    `\n✓ inserted ${counters.task1New} Task 1 + ${counters.task2New} Task 2 prompts` +
      ` (skipped ${counters.task1Skip + counters.task2Skip} existing, ${counters.errors} errors)`
  );

  await pool.end();
  process.exit(counters.errors > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error(`[seedWritingQuestions] fatal: ${err.message}`);
  try { await pool.end(); } catch { /* noop */ }
  process.exit(1);
});
