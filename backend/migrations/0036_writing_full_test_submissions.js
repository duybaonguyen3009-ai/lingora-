/* eslint-disable camelcase */

/**
 * Migration 0036 — Writing Full Tests.
 *
 * Links a Task 1 + Task 2 pair into one exam-style run so the Full Test
 * mode (Item 2 skeleton) can finalize, score, and show aggregate
 * analytics. Individual submissions stay in writing_submissions — this
 * table owns the Full Test lifecycle (started/submitted/expired) and the
 * weighted overall band.
 *
 * FK design:
 *   - user_id               CASCADE — user deletion wipes their Full Tests.
 *   - task{1,2}_submission_id  SET NULL — never destroy a graded essay
 *                            because its parent Full Test was tidied.
 *   - task{1,2}_question_id    SET NULL — curated prompts can be retired.
 *
 * All defaults via pgm.func() to avoid the triple-quote string-literal
 * bug migration 0034 cleaned up.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("writing_full_tests", {
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
    task1_submission_id: {
      type: "uuid",
      references: '"writing_submissions"',
      onDelete: "SET NULL",
    },
    task2_submission_id: {
      type: "uuid",
      references: '"writing_submissions"',
      onDelete: "SET NULL",
    },
    task1_question_id: {
      type: "uuid",
      references: '"writing_questions"',
      onDelete: "SET NULL",
    },
    task2_question_id: {
      type: "uuid",
      references: '"writing_questions"',
      onDelete: "SET NULL",
    },
    total_time_used_seconds: {
      type: "integer",
    },
    started_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    submitted_at: {
      type: "timestamptz",
    },
    status: {
      type: "varchar(20)",
      notNull: true,
      check: "status IN ('in_progress','submitted','expired')",
    },
    overall_band: {
      type: "numeric(3,1)",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.createIndex("writing_full_tests", ["user_id"], {
    name: "idx_writing_full_tests_user_id",
  });
  pgm.createIndex("writing_full_tests", ["status"], {
    name: "idx_writing_full_tests_status",
  });
  pgm.createIndex("writing_full_tests", ["submitted_at"], {
    name: "idx_writing_full_tests_submitted_at",
  });
};

exports.down = (pgm) => {
  pgm.dropTable("writing_full_tests");
};
