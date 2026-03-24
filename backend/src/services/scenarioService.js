/**
 * scenarioService.js
 *
 * Orchestrates scenario speaking practice + IELTS speaking exam.
 *
 * IELTS sessions use an EXPLICIT STATE MACHINE:
 *  - State is persisted in DB (session_meta JSONB column)
 *  - Each submitTurn call reads the current state, processes the turn,
 *    then EXPLICITLY advances to the next state
 *  - Turn count is NOT used to derive state — state drives everything
 *  - State transitions are logged for auditability
 */

const { createAiProvider } = require("../providers/ai/aiProvider");
const scenarioRepository = require("../repositories/scenarioRepository");
const { analyzeSpeechFlow, aggregateSpeechFlow } = require("./speechAnalyzer");

const ai = createAiProvider();

// ---------------------------------------------------------------------------
// IELTS Constants
// ---------------------------------------------------------------------------

const IELTS_PART1_QUESTIONS_PER_BLOCK = 3;
const IELTS_PART1_TOPIC_BLOCKS = 2;
const IELTS_PART1_TOTAL_QUESTIONS = IELTS_PART1_QUESTIONS_PER_BLOCK * IELTS_PART1_TOPIC_BLOCKS; // 6
const IELTS_PART3_QUESTIONS = 4;

// Part 3 discussion tiers — each question escalates
const PART3_TIERS = ["concrete", "comparative", "analytical", "evaluative"];

// ---------------------------------------------------------------------------
// IELTS Part 1 Topic Sets — diverse personal/familiar topics
// Each set has a theme and specific question prompts for the AI to use.
// ---------------------------------------------------------------------------

const IELTS_PART1_TOPIC_SETS = [
  {
    theme: "Home & Accommodation",
    questions: [
      "Can you describe the place where you live?",
      "What do you like most about your home?",
      "Is there anything you would like to change about your home?",
      "Do you plan to live there for a long time?",
    ],
  },
  {
    theme: "Work & Studies",
    questions: [
      "Do you work or are you a student?",
      "What do you enjoy most about your work or studies?",
      "Would you like to change your job or field of study in the future?",
      "What did you want to be when you were younger?",
    ],
  },
  {
    theme: "Hometown & Neighbourhood",
    questions: [
      "Where is your hometown?",
      "What is the best thing about living there?",
      "Has your hometown changed much in recent years?",
      "Would you recommend your hometown to visitors?",
    ],
  },
  {
    theme: "Daily Routine & Leisure",
    questions: [
      "What does a typical day look like for you?",
      "Do you prefer mornings or evenings?",
      "How do you usually relax after a busy day?",
      "Has your daily routine changed recently?",
    ],
  },
  {
    theme: "Food & Cooking",
    questions: [
      "What kind of food do you enjoy eating?",
      "Do you prefer eating at home or in restaurants?",
      "Have you ever tried cooking a dish from another country?",
      "Is there a food you disliked as a child but enjoy now?",
    ],
  },
  {
    theme: "Travel & Transport",
    questions: [
      "How do you usually travel to work or school?",
      "Do you enjoy travelling to new places?",
      "What was the last trip you took?",
      "Do you prefer travelling alone or with others?",
    ],
  },
  {
    theme: "Technology & Internet",
    questions: [
      "How often do you use the internet?",
      "What do you mainly use your phone for?",
      "Do you think people spend too much time on technology?",
      "Is there a piece of technology you could not live without?",
    ],
  },
  {
    theme: "Friends & Social Life",
    questions: [
      "Do you prefer spending time with a few close friends or a large group?",
      "How do you usually keep in touch with friends?",
      "Have your friendships changed since you were younger?",
      "What qualities do you value most in a friend?",
    ],
  },
];

// ---------------------------------------------------------------------------
// IELTS Part 2 Cue Cards — expanded with Part 3 theme link
// ---------------------------------------------------------------------------

const IELTS_CUE_CARDS = [
  { topic: "Describe a place you would like to visit", prompts: ["Where the place is", "How you heard about it", "What you would do there", "Why you would like to visit it"], part3Theme: "tourism and travel" },
  { topic: "Describe a person who has inspired you", prompts: ["Who this person is", "How you know them", "What they have done that inspired you", "Why they have been important to you"], part3Theme: "role models and influence" },
  { topic: "Describe a skill you would like to learn", prompts: ["What the skill is", "Why you want to learn it", "How you would learn it", "How useful this skill would be for you"], part3Theme: "learning and education" },
  { topic: "Describe a memorable journey you have made", prompts: ["Where you went", "Who you went with", "What happened during the journey", "Why this journey was memorable"], part3Theme: "travel experiences and transportation" },
  { topic: "Describe a book or film that made you think", prompts: ["What it was about", "When you read or watched it", "What ideas it presented", "Why it made an impression on you"], part3Theme: "media, culture, and storytelling" },
  { topic: "Describe a time you helped someone", prompts: ["Who you helped", "Why they needed help", "How you helped them", "How you felt afterwards"], part3Theme: "helping others and community" },
  { topic: "Describe a tradition in your country that you enjoy", prompts: ["What the tradition is", "When it takes place", "How people celebrate or practise it", "Why it is important to you personally"], part3Theme: "culture and traditions" },
  { topic: "Describe a piece of technology that has changed your daily life", prompts: ["What the technology is", "When you started using it", "How you use it in your daily life", "How your life was different before you had it"], part3Theme: "technology and modern life" },
  { topic: "Describe an achievement you are proud of", prompts: ["What you achieved", "When it happened", "How you achieved it", "Why you feel proud of it"], part3Theme: "success, ambition, and motivation" },
  { topic: "Describe a time when you had to make a difficult decision", prompts: ["What the decision was", "Why it was difficult", "What you decided to do", "How you felt about the outcome"], part3Theme: "decision-making and responsibility" },
  { topic: "Describe a public place you enjoy visiting", prompts: ["What the place is", "Where it is located", "What you do there", "Why you enjoy going there"], part3Theme: "public spaces and urban planning" },
  { topic: "Describe a hobby or activity you enjoy doing in your free time", prompts: ["What the activity is", "How often you do it", "Who you do it with", "Why you find it enjoyable"], part3Theme: "leisure, hobbies, and work-life balance" },
];

// ---------------------------------------------------------------------------
// IELTS State Machine — Explicit Transitions
// ---------------------------------------------------------------------------

/**
 * State shape (persisted in session_meta JSONB):
 * {
 *   part: 1 | 2 | 3,
 *   phase: "question" | "transition_to_part2" | "cue_card" | "long_turn" |
 *          "follow_up" | "transition_to_part3" | "question_p3" | "complete",
 *   questionIndex: number,         // 0-based within current part
 *   cueCardIndex: number,          // index into IELTS_CUE_CARDS
 *   transitionHistory: string[],   // audit trail of state transitions
 * }
 */

/**
 * Create the initial IELTS state for a new session.
 */
function createInitialIeltsState(cueCardIndex) {
  // Select 2 different topic sets for Part 1 topic blocks
  const allIndices = Array.from({ length: IELTS_PART1_TOPIC_SETS.length }, (_, i) => i);
  const shuffled = allIndices.sort(() => Math.random() - 0.5);
  const topicSetIndices = [shuffled[0], shuffled[1]];

  return {
    part: 1,
    phase: "opening",         // NEW: starts with opening, not question
    questionIndex: 0,
    cueCardIndex,

    // ── Examiner Brain: Part 1 Topic Engine ──
    topicSetIndices,          // 2 topic set indices for 2 blocks
    currentTopicBlock: 0,     // which topic block we're in (0 or 1)

    // ── Examiner Brain: Response Policy ──
    lastAcknowledgment: "",   // tracks last acknowledgment to avoid repetition
    questionsAskedSummary: [], // brief angles already covered

    // ── Examiner Brain: Part 3 Discussion Ladder ──
    part3Tier: 0,             // 0=concrete, 1=comparative, 2=analytical, 3=evaluative
    part3PrevWordCount: 0,    // word count of previous Part 3 answer (for de-escalation)

    // ── Quality tracking ──
    userWordCounts: [],
    userResponses: [],
    userResponseCount: 0,
    transitionHistory: ["init → part1:opening:0"],
  };
}

/**
 * EXPLICIT state transition — given the current state + the fact that the user
 * just submitted a turn, compute the NEXT state.
 *
 * This is NOT based on turn count. It reads the current state and advances it.
 * Each transition is logged in transitionHistory for auditability.
 */
function advanceIeltsState(currentState) {
  const next = { ...currentState, transitionHistory: [...currentState.transitionHistory] };
  const from = `part${next.part}:${next.phase}:${next.questionIndex}`;

  // ── Part 1: opening → id_check ──
  if (next.part === 1 && next.phase === "opening") {
    next.phase = "id_check";
    next.transitionHistory.push(`${from} → part1:id_check:0`);
    return next;
  }

  // ── Part 1: id_check → question:0 (first topic block) ──
  if (next.part === 1 && next.phase === "id_check") {
    next.phase = "question";
    next.questionIndex = 0;
    next.transitionHistory.push(`${from} → part1:question:0`);
    return next;
  }

  // ── Part 1: question → question → ... → transition_to_part2 ──
  if (next.part === 1 && next.phase === "question") {
    if (next.questionIndex + 1 >= IELTS_PART1_TOTAL_QUESTIONS) {
      // All Part 1 questions asked → transition to Part 2
      next.part = 2;
      next.phase = "transition_to_part2";
      next.questionIndex = 0;
    } else {
      next.questionIndex += 1;
      // Update topic block when crossing boundary
      const newBlock = Math.floor(next.questionIndex / IELTS_PART1_QUESTIONS_PER_BLOCK);
      if (newBlock !== next.currentTopicBlock) {
        next.currentTopicBlock = newBlock;
      }
    }
    next.transitionHistory.push(`${from} → part${next.part}:${next.phase}:${next.questionIndex}`);
    return next;
  }

  // ── Part 2: transition_to_part2 → cue_card (user preps) ──
  if (next.part === 2 && next.phase === "transition_to_part2") {
    next.phase = "cue_card";
    next.transitionHistory.push(`${from} → part2:cue_card:0`);
    return next;
  }

  // ── Part 2: cue_card → long_turn (user speaks for 2 min) ──
  if (next.part === 2 && next.phase === "cue_card") {
    next.phase = "long_turn";
    next.transitionHistory.push(`${from} → part2:long_turn:0`);
    return next;
  }

  // ── Part 2: long_turn → follow_up (examiner asks 1 follow-up) ──
  if (next.part === 2 && next.phase === "long_turn") {
    next.phase = "follow_up";
    next.transitionHistory.push(`${from} → part2:follow_up:0`);
    return next;
  }

  // ── Part 2: follow_up → transition_to_part3 ──
  if (next.part === 2 && next.phase === "follow_up") {
    next.part = 3;
    next.phase = "transition_to_part3";
    next.questionIndex = 0;
    next.transitionHistory.push(`${from} → part3:transition_to_part3:0`);
    return next;
  }

  // ── Part 3: transition_to_part3 → question_p3 ──
  if (next.part === 3 && next.phase === "transition_to_part3") {
    next.phase = "question_p3";
    next.part3Tier = 0; // Start at concrete tier
    next.transitionHistory.push(`${from} → part3:question_p3:0`);
    return next;
  }

  // ── Part 3: question_p3 → question_p3 → ... → complete ──
  if (next.part === 3 && next.phase === "question_p3") {
    if (next.questionIndex + 1 >= IELTS_PART3_QUESTIONS) {
      next.phase = "complete";
    } else {
      next.questionIndex += 1;
      // ── Discussion Ladder: advance tier ──
      const baseTier = next.questionIndex; // 0→0, 1→1, 2→2, 3→3
      // De-escalation: if previous answer was very short (<15 words), drop one tier
      if (next.part3PrevWordCount > 0 && next.part3PrevWordCount < 15 && baseTier > 0) {
        next.part3Tier = Math.max(0, baseTier - 1);
      } else {
        next.part3Tier = Math.min(baseTier, PART3_TIERS.length - 1);
      }
    }
    next.transitionHistory.push(`${from} → part${next.part}:${next.phase}:${next.questionIndex}`);
    return next;
  }

  // Already complete — no transition
  return next;
}

/**
 * Multi-signal response quality analysis for adaptive difficulty.
 *
 * Signals:
 * - avgWordCount: average words per response
 * - vocabComplexity: ratio of words > 6 chars (proxy for advanced vocabulary)
 * - sentenceComplexity: avg commas + conjunctions per response (proxy for compound/complex sentences)
 *
 * Returns: { level: "strong"|"moderate"|"limited", avgWords, vocabRatio, complexityAvg }
 */
function analyzeResponseQuality(state) {
  const counts = state.userWordCounts || [];
  const responses = state.userResponses || [];

  if (counts.length === 0) {
    return { level: "unknown", avgWords: 0, vocabRatio: 0, complexityAvg: 0 };
  }

  const avgWords = counts.reduce((a, b) => a + b, 0) / counts.length;

  // Vocabulary complexity: ratio of "long" words (>6 chars) across all responses
  let totalWords = 0;
  let longWords = 0;
  let totalComplexitySignals = 0;

  for (const text of responses) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    totalWords += words.length;
    longWords += words.filter(w => w.replace(/[^a-zA-Z]/g, "").length > 6).length;
    // Sentence complexity signals: commas, semicolons, conjunctions
    const commas = (text.match(/,/g) || []).length;
    const conjunctions = (text.match(/\b(because|although|however|moreover|furthermore|nevertheless|whereas|therefore|consequently)\b/gi) || []).length;
    totalComplexitySignals += commas + conjunctions * 2;
  }

  const vocabRatio = totalWords > 0 ? longWords / totalWords : 0;
  const complexityAvg = responses.length > 0 ? totalComplexitySignals / responses.length : 0;

  // Composite scoring
  let score = 0;
  if (avgWords >= 40) score += 3;
  else if (avgWords >= 25) score += 2;
  else if (avgWords >= 12) score += 1;

  if (vocabRatio >= 0.20) score += 2;
  else if (vocabRatio >= 0.10) score += 1;

  if (complexityAvg >= 2.0) score += 2;
  else if (complexityAvg >= 1.0) score += 1;

  const level = score >= 5 ? "strong" : score >= 3 ? "moderate" : "limited";

  return { level, avgWords, vocabRatio, complexityAvg };
}

// ---------------------------------------------------------------------------
// Examiner Brain — Helper functions
// ---------------------------------------------------------------------------

/**
 * Get the current topic set for the active Part 1 block.
 */
function getCurrentTopicSet(state) {
  const blockIdx = state.currentTopicBlock || 0;
  const indices = state.topicSetIndices || [0, 1];
  const topicIdx = indices[Math.min(blockIdx, indices.length - 1)];
  return IELTS_PART1_TOPIC_SETS[topicIdx % IELTS_PART1_TOPIC_SETS.length];
}

/**
 * Get the question hint for the current position within the current topic block.
 */
function getQuestionHint(state) {
  const topicSet = getCurrentTopicSet(state);
  const posInBlock = state.questionIndex % IELTS_PART1_QUESTIONS_PER_BLOCK;
  return topicSet.questions[Math.min(posInBlock, topicSet.questions.length - 1)];
}

/**
 * Check if we're at the start of a new topic block (topic transition needed).
 */
function isTopicTransition(state) {
  return state.questionIndex > 0 && state.questionIndex % IELTS_PART1_QUESTIONS_PER_BLOCK === 0;
}

/**
 * Build anti-repetition context for the examiner prompt.
 */
function buildAntiRepetitionContext(state) {
  const parts = [];
  if (state.lastAcknowledgment) {
    parts.push(`Your last acknowledgment was "${state.lastAcknowledgment}". You MUST use a DIFFERENT one this time.`);
  }
  if (state.questionsAskedSummary && state.questionsAskedSummary.length > 0) {
    parts.push(`Angles already covered in this session (do NOT repeat): ${state.questionsAskedSummary.join(", ")}.`);
  }
  return parts.join("\n");
}

/**
 * Build a strict IELTS examiner system prompt based on current state.
 * The examiner brain provides specific decision context — not generic instructions.
 */
function buildIeltsSystemPrompt(state) {
  const cueCard = IELTS_CUE_CARDS[state.cueCardIndex % IELTS_CUE_CARDS.length];

  const base = `You are a certified IELTS Speaking examiner conducting an official IELTS Speaking test in a quiet examination room. You have years of experience. You are calm, professional, and genuinely attentive to what the candidate says.

EXAMINER PERSONALITY:
- You are a real person, not a machine. You have warmth but maintain professional distance.
- You listen carefully. Your questions sometimes reference what the candidate just said.
- You speak with natural rhythm — not rushed, not robotic.

STRICT RULES:
- Ask ONE question at a time. Never double-question.
- Keep questions to 1–2 sentences maximum.
- NEVER praise: no "Good answer!", "That's interesting!", "Well done!", "Great!".
- NEVER explain the test structure or what part you are in.
- NEVER use mechanical filler: "Let me ask you", "I'd like to ask you".
- If the candidate asks a meta-question, redirect: "Let's continue." then ask the next question.
- Your tone should resemble a university professor conducting a calm interview, not a customer service chatbot.`;

  const antiRepetition = buildAntiRepetitionContext(state);

  // ── Part 1: Opening — Greeting + Name Request ──
  if (state.part === 1 && state.phase === "opening") {
    return `${base}

CURRENT STATE: Part 1 — Opening. This is the very first thing you say to the candidate.

INSTRUCTIONS:
- Greet the candidate and ask for their full name. This is your ONLY task.
- Example: "Good morning. My name is Sarah. Could you tell me your full name, please?"
- Pick a real English first name (Sarah, David, James, Emily, Michael, Rachel). Do NOT say "the examiner".
- Do NOT ask for ID yet. Do NOT ask any topic questions yet. Just greet and ask their name.
- Keep it to 2 sentences maximum.`;
  }

  // ── Part 1: ID Check + Transition to Questions ──
  if (state.part === 1 && state.phase === "id_check") {
    const topicSet = getCurrentTopicSet(state);
    return `${base}

CURRENT STATE: Part 1 — Identity confirmation, then transition to interview questions.

INSTRUCTIONS:
- Thank the candidate for giving their name (use a BRIEF acknowledgment like "Thank you, [their name]." — use whatever name they gave).
- Ask to see their identification: "Can I see your identification, please?"
- Then pause briefly and say: "Thank you, that's fine."
- Then transition to Part 1 questions: "Now, in this first part, I'd like to ask you some questions about yourself."
- Then ask your FIRST question from the topic: "${topicSet.theme}"
- Use this as your first question (rephrase naturally): "${topicSet.questions[0]}"
- Combine all of the above into ONE natural response. Keep the total under 4 sentences after the ID confirmation.`;
  }

  // ── Part 1: Interview Questions ──
  if (state.part === 1 && state.phase === "question") {
    const topicSet = getCurrentTopicSet(state);
    const questionHint = getQuestionHint(state);
    const isTransition = isTopicTransition(state);
    const qNum = state.questionIndex + 1;
    const totalQ = IELTS_PART1_TOTAL_QUESTIONS;

    let topicInstruction = "";
    if (isTransition) {
      // Topic block boundary — examiner must transition to new topic
      topicInstruction = `
TOPIC TRANSITION (mandatory): You are now changing topic. Begin with a natural transition phrase BEFORE the acknowledgment:
  "Now, let's talk about ${topicSet.theme.toLowerCase()}." or "I'd like to move on and ask you about ${topicSet.theme.toLowerCase()}."
  Then ask your question.`;
    }

    return `${base}

CURRENT STATE: Part 1, Question ${qNum} of ${totalQ}
Topic area: "${topicSet.theme}"
${topicInstruction}

ACKNOWLEDGMENT POLICY:
- Start with a BRIEF neutral acknowledgment: "Thank you." / "Okay." / "Right." / "Alright." / "I see."
${antiRepetition}

QUESTION:
- Ask ONE question about "${topicSet.theme}".
- Use this as a guide (rephrase naturally, do not read it verbatim): "${questionHint}"
- Keep your total response to 2 sentences maximum (acknowledgment + question).${isTransition ? " (3 sentences allowed when transitioning topic.)" : ""}
- If this is the last Part 1 question, do NOT announce Part 2 — the system handles that.`;
  }

  // ── Part 2: transition announcement ──
  if (state.part === 2 && state.phase === "transition_to_part2") {
    return `${base}

CURRENT STATE: Transitioning to Part 2.

INSTRUCTIONS:
- Say EXACTLY this (word for word): "Now I'm going to give you a topic and I'd like you to talk about it for one to two minutes. Before you talk, you'll have one minute to think about what you're going to say. You can make some notes if you wish. Here is your topic."
- Do NOT mention the specific topic text — the system will display the task card separately.
- Do NOT add anything else.`;
  }

  // ── Part 2: follow-up (context-aware) ──
  if (state.part === 2 && state.phase === "follow_up") {
    // Extract what the candidate actually said in Part 2 for context-aware follow-up
    const part2Response = (state.userResponses || []).slice(-1)[0] || "";
    const part2Summary = part2Response.length > 200 ? part2Response.substring(0, 200) + "..." : part2Response;

    return `${base}

CURRENT STATE: Part 2 Follow-up. The candidate just finished their long turn about: "${cueCard.topic}"

WHAT THE CANDIDATE SAID (summary):
"${part2Summary}"

INSTRUCTIONS:
- Ask ONE brief rounding-off question that DIRECTLY relates to something the candidate actually said.
- Do NOT ask a generic question. Reference a specific point, detail, or claim from their answer.
- This should be a simple, short question — not a deep discussion question.
- Examples of good follow-ups (adapt to what they actually said):
  "You mentioned [specific thing]. Do you think that will change in the future?"
  "You talked about [specific detail]. Is that common where you come from?"
  "Would you say [specific opinion they expressed] is a widely shared view?"
- Keep it to 1 sentence. Do NOT start Part 3 yet.
${antiRepetition}`;
  }

  // ── Part 3: transition announcement ──
  if (state.part === 3 && state.phase === "transition_to_part3") {
    const themeLabel = cueCard.part3Theme || cueCard.topic.toLowerCase().replace("describe ", "");
    return `${base}

CURRENT STATE: Transitioning to Part 3.
Part 2 topic was: "${cueCard.topic}"
Part 3 discussion theme: "${themeLabel}"

INSTRUCTIONS:
- Transition naturally. Say something like: "We've been talking about ${cueCard.topic.toLowerCase().replace("describe ", "")} and I'd like to discuss some more general questions related to this."
- Then immediately ask your FIRST Part 3 discussion question about "${themeLabel}".
- This first question should be CONCRETE — about real, observable things in society or everyday life. NOT abstract yet.
- Example style: "In your country, how common is [topic-related thing]?" or "How do most people in your country feel about [topic]?"
- Combine the transition and first question into ONE response.`;
  }

  // ── Part 3: discussion questions with DISCUSSION LADDER ──
  if (state.part === 3 && state.phase === "question_p3") {
    const analysis = analyzeResponseQuality(state);
    const themeLabel = cueCard.part3Theme || cueCard.topic.toLowerCase().replace("describe ", "");
    const tier = PART3_TIERS[state.part3Tier || 0] || "concrete";
    const qNum = state.questionIndex + 1;

    // Build tier-specific instruction
    let tierInstruction;
    switch (tier) {
      case "concrete":
        tierInstruction = `DISCUSSION TIER: CONCRETE (Level 1 of 4)
Ask about observable, real-world facts or common behaviors related to "${themeLabel}".
Style: "In your country, how common is...?" / "What do most people think about...?" / "How does this work in practice?"`;
        break;
      case "comparative":
        tierInstruction = `DISCUSSION TIER: COMPARATIVE (Level 2 of 4)
Ask the candidate to compare across time, places, or groups related to "${themeLabel}".
Style: "How has this changed in recent years?" / "Is this different in urban vs rural areas?" / "How does your generation view this compared to your parents' generation?"`;
        break;
      case "analytical":
        tierInstruction = `DISCUSSION TIER: ANALYTICAL (Level 3 of 4)
Ask the candidate to explain causes, effects, or reasons related to "${themeLabel}".
Style: "Why do you think this has become more common?" / "What impact does this have on society?" / "What factors contribute to this trend?"`;
        break;
      case "evaluative":
        tierInstruction = `DISCUSSION TIER: EVALUATIVE (Level 4 of 4)
Ask the candidate to evaluate, judge, or predict related to "${themeLabel}".
Style: "To what extent do you agree that...?" / "Some people argue that... What is your view?" / "What might happen in the future if this continues?"`;
        break;
    }

    // Adaptive difficulty modulates PHRASING within the tier
    let adaptiveNote = "";
    if (analysis.level === "strong") {
      adaptiveNote = `\nCANDIDATE LEVEL: Strong (avg ${Math.round(analysis.avgWords)} words). Use sophisticated, nuanced phrasing. You may add a challenging angle.`;
    } else if (analysis.level === "limited") {
      adaptiveNote = `\nCANDIDATE LEVEL: Developing (avg ${Math.round(analysis.avgWords)} words). Use simpler phrasing for this tier. Keep the question clear and accessible.`;
    }

    return `${base}

CURRENT STATE: Part 3, Question ${qNum} of ${IELTS_PART3_QUESTIONS}
Part 3 discussion theme: "${themeLabel}"

${tierInstruction}${adaptiveNote}

ACKNOWLEDGMENT POLICY:
- Start with a BRIEF neutral acknowledgment before your question.
${antiRepetition}

RULES:
- Ask ONE discussion question about "${themeLabel}" at the ${tier.toUpperCase()} tier.
- Questions must be about society, trends, comparisons, or opinions. NOT personal.
- Do NOT repeat an angle already covered in Part 3.
- Keep your question to 1-2 sentences maximum.`;
  }

  // ── Complete ──
  if (state.phase === "complete") {
    return `${base}

CURRENT STATE: Test complete.

INSTRUCTIONS:
- Say EXACTLY: "Thank you. That is the end of the speaking test. Thank you for your time."
- Do NOT add any feedback, scores, or additional commentary.`;
  }

  return base;
}

// ---------------------------------------------------------------------------
// Part-tagging for scorer — provides structural context
// ---------------------------------------------------------------------------

/**
 * Tag conversation turns with part labels so the scorer knows which part
 * each response belongs to. This enables weighted scoring (Part 2/3 > Part 1).
 */
function tagConversationParts(filteredTurns, meta) {
  // Reconstruct part boundaries from transition history
  const transitions = meta.transitionHistory || [];
  const partBoundaries = []; // { turnIndex, part, phase }

  // Parse transitions to find where each part starts
  let currentPart = 1;
  let turnCounter = 0;

  // Simple heuristic: count user turns to estimate part boundaries
  const userTurns = filteredTurns.filter(t => t.role === "user");
  const openingTurns = 2; // opening + id_check responses
  const part1Turns = IELTS_PART1_TOTAL_QUESTIONS;
  const part2Turns = 1; // long turn
  // Remaining = Part 3

  return filteredTurns.map((t, i) => {
    if (t.role !== "user") {
      return { role: t.role, content: t.content };
    }

    // Count this user turn's position
    const userIdx = filteredTurns.slice(0, i + 1).filter(x => x.role === "user").length - 1;

    let partLabel;
    if (userIdx < openingTurns) {
      partLabel = "[Part 1 — Opening]";
    } else if (userIdx < openingTurns + part1Turns) {
      const qNum = userIdx - openingTurns + 1;
      partLabel = `[Part 1, Q${qNum}]`;
    } else if (userIdx === openingTurns + part1Turns) {
      partLabel = "[Part 2 — Long Turn]";
    } else if (userIdx === openingTurns + part1Turns + 1) {
      partLabel = "[Part 2 — Follow-up]";
    } else {
      const p3Idx = userIdx - openingTurns - part1Turns - 2;
      partLabel = `[Part 3, Q${p3Idx + 1}]`;
    }

    return { role: t.role, content: `${partLabel} ${t.content}` };
  });
}

// ---------------------------------------------------------------------------
// Scenario catalogue
// ---------------------------------------------------------------------------

async function listScenarios(category) {
  return scenarioRepository.findAllScenarios(category);
}

async function getScenario(id) {
  const scenario = await scenarioRepository.findScenarioById(id);
  if (!scenario) {
    const err = new Error("Scenario not found");
    err.status = 404;
    throw err;
  }
  return scenario;
}

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

async function startSession(scenarioId, userId) {
  const scenario = await scenarioRepository.findScenarioById(scenarioId);
  if (!scenario) {
    const err = new Error("Scenario not found");
    err.status = 404;
    throw err;
  }

  await scenarioRepository.abandonActiveSession(userId);
  const session = await scenarioRepository.createSession(scenarioId, userId);

  const isIelts = scenario.category === "exam";
  let openingContent;

  if (isIelts) {
    const cueCardIndex = Math.floor(Math.random() * IELTS_CUE_CARDS.length);
    const initialState = createInitialIeltsState(cueCardIndex);

    // Persist state to DB
    await scenarioRepository.updateSessionMeta(session.id, initialState);

    // Generate examiner opening with strict prompt
    const systemPrompt = buildIeltsSystemPrompt(initialState);
    openingContent = await ai.generateResponse(systemPrompt, [], { category: "exam" });

    console.log(`[ielts] Session started: ${session.id} | cueCard: ${cueCardIndex} | state: part1:question:0`);
  } else {
    openingContent = scenario.opening_message;
  }

  const openingTurn = await scenarioRepository.insertTurn(
    session.id, 0, "assistant", openingContent
  );

  // Return cue card so frontend can display it during Part 2
  const cueCard = isIelts
    ? IELTS_CUE_CARDS[(await scenarioRepository.getSessionMeta(session.id))?.cueCardIndex ?? 0]
    : null;

  return {
    sessionId: session.id,
    title: session.title,
    emoji: session.emoji,
    category: session.category,
    cueCard: cueCard || undefined,
    turns: [{
      turnIndex: openingTurn.turn_index,
      role: openingTurn.role,
      content: openingTurn.content,
      createdAt: openingTurn.created_at,
    }],
  };
}

async function submitTurn(sessionId, userId, content, speechMetrics = null) {
  const session = await scenarioRepository.findSessionById(sessionId);
  if (!session) {
    const err = new Error("Session not found");
    err.status = 404;
    throw err;
  }
  if (session.user_id !== userId) {
    const err = new Error("Not authorized to access this session");
    err.status = 403;
    throw err;
  }
  if (session.status !== "active") {
    const err = new Error("Session is no longer active");
    err.status = 400;
    throw err;
  }

  const existingTurns = await scenarioRepository.findSessionTurns(sessionId);
  const nextIndex = existingTurns.length;

  // Save user turn
  const userTurn = await scenarioRepository.insertTurn(sessionId, nextIndex, "user", content);

  // Build conversation history for AI
  const conversationHistory = existingTurns.map(t => ({ role: t.role, content: t.content }));
  conversationHistory.push({ role: "user", content });

  const isIelts = session.category === "exam";
  let aiContent;
  let ieltsState = null;

  if (isIelts) {
    // ── Read current state from DB ──
    const currentState = await scenarioRepository.getSessionMeta(sessionId);
    if (!currentState || !currentState.part) {
      console.error(`[ielts] FATAL: No state found for session ${sessionId}`);
      const err = new Error("IELTS session state corrupted");
      err.status = 500;
      throw err;
    }

    // ── Track user response quality (skip placeholders) ──
    const isPlaceholder = content.startsWith("[") && content.endsWith("]");
    if (!isPlaceholder) {
      const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
      currentState.userWordCounts = [...(currentState.userWordCounts || []), wordCount];
      currentState.userResponses = [...(currentState.userResponses || []), content];
      currentState.userResponseCount = (currentState.userResponseCount || 0) + 1;

      // ── Audio Intelligence: Store speechMetrics per turn ──
      if (speechMetrics) {
        currentState.turnSpeechMetrics = [
          ...(currentState.turnSpeechMetrics || []),
          { turnIndex: nextIndex, ...speechMetrics },
        ];
        console.log(`[speech] session=${sessionId} | wpm=${speechMetrics.wordsPerMinute} | pauses=${speechMetrics.pauseCount} | ratio=${speechMetrics.speakingRatio}`);
      }

      // ── Examiner Brain: Track Part 3 previous word count for de-escalation ──
      if (currentState.part === 3 && currentState.phase === "question_p3") {
        currentState.part3PrevWordCount = wordCount;
      }

      // ── Examiner Brain: Track question angles asked (brief summary) ──
      if (currentState.phase === "question" || currentState.phase === "question_p3") {
        const briefSummary = content.substring(0, 40).replace(/[^a-zA-Z\s]/g, "").trim();
        currentState.questionsAskedSummary = [
          ...(currentState.questionsAskedSummary || []),
          briefSummary,
        ].slice(-8); // Keep last 8 summaries
      }
    }

    const fromState = `part${currentState.part}:${currentState.phase}:${currentState.questionIndex}`;

    // ── EXPLICIT transition — advance to next state ──
    const nextState = advanceIeltsState(currentState);
    // Carry forward all brain metadata
    nextState.userWordCounts = currentState.userWordCounts;
    nextState.userResponses = currentState.userResponses;
    nextState.userResponseCount = currentState.userResponseCount;
    nextState.questionsAskedSummary = currentState.questionsAskedSummary || [];
    nextState.part3PrevWordCount = currentState.part3PrevWordCount || 0;
    nextState.turnSpeechMetrics = currentState.turnSpeechMetrics || [];
    ieltsState = nextState;

    const toState = `part${nextState.part}:${nextState.phase}:${nextState.questionIndex}`;
    console.log(`[ielts] session=${sessionId} | ${fromState} → ${toState}`);

    // ── Generate AI response based on NEXT state ──
    if (nextState.phase === "complete") {
      aiContent = "Thank you. That is the end of the speaking test. Thank you for your time.";
    } else if (nextState.phase === "cue_card") {
      // Special: cue_card phase — examiner doesn't say anything new,
      // the UI shows the cue card. We send a brief instruction.
      const cueCard = IELTS_CUE_CARDS[nextState.cueCardIndex % IELTS_CUE_CARDS.length];
      aiContent = `Please look at your task card. Your topic is: "${cueCard.topic}". You have one minute to prepare. Remember to cover all the points on the card.`;
    } else if (nextState.phase === "long_turn") {
      // User is about to speak for 2 minutes — no examiner question
      aiContent = "Your preparation time is over. Please begin speaking now. You have up to two minutes.";
    } else {
      const systemPrompt = buildIeltsSystemPrompt(nextState);
      aiContent = await ai.generateResponse(systemPrompt, conversationHistory, { category: "exam" });
    }

    // ── Examiner Brain: Extract acknowledgment from AI response for anti-repetition ──
    const ackMatch = aiContent.match(/^(Thank you\.|Okay\.|Right\.|Alright\.|I see\.|Okay, thank you\.)/i);
    if (ackMatch) {
      nextState.lastAcknowledgment = ackMatch[1];
    }

    // ── Persist the new state to DB ──
    await scenarioRepository.updateSessionMeta(sessionId, nextState);
  } else {
    console.log(`[ai] session: ${sessionId} | category: ${session.category} | turns: ${conversationHistory.length}`);
    aiContent = await ai.generateResponse(
      session.system_prompt,
      conversationHistory,
      { category: session.category }
    );
  }

  // Save AI turn
  const aiTurn = await scenarioRepository.insertTurn(sessionId, nextIndex + 1, "assistant", aiContent);

  return {
    userTurn: {
      turnIndex: userTurn.turn_index,
      role: userTurn.role,
      content: userTurn.content,
      createdAt: userTurn.created_at,
    },
    aiTurn: {
      turnIndex: aiTurn.turn_index,
      role: aiTurn.role,
      content: aiTurn.content,
      createdAt: aiTurn.created_at,
    },
    ieltsState,
  };
}

// ---------------------------------------------------------------------------
// Placeholder detection — filter internal signals from scoring
// ---------------------------------------------------------------------------

const PLACEHOLDER_PATTERNS = [
  /^\[READY FOR PART [23]\]$/,
  /^\[PREP(ARATION)? (TIME )?COMPLETE/,
  /^\[Speaking completed\]$/,
  /^\[PREPARATION COMPLETE\]$/,
];

function isPlaceholderTurn(content) {
  return PLACEHOLDER_PATTERNS.some(p => p.test(content.trim()));
}

/**
 * Filter conversation history: remove placeholder turns that are internal
 * state-machine signals, not real candidate speech.
 */
function filterPlaceholders(turns) {
  return turns.filter(t => {
    if (t.role === "user" && isPlaceholderTurn(t.content)) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Hybrid scoring — strict IELTS-realistic
// ---------------------------------------------------------------------------

function computeHybridPenalties(turns) {
  // Only score real user turns (excluding placeholders)
  const userTurns = turns.filter(t => t.role === "user" && !isPlaceholderTurn(t.content));
  const totalWords = userTurns.reduce(
    (sum, t) => sum + t.content.trim().split(/\s+/).filter(Boolean).length, 0
  );
  const avgWords = userTurns.length > 0 ? totalWords / userTurns.length : 0;

  let penalty = 1.0;
  let floorScore = 0;

  if (avgWords < 3) {
    penalty = 0.35;
    floorScore = 0;
  } else if (avgWords < 6) {
    penalty = 0.55;
    floorScore = 0;
  } else if (avgWords < 10) {
    penalty = 0.75;
    floorScore = 20;
  } else if (avgWords < 20) {
    penalty = 0.90;
    floorScore = 30;
  }

  const copOuts = userTurns.filter(t => {
    const lower = t.content.toLowerCase();
    return lower.includes("i don't know") ||
           lower.includes("i have no idea") ||
           lower.includes("i can't answer") ||
           lower.includes("no comment") ||
           (lower.includes("pass") && t.content.trim().length < 10);
  });

  if (copOuts.length > userTurns.length * 0.5) {
    penalty = Math.min(penalty, 0.3);
  } else if (copOuts.length > 0) {
    penalty = Math.min(penalty, penalty * 0.7);
  }

  return { penalty, floorScore, avgWords, totalWords };
}

/**
 * Convert a 0-100 score to an IELTS band (1.0–9.0 in 0.5 increments).
 */
function toBandScore(score100) {
  // Map: 0→1, 20→3, 40→4.5, 60→6, 75→7, 85→7.5, 95→8.5, 100→9
  if (score100 >= 95) return 9.0;
  if (score100 >= 90) return 8.5;
  if (score100 >= 85) return 8.0;
  if (score100 >= 80) return 7.5;
  if (score100 >= 75) return 7.0;
  if (score100 >= 70) return 6.5;
  if (score100 >= 60) return 6.0;
  if (score100 >= 50) return 5.5;
  if (score100 >= 40) return 5.0;
  if (score100 >= 30) return 4.5;
  if (score100 >= 20) return 4.0;
  if (score100 >= 10) return 3.0;
  return 2.0;
}

async function endSession(sessionId, userId, durationMs) {
  const session = await scenarioRepository.findSessionById(sessionId);
  if (!session) {
    const err = new Error("Session not found");
    err.status = 404;
    throw err;
  }
  if (session.user_id !== userId) {
    const err = new Error("Not authorized to access this session");
    err.status = 403;
    throw err;
  }
  if (session.status !== "active") {
    const err = new Error("Session is no longer active");
    err.status = 400;
    throw err;
  }

  const turns = await scenarioRepository.findSessionTurns(sessionId);

  // Filter placeholder turns before scoring (keep in DB for audit trail)
  const filteredTurns = filterPlaceholders(turns);
  const conversationHistory = filteredTurns.map(t => ({ role: t.role, content: t.content }));

  // Log transition history for auditability
  const meta = await scenarioRepository.getSessionMeta(sessionId);
  if (meta?.transitionHistory) {
    console.log(`[ielts] Session ${sessionId} transition history:`);
    meta.transitionHistory.forEach(t => console.log(`  ${t}`));
  }

  const isIelts = session.category === "exam";
  console.log(`[ai] scoring session: ${sessionId} | turns: ${conversationHistory.length} (filtered from ${turns.length}) | isIelts: ${isIelts}`);

  // ── Audio Intelligence: Analyze speech flow across all user turns ──
  const realUserTurnsForAnalysis = filteredTurns
    .filter(t => t.role === "user" && !isPlaceholderTurn(t.content));

  const turnSpeechMetricsMap = new Map();
  if (meta?.turnSpeechMetrics) {
    for (const m of meta.turnSpeechMetrics) {
      turnSpeechMetricsMap.set(m.turnIndex, m);
    }
  }

  const turnsForAggregation = realUserTurnsForAnalysis.map(t => ({
    text: t.content,
    speechMetrics: turnSpeechMetricsMap.get(t.turn_index) || null,
  }));

  const speechFlow = aggregateSpeechFlow(turnsForAggregation);
  console.log(`[speech] session=${sessionId} | fillers=${speechFlow.totalFillerCount} | corrections=${speechFlow.totalSelfCorrections} | hesitation=${speechFlow.hesitationLevel} | fluencyEst=${speechFlow.fluencyEstimate}${speechFlow.avgWordsPerMinute ? ` | wpm=${speechFlow.avgWordsPerMinute}` : ""}`);

  // ── Examiner Brain: Part-tag conversation for scorer context ──
  let scoringHistory = conversationHistory;
  if (isIelts && meta) {
    scoringHistory = tagConversationParts(filteredTurns, meta);
  }

  const aiScores = await ai.scoreConversation(session.system_prompt, scoringHistory, {
    isIelts,
    speechFlow, // Pass speech analysis to scoring prompt
  });
  const { penalty, floorScore, avgWords, totalWords } = computeHybridPenalties(turns);

  // ── Audio Intelligence: Speech-aware fluency modifier ──
  // If speech analysis detected high hesitation, apply additional fluency penalty
  let speechFluencyModifier = 1.0;
  if (speechFlow.hesitationLevel === "high") {
    speechFluencyModifier = 0.85; // 15% penalty for high hesitation
  } else if (speechFlow.hesitationLevel === "medium") {
    speechFluencyModifier = 0.93; // 7% penalty for medium hesitation
  }

  const adjustedFluency = Math.max(floorScore, Math.round(aiScores.fluency * penalty * speechFluencyModifier));
  const adjustedVocab = Math.max(floorScore, Math.round(aiScores.vocabulary * penalty));
  const adjustedGrammar = Math.max(floorScore, Math.round(aiScores.grammar * penalty));
  const adjustedPronunciation = Math.max(floorScore, Math.round((aiScores.pronunciation || aiScores.fluency) * penalty));
  const adjustedOverall = Math.round((adjustedFluency + adjustedVocab + adjustedGrammar + adjustedPronunciation) / 4);

  console.log(`[scoring] AI: ${aiScores.overallScore} | penalty: ${penalty} | speechMod: ${speechFluencyModifier} | avgWords: ${avgWords.toFixed(1)} | adjusted: ${adjustedOverall}`);

  let coachFeedback = aiScores.coachFeedback;
  if (adjustedOverall < 30) {
    coachFeedback = "You need to provide longer, more detailed answers. In IELTS Speaking, one-word or very short responses will significantly lower your score. Try to speak in full sentences and expand on your ideas.";
  } else if (adjustedOverall < 50) {
    coachFeedback = "Your answers need more development. Try to give reasons and examples when you answer. Aim for at least 2-3 sentences per response in Part 1, and much longer responses in Parts 2 and 3.";
  }

  // Extract real user turns (excluding placeholders)
  const realUserTurns = turns.filter(t => t.role === "user" && !isPlaceholderTurn(t.content));
  const turnCount = realUserTurns.length;
  const wordCount = totalWords;

  // Band score conversion for IELTS
  const bandScore = isIelts ? toBandScore(adjustedOverall) : null;

  // Notable vocabulary from AI scoring
  const notableVocabulary = aiScores.notableVocabulary || [];
  const improvementVocabulary = aiScores.improvementVocabulary || [];
  const criteriaFeedback = aiScores.criteriaFeedback || null;

  await scenarioRepository.completeSession(sessionId, {
    overallScore: adjustedOverall,
    fluencyScore: adjustedFluency,
    vocabularyScore: adjustedVocab,
    grammarScore: adjustedGrammar,
    coachFeedback,
    turnCount,
    wordCount,
    durationMs: durationMs || 0,
  });

  // ── Audio Intelligence: Build speech insights for frontend ──
  const speechInsights = {
    hesitationLevel: speechFlow.hesitationLevel,
    fluencyEstimate: speechFlow.fluencyEstimate,
    fillerSummary: speechFlow.fillerSummary,
    totalFillerCount: speechFlow.totalFillerCount,
    totalSelfCorrections: speechFlow.totalSelfCorrections,
    avgWordsPerMinute: speechFlow.avgWordsPerMinute,
    avgSpeakingRatio: speechFlow.avgSpeakingRatio,
  };

  return {
    overallScore: adjustedOverall,
    fluency: adjustedFluency,
    vocabulary: adjustedVocab,
    grammar: adjustedGrammar,
    pronunciation: adjustedPronunciation,
    bandScore,
    criteriaFeedback,
    coachFeedback,
    turnFeedback: aiScores.turnFeedback,
    notableVocabulary,
    improvementVocabulary,
    speechInsights,
    turnCount,
    wordCount,
    durationMs: durationMs || 0,
  };
}

// ---------------------------------------------------------------------------
// Session queries
// ---------------------------------------------------------------------------

async function getSessionDetail(sessionId, userId) {
  const session = await scenarioRepository.findSessionById(sessionId);
  if (!session) {
    const err = new Error("Session not found");
    err.status = 404;
    throw err;
  }
  if (session.user_id !== userId) {
    const err = new Error("Not authorized to access this session");
    err.status = 403;
    throw err;
  }

  const turns = await scenarioRepository.findSessionTurns(sessionId);

  return {
    sessionId: session.id,
    scenarioId: session.scenario_id,
    title: session.title,
    emoji: session.emoji,
    category: session.category,
    status: session.status,
    overallScore: session.overall_score,
    fluencyScore: session.fluency_score,
    vocabularyScore: session.vocabulary_score,
    grammarScore: session.grammar_score,
    coachFeedback: session.feedback_summary,
    turnCount: session.total_turns,
    wordCount: session.total_user_words,
    durationMs: session.duration_ms,
    startedAt: session.started_at,
    completedAt: session.completed_at,
    turns: turns.map(t => ({
      turnIndex: t.turn_index,
      role: t.role,
      content: t.content,
      createdAt: t.created_at,
    })),
  };
}

async function getUserSessions(userId) {
  return scenarioRepository.findSessionsByUser(userId);
}

module.exports = {
  listScenarios,
  getScenario,
  startSession,
  submitTurn,
  endSession,
  getSessionDetail,
  getUserSessions,
};
