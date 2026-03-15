/* eslint-disable camelcase */

/**
 * Migration 0005 — Pronunciation Attempts
 *
 * Adds the pronunciation_attempts table for storing audio recording
 * metadata and AI pronunciation scoring results (phoneme-level detail).
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // -----------------------------------------------------------------------
  // pronunciation_attempts — one row per user recording + scoring attempt
  // -----------------------------------------------------------------------
  pgm.createTable("pronunciation_attempts", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE",
    },
    speaking_prompt_id: {
      type: "uuid",
      notNull: true,
      references: "speaking_prompts(id)",
      onDelete: "CASCADE",
    },
    lesson_id: {
      type: "uuid",
      notNull: true,
      references: "lessons(id)",
      onDelete: "CASCADE",
    },
    audio_storage_key: {
      type: "text",
      notNull: true,
    },
    audio_duration_ms: {
      type: "integer",
    },
    overall_score: {
      type: "real",
      notNull: true,
    },
    accuracy_score: {
      type: "real",
    },
    fluency_score: {
      type: "real",
    },
    completeness_score: {
      type: "real",
    },
    pronunciation_score: {
      type: "real",
    },
    phoneme_details: {
      type: "jsonb",
    },
    word_details: {
      type: "jsonb",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  // Index for fetching best attempt per prompt (user + prompt combo)
  pgm.createIndex("pronunciation_attempts", ["user_id", "speaking_prompt_id"], {
    name: "idx_pronunciation_user_prompt",
  });

  // Index for computing per-lesson speaking averages
  pgm.createIndex("pronunciation_attempts", ["user_id", "lesson_id"], {
    name: "idx_pronunciation_user_lesson",
  });
};

exports.down = (pgm) => {
  pgm.dropTable("pronunciation_attempts");
};
