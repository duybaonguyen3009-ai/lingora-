/**
 * backend/scripts/seedBattleReading.js
 *
 * Seeds the reading_passages and reading_questions tables with
 * IELTS Battle reading content. Uses a transaction to ensure
 * atomicity — all inserts succeed or none do.
 *
 * Usage (from backend/ directory):
 *   node scripts/seedBattleReading.js
 *
 * Usage (from repo root):
 *   node backend/scripts/seedBattleReading.js
 */

"use strict";

const path = require("path");

// ── Bootstrap ─────────────────────────────────────────────────
const BACKEND_DIR = path.resolve(__dirname, "..");
require("dotenv").config({ path: path.join(BACKEND_DIR, ".env"), override: true });

const { pool } = require(path.join(BACKEND_DIR, "src", "config", "db.js"));

// ── Seed data ─────────────────────────────────────────────────

const PASSAGE = {
  id: "c1f9a7e2-6b3e-4b6a-9d9a-1f8a2b7c9d11",
  topic: "urban development",
  difficulty: "band_50_55",
  estimated_minutes: 7,
  passage_title: "The Rise of Smart Cities",
  passage_text:
    'A. In recent years, cities around the world have begun adopting new technologies to improve the quality of urban life. These so-called "smart cities" use digital tools such as sensors, data analysis, and mobile applications to manage resources more efficiently. Governments hope that these systems can reduce traffic, save energy, and improve public services.\n\nB. One major area of development is transportation. Smart traffic lights can adjust their timing based on real-time conditions, helping to reduce congestion. In addition, many cities have introduced apps that allow citizens to track buses and trains, making public transport more convenient. As a result, people may choose public transport over private cars, which can lower pollution levels.\n\nC. Energy management is another key feature of smart cities. For example, smart meters can monitor electricity usage in homes and send this information to both consumers and providers. This allows people to understand their energy consumption and encourages them to reduce waste. Some cities are also investing in renewable energy sources, integrating them into the urban power system.\n\nD. Despite these advantages, there are concerns about privacy and security. Collecting large amounts of data from citizens raises questions about how this information is stored and used. Experts warn that without proper regulations, personal data could be misused. Therefore, while smart cities offer many benefits, careful planning is essential to protect individuals.',
  tags: ["urban development", "technology"],
  created_by: "ai_generated",
  review_status: "pending",
};

const QUESTIONS = [
  {
    order_index: 1,
    type: "mcq",
    question_text: "What is the main purpose of smart cities?",
    options: {
      A: "To increase population size",
      B: "To improve urban living conditions",
      C: "To replace traditional cities",
      D: "To reduce government spending",
    },
    correct_answer: "B",
    explanation: "Paragraph A states that smart cities aim to improve the quality of urban life.",
  },
  {
    order_index: 2,
    type: "mcq",
    question_text: "How do smart traffic lights help cities?",
    options: {
      A: "By increasing traffic speed at all times",
      B: "By eliminating public transport",
      C: "By adjusting to real-time traffic conditions",
      D: "By reducing the number of roads",
    },
    correct_answer: "C",
    explanation: "Paragraph B explains that smart traffic lights change timing based on real-time conditions.",
  },
  {
    order_index: 3,
    type: "mcq",
    question_text: "What is one benefit of smart meters?",
    options: {
      A: "They generate electricity",
      B: "They reduce the cost of devices",
      C: "They help people understand energy use",
      D: "They replace renewable energy",
    },
    correct_answer: "C",
    explanation: "Paragraph C states that smart meters help users understand their energy consumption.",
  },
  {
    order_index: 4,
    type: "tfng",
    question_text: "Smart cities always eliminate traffic problems completely.",
    options: null,
    correct_answer: "FALSE",
    explanation: "The passage says smart systems reduce congestion, not eliminate it completely.",
  },
  {
    order_index: 5,
    type: "tfng",
    question_text: "Smart city technology can encourage people to use public transport.",
    options: null,
    correct_answer: "TRUE",
    explanation: "Paragraph B mentions that better transport systems may encourage public transport use.",
  },
  {
    order_index: 6,
    type: "tfng",
    question_text: "All experts agree that smart cities are completely safe.",
    options: null,
    correct_answer: "FALSE",
    explanation: "Paragraph D highlights concerns about privacy and security.",
  },
  {
    order_index: 7,
    type: "matching",
    question_text: "Match paragraph B with its main idea",
    options: {
      A: "Concerns about data security",
      B: "Improvements in transportation systems",
      C: "Energy consumption monitoring",
      D: "General introduction to smart cities",
    },
    correct_answer: "B",
    explanation: "Paragraph B focuses on transportation improvements.",
  },
  {
    order_index: 8,
    type: "matching",
    question_text: "Match paragraph D with its main idea",
    options: {
      A: "Benefits of renewable energy",
      B: "Transportation innovations",
      C: "Privacy and security concerns",
      D: "Urban population growth",
    },
    correct_answer: "C",
    explanation: "Paragraph D discusses risks related to data privacy and security.",
  },
];

// ── Seed function ─────────────────────────────────────────────

async function seed() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check if passage already exists (idempotent)
    const existing = await client.query(
      "SELECT id FROM reading_passages WHERE id = $1",
      [PASSAGE.id]
    );
    if (existing.rowCount > 0) {
      console.log(`⏭  Passage "${PASSAGE.passage_title}" already exists — skipping`);
      await client.query("COMMIT");
      return;
    }

    // Insert passage
    await client.query(
      `INSERT INTO reading_passages (id, topic, difficulty, estimated_minutes, passage_title, passage_text, tags, created_by, review_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        PASSAGE.id,
        PASSAGE.topic,
        PASSAGE.difficulty,
        PASSAGE.estimated_minutes,
        PASSAGE.passage_title,
        PASSAGE.passage_text,
        PASSAGE.tags,
        PASSAGE.created_by,
        PASSAGE.review_status,
      ]
    );
    console.log(`✔  Inserted passage: "${PASSAGE.passage_title}"`);

    // Insert questions
    for (const q of QUESTIONS) {
      await client.query(
        `INSERT INTO reading_questions (passage_id, order_index, type, question_text, options, correct_answer, explanation)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          PASSAGE.id,
          q.order_index,
          q.type,
          q.question_text,
          q.options ? JSON.stringify(q.options) : null,
          q.correct_answer,
          q.explanation,
        ]
      );
    }
    console.log(`✔  Inserted ${QUESTIONS.length} questions`);

    await client.query("COMMIT");
    console.log("\n✅ Battle reading seed completed successfully");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n✖  Seed failed — rolled back:", err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

// ── Run ───────────────────────────────────────────────────────

seed()
  .then(() => pool.end())
  .catch((err) => {
    console.error("Fatal:", err.message);
    pool.end();
    process.exit(1);
  });
