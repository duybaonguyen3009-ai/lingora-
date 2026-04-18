/**
 * IELTS Examiner Persona module — pure functions and constants.
 *
 * Owns: the fixed pool of 4 examiner personas, greeting computation from
 * local time, opening-message template, and input validators used by the
 * controller/service layer.
 *
 * No DB, no network, no mutable state. Safe to import from anywhere in the
 * IELTS domain.
 *
 * @module domain/ielts/examinerPersona
 */

const PERSONAS = Object.freeze([
  Object.freeze({ name: "Sarah",  voice: "nova",    gender: "F" }),
  Object.freeze({ name: "Emily",  voice: "shimmer", gender: "F" }),
  Object.freeze({ name: "David",  voice: "onyx",    gender: "M" }),
  Object.freeze({ name: "James",  voice: "echo",    gender: "M" }),
]);

const TTS_VOICE_WHITELIST = Object.freeze(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]);
const DEFAULT_TTS_VOICE = "alloy";
const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";

const OPENING_TEMPLATE =
  "{greeting}. My name is {name}, and I'll be your examiner today. " +
  "This speaking test has three parts. First, could you tell me your full name, please?";

/**
 * Pick a random examiner persona from the pool.
 * Plain random per-call — no rotation, no avoid-repeat.
 * @returns {{name: string, voice: string, gender: string}}
 */
function pickPersona() {
  const idx = Math.floor(Math.random() * PERSONAS.length);
  return PERSONAS[idx];
}

/**
 * Validate an IANA timezone string.
 * @param {unknown} tz
 * @returns {boolean}
 */
function isValidTimezone(tz) {
  if (typeof tz !== "string" || !tz) return false;
  try {
    // Intl throws RangeError for invalid IANA identifiers.
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Compute the local hour (0-23) for the given UTC instant in the given IANA timezone.
 * @param {Date} utcDate
 * @param {string} timezone  valid IANA identifier
 * @returns {number}
 */
function localHourInTimezone(utcDate, timezone) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false,
  });
  // "24" can appear at midnight in some locales — normalize to 0.
  const hourStr = fmt.format(utcDate);
  const h = parseInt(hourStr, 10);
  return Number.isFinite(h) ? (h === 24 ? 0 : h) : 0;
}

/**
 * Compute the IELTS-style English greeting for the user's local time.
 *   05:00–11:59 → Good morning
 *   12:00–17:59 → Good afternoon
 *   18:00–04:59 → Good evening
 * @param {Date} utcDate
 * @param {string} timezone
 * @returns {"Good morning" | "Good afternoon" | "Good evening"}
 */
function computeGreeting(utcDate, timezone) {
  const h = localHourInTimezone(utcDate, timezone);
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Build the examiner opening message from the template.
 * @param {{name: string}} persona
 * @param {string} greeting
 * @returns {string}
 */
function buildOpeningMessage(persona, greeting) {
  return OPENING_TEMPLATE
    .replace("{greeting}", greeting)
    .replace("{name}", persona.name);
}

/**
 * Validate + normalize a requested TTS voice against the OpenAI whitelist.
 * Invalid or missing → `DEFAULT_TTS_VOICE` ("alloy").
 * @param {unknown} voice
 * @returns {string}
 */
function normalizeVoice(voice) {
  return typeof voice === "string" && TTS_VOICE_WHITELIST.includes(voice)
    ? voice
    : DEFAULT_TTS_VOICE;
}

/**
 * Validate + normalize a requested timezone. Invalid or missing → `DEFAULT_TIMEZONE`.
 * @param {unknown} tz
 * @returns {string}
 */
function normalizeTimezone(tz) {
  return isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE;
}

module.exports = {
  PERSONAS,
  TTS_VOICE_WHITELIST,
  DEFAULT_TTS_VOICE,
  DEFAULT_TIMEZONE,
  pickPersona,
  isValidTimezone,
  computeGreeting,
  buildOpeningMessage,
  normalizeVoice,
  normalizeTimezone,
};
