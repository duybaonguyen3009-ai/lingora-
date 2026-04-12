/* eslint-disable camelcase */

/**
 * Migration 0024 — Profile polish
 *
 * Adds bio and location fields to users for enhanced profiles.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns("users", {
    bio: { type: "text" },
    location: { type: "text" },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns("users", ["bio", "location"]);
};
