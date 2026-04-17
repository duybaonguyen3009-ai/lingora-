/**
 * IELTS exam format specifications.
 *
 * Values come from the IELTS specification itself (IDP/British Council).
 * They are NOT configurable by Lingona — do not change them to "make things easier".
 *
 * Source: https://www.ielts.org/about-the-test/test-format
 * @module domain/ielts/format
 */

// ════════════════════════════════════════════════════════════════
// TEST TYPES
// ════════════════════════════════════════════════════════════════

/** @typedef {'academic' | 'general_training'} TestType */

const TEST_TYPES = Object.freeze(['academic', 'general_training']);

// ════════════════════════════════════════════════════════════════
// READING
// ════════════════════════════════════════════════════════════════

const READING = Object.freeze({
  TOTAL_QUESTIONS: 40,
  TOTAL_PASSAGES: 3,
  TOTAL_MINUTES: 60,
  // Computer-delivered test: no extra transfer time
  TRANSFER_MINUTES: 0,
});

// ════════════════════════════════════════════════════════════════
// LISTENING
// ════════════════════════════════════════════════════════════════

const LISTENING = Object.freeze({
  TOTAL_QUESTIONS: 40,
  TOTAL_SECTIONS: 4,
  AUDIO_MINUTES: 30,
  // CDT: 2-minute review at end, no transfer time
  REVIEW_MINUTES: 2,
  TOTAL_MINUTES: 32,
  // Audio plays exactly once in real exam
  AUDIO_REPLAYS_ALLOWED: 0,
});

// ════════════════════════════════════════════════════════════════
// WRITING
// ════════════════════════════════════════════════════════════════

const WRITING = Object.freeze({
  TOTAL_MINUTES: 60,

  TASK_1: Object.freeze({
    MIN_WORDS: 150,
    RECOMMENDED_MINUTES: 20,
    // Academic: chart/graph/process/map. General: letter.
    TYPES: Object.freeze(['academic_chart', 'general_letter']),
  }),

  TASK_2: Object.freeze({
    MIN_WORDS: 250,
    RECOMMENDED_MINUTES: 40,
    // Essay types as per IELTS band descriptors
    TYPES: Object.freeze(['opinion', 'discussion', 'problem_solution', 'two_part']),
  }),
});

// ════════════════════════════════════════════════════════════════
// SPEAKING
// ════════════════════════════════════════════════════════════════

const SPEAKING = Object.freeze({
  TOTAL_MINUTES_MIN: 11,
  TOTAL_MINUTES_MAX: 14,

  PART_1: Object.freeze({
    MINUTES_MIN: 4,
    MINUTES_MAX: 5,
    DESCRIPTION: 'Interview — familiar topics (home, work, studies, interests)',
  }),
  PART_2: Object.freeze({
    PREP_SECONDS: 60,
    SPEAKING_SECONDS_MIN: 60,
    SPEAKING_SECONDS_MAX: 120,
    DESCRIPTION: 'Long turn — cue card, speak 1-2 minutes after 1 minute prep',
  }),
  PART_3: Object.freeze({
    MINUTES_MIN: 4,
    MINUTES_MAX: 5,
    DESCRIPTION: 'Discussion — abstract questions related to Part 2 topic',
  }),
});

// ════════════════════════════════════════════════════════════════
// FULL TEST ORDER
// ════════════════════════════════════════════════════════════════

/**
 * Real IELTS computer-delivered test order.
 * Full Test Mode enforces this order. No backward navigation between sections.
 * Speaking is a separate session (face-to-face in real exam).
 *
 * @typedef {'listening' | 'reading' | 'writing' | 'speaking'} Section
 */
const FULL_TEST_ORDER = Object.freeze(['listening', 'reading', 'writing', 'speaking']);

// ════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════

module.exports = {
  TEST_TYPES,
  READING,
  LISTENING,
  WRITING,
  SPEAKING,
  FULL_TEST_ORDER,
};
