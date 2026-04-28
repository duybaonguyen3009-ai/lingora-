/* eslint-disable camelcase */

/**
 * Migration 0044 — Per-skill band estimate columns.
 *
 * Why: the legacy `users.estimated_band` + `band_history` (migrations
 * 0020/0021) mixes scores from all 4 IELTS skills into a single rolling
 * average. A user with Writing 7.5 who completes one Reading passage at
 * band 6.0 sees their displayed band drop, even though their writing
 * ability is unchanged. Per-skill estimates fix this.
 *
 * Listening column is reserved here so the schema is future-proof, but
 * Wave 2 listening logic is paused (no-touch) — the column stays NULL
 * until Phase 1B.2 ships.
 *
 * Type matches the existing `estimated_band` column (decimal(3,1)).
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns("users", {
    band_estimate_reading:   { type: "decimal(3,1)" },
    band_estimate_writing:   { type: "decimal(3,1)" },
    band_estimate_speaking:  { type: "decimal(3,1)" },
    band_estimate_listening: { type: "decimal(3,1)" },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns("users", [
    "band_estimate_reading",
    "band_estimate_writing",
    "band_estimate_speaking",
    "band_estimate_listening",
  ]);
};
