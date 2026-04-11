/* eslint-disable camelcase */

/**
 * Migration 0018 — IELTS Battle Reading Content System
 *
 * Adds tables for reading passages and questions used in
 * IELTS Battle reading practice mode.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // -----------------------------------------------------------------------
  // reading_passages — IELTS reading passage content
  // -----------------------------------------------------------------------
  pgm.createTable("reading_passages", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    topic: {
      type: "text",
      notNull: true,
    },
    difficulty: {
      type: "text",
      notNull: true,
      default: "'band_55_70'",
    },
    estimated_minutes: {
      type: "int",
      notNull: true,
    },
    passage_title: {
      type: "text",
      notNull: true,
    },
    passage_text: {
      type: "text",
      notNull: true,
    },
    tags: {
      type: "text[]",
      default: pgm.func("ARRAY[]::text[]"),
    },
    created_by: {
      type: "text",
      default: "'ai_generated'",
    },
    review_status: {
      type: "text",
      default: "'pending'",
      check: "review_status IN ('pending', 'approved', 'rejected')",
    },
    created_at: {
      type: "timestamptz",
      default: pgm.func("now()"),
    },
    updated_at: {
      type: "timestamptz",
      default: pgm.func("now()"),
    },
  });

  // -----------------------------------------------------------------------
  // reading_questions — questions linked to passages
  // -----------------------------------------------------------------------
  pgm.createTable("reading_questions", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    passage_id: {
      type: "uuid",
      notNull: true,
      references: '"reading_passages"',
      onDelete: "CASCADE",
    },
    order_index: {
      type: "int",
      notNull: true,
    },
    type: {
      type: "text",
      notNull: true,
      check: "type IN ('mcq', 'tfng', 'matching')",
    },
    question_text: {
      type: "text",
      notNull: true,
    },
    options: {
      type: "jsonb",
    },
    correct_answer: {
      type: "text",
      notNull: true,
    },
    explanation: {
      type: "text",
    },
    created_at: {
      type: "timestamptz",
      default: pgm.func("now()"),
    },
  });

  // Indexes
  pgm.createIndex("reading_passages", ["topic"], {
    name: "idx_reading_passages_topic",
  });
  pgm.createIndex("reading_passages", ["difficulty"], {
    name: "idx_reading_passages_difficulty",
  });
  pgm.createIndex("reading_passages", ["review_status"], {
    name: "idx_reading_passages_review_status",
  });
  pgm.createIndex("reading_questions", ["passage_id", "order_index"], {
    name: "idx_reading_questions_passage_order",
  });
};

exports.down = (pgm) => {
  pgm.dropTable("reading_questions");
  pgm.dropTable("reading_passages");
};
