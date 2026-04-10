/* eslint-disable camelcase */

/**
 * Migration 0014 — IELTS Writing Feature
 *
 * Adds two tables:
 *   - writing_submissions  – essay submissions with AI scoring results
 *   - writing_usage        – daily usage tracking for free-tier limits
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // -----------------------------------------------------------------------
  // writing_submissions
  // -----------------------------------------------------------------------
  pgm.createTable("writing_submissions", {
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
    task_type: {
      type: "varchar(10)",
      notNull: true,
      check: "task_type IN ('task1', 'task2')",
    },
    question_text: {
      type: "text",
      notNull: true,
    },
    essay_text: {
      type: "text",
      notNull: true,
    },
    word_count: {
      type: "integer",
      notNull: true,
    },
    language_detected: {
      type: "varchar(10)",
      default: "'en'",
    },
    overall_band: {
      type: "decimal(3,1)",
    },
    task_score: {
      type: "decimal(3,1)",
    },
    coherence_score: {
      type: "decimal(3,1)",
    },
    lexical_score: {
      type: "decimal(3,1)",
    },
    grammar_score: {
      type: "decimal(3,1)",
    },
    feedback_json: {
      type: "jsonb",
    },
    status: {
      type: "varchar(20)",
      notNull: true,
      default: "'pending'",
      check: "status IN ('pending', 'completed', 'failed')",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  // -----------------------------------------------------------------------
  // writing_usage — daily submission counts for free-tier limits
  // -----------------------------------------------------------------------
  pgm.createTable("writing_usage", {
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
    date: {
      type: "date",
      notNull: true,
      default: pgm.func("CURRENT_DATE"),
    },
    writing_count: {
      type: "integer",
      notNull: true,
      default: 0,
    },
  });

  // Unique constraint: one row per user per day
  pgm.addConstraint("writing_usage", "uq_writing_usage_user_date", {
    unique: ["user_id", "date"],
  });

  // -----------------------------------------------------------------------
  // Indexes
  // -----------------------------------------------------------------------
  pgm.createIndex("writing_submissions", ["user_id"], {
    name: "idx_writing_submissions_user_id",
  });
  pgm.createIndex("writing_submissions", ["status"], {
    name: "idx_writing_submissions_status",
  });
  pgm.createIndex("writing_usage", ["user_id", "date"], {
    name: "idx_writing_usage_user_date",
  });
};

exports.down = (pgm) => {
  pgm.dropTable("writing_usage");
  pgm.dropTable("writing_submissions");
};
