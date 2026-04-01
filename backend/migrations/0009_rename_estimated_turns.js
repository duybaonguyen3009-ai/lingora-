/**
 * Migration 0009 — Rename estimated_turns → expected_turns
 *
 * Migration 0006 created the column as `estimated_turns`, but all repository
 * code and migration 0007's INSERT reference `expected_turns`. This rename
 * resolves the mismatch so scenario queries work correctly.
 */

exports.up = (pgm) => {
  pgm.renameColumn("scenarios", "estimated_turns", "expected_turns");
};

exports.down = (pgm) => {
  pgm.renameColumn("scenarios", "expected_turns", "estimated_turns");
};
