/**
 * services/coachService.js
 *
 * Rules-based recommendation engine for the "Today's Focus" coach card.
 *
 * Returns 0–2 FocusRecommendation objects, prioritised by highest learning impact.
 * All logic is pure rules — no LLM calls.  Designed for easy future extension
 * (add a new rule block, bump priority, plug in LLM scoring later).
 *
 * Recommendation types (in priority order):
 *  1. first_lesson  — user has zero history → guide them to start
 *  2. pronunciation — weak prompt (avg score < WEAK_PRON_THRESHOLD)
 *  3. scenario      — no recent conversations OR low average score
 *
 * ---------------------------------------------------------------------------
 * Extension points for future iterations:
 *  - Add user goals (pronunciation focus vs. fluency focus) → weight differently
 *  - Add A/B experiment flags → alter which rule fires
 *  - Swap in LLM scoring: pass raw data to GPT, get back ranked recommendations
 *  - Add IELTS-specific rule once exam_type usage data is available
 * ---------------------------------------------------------------------------
 */

const coachRepository = require('../repositories/coachRepository');

// ---------------------------------------------------------------------------
// Thresholds — tune these without changing control flow
// ---------------------------------------------------------------------------

/** Pronunciation avg score below this triggers a "practice pronunciation" rec */
const WEAK_PRON_THRESHOLD = 75;

/** Scenario avg score below this triggers a "practice scenarios" rec */
const WEAK_SCENARIO_THRESHOLD = 60;

/** Days window for "recent" scenario sessions */
const RECENT_SCENARIO_DAYS = 7;

/** Hard cap on recommendations returned — keep UI scannable */
const MAX_RECOMMENDATIONS = 2;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Truncate a string to maxLen chars, appending "…" if cut.
 * Used to keep prompt text short inside recommendation titles.
 */
function truncate(text, maxLen = 45) {
  if (!text || text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '…';
}

/**
 * Average of an array of numbers. Returns 0 on empty array.
 * @param {number[]} nums
 */
function avg(nums) {
  if (!nums.length) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

// ---------------------------------------------------------------------------
// Recommendation builders — one function per type for clean extensibility
// ---------------------------------------------------------------------------

function buildFirstLessonRec() {
  return {
    type:         'first_lesson',
    label:        'Get Started',
    title:        'Start your first lesson',
    description:  'Open a lesson in the Practice tab to begin building your speaking skills.',
    actionLabel:  'Go to Practice',
    actionTarget: 'practice',
  };
}

function buildPronunciationRec(weakPrompt) {
  const score = Math.round(weakPrompt.avgScore);
  return {
    type:         'pronunciation',
    label:        'Pronunciation',
    title:        `Practice "${truncate(weakPrompt.promptText)}"`,
    description:  `Your average score is ${score}/100 — this is your biggest improvement area.`,
    actionLabel:  'Practice',
    actionTarget: 'practice',
    lessonId:     weakPrompt.lessonId || undefined,
  };
}

function buildNoRecentScenarioRec() {
  return {
    type:         'scenario',
    label:        'Speaking',
    title:        'No conversations this week',
    description:  'Real English practice with your AI coach — pick any topic and start talking.',
    actionLabel:  'Explore',
    actionTarget: 'speak',
  };
}

function buildLowScenarioRec(recentAvg, worstSession) {
  const score = Math.round(recentAvg);
  return {
    type:         'scenario',
    label:        'Speaking',
    title:        worstSession
      ? `Retry "${truncate(worstSession.title, 30)}" conversation`
      : 'Keep improving your conversations',
    description:  `Recent average: ${score}/100. More practice sessions will boost your fluency.`,
    actionLabel:  'Practice',
    actionTarget: 'speak',
    scenarioId:   worstSession?.scenarioId || undefined,
  };
}

// ---------------------------------------------------------------------------
// Main service function
// ---------------------------------------------------------------------------

/**
 * Returns 0–2 prioritised focus recommendations for the given user.
 *
 * Fetches data in parallel where possible, then applies rules top-down
 * until the MAX_RECOMMENDATIONS cap is reached.
 *
 * Never throws — returns an empty array on any data error so the UI
 * degrades gracefully (coach card simply doesn't render).
 *
 * @param {string} userId
 * @returns {Promise<FocusRecommendation[]>}
 */
async function getFocusRecommendations(userId) {
  try {
    // --- Fetch aggregate counts in parallel (fast path) ---
    const [pronCount, scenarioCount] = await Promise.all([
      coachRepository.getPronunciationAttemptCount(userId),
      coachRepository.getCompletedScenarioCount(userId),
    ]);

    // Rule 1: Brand-new user — no history at all
    if (pronCount === 0 && scenarioCount === 0) {
      return [buildFirstLessonRec()];
    }

    const recommendations = [];

    // --- Fetch detailed data in parallel (only when counts > 0) ---
    const [weakPrompt, recentSessions] = await Promise.all([
      pronCount > 0
        ? coachRepository.getWeakestPronunciationPrompt(userId)
        : Promise.resolve(null),
      coachRepository.getRecentScenarioSessions(userId, RECENT_SCENARIO_DAYS),
    ]);

    // Rule 2: Weak pronunciation prompt
    if (
      recommendations.length < MAX_RECOMMENDATIONS &&
      weakPrompt !== null &&
      weakPrompt.avgScore < WEAK_PRON_THRESHOLD
    ) {
      recommendations.push(buildPronunciationRec(weakPrompt));
    }

    // Rule 3a: No recent scenario sessions (lapsed practice)
    if (
      recommendations.length < MAX_RECOMMENDATIONS &&
      recentSessions.length === 0
    ) {
      recommendations.push(buildNoRecentScenarioRec());
    }

    // Rule 3b: Recent sessions exist but scores are low
    if (
      recommendations.length < MAX_RECOMMENDATIONS &&
      recentSessions.length > 0
    ) {
      const scoredSessions = recentSessions.filter((s) => s.overallScore !== null);

      if (scoredSessions.length > 0) {
        const recentAvg = avg(scoredSessions.map((s) => s.overallScore));
        if (recentAvg < WEAK_SCENARIO_THRESHOLD) {
          // Find the lowest-scoring session to deep-link to
          const worstSession = scoredSessions.reduce((worst, s) =>
            s.overallScore < worst.overallScore ? s : worst,
          );
          recommendations.push(buildLowScenarioRec(recentAvg, worstSession));
        }
      }
    }

    return recommendations;
  } catch (err) {
    // Degrade gracefully — coach card is non-critical
    console.error('coachService.getFocusRecommendations error:', err.message);
    return [];
  }
}

module.exports = { getFocusRecommendations };
