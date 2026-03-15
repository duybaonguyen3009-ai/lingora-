/**
 * Migration 0004 – Fill-in-the-blank quiz support
 *
 * Extends quiz_items to support a second question type alongside the
 * existing multiple-choice format.
 *
 * Changes:
 *   quiz_items
 *     + question_type   TEXT NOT NULL DEFAULT 'multiple_choice'
 *                       CHECK (question_type IN ('multiple_choice','fill_in_blank'))
 *     + correct_answer  TEXT   – plain-text expected answer for fill_in_blank
 *                                NULL on multiple_choice rows (uses correct_option)
 *
 * Design decisions:
 *   • correct_option is kept NOT NULL for existing rows but will be set to NULL
 *     on new fill_in_blank rows via a relaxed constraint (see note below).
 *     Rather than ALTER the NOT NULL on correct_option (which requires a table
 *     rewrite on large datasets), we enforce the distinction in the application
 *     layer: service/repository code validates that fill_in_blank rows have
 *     correct_answer and multiple_choice rows have correct_option.
 *   • correct_answer stores the canonical answer in lowercase, trimmed form.
 *     The quiz scorer normalises the student's input the same way before comparing.
 *   • Existing rows default to question_type = 'multiple_choice' so all live
 *     content continues to work without a data backfill.
 */

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {

  // ─── 1. Add question_type column with CHECK constraint ────────────────────
  pgm.addColumns('quiz_items', {
    question_type: {
      type:    'text',
      notNull: true,
      default: 'multiple_choice',
      // CHECK constraint added below (node-pg-migrate addColumns doesn't
      // support inline CHECK on non-PK columns reliably across all adapters).
    },
  });

  pgm.addConstraint('quiz_items', 'check_quiz_question_type',
    `CHECK (question_type IN ('multiple_choice', 'fill_in_blank'))`);

  // ─── 2. Add correct_answer column for fill_in_blank rows ─────────────────
  // NULL = multiple_choice question (answer encoded in correct_option).
  pgm.addColumns('quiz_items', {
    correct_answer: {
      type: 'text',
      // nullable: only populated on fill_in_blank rows
    },
  });

  // ─── 3. Index for filtering by question type ─────────────────────────────
  // Useful for seed scripts and admin queries that need only one type.
  pgm.createIndex('quiz_items', 'question_type', {
    name: 'idx_quiz_items_type',
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropIndex('quiz_items', 'question_type', { name: 'idx_quiz_items_type' });
  pgm.dropConstraint('quiz_items', 'check_quiz_question_type');
  pgm.dropColumns('quiz_items', ['correct_answer', 'question_type']);
};
