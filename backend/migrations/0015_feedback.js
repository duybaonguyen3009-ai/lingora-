/* eslint-disable camelcase */

/**
 * Migration 0015 — User Feedback
 *
 * Adds a table for collecting user feedback after speaking sessions,
 * writing submissions, and lesson completions.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("user_feedback", {
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
    activity_type: {
      type: "varchar(20)",
      notNull: true,
      check: "activity_type IN ('speaking', 'writing', 'lesson')",
    },
    activity_id: {
      type: "uuid",
    },
    rating: {
      type: "smallint",
      notNull: true,
      check: "rating BETWEEN 1 AND 3",
    },
    comment: {
      type: "text",
    },
    tags: {
      type: "jsonb",
      default: pgm.func("'[]'::jsonb"),
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.createIndex("user_feedback", ["user_id"], {
    name: "idx_feedback_user_id",
  });
  pgm.createIndex("user_feedback", ["activity_type", "activity_id"], {
    name: "idx_feedback_activity",
  });
};

exports.down = (pgm) => {
  pgm.dropTable("user_feedback");
};
