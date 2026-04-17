/**
 * Exam UX fidelity rules.
 *
 * Business rules about UI BEHAVIOR (not styling) that mirror the real IELTS
 * exam environment. Components read from EXAM_UX[mode] rather than hardcoding
 * these behaviors.
 *
 * @module domain/ielts/exam-ux
 */

/** @typedef {'practice' | 'fullTest' | 'battleRanked' | 'battleFriend'} ExamMode */
/** @typedef {'brand' | 'brand-soft' | 'ielts-authentic'} Palette */
/** @typedef {'brand' | 'exam'} FontSet */

/**
 * @typedef {Object} TimerBehavior
 * @property {boolean} canPause
 * @property {boolean} autoSubmitOnTimeUp
 * @property {boolean} showFiveMinuteWarning
 */

/**
 * @typedef {Object} NavigationBehavior
 * @property {boolean} canGoBackBetweenSections
 * @property {boolean} canJumpWithinSection
 * @property {boolean} canSkipSection
 */

/**
 * @typedef {Object} InputBehavior
 * @property {boolean} spellCheck
 * @property {boolean} autoCorrect
 * @property {boolean} allowPasteInWriting
 */

/**
 * @typedef {Object} AudioBehavior
 * @property {boolean} replayAllowed
 */

/**
 * @typedef {Object} AntiCheatBehavior
 * @property {boolean} detectTabSwitch
 * @property {boolean} blockRightClick
 * @property {boolean} blockCopyPassage
 * @property {number}  maxTabSwitchesBeforeAutoSubmit Infinity if disabled
 */

/**
 * @typedef {Object} ProgressBehavior
 * @property {boolean} showAnsweredCount
 * @property {boolean} showCorrectness
 */

/**
 * @typedef {Object} ExamUxConfig
 * @property {Palette}            palette
 * @property {FontSet}            fontSet
 * @property {TimerBehavior}      timer
 * @property {NavigationBehavior} navigation
 * @property {InputBehavior}      input
 * @property {AudioBehavior}      audio
 * @property {AntiCheatBehavior}  antiCheat
 * @property {ProgressBehavior}   progress
 */

// ════════════════════════════════════════════════════════════════
// MODE CONFIGS
// ════════════════════════════════════════════════════════════════

/** @type {Readonly<Record<ExamMode, ExamUxConfig>>} */
const EXAM_UX = Object.freeze({
  /**
   * Practice Mode — teaches exam behavior without full pressure.
   * IELTS-compliant (no spellcheck, word limits) but pauseable.
   */
  practice: Object.freeze({
    palette: 'brand-soft',
    fontSet: 'brand',
    timer: Object.freeze({
      canPause: true,
      autoSubmitOnTimeUp: false,
      showFiveMinuteWarning: true,
    }),
    navigation: Object.freeze({
      canGoBackBetweenSections: true,
      canJumpWithinSection: true,
      canSkipSection: true,
    }),
    input: Object.freeze({
      spellCheck: false,
      autoCorrect: false,
      allowPasteInWriting: false,
    }),
    audio: Object.freeze({
      replayAllowed: true,
    }),
    antiCheat: Object.freeze({
      detectTabSwitch: false,
      blockRightClick: false,
      blockCopyPassage: false,
      maxTabSwitchesBeforeAutoSubmit: Infinity,
    }),
    progress: Object.freeze({
      showAnsweredCount: true,
      showCorrectness: false,
    }),
  }),

  /**
   * Full Test Mode — complete exam simulation under real conditions.
   * Band prediction tool before booking the real exam.
   */
  fullTest: Object.freeze({
    palette: 'ielts-authentic',
    fontSet: 'exam',
    timer: Object.freeze({
      canPause: false,
      autoSubmitOnTimeUp: true,
      showFiveMinuteWarning: false, // real IELTS CDT doesn't show this
    }),
    navigation: Object.freeze({
      canGoBackBetweenSections: false,
      canJumpWithinSection: true,
      canSkipSection: false,
    }),
    input: Object.freeze({
      spellCheck: false,
      autoCorrect: false,
      allowPasteInWriting: false,
    }),
    audio: Object.freeze({
      replayAllowed: false,
    }),
    antiCheat: Object.freeze({
      detectTabSwitch: true,
      blockRightClick: true,
      blockCopyPassage: true,
      maxTabSwitchesBeforeAutoSubmit: 2,
    }),
    progress: Object.freeze({
      showAnsweredCount: true,
      showCorrectness: false,
    }),
  }),

  /**
   * Battle Ranked — exam-level seriousness, rank points on the line.
   * Strictest anti-cheat because competitive.
   */
  battleRanked: Object.freeze({
    palette: 'ielts-authentic',
    fontSet: 'exam',
    timer: Object.freeze({
      canPause: false,
      autoSubmitOnTimeUp: true,
      showFiveMinuteWarning: false,
    }),
    navigation: Object.freeze({
      canGoBackBetweenSections: false,
      canJumpWithinSection: true,
      canSkipSection: false,
    }),
    input: Object.freeze({
      spellCheck: false,
      autoCorrect: false,
      allowPasteInWriting: false,
    }),
    audio: Object.freeze({
      replayAllowed: false,
    }),
    antiCheat: Object.freeze({
      detectTabSwitch: true,
      blockRightClick: true,
      blockCopyPassage: true,
      maxTabSwitchesBeforeAutoSubmit: 1, // stricter than Full Test
    }),
    progress: Object.freeze({
      showAnsweredCount: true,
      showCorrectness: false,
    }),
  }),

  /**
   * Battle Friend — casual, no stakes. Brand feel.
   */
  battleFriend: Object.freeze({
    palette: 'brand',
    fontSet: 'brand',
    timer: Object.freeze({
      canPause: false, // still timed so it ends
      autoSubmitOnTimeUp: true,
      showFiveMinuteWarning: true,
    }),
    navigation: Object.freeze({
      canGoBackBetweenSections: false,
      canJumpWithinSection: true,
      canSkipSection: false,
    }),
    input: Object.freeze({
      spellCheck: false,
      autoCorrect: false,
      allowPasteInWriting: false,
    }),
    audio: Object.freeze({
      replayAllowed: true,
    }),
    antiCheat: Object.freeze({
      detectTabSwitch: false,
      blockRightClick: false,
      blockCopyPassage: false,
      maxTabSwitchesBeforeAutoSubmit: Infinity,
    }),
    progress: Object.freeze({
      showAnsweredCount: true,
      showCorrectness: false,
    }),
  }),
});

/**
 * @param {ExamMode} mode
 * @returns {ExamUxConfig}
 */
function getExamUx(mode) {
  const config = EXAM_UX[mode];
  if (!config) {
    throw new Error(`getExamUx: unknown mode "${mode}"`);
  }
  return config;
}

module.exports = {
  EXAM_UX,
  getExamUx,
};
