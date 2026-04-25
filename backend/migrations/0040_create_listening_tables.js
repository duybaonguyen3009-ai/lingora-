/* eslint-disable camelcase */

/**
 * Migration 0040 — IELTS Listening foundation
 *
 * Adds 5 tables for the IELTS Listening feature:
 *
 *   listening_tests           – one row per Cambridge test (e.g. "Cam 7 Test 3")
 *   listening_parts           – 4 rows per test (Part 1..4)
 *   listening_question_groups – groups of questions sharing instructions/layout
 *   listening_questions       – individual questions (~3,200 rows at full seed)
 *   listening_attempts        – user attempts (practice or exam mode)
 *
 * Practice Mode = Cam 1–6, played one Part at a time (mode = 'practice').
 * Exam Mode     = Cam 7–14, all 4 Parts continuous (mode = 'exam').
 *
 * Audio + map images live on Cloudflare R2 under prefix "listening/" (bucket
 * "lingora-audio"). The audio_url column stores the R2 KEY (e.g.
 * "listening/cam07/test3/part1.mp3"); the API issues a presigned download
 * URL via the existing r2Storage provider.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // -----------------------------------------------------------------------
  // listening_tests — one row per Cambridge test
  // -----------------------------------------------------------------------
  pgm.createTable("listening_tests", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    cambridge_book: {
      type: "int",
      notNull: true,
      check: "cambridge_book BETWEEN 1 AND 14",
    },
    test_number: {
      type: "int",
      notNull: true,
      check: "test_number BETWEEN 1 AND 4",
    },
    mode: {
      type: "text",
      notNull: true,
      check: "mode IN ('practice', 'exam')",
    },
    total_duration_seconds: {
      type: "int",
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

  pgm.addConstraint("listening_tests", "listening_tests_book_test_mode_unique", {
    unique: ["cambridge_book", "test_number", "mode"],
  });

  // -----------------------------------------------------------------------
  // listening_parts — 4 rows per test
  // -----------------------------------------------------------------------
  pgm.createTable("listening_parts", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    test_id: {
      type: "uuid",
      notNull: true,
      references: '"listening_tests"',
      onDelete: "CASCADE",
    },
    part_number: {
      type: "int",
      notNull: true,
      check: "part_number BETWEEN 1 AND 4",
    },
    topic: {
      type: "text",
    },
    description: {
      type: "text",
    },
    audio_url: {
      type: "text",
      notNull: true,
    },
    audio_duration_seconds: {
      type: "int",
      notNull: true,
    },
    transcript: {
      type: "text",
      notNull: true,
    },
    created_at: {
      type: "timestamptz",
      default: pgm.func("now()"),
    },
  });

  pgm.addConstraint("listening_parts", "listening_parts_test_part_unique", {
    unique: ["test_id", "part_number"],
  });

  // -----------------------------------------------------------------------
  // listening_question_groups — groups sharing instructions/layout
  // -----------------------------------------------------------------------
  pgm.createTable("listening_question_groups", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    part_id: {
      type: "uuid",
      notNull: true,
      references: '"listening_parts"',
      onDelete: "CASCADE",
    },
    question_type: {
      type: "text",
      notNull: true,
      check:
        "question_type IN (" +
        "'form_completion', " +
        "'note_completion', " +
        "'sentence_completion', " +
        "'multiple_choice', " +
        "'multiple_choice_multi', " +
        "'matching', " +
        "'map_labelling', " +
        "'plan_diagram_labelling', " +
        "'short_answer', " +
        "'flow_chart_completion'" +
        ")",
    },
    instructions: {
      type: "text",
      notNull: true,
    },
    display_order: {
      type: "int",
      notNull: true,
    },
    metadata: {
      type: "jsonb",
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
    },
    created_at: {
      type: "timestamptz",
      default: pgm.func("now()"),
    },
  });

  // -----------------------------------------------------------------------
  // listening_questions — individual questions
  // -----------------------------------------------------------------------
  pgm.createTable("listening_questions", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    group_id: {
      type: "uuid",
      notNull: true,
      references: '"listening_question_groups"',
      onDelete: "CASCADE",
    },
    question_number: {
      type: "int",
      notNull: true,
      check: "question_number BETWEEN 1 AND 40",
    },
    question_text: {
      type: "text",
    },
    correct_answer: {
      type: "text",
      notNull: true,
    },
    acceptable_answers: {
      type: "text[]",
      default: pgm.func("ARRAY[]::text[]"),
    },
    transcript_quote: {
      type: "text",
    },
    audio_segment_start_seconds: {
      type: "int",
    },
    audio_segment_end_seconds: {
      type: "int",
    },
    display_order: {
      type: "int",
      notNull: true,
    },
    created_at: {
      type: "timestamptz",
      default: pgm.func("now()"),
    },
  });

  // -----------------------------------------------------------------------
  // listening_attempts — user attempts
  // -----------------------------------------------------------------------
  pgm.createTable("listening_attempts", {
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
    test_id: {
      type: "uuid",
      notNull: true,
      references: '"listening_tests"',
    },
    mode: {
      type: "text",
      notNull: true,
      check: "mode IN ('practice_strict', 'practice_loose', 'exam')",
    },
    part_id: {
      type: "uuid",
      references: '"listening_parts"',
    },
    status: {
      type: "text",
      notNull: true,
      default: "'in_progress'",
      check: "status IN ('in_progress', 'submitted', 'abandoned')",
    },
    answers: {
      type: "jsonb",
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
    },
    correct_count: {
      type: "int",
    },
    total_count: {
      type: "int",
    },
    band_score: {
      type: "numeric(3,1)",
    },
    time_spent_seconds: {
      type: "int",
    },
    pause_used: {
      type: "boolean",
      default: false,
    },
    started_at: {
      type: "timestamptz",
      default: pgm.func("now()"),
    },
    submitted_at: {
      type: "timestamptz",
    },
  });

  // -----------------------------------------------------------------------
  // Indexes
  // -----------------------------------------------------------------------
  pgm.createIndex("listening_attempts", ["user_id", { name: "started_at", sort: "DESC" }], {
    name: "idx_listening_attempts_user",
  });
  pgm.createIndex("listening_parts", ["test_id"], {
    name: "idx_listening_parts_test",
  });
  pgm.createIndex("listening_questions", ["group_id", "display_order"], {
    name: "idx_listening_questions_group",
  });
  pgm.createIndex("listening_question_groups", ["part_id", "display_order"], {
    name: "idx_listening_question_groups_part",
  });
};

exports.down = (pgm) => {
  // Drop indexes (most are auto-dropped with their tables, but explicit for clarity)
  pgm.dropIndex("listening_question_groups", ["part_id", "display_order"], {
    name: "idx_listening_question_groups_part",
    ifExists: true,
  });
  pgm.dropIndex("listening_questions", ["group_id", "display_order"], {
    name: "idx_listening_questions_group",
    ifExists: true,
  });
  pgm.dropIndex("listening_parts", ["test_id"], {
    name: "idx_listening_parts_test",
    ifExists: true,
  });
  pgm.dropIndex("listening_attempts", ["user_id", { name: "started_at", sort: "DESC" }], {
    name: "idx_listening_attempts_user",
    ifExists: true,
  });

  // Drop tables in reverse dependency order
  pgm.dropTable("listening_attempts");
  pgm.dropTable("listening_questions");
  pgm.dropTable("listening_question_groups");
  pgm.dropTable("listening_parts");
  pgm.dropTable("listening_tests");
};
