/* eslint-disable camelcase */

/**
 * Migration 0039 — Voice message waveform peaks
 *
 * Adds nullable waveform_peaks JSONB column for rendering voice message
 * waveforms in the chat UI. Client-side extracts normalized amplitudes
 * via Web Audio API and includes them in the send payload. Backend only
 * persists — no server-side audio processing.
 *
 * NULL = text message, legacy voice row, or client without waveform support.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns("messages", {
    waveform_peaks: { type: "jsonb", notNull: false },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns("messages", ["waveform_peaks"]);
};
