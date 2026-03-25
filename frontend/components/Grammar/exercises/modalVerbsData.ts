/**
 * modalVerbsData.ts
 *
 * Content for the Modal Verbs interactive lessons.
 * Covers: can/could, should, must/have to, may/might, will/would.
 * Exercise types: fill-blank, matching, scenario.
 */

import type { FillBlankExercise } from "./GrammarFillBlank";
import type { MatchingExercise } from "./GrammarMatching";
import type { ScenarioExercise } from "./GrammarScenario";

// ---------------------------------------------------------------------------
// Explanation panels (shown between exercises)
// ---------------------------------------------------------------------------

export interface ModalExplanation {
  id: string;
  title: string;
  modal: string;
  meaning: string;
  usage: string;
  example: string;
}

export const MODAL_EXPLANATIONS: ModalExplanation[] = [
  {
    id: "exp-can-could",
    title: "Can & Could",
    modal: "can / could",
    meaning: "Ability, possibility, or polite requests",
    usage: "Use \"can\" for present ability or informal requests. Use \"could\" for past ability, polite requests, or less certain possibilities.",
    example: "She can speak three languages. / Could you help me, please?",
  },
  {
    id: "exp-must-have-to",
    title: "Must & Have to",
    modal: "must / have to",
    meaning: "Obligation and necessity",
    usage: "Use \"must\" for strong personal obligation or rules. Use \"have to\" for external obligations. Both express something is necessary.",
    example: "You must wear a seatbelt. / I have to finish this report by Friday.",
  },
  {
    id: "exp-should",
    title: "Should",
    modal: "should",
    meaning: "Advice and recommendation",
    usage: "Use \"should\" to give advice, make recommendations, or say what is the right thing to do.",
    example: "You should drink more water. / He should apologize.",
  },
  {
    id: "exp-may-might",
    title: "May & Might",
    modal: "may / might",
    meaning: "Possibility and permission",
    usage: "Use \"may\" for formal permission or moderate possibility. Use \"might\" for lower possibility. Both express uncertainty about the future.",
    example: "It may rain tomorrow. / She might come to the party.",
  },
  {
    id: "exp-will-would",
    title: "Will & Would",
    modal: "will / would",
    meaning: "Future intention and polite/conditional",
    usage: "Use \"will\" for decisions, promises, and predictions. Use \"would\" for polite requests, hypothetical situations, or conditional outcomes.",
    example: "I will call you later. / Would you like some tea?",
  },
];

// ---------------------------------------------------------------------------
// Fill-blank exercises (Lesson 3: "Fill the Modal")
// ---------------------------------------------------------------------------

export const FILL_BLANK_EXERCISES: FillBlankExercise[] = [
  {
    id: "fb-1",
    sentence: "You look tired. You ___ get some rest tonight.",
    options: ["should", "must", "might", "can"],
    correctAnswer: "should",
    explanation: "\"Should\" gives friendly advice. \"Must\" would be too strong for casual advice to a friend.",
    category: "Advice",
    difficulty: "easy",
  },
  {
    id: "fb-2",
    sentence: "All employees ___ wear safety helmets in the construction zone.",
    options: ["must", "should", "might", "could"],
    correctAnswer: "must",
    explanation: "\"Must\" expresses a rule or strong obligation. Safety equipment is mandatory, not optional advice.",
    category: "Obligation",
    difficulty: "easy",
  },
  {
    id: "fb-3",
    sentence: "It's cloudy outside. It ___ rain later this afternoon.",
    options: ["might", "must", "should", "will"],
    correctAnswer: "might",
    explanation: "\"Might\" expresses uncertain possibility. We're not sure about the rain — it's just a chance based on the clouds.",
    category: "Possibility",
    difficulty: "easy",
  },
  {
    id: "fb-4",
    sentence: "Excuse me, ___ you tell me where the nearest station is?",
    options: ["could", "must", "should", "might"],
    correctAnswer: "could",
    explanation: "\"Could\" is used for polite requests. It's more formal and courteous than \"can\" when asking strangers for help.",
    category: "Polite request",
    difficulty: "medium",
  },
  {
    id: "fb-5",
    sentence: "I ___ swim when I was five years old.",
    options: ["could", "can", "might", "should"],
    correctAnswer: "could",
    explanation: "\"Could\" expresses past ability — something you were able to do before. \"Can\" is for present ability only.",
    category: "Past ability",
    difficulty: "medium",
  },
  {
    id: "fb-6",
    sentence: "___ you like some coffee, or do you prefer tea?",
    options: ["Would", "Should", "Must", "Can"],
    correctAnswer: "Would",
    explanation: "\"Would you like...?\" is the standard polite way to offer something. It's softer and more courteous than \"Do you want...?\"",
    category: "Polite offer",
    difficulty: "medium",
  },
];

// ---------------------------------------------------------------------------
// Matching exercises (Lesson 4: "Modal Mastery")
// ---------------------------------------------------------------------------

export const MATCHING_EXERCISES: MatchingExercise[] = [
  {
    id: "match-1",
    instruction: "Match each modal verb to its primary meaning.",
    pairs: [
      { left: "must", right: "obligation" },
      { left: "should", right: "advice" },
      { left: "might", right: "possibility" },
      { left: "can", right: "ability" },
      { left: "would", right: "polite offer" },
    ],
    explanation: "Modal verbs carry specific meanings: must = obligation, should = advice, might = possibility, can = ability, would = polite offer/request.",
    difficulty: "easy",
  },
  {
    id: "match-2",
    instruction: "Match each sentence to the correct modal meaning.",
    pairs: [
      { left: "You must stop at red lights.", right: "rule / law" },
      { left: "She could play piano at age 4.", right: "past ability" },
      { left: "It may be sunny tomorrow.", right: "uncertain possibility" },
      { left: "You should eat breakfast.", right: "recommendation" },
    ],
    explanation: "Context determines meaning: traffic laws = must (rule), childhood skill = could (past ability), weather guess = may (possibility), health tip = should (recommendation).",
    difficulty: "medium",
  },
];

// ---------------------------------------------------------------------------
// Scenario exercises (Lesson 4: "Modal Mastery")
// ---------------------------------------------------------------------------

export const SCENARIO_EXERCISES: ScenarioExercise[] = [
  {
    id: "sc-1",
    scenario: "Your friend tells you they have a terrible headache and can't concentrate on their work.",
    task: "Give them appropriate advice:",
    options: [
      "You must go to the hospital right now!",
      "You should take a break and drink some water.",
      "You might feel better tomorrow.",
      "You can ignore it, it will pass.",
    ],
    correctIndex: 1,
    explanation: "\"Should\" is perfect for friendly advice. \"Must\" is too dramatic for a headache. \"Might\" just states possibility without helping. \"Can ignore it\" dismisses the problem.",
    category: "Giving advice",
    difficulty: "easy",
  },
  {
    id: "sc-2",
    scenario: "You're at a restaurant and want to ask the waiter for the bill. You want to be polite.",
    task: "Choose the most appropriate request:",
    options: [
      "You must bring me the bill.",
      "Could I have the bill, please?",
      "I might need the bill.",
      "I should get the bill.",
    ],
    correctIndex: 1,
    explanation: "\"Could I have...?\" is the standard polite request form. \"Must\" is rude and commanding. \"Might\" sounds uncertain. \"Should\" doesn't make a request.",
    category: "Polite request",
    difficulty: "easy",
  },
  {
    id: "sc-3",
    scenario: "Your colleague is about to present confidential company data to an external visitor without permission.",
    task: "Express the appropriate level of urgency:",
    options: [
      "You should probably check with the manager.",
      "You might want to reconsider.",
      "You must not share that information without authorization!",
      "You could ask someone about it.",
    ],
    correctIndex: 2,
    explanation: "\"Must not\" expresses strong prohibition — this is a serious security issue, not a casual suggestion. \"Should\" and \"could\" are too weak for something that could have legal consequences.",
    category: "Prohibition",
    difficulty: "medium",
  },
  {
    id: "sc-4",
    scenario: "You're planning a weekend trip but the weather forecast shows a 30% chance of rain.",
    task: "Express the right level of certainty about the weather:",
    options: [
      "It will definitely rain this weekend.",
      "It must rain because the forecast says so.",
      "It might rain, so let's bring umbrellas just in case.",
      "It should rain on Saturday.",
    ],
    correctIndex: 2,
    explanation: "\"Might\" perfectly expresses the 30% uncertainty. \"Will\" and \"must\" are too certain. \"Should\" implies expectation rather than possibility.",
    category: "Expressing possibility",
    difficulty: "medium",
  },
];
