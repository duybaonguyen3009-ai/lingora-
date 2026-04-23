/* eslint-disable camelcase */

/**
 * Migration 0033 — Link writing_submissions to writing_questions.
 *
 * Adds writing_submissions.writing_question_id (nullable FK). Legacy
 * submissions (pre-prompt-bank) keep NULL and stay valid. Deleting a
 * curated prompt leaves the user's essay intact (ON DELETE SET NULL)
 * — we never destroy submitted work because an admin tidied the bank.
 *
 * Populating user_writing_attempts.submission_id after a successful
 * essay submission is handled in the service layer, not here.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn("writing_submissions", {
    writing_question_id: {
      type: "uuid",
      references: '"writing_questions"',
      onDelete: "SET NULL",
    },
  });

  pgm.createIndex("writing_submissions", ["writing_question_id"], {
    name: "idx_writing_submissions_question_id",
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("writing_submissions", ["writing_question_id"], {
    name: "idx_writing_submissions_question_id",
  });
  pgm.dropColumn("writing_submissions", "writing_question_id");
};
