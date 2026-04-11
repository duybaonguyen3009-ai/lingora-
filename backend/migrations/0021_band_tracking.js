/* eslint-disable camelcase */

/**
 * Migration 0021 — Band tracking + writing idempotency
 *
 * 1. Add band_history JSONB to users (estimated_band already exists from 0020)
 * 2. Add index on estimated_band
 * 3. Add unique constraint on writing_submissions to prevent duplicate daily submissions
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Add band_history to users
  pgm.addColumns("users", {
    band_history: {
      type: "jsonb",
      default: pgm.func("'[]'::jsonb"),
    },
  });

  // 2. Index on estimated_band for band-aware queries
  pgm.createIndex("users", ["estimated_band"], {
    name: "idx_users_estimated_band",
    where: "estimated_band IS NOT NULL",
  });

  // 3. Add submission_date column for idempotency index
  pgm.addColumns("writing_submissions", {
    submission_date: {
      type: "date",
      default: pgm.func("CURRENT_DATE"),
    },
  });

  // Backfill existing rows
  pgm.sql(`UPDATE writing_submissions SET submission_date = created_at::date WHERE submission_date IS NULL;`);

  // Unique index: one non-failed submission per user per task_type per day
  pgm.createIndex("writing_submissions", ["user_id", "task_type", "submission_date"], {
    name: "idx_writing_submissions_user_type_day",
    unique: true,
    where: "status != 'failed'",
  });
};

exports.down = (pgm) => {
  pgm.sql(`DROP INDEX IF EXISTS idx_writing_submissions_user_type_day;`);
  pgm.dropColumns("writing_submissions", ["submission_date"]);
  pgm.dropIndex("users", ["estimated_band"], { name: "idx_users_estimated_band" });
  pgm.dropColumns("users", ["band_history"]);
};
