/* eslint-disable camelcase */

/**
 * Migration 0013 — Add is_pro flag to users table
 *
 * Supports free-tier limits (e.g., writing submissions per day).
 * Default false — all existing users start as free.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns("users", {
    is_pro: {
      type: "boolean",
      notNull: true,
      default: false,
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns("users", ["is_pro"]);
};
