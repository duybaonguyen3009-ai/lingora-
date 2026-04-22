/* eslint-disable camelcase */

/**
 * Migration 0032 — IELTS Writing Question Bank
 *
 * Two new tables:
 *
 *   writing_questions        Curated IELTS Writing prompts (Task 1 + Task 2).
 *                             ~48 Task 1 + ~50 Task 2 rows seeded separately
 *                             via backend/scripts/seedWritingQuestions.js.
 *
 *   user_writing_attempts    One row per (user, question) — records that a
 *                             user opened a prompt. Submission_id is nullable
 *                             because attempt is created at selection time,
 *                             before the essay is graded.
 *
 * review_status defaults to 'approved' — seed content is hand-curated.
 *
 * Run: `npm run migrate:up` from backend/. Content seeding is a separate
 * manual step (see script above).
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ---------------------------------------------------------------------------
  // writing_questions
  // ---------------------------------------------------------------------------
  pgm.createTable("writing_questions", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    task_type: {
      type: "varchar(10)",
      notNull: true,
      check: "task_type IN ('task1', 'task2')",
    },
    chart_type: {
      type: "varchar(20)",
      check: "chart_type IN ('line', 'bar', 'pie', 'table')",
    },
    essay_type: {
      type: "varchar(40)",
      check: "essay_type IN ('opinion', 'discussion', 'problem_solution', 'advantages_disadvantages', 'two_part_question')",
    },
    topic: {
      type: "varchar(80)",
      notNull: true,
    },
    difficulty: {
      type: "varchar(20)",
      notNull: true,
      check: "difficulty IN ('band_5_6', 'band_6_7', 'band_7_8')",
    },
    title: { type: "text" },
    question_text: { type: "text", notNull: true },
    chart_data: { type: "jsonb" },
    sample_band_7_answer: { type: "text", notNull: true },
    supplementary: {
      type: "jsonb",
      notNull: true,
      default: "'{}'::jsonb",
    },
    review_status: {
      type: "varchar(20)",
      notNull: true,
      default: "'approved'",
      check: "review_status IN ('draft', 'pending', 'approved', 'rejected')",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  // Shape constraint: task1 rows must carry chart_type (not essay_type),
  // task2 rows must carry essay_type (not chart_type).
  pgm.addConstraint("writing_questions", "writing_questions_task_fields_valid", {
    check:
      "(task_type = 'task1' AND chart_type IS NOT NULL AND essay_type IS NULL) OR " +
      "(task_type = 'task2' AND essay_type IS NOT NULL AND chart_type IS NULL)",
  });

  pgm.createIndex("writing_questions", ["task_type"], {
    name: "idx_writing_questions_task_type",
  });
  pgm.createIndex("writing_questions", ["topic"], {
    name: "idx_writing_questions_topic",
  });
  pgm.createIndex("writing_questions", ["difficulty"], {
    name: "idx_writing_questions_difficulty",
  });
  pgm.createIndex("writing_questions", ["task_type", "topic", "difficulty"], {
    name: "idx_writing_questions_filter_composite",
  });
  pgm.createIndex("writing_questions", ["review_status"], {
    name: "idx_writing_questions_review_status",
  });

  // ---------------------------------------------------------------------------
  // user_writing_attempts
  // ---------------------------------------------------------------------------
  pgm.createTable("user_writing_attempts", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE",
    },
    writing_question_id: {
      type: "uuid",
      notNull: true,
      references: '"writing_questions"',
      onDelete: "CASCADE",
    },
    submission_id: {
      type: "uuid",
      references: '"writing_submissions"',
      onDelete: "SET NULL",
    },
    attempted_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.addConstraint("user_writing_attempts", "uq_user_writing_attempts_user_question", {
    unique: ["user_id", "writing_question_id"],
  });

  pgm.createIndex("user_writing_attempts", ["user_id"], {
    name: "idx_user_writing_attempts_user_id",
  });
  pgm.createIndex("user_writing_attempts", ["writing_question_id"], {
    name: "idx_user_writing_attempts_question_id",
  });
};

exports.down = (pgm) => {
  pgm.dropTable("user_writing_attempts");
  pgm.dropTable("writing_questions");
};
