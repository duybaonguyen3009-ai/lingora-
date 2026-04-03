"use client";

/**
 * IeltsConversationV2.tsx
 *
 * EXPERIMENTAL — Upgraded IELTS Speaking exam simulation.
 *
 * Changes from V1:
 *  - Part 1: Time-based interruptions (25-35s per question)
 *  - Part 2: Realistic silence protocol (8s wait, no prompt)
 *  - Part 3: Pushback/challenge behavior via backend
 *  - Results: IeltsDiagnosticReport with band ranges, Vietnamese L1, retry comparison
 *  - Retry same topic: store previous attempt for comparison
 *
 * Architecture (same as V1):
 *  - Backend state machine controls Part 1/2/3 transitions
 *  - TTS auto-play → mic auto-start lifecycle
 *  - Voice-first with text fallback
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  startScenarioSession,
  submitScenarioTurnV2 as submitScenarioTurn,
  endScenarioSessionV2 as endScenarioSession,
  synthesizeSpeech,
} from "@/lib/api";
import { useAuthStore } from "@/lib/stores/authStore";
import type {
  Scenario,
  ConversationTurn,
  EndSessionResult,
  IeltsCueCard,
  IeltsDiagnosticData,
  CriterionDiagnostic,
  BandRange,
  FeedbackAccuracy,
} from "@/lib/types";
import IeltsDiagnosticReport from "./IeltsDiagnosticReport";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useSpeechTiming } from "@/hooks/useSpeechTiming";
import type { SpeechMetrics } from "@/hooks/useSpeechTiming";

// ─── V2: Diagnostic data builder ────────────────────────────────────────────

function toBandRange(score100: number): BandRange {
  // Convert 0-100 to IELTS band, then create a ±0.5 range
  const band = toBandScore(score100);
  const low = Math.max(1.0, band - 0.5);
  const high = Math.min(9.0, band);
  // Round to nearest 0.5
  return {
    low: Math.round(low * 2) / 2,
    high: Math.round(high * 2) / 2,
  };
}

function toBandScore(score100: number): number {
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

/** Vietnamese L1 patterns: detect from criteria feedback text */
function detectVietnameseL1Patterns(result: EndSessionResult) {
  const patterns: IeltsDiagnosticData["vietnameseL1"] = [];
  const pronFeedback = (result.criteriaFeedback?.pronunciation || "").toLowerCase();
  const allFeedback = [
    result.criteriaFeedback?.pronunciation || "",
    result.criteriaFeedback?.grammar || "",
    result.coachFeedback || "",
  ].join(" ").toLowerCase();

  // Detect final consonant deletion
  const finalConsonantWords: string[] = [];
  const improvWords = result.improvementVocabulary || [];
  // Look for words ending in common deleted consonants
  for (const w of improvWords) {
    if (/[tdszk]$/i.test(w)) finalConsonantWords.push(w);
  }
  if (
    finalConsonantWords.length > 0 ||
    pronFeedback.includes("final") ||
    pronFeedback.includes("consonant") ||
    allFeedback.includes("dropped") ||
    allFeedback.includes("missing end")
  ) {
    patterns.push({
      pattern: "final_consonant_deletion",
      label: "Final Consonant Deletion",
      words: finalConsonantWords.length > 0 ? finalConsonantWords : ["walked", "friends", "months"],
      suggestion:
        "Practice word-final /t/, /d/, /s/, /z/ sounds. Say each word 5 times, exaggerating the ending. This is the #1 pronunciation pattern for Vietnamese speakers.",
    });
  }

  // Detect flat intonation
  if (
    pronFeedback.includes("flat") ||
    pronFeedback.includes("monoton") ||
    pronFeedback.includes("intonation") ||
    allFeedback.includes("stress pattern")
  ) {
    patterns.push({
      pattern: "flat_intonation",
      label: "Flat Intonation Transfer",
      words: [],
      suggestion:
        "English uses pitch changes to emphasize key information. Practice rising pitch on new/important words and falling pitch at sentence end.",
    });
  }

  // Detect filler/hesitation patterns
  if (
    result.speechInsights &&
    result.speechInsights.totalFillerCount >= 5 &&
    result.speechInsights.fillerSummary.length > 0
  ) {
    patterns.push({
      pattern: "hesitation_fillers",
      label: "Extended Hesitation Patterns",
      words: result.speechInsights.fillerSummary.slice(0, 5),
      suggestion:
        "Replace long pauses with bridging phrases: \"Let me think...\", \"That's an interesting question...\", \"What I mean is...\" — these maintain your fluency score.",
    });
  }

  return patterns;
}

function buildDiagnosticData(
  result: EndSessionResult,
  previousAttempt: IeltsDiagnosticData["previousAttempt"] | null
): IeltsDiagnosticData {
  const criteria: CriterionDiagnostic[] = [
    {
      label: "Fluency & Coherence",
      bandRange: toBandRange(result.fluency),
      score100: result.fluency,
      justification: result.criteriaFeedback?.fluency || "Score based on overall speaking flow and idea development.",
      action: result.fluency < 60
        ? "Use discourse markers (\"However\", \"On the other hand\") to connect ideas and maintain flow."
        : "Maintain your current fluency level. Focus on reducing any remaining hesitations.",
      l1Tag: undefined,
    },
    {
      label: "Lexical Resource",
      bandRange: toBandRange(result.vocabulary),
      score100: result.vocabulary,
      justification: result.criteriaFeedback?.vocabulary || "Score based on vocabulary range and precision.",
      action: result.vocabulary < 60
        ? "Replace common words (\"good\", \"nice\", \"important\") with topic-specific vocabulary."
        : "Continue using varied vocabulary. Try incorporating more idiomatic expressions.",
    },
    {
      label: "Grammatical Range & Accuracy",
      bandRange: toBandRange(result.grammar),
      score100: result.grammar,
      justification: result.criteriaFeedback?.grammar || "Score based on sentence structure variety and accuracy.",
      action: result.grammar < 60
        ? "Practice using complex sentences with \"although\", \"if\", \"which\" to demonstrate range."
        : "Your grammar is solid. Focus on consistent tense marking in longer responses.",
    },
    {
      label: "Pronunciation",
      bandRange: toBandRange(result.pronunciation ?? result.fluency),
      score100: result.pronunciation ?? result.fluency,
      justification: result.criteriaFeedback?.pronunciation || "Score based on pronunciation clarity and natural rhythm.",
      action: "Focus on word-final consonant sounds — the highest-impact area for Vietnamese speakers.",
      l1Tag: undefined, // Set below if patterns detected
    },
  ];

  const vietnameseL1 = detectVietnameseL1Patterns(result);

  // Tag pronunciation criterion if L1 patterns found
  if (vietnameseL1.some((p) => p.pattern === "final_consonant_deletion")) {
    criteria[3].l1Tag = "final_consonant_deletion";
  }

  // Determine #1 priority
  const weakest = [...criteria].sort((a, b) => a.score100 - b.score100)[0];
  let topPriority = weakest.action;
  if (vietnameseL1.length > 0 && vietnameseL1[0].pattern === "final_consonant_deletion") {
    topPriority = vietnameseL1[0].suggestion;
  }

  const overallScore100 = Math.round(
    criteria.reduce((s, c) => s + c.score100, 0) / criteria.length
  );

  return {
    overallBandRange: toBandRange(overallScore100),
    overallScore100,
    criteria,
    topPriority,
    vietnameseL1,
    speechInsights: result.speechInsights || null,
    coachFeedback: result.coachFeedback,
    turnFeedback: result.turnFeedback,
    notableVocabulary: result.notableVocabulary || [],
    improvementVocabulary: result.improvementVocabulary || [],
    turnCount: result.turnCount,
    wordCount: result.wordCount,
    durationMs: result.durationMs,
    previousAttempt: previousAttempt || null,
  };
}

// ─── Constants ─────────────────────────────────────────────────────────────

type ExamPhase =
  | "entering"     // fade-in intro sequence
  | "identity"     // examiner greeting + name check (NOT scored)
  | "part1"        // interview questions
  | "part2_intro"  // "now let's move to part 2" transition
  | "part2_prep"   // cue card + 60s countdown
  | "part2_speak"  // 2-minute speaking window
  | "part3"        // discussion questions
  | "ending"       // scoring analysis
  | "summary"      // results
  | "error";

const PART1_QUESTIONS = 6; // 2 topic blocks × 3 questions
const PART3_QUESTIONS = 4;
const PREP_SECONDS = 60;
const SPEAK_SECONDS = 120;

// V2: Examiner greeting — warm, professional, IELTS-accurate
const EXAMINER_GREETING = "Good morning. My name is Sarah, and I'll be your examiner today. This speaking test has three parts. First, could you tell me your full name, please?";

// V2: After identity check, transition to Part 1
const EXAMINER_PART1_START = "Thank you. Now, in the first part, I'd like to ask you some questions about yourself.";

// Extended turn type with part metadata for grouped history
interface TaggedTurn extends ConversationTurn {
  examPart?: 1 | 2 | 3;
}

// Q&A pair grouped by part
interface GroupedQA {
  q: string;
  a: string;
  idx: number;
}
interface PartGroup {
  part: 1 | 2 | 3;
  label: string;
  pairs: GroupedQA[];
}

const SAFE_SCORES: EndSessionResult = {
  overallScore: 60,
  fluency: 60,
  vocabulary: 60,
  grammar: 60,
  pronunciation: 60,
  coachFeedback: "Good effort! Keep practicing to build your fluency.",
  turnFeedback: [],
  notableVocabulary: [],
  turnCount: 0,
  wordCount: 0,
  durationMs: 0,
};

// ─── Props ─────────────────────────────────────────────────────────────────

interface IeltsConversationV2Props {
  scenario: Scenario;
  onClose: () => void;
  onComplete?: () => void;
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function IeltsConversationV2({
  scenario,
  onClose,
  onComplete,
}: IeltsConversationV2Props) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => !!s.user);

  // ── Core state ──
  const [phase, setPhase] = useState<ExamPhase>("entering");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<TaggedTurn[]>([]);
  const [cueCard, setCueCard] = useState<IeltsCueCard | null>(null);
  const [userTurnCount, setUserTurnCount] = useState(0);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [examinerSpeaking, setExaminerSpeaking] = useState(false);
  const [scores, setScores] = useState<EndSessionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [part2Nudge, setPart2Nudge] = useState<string | null>(null);

  // V2: Diagnostic data + retry state
  const [diagnosticData, setDiagnosticData] = useState<IeltsDiagnosticData | null>(null);
  const [previousAttempt, setPreviousAttempt] = useState<IeltsDiagnosticData["previousAttempt"] | null>(null);
  const [retryingTopic, setRetryingTopic] = useState(false);
  const [savedCueCardIndex, setSavedCueCardIndex] = useState<number | undefined>(undefined);

  // V2: Part 1 interruption timer
  const part1SpeechStartRef = useRef<number | null>(null);
  const part1InterruptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const part1InterruptThreshold = useRef(25 + Math.random() * 10); // 25-35s, randomized per session

  // Part 2 timer
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Flag: true ONLY when timer counted down to 0 (not when it was never started)
  const [timerExpired, setTimerExpired] = useState(false);

  // Refs
  const startTimeRef = useRef(Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const micEnabledRef = useRef(true);

  // Speech timing tracker
  const speechTiming = useSpeechTiming();

  // Part 2 pause detection
  const [part2SilenceNudge, setPart2SilenceNudge] = useState<string | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consecutiveShortSegmentsRef = useRef(0);

  // Voice input — with timing hooks
  const voice = useVoiceInput(
    useCallback((transcript: string) => {
      // Track timing when transcript arrives
      speechTiming.onRecordingEnd(transcript);

      // Clear silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      // Track short segments for Part 2 fragmentation detection
      const words = transcript.trim().split(/\s+/).filter(Boolean).length;
      if (words < 5) {
        consecutiveShortSegmentsRef.current += 1;
      } else {
        consecutiveShortSegmentsRef.current = 0;
      }

      setInputText((prev) => (prev ? prev + " " + transcript : transcript));
    }, [speechTiming])
  );

  // ── Smart mic start: wraps voice.startRecording with timing tracking ──
  const startMicWithTiming = useCallback(() => {
    speechTiming.onRecordingStart();
    voice.startRecording();

    // Part 2 silence detection: if mic auto-stops and user doesn't restart within 4s
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  }, [voice, speechTiming]);

  // ── Part 2 silence detection: when voice auto-stops during speaking phase ──
  useEffect(() => {
    // Only active during Part 2 speaking, and only when NOT recording but timer is still going
    if (phase !== "part2_speak" || voice.isRecording || !timerActive || isProcessing) return;

    // V2: Realistic silence protocol — 8 seconds of silence, no nudge.
    // Real examiners don't prompt you. The silence is yours to fill.
    silenceTimerRef.current = setTimeout(() => {
      // After 8s silence, if before 1:40, auto-end Part 2 with "Thank you"
      if (timerSeconds > 20) {
        // Still have significant time left — just restart mic silently
        // No nudge text. The user feels the pressure of silence.
        if (voice.isSupported) {
          startMicWithTiming();
        }
      } else {
        // Near the end — let timer handle it
        if (voice.isSupported) {
          startMicWithTiming();
        }
      }
    }, 8000); // 8 seconds — doubled from V1's 4 seconds

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };
  }, [phase, voice.isRecording, timerActive, isProcessing, voice.isSupported, startMicWithTiming]);

  // ── V2: Part 1 interruption timer — auto-submit after 25-35s of speaking ──
  useEffect(() => {
    if (phase !== "part1" || !voice.isRecording || isProcessing || examinerSpeaking) {
      // Clear interruption timer if conditions change
      if (part1InterruptTimerRef.current) {
        clearTimeout(part1InterruptTimerRef.current);
        part1InterruptTimerRef.current = null;
      }
      part1SpeechStartRef.current = null;
      return;
    }

    // User started recording in Part 1 — set interruption timer
    if (part1SpeechStartRef.current === null) {
      part1SpeechStartRef.current = Date.now();
    }

    const thresholdMs = part1InterruptThreshold.current * 1000;
    const elapsed = Date.now() - part1SpeechStartRef.current;
    const remaining = Math.max(0, thresholdMs - elapsed);

    part1InterruptTimerRef.current = setTimeout(() => {
      // Time's up — auto-submit the current input as if examiner interrupted
      if (inputText.trim()) {
        handleSend();
      }
      part1SpeechStartRef.current = null;
      // Randomize next threshold for variety
      part1InterruptThreshold.current = 25 + Math.random() * 10;
    }, remaining);

    return () => {
      if (part1InterruptTimerRef.current) {
        clearTimeout(part1InterruptTimerRef.current);
        part1InterruptTimerRef.current = null;
      }
    };
  }, [phase, voice.isRecording, isProcessing, examinerSpeaking]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-scroll ──
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns, isProcessing, phase]);

  // ── Timer logic ──
  useEffect(() => {
    if (!timerActive || timerSeconds <= 0) return;
    timerRef.current = setInterval(() => {
      setTimerSeconds((s) => {
        if (s <= 1) {
          setTimerActive(false);
          setTimerExpired(true); // Signal that timer actually counted down to 0
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive, timerSeconds]);

  // ─── TTS Playback — EXCLUSIVE & SEQUENTIAL ──────────────────────────────
  // Only one audio can play at a time. playTTS resolves when audio FINISHES,
  // not when it starts. This prevents all overlap issues.

  const stopCurrentAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      stopCurrentAudio();
      if (timerRef.current) clearInterval(timerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (part1InterruptTimerRef.current) clearTimeout(part1InterruptTimerRef.current);
    };
  }, [stopCurrentAudio]);

  const playTTS = useCallback(async (text: string, autoMic = true): Promise<void> => {
    // CRITICAL: Stop any existing playback before starting new
    stopCurrentAudio();

    setExaminerSpeaking(true);
    micEnabledRef.current = false;

    const enableMicAfter = () => {
      setExaminerSpeaking(false);
      micEnabledRef.current = true;
      if (autoMic && voice.isSupported && !voice.isRecording) {
        setTimeout(() => startMicWithTiming(), 300);
      }
    };

    try {
      const blob = await synthesizeSpeech(text);
      if (blob && blob.size > 0) {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;

        // Return a promise that resolves when audio FINISHES playing
        await new Promise<void>((resolve) => {
          let resolved = false;
          const done = () => {
            if (resolved) return;
            resolved = true;
            URL.revokeObjectURL(url);
            if (audioRef.current === audio) audioRef.current = null;
            enableMicAfter();
            resolve();
          };

          audio.onended = done;
          audio.onerror = done;
          audio.play().catch(done);
        });
      } else {
        // No TTS available — brief pause then enable mic
        await new Promise<void>((r) => setTimeout(r, 600));
        enableMicAfter();
      }
    } catch {
      enableMicAfter();
    }
  }, [voice, startMicWithTiming, stopCurrentAudio]);

  // ─── Session Init ───────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!useAuthStore.getState().accessToken) {
        setErrorMsg("Please log in to start the exam.");
        setPhase("error");
        return;
      }

      try {
        // Entering sequence — 2s dramatic pause
        await new Promise((r) => setTimeout(r, 2000));
        if (cancelled) return;

        const result = await startScenarioSession(scenario.id);
        if (cancelled) return;

        // V2: Scripted greeting includes identity check — NOT scored
        const greetingTurn: TaggedTurn = {
          id: "greeting-0",
          turnIndex: -1,
          role: "assistant",
          content: EXAMINER_GREETING,
          audioStorageKey: null,
          scores: null,
          feedback: null,
          createdAt: new Date().toISOString(),
          // No examPart — this is pre-exam, not scored
        };

        setSessionId(result.sessionId);
        // Only show the greeting — backend's "What is your full name?" is absorbed into our greeting
        setTurns([greetingTurn]);

        // Store cue card from backend
        if (result.cueCard) {
          setCueCard(result.cueCard);
        }
        // V2: Save cue card index for retry-same-topic
        if (result.cueCardIndex != null) {
          setSavedCueCardIndex(result.cueCardIndex);
        }

        // Start in identity phase — NOT part1
        setPhase("identity");

        // Play the greeting (includes name request)
        if (!cancelled) {
          await playTTS(EXAMINER_GREETING, true); // auto-mic for name response
        }
      } catch (err: unknown) {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : "Failed to start session");
        setPhase("error");
      }
    }

    init();
    return () => { cancelled = true; };
  }, [scenario.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── End Session ────────────────────────────────────────────────────────

  const handleEndSession = useCallback(async (sid: string) => {
    setPhase("ending");
    try {
      const durationMs = Date.now() - startTimeRef.current;
      const [result] = await Promise.all([
        endScenarioSession(sid, durationMs),
        new Promise((r) => setTimeout(r, 3000)), // minimum 3s analysis feel
      ]);
      const endResult = result as EndSessionResult;
      setScores(endResult);

      // V2: Build diagnostic data with comparison to previous attempt
      const diag = buildDiagnosticData(endResult, previousAttempt);
      setDiagnosticData(diag);

      onComplete?.();
    } catch {
      setScores({ ...SAFE_SCORES });
      // V2: Still build diagnostic from safe scores
      const diag = buildDiagnosticData({ ...SAFE_SCORES }, previousAttempt);
      setDiagnosticData(diag);
    } finally {
      setPhase("summary");
    }
  }, [onComplete, previousAttempt]);

  // ─── Submit Turn ────────────────────────────────────────────────────────

  // ── Identity check handler — NOT scored, advances backend state ──
  const handleIdentitySubmit = useCallback(async () => {
    const name = inputText.trim();
    if (!sessionId || !name || isProcessing) return;

    if (voice.isRecording) voice.stopRecording();
    stopCurrentAudio();
    setExaminerSpeaking(false);

    setInputText("");
    setIsProcessing(true);

    // Show name as a non-scored display turn (no examPart = not scored)
    const nameTurn: TaggedTurn = {
      id: "identity-answer",
      turnIndex: -2,
      role: "user",
      content: name,
      audioStorageKey: null, scores: null, feedback: null,
      createdAt: new Date().toISOString(),
      // No examPart — identity check is NOT scored
    };
    setTurns((prev) => [...prev, nameTurn]);

    try {
      // Submit to backend to advance: opening → part1_transition
      const result = await submitScenarioTurn(sessionId, name);

      if (result.ieltsState?.phase === "part1_transition") {
        // Play our scripted Part 1 introduction
        const part1IntroTurn: TaggedTurn = {
          id: "part1-intro",
          turnIndex: -3,
          role: "assistant",
          content: EXAMINER_PART1_START,
          audioStorageKey: null, scores: null, feedback: null,
          createdAt: new Date().toISOString(),
          // No examPart — transition message
        };
        setTurns((prev) => [...prev, part1IntroTurn]);

        await playTTS(EXAMINER_PART1_START, false);
        await new Promise((r) => setTimeout(r, 800));

        // Now advance to first real Part 1 question
        setIsProcessing(false);
        const q1Result = await submitScenarioTurn(sessionId, "[READY FOR PART 1]");
        if (q1Result.ieltsState) {
          const q1Turn: TaggedTurn = {
            id: `ai-${q1Result.aiTurn.turnIndex}`,
            turnIndex: q1Result.aiTurn.turnIndex,
            role: "assistant",
            content: q1Result.aiTurn.content,
            audioStorageKey: null, scores: null, feedback: null,
            createdAt: q1Result.aiTurn.createdAt,
            examPart: 1,
          };
          setTurns((prev) => [...prev, q1Turn]);
          setPhase("part1");
          await new Promise((r) => setTimeout(r, 500));
          playTTS(q1Result.aiTurn.content, true);
        }
      }
    } catch (err) {
      console.error("[ielts-ui] handleIdentitySubmit error:", err);
    } finally {
      setIsProcessing(false);
    }
  }, [sessionId, inputText, isProcessing, voice, playTTS]);

  const handleSend = useCallback(async () => {
    const content = inputText.trim();
    if (!sessionId || !content || isProcessing) return;

    // Identity phase has its own handler
    if (phase === "identity") {
      handleIdentitySubmit();
      return;
    }

    // During Part 2 speaking, redirect to handlePart2End
    if (phase === "part2_speak") {
      handlePart2End();
      return;
    }

    // Stop recording + any current TTS
    if (voice.isRecording) voice.stopRecording();
    stopCurrentAudio();
    setExaminerSpeaking(false);

    // Finalize speech timing for this turn
    const metrics = speechTiming.finalizeTurn();

    setInputText("");
    setIsProcessing(true);

    // Optimistic user turn
    const tempId = `temp-${Date.now()}`;
    const turnPart = (currentPart as 1 | 2 | 3);
    const optimistic: TaggedTurn = {
      id: tempId,
      turnIndex: turns.length,
      role: "user",
      content,
      audioStorageKey: null,
      scores: null,
      feedback: null,
      createdAt: new Date().toISOString(),
      examPart: turnPart,
    };
    setTurns((prev) => [...prev, optimistic]);

    try {
      const result = await submitScenarioTurn(sessionId, content, metrics);

      const userTurn: TaggedTurn = {
        id: `user-${result.userTurn.turnIndex}`,
        turnIndex: result.userTurn.turnIndex,
        role: "user",
        content: result.userTurn.content,
        audioStorageKey: null,
        scores: null,
        feedback: null,
        createdAt: result.userTurn.createdAt,
        examPart: turnPart,
      };

      const aiTurn: TaggedTurn = {
        id: `ai-${result.aiTurn.turnIndex}`,
        turnIndex: result.aiTurn.turnIndex,
        role: "assistant",
        content: result.aiTurn.content,
        audioStorageKey: null,
        scores: null,
        feedback: null,
        createdAt: result.aiTurn.createdAt,
        examPart: turnPart,
      };

      // Replace optimistic + add AI turn
      setTurns((prev) => {
        const cleaned = prev.filter((t) => t.id !== tempId);
        return [...cleaned, userTurn, aiTurn];
      });

      const newUserCount = userTurnCount + 1;
      setUserTurnCount(newUserCount);

      // ── State machine transitions (driven by backend ieltsState) ──
      const state = result.ieltsState;

      if (state) {
        if (process.env.NODE_ENV === "development") console.log(`[ielts-ui] part=${state.part} phase=${state.phase} qIdx=${state.questionIndex}`);

        if (state.phase === "part1_transition") {
          // This should only happen if identity check path was skipped somehow
          // Normal flow handles this in handleIdentitySubmit
          await playTTS(result.aiTurn.content, false);
          await new Promise((r) => setTimeout(r, 1200));
          setIsProcessing(false);
          const q1Result = await submitScenarioTurn(sessionId, "[READY FOR PART 1]");
          if (q1Result.ieltsState) {
            const q1Turn: TaggedTurn = {
              id: `ai-${q1Result.aiTurn.turnIndex}`,
              turnIndex: q1Result.aiTurn.turnIndex,
              role: "assistant",
              content: q1Result.aiTurn.content,
              audioStorageKey: null, scores: null, feedback: null,
              createdAt: q1Result.aiTurn.createdAt,
              examPart: 1,
            };
            setTurns((prev) => [...prev, q1Turn]);
            setPhase("part1");
            await new Promise((r) => setTimeout(r, 500));
            playTTS(q1Result.aiTurn.content, true);
          }

        } else if (state.phase === "transition_to_part2") {
          // Transition to Part 2 — play the transition message
          setPhase("part2_intro");
          await playTTS(result.aiTurn.content, false);
          await new Promise((r) => setTimeout(r, 2000));
          // Auto-advance to cue_card
          setIsProcessing(false);
          const cueResult = await submitScenarioTurn(sessionId, "[READY FOR PART 2]");
          if (cueResult.ieltsState?.phase === "cue_card") {
            if (cueResult.ieltsState.cueCard) setCueCard(cueResult.ieltsState.cueCard);
            // Show the cue card UI first — BUT DO NOT start timer yet
            setPhase("part2_prep");
            // Play the cue card instruction FIRST ("Your topic is: ..."),
            // then play the prep instruction, THEN start the timer
            await new Promise((r) => setTimeout(r, 500));
            await playTTS(cueResult.aiTurn.content, false); // "Your topic is: ..."
            await new Promise((r) => setTimeout(r, 1000));
            // Now speak the prep time instruction
            const prepInstruction = "You have one minute to think about what you are going to say. You may make some notes if you wish. Your preparation time starts now.";
            await playTTS(prepInstruction, false);
            // ONLY NOW start the prep timer — after all instructions are spoken
            setTimerExpired(false);
            setTimerSeconds(PREP_SECONDS);
            setTimerActive(true);
          }

        } else if (state.phase === "cue_card") {
          // Show cue card — timer starts AFTER instruction TTS
          setPhase("part2_prep");
          await new Promise((r) => setTimeout(r, 500));
          await playTTS(result.aiTurn.content, false);
          await new Promise((r) => setTimeout(r, 1000));
          const prepInstruction = "You have one minute to prepare. Your preparation time starts now.";
          await playTTS(prepInstruction, false);
          setTimerExpired(false);
          setTimerSeconds(PREP_SECONDS);
          setTimerActive(true);

        } else if (state.phase === "long_turn") {
          // User's 2-minute speaking window — play announcement FIRST, then start timer
          setPhase("part2_speak");
          await new Promise((r) => setTimeout(r, 500));
          await playTTS(result.aiTurn.content, false);
          // ONLY start timer and mic after TTS finishes
          setTimerExpired(false);
          setTimerSeconds(SPEAK_SECONDS);
          setTimerActive(true);
          if (voice.isSupported && !voice.isRecording) {
            setTimeout(() => startMicWithTiming(), 300);
          }

        } else if (state.phase === "transition_to_part3") {
          // Hardcoded transition: "Okay, let's move on to Part 3."
          setPhase("part3");
          await playTTS(result.aiTurn.content, false);
          await new Promise((r) => setTimeout(r, 1500));
          // Auto-advance to first Part 3 question
          setIsProcessing(false);
          const p3Result = await submitScenarioTurn(sessionId, "[READY FOR PART 3]");
          if (p3Result.ieltsState) {
            const aiT: TaggedTurn = {
              id: `ai-${p3Result.aiTurn.turnIndex}`,
              turnIndex: p3Result.aiTurn.turnIndex,
              role: "assistant",
              content: p3Result.aiTurn.content,
              audioStorageKey: null, scores: null, feedback: null,
              createdAt: p3Result.aiTurn.createdAt,
              examPart: 3,
            };
            setTurns((prev) => [...prev, aiT]);
            await new Promise((r) => setTimeout(r, 500));
            playTTS(p3Result.aiTurn.content, true);
          }

        } else if (state.phase === "complete") {
          // Test complete
          await playTTS(result.aiTurn.content, false);
          await new Promise((r) => setTimeout(r, 1000));
          await handleEndSession(sessionId);

        } else {
          // Normal question (Part 1 or Part 3) — play TTS
          await new Promise((r) => setTimeout(r, 600));
          playTTS(result.aiTurn.content, true);
        }
      } else {
        // Non-IELTS scenario fallback
        await new Promise((r) => setTimeout(r, 600));
        playTTS(result.aiTurn.content, true);
      }
    } catch (err) {
      console.error("[ielts-ui] handleSend error:", err);
      setTurns((prev) => prev.filter((t) => t.id !== tempId));
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  }, [sessionId, inputText, isProcessing, turns, userTurnCount, voice, playTTS, handleEndSession, speechTiming, phase, handleIdentitySubmit, stopCurrentAudio]);

  // ── Key handler ──
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Timer expiry handlers are defined after handlePrepSkip and handlePart2End below

  const part2EndByTimerRef = useRef(false);
  const handlePart2End = useCallback(async () => {
    if (!sessionId || isProcessing) return;

    if (voice.isRecording) voice.stopRecording();

    const content = inputText.trim() || "[Speaking completed]";
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const speakingDurationMs = speechTiming.getCurrentSpeakingDurationMs();

    // Enforce minimum speaking: word count AND duration check
    const isTimerExpiry = part2EndByTimerRef.current;
    part2EndByTimerRef.current = false;

    if (!isTimerExpiry && content !== "[Speaking completed]") {
      const tooFewWords = wordCount < 30;
      const tooShortDuration = speakingDurationMs < 30000; // < 30 seconds of actual speaking

      if (tooFewWords || tooShortDuration) {
        const reason = tooFewWords && tooShortDuration
          ? "You still have time. In the real IELTS test, you should speak for at least one minute. Try to continue."
          : tooShortDuration
          ? "You've been speaking for less than 30 seconds. Try to develop your ideas more."
          : "You still have time. Try to expand on your points.";
        setPart2Nudge(reason);
        if (voice.isSupported) {
          setTimeout(() => startMicWithTiming(), 300);
        }
        return;
      }
    }

    // Finalize speech timing for Part 2
    const metrics = speechTiming.finalizeTurn();
    consecutiveShortSegmentsRef.current = 0;

    setPart2Nudge(null);
    setPart2SilenceNudge(null);
    setTimerActive(false);
    setInputText("");
    setIsProcessing(true);

    try {
      const result = await submitScenarioTurn(sessionId, content, metrics);

      const userTurn: TaggedTurn = {
        id: `user-${result.userTurn.turnIndex}`,
        turnIndex: result.userTurn.turnIndex,
        role: "user",
        content: result.userTurn.content,
        audioStorageKey: null,
        scores: null,
        feedback: null,
        createdAt: result.userTurn.createdAt,
        examPart: 2,
      };
      const aiTurn: TaggedTurn = {
        id: `ai-${result.aiTurn.turnIndex}`,
        turnIndex: result.aiTurn.turnIndex,
        role: "assistant",
        content: result.aiTurn.content,
        audioStorageKey: null,
        scores: null,
        feedback: null,
        createdAt: result.aiTurn.createdAt,
        examPart: 2,
      };

      setTurns((prev) => [...prev, userTurn, aiTurn]);
      setUserTurnCount((c) => c + 1);

      // Check the IELTS state from the response
      const state = result.ieltsState;
      if (state) {
        if (process.env.NODE_ENV === "development") console.log(`[ielts-ui] handlePart2End: part=${state.part} phase=${state.phase}`);
        if (state.phase === "long_turn") {
          // Backend was still at cue_card when we submitted — re-submit to advance
          setIsProcessing(false);
          const retry = await submitScenarioTurn(sessionId, "[Speaking completed]");
          if (retry.ieltsState?.phase === "transition_to_part3") {
            // Direct to Part 3 (no follow-up)
            setPhase("part3");
            setTimerActive(false);
            setTimerSeconds(0);
            await playTTS(retry.aiTurn.content, false);
            await new Promise((r) => setTimeout(r, 1500));
            setIsProcessing(false);
            const p3Result = await submitScenarioTurn(sessionId, "[READY FOR PART 3]");
            if (p3Result.ieltsState) {
              const p3Turn: TaggedTurn = {
                id: `ai-${p3Result.aiTurn.turnIndex}`,
                turnIndex: p3Result.aiTurn.turnIndex,
                role: "assistant", content: p3Result.aiTurn.content,
                audioStorageKey: null, scores: null, feedback: null,
                createdAt: p3Result.aiTurn.createdAt,
                examPart: 3,
              };
              setTurns((prev) => [...prev, p3Turn]);
              await new Promise((r) => setTimeout(r, 500));
              playTTS(p3Result.aiTurn.content, true);
            }
          }
        } else if (state.phase === "transition_to_part3") {
          setPhase("part3");
          await playTTS(result.aiTurn.content, false);
          await new Promise((r) => setTimeout(r, 2000));
          setIsProcessing(false);
          const p3Result = await submitScenarioTurn(sessionId, "[READY FOR PART 3]");
          if (p3Result.ieltsState) {
            const p3Turn: TaggedTurn = {
              id: `ai-${p3Result.aiTurn.turnIndex}`,
              turnIndex: p3Result.aiTurn.turnIndex,
              role: "assistant",
              content: p3Result.aiTurn.content,
              audioStorageKey: null, scores: null, feedback: null,
              createdAt: p3Result.aiTurn.createdAt,
              examPart: 3,
            };
            setTurns((prev) => [...prev, p3Turn]);
            await new Promise((r) => setTimeout(r, 500));
            playTTS(p3Result.aiTurn.content, true);
          }
        }
      } else {
        // Fallback: play the follow-up question
        await new Promise((r) => setTimeout(r, 800));
        playTTS(result.aiTurn.content, true);
      }
    } catch (err) { console.error("[ielts-ui] handlePart2End error:", err); } finally {
      setIsProcessing(false);
    }
  }, [sessionId, isProcessing, inputText, voice, playTTS, speechTiming, startMicWithTiming]);

  const prepSkipFiredRef = useRef(false);
  const handlePrepSkip = useCallback(async () => {
    if (!sessionId || prepSkipFiredRef.current) return;
    prepSkipFiredRef.current = true;
    setTimerActive(false);

    // Advance backend from cue_card → long_turn
    try {
      const result = await submitScenarioTurn(sessionId, "[PREP TIME COMPLETE — I AM READY TO SPEAK]");

      // Add the examiner's announcement as a turn so it appears in transcript
      if (result.aiTurn) {
        const announceTurn: TaggedTurn = {
          id: `ai-${result.aiTurn.turnIndex}`,
          turnIndex: result.aiTurn.turnIndex,
          role: "assistant",
          content: result.aiTurn.content,
          audioStorageKey: null,
          scores: null,
          feedback: null,
          createdAt: result.aiTurn.createdAt,
          examPart: 2,
        };
        setTurns((prev) => [...prev, announceTurn]);

        // Play TTS announcement: "Your preparation time is over. Please begin speaking now."
        // autoMic = false — we start mic manually after TTS finishes
        await playTTS(result.aiTurn.content, false);
      }
    } catch (err) {
      console.error("[ielts-ui] handlePrepSkip advance error:", err);
    }

    // NOW transition to speaking phase
    setPhase("part2_speak");
    setTimerExpired(false);
    setTimerSeconds(SPEAK_SECONDS);
    setTimerActive(true);

    // Start mic with timing after a brief pause (TTS has already finished via await)
    if (voice.isSupported) {
      setTimeout(() => startMicWithTiming(), 300);
    }
  }, [sessionId, voice, playTTS, startMicWithTiming]);

  // ── Timer expiry handlers ──
  // CRITICAL: Use timerExpired flag, NOT timerSeconds === 0.
  // timerSeconds starts at 0 before the timer is set, so checking === 0
  // would fire immediately when phase changes — skipping the entire prep.
  useEffect(() => {
    if (!timerExpired) return;
    if (phase === "part2_prep") {
      setTimerExpired(false);
      handlePrepSkip();
    } else if (phase === "part2_speak") {
      setTimerExpired(false);
      part2EndByTimerRef.current = true;
      handlePart2End();
    } else {
      setTimerExpired(false);
    }
  }, [timerExpired, phase, handlePrepSkip]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ──
  const currentPart = (phase === "identity" || phase === "part1") ? 1 : (phase.startsWith("part2") ? 2 : 3);
  const latestExaminerMsg = [...turns].reverse().find((t) => t.role === "assistant");
  const latestUserMsg = [...turns].reverse().find((t) => t.role === "user");

  // Q&A pairs for transcript (flat for compatibility)
  const qaPairs: Array<{ q: string; a: string; idx: number }> = [];
  for (let i = 0; i < turns.length - 1; i++) {
    if (turns[i].role === "assistant" && turns[i + 1]?.role === "user") {
      qaPairs.push({ q: turns[i].content, a: turns[i + 1].content, idx: qaPairs.length + 1 });
      i++;
    }
  }

  // V2: Grouped Q&A pairs by IELTS part for structured history panel
  const partGroups: PartGroup[] = (() => {
    const groups: Map<number, GroupedQA[]> = new Map();
    let pairIdx = 0;
    // IDs that are NOT exam content (greeting, identity check, transitions)
    const nonScoredIds = new Set(["greeting-0", "greeting-retry", "identity-answer", "part1-intro"]);
    for (let i = 0; i < turns.length - 1; i++) {
      const t = turns[i];
      const next = turns[i + 1];
      if (t.role === "assistant" && next?.role === "user") {
        // Skip all non-scored turns (greeting, identity, transitions)
        if (nonScoredIds.has(t.id) || nonScoredIds.has(next.id)) { continue; }
        // Skip transition messages that don't have an examPart
        if (!(t as TaggedTurn).examPart) { continue; }
        if (t.content.startsWith("Let's begin with Part") || t.content.startsWith("Now I'm going to give") || t.content.startsWith("We've been talking") || t.content.startsWith("Thank you. Now, in the first")) { continue; }
        const part = (t as TaggedTurn).examPart || 1;
        if (!groups.has(part)) groups.set(part, []);
        pairIdx++;
        groups.get(part)!.push({ q: t.content, a: next.content, idx: pairIdx });
        i++;
      }
    }
    const result: PartGroup[] = [];
    if (groups.has(1) && groups.get(1)!.length > 0) result.push({ part: 1, label: "Part 1 — Interview", pairs: groups.get(1)! });
    if (groups.has(2) && groups.get(2)!.length > 0) result.push({ part: 2, label: "Part 2 — Long Turn", pairs: groups.get(2)! });
    if (groups.has(3) && groups.get(3)!.length > 0) result.push({ part: 3, label: "Part 3 — Discussion", pairs: groups.get(3)! });
    return result;
  })();

  // Timer format
  const timerMin = Math.floor(timerSeconds / 60);
  const timerSec = timerSeconds % 60;
  const timerDisplay = `${timerMin}:${timerSec.toString().padStart(2, "0")}`;
  const timerUrgent = timerSeconds <= 10 && timerSeconds > 0;

  // ─── Render ──────────────────────────────────────────────────────────────

  // V2: Retry same topic handler — store current scores as previous, restart session
  const handleRetrySameTopic = useCallback(() => {
    if (diagnosticData) {
      // Store current scores for comparison
      setPreviousAttempt({
        overallBandRange: diagnosticData.overallBandRange,
        criteria: diagnosticData.criteria.map((c) => ({
          label: c.label,
          bandRange: c.bandRange,
          score100: c.score100,
        })),
      });
    }
    // Reset state for retry
    setPhase("entering");
    setSessionId(null);
    setTurns([]);
    setCueCard(null);
    setUserTurnCount(0);
    setInputText("");
    setIsProcessing(false);
    setExaminerSpeaking(false);
    setScores(null);
    setDiagnosticData(null);
    setErrorMsg(null);
    setPart2Nudge(null);
    setTimerSeconds(0);
    setTimerActive(false);
    setTimerExpired(false);
    startTimeRef.current = Date.now();
    setRetryingTopic(true);
    // The useEffect on scenario.id won't re-fire since scenario hasn't changed,
    // so we trigger init manually by toggling retryingTopic
  }, [diagnosticData]);

  // V2: New topic handler — close and reopen (parent handles new scenario selection)
  const handleNewTopic = useCallback(() => {
    setPreviousAttempt(null);
    setRetryingTopic(false);
    onClose();
  }, [onClose]);

  // V2: Re-init when retrying same topic
  useEffect(() => {
    if (!retryingTopic) return;
    setRetryingTopic(false);

    let cancelled = false;
    async function retryInit() {
      if (!useAuthStore.getState().accessToken) {
        setErrorMsg("Please log in to start the exam.");
        setPhase("error");
        return;
      }
      try {
        await new Promise((r) => setTimeout(r, 2000));
        if (cancelled) return;

        // V2: Pass saved cue card index to reuse exact same Part 2 topic
        const result = await startScenarioSession(scenario.id, {
          cueCardIndex: savedCueCardIndex,
        });
        if (cancelled) return;

        const greetingTurn: TaggedTurn = {
          id: "greeting-retry",
          turnIndex: -1,
          role: "assistant",
          content: EXAMINER_GREETING,
          audioStorageKey: null,
          scores: null,
          feedback: null,
          createdAt: new Date().toISOString(),
          // No examPart — pre-exam greeting
        };

        setSessionId(result.sessionId);
        setTurns([greetingTurn]);
        if (result.cueCard) setCueCard(result.cueCard);
        setPhase("identity");

        if (!cancelled) {
          await playTTS(EXAMINER_GREETING, true);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : "Failed to start session");
        setPhase("error");
      }
    }
    retryInit();
    return () => { cancelled = true; };
  }, [retryingTopic]); // eslint-disable-line react-hooks/exhaustive-deps

  // V2: Accuracy feedback handler
  const handleAccuracyFeedback = useCallback((accuracy: FeedbackAccuracy) => {
    // Store in localStorage for now — can be sent to backend later
    const key = `ielts_accuracy_${sessionId}`;
    try {
      localStorage.setItem(key, JSON.stringify({ accuracy, timestamp: Date.now() }));
    } catch { /* localStorage might be full — ignore */ }
    if (process.env.NODE_ENV === "development") console.log(`[ielts-v2] Accuracy feedback: ${accuracy} for session ${sessionId}`);
  }, [sessionId]);

  if (phase === "summary" && diagnosticData) {
    return (
      <IeltsDiagnosticReport
        diagnostic={diagnosticData}
        onRetrySameTopic={handleRetrySameTopic}
        onNewTopic={handleNewTopic}
        onClose={onClose}
        onAccuracyFeedback={handleAccuracyFeedback}
      />
    );
  }

  const showInput = phase === "identity" || phase === "part1" || phase === "part2_speak" || phase === "part3";

  // V2: Grouped history sidebar component
  const HistorySidebar = () => {
    if (partGroups.length === 0) return null;
    return (
      <div className="ielts-history-sidebar">
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] mb-4" style={{ color: 'var(--ielts-text-faint)' }}>
          Session Transcript
        </div>
        {partGroups.map((group) => (
          <div key={group.part} className="mb-5 last:mb-0">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                group.part <= currentPart ? "ielts-part-done" : "ielts-part-future"
              }`}>
                {group.part < currentPart ? "\u2713" : group.part}
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ielts-text-secondary)' }}>
                {group.label}
              </span>
            </div>
            <div className="flex flex-col gap-2.5 pl-7">
              {group.pairs.map((pair) => (
                <div key={pair.idx} className="ielts-history-item">
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--ielts-text-muted)' }}>
                    {pair.q}
                  </p>
                  <p className="text-[12px] leading-relaxed mt-1" style={{ color: 'var(--ielts-text-secondary)' }}>
                    {pair.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col ielts-exam-bg">
      {/* ── Top Bar ── */}
      <div className="shrink-0 ielts-header">
        <div className="flex items-center gap-3 px-4 py-3 max-w-[1400px] mx-auto w-full">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center ielts-btn-ghost"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <div className="font-sora font-bold text-[14px]" style={{ color: 'var(--ielts-text)' }}>
              IELTS Speaking Test
            </div>
            <div className="text-[11px]" style={{ color: 'var(--ielts-text-secondary)' }}>
              {phase === "identity" ? "Identity Check" :
               phase === "part1" ? "Part 1 \u2014 Interview" :
               phase.startsWith("part2") ? "Part 2 \u2014 Long Turn" :
               phase === "part3" ? "Part 3 \u2014 Discussion" :
               ""}
            </div>
          </div>

          {/* Part indicator pills */}
          {(phase === "identity" || phase === "part1" || phase.startsWith("part2") || phase === "part3") && (
            <div className="flex gap-1">
              {[1, 2, 3].map((p) => (
                <div
                  key={p}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition duration-500 ${
                    p === currentPart ? "ielts-part-active" :
                    p < currentPart ? "ielts-part-done" :
                    "ielts-part-future"
                  }`}
                >
                  {p < currentPart ? "\u2713" : p}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">

        {/* ═══ ENTERING — Full viewport centered ═══ */}
        {phase === "entering" && (
          <div className="min-h-full flex flex-col items-center justify-center gap-8 px-4 animate-fadeIn">
            <div className="ielts-orb ielts-orb-breathing">
              <div className="ielts-orb-inner">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <rect x="4" y="12" width="3" height="8" rx="1.5" fill="white" opacity="0.6"/>
                  <rect x="9.5" y="8" width="3" height="16" rx="1.5" fill="white" opacity="0.8"/>
                  <rect x="15" y="4" width="3" height="24" rx="1.5" fill="white"/>
                  <rect x="20.5" y="8" width="3" height="16" rx="1.5" fill="white" opacity="0.8"/>
                  <rect x="26" y="12" width="3" height="8" rx="1.5" fill="white" opacity="0.6"/>
                </svg>
              </div>
            </div>
            <div className="text-center">
              <p className="font-sora font-bold text-[20px]" style={{ color: 'var(--ielts-text)' }}>Entering exam room</p>
              <p className="text-[14px] mt-3 max-w-[280px] mx-auto leading-relaxed" style={{ color: 'var(--ielts-text-muted)' }}>Your examiner is preparing. The test will begin shortly.</p>
            </div>
            <div className="flex gap-2">
              {[0, 200, 400].map((d) => (
                <span key={d} className="ielts-dot" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}

        {/* ═══ ERROR — Full viewport centered ═══ */}
        {phase === "error" && (
          <div className="min-h-full flex flex-col items-center justify-center gap-5 px-4">
            <div className="text-[40px]">{!isAuthenticated ? "🔒" : "⚠️"}</div>
            <p className="text-[16px] font-medium text-center" style={{ color: 'var(--ielts-text-secondary)' }}>{errorMsg || "Something went wrong"}</p>
            <div className="flex gap-3">
              {!isAuthenticated && (
                <button onClick={() => router.push("/login")} className="ielts-btn-primary px-6 py-2.5 rounded-xl text-[14px] font-semibold">Sign In</button>
              )}
              <button onClick={onClose} className="underline text-[14px]" style={{ color: 'var(--ielts-text-secondary)' }}>Go back</button>
            </div>
          </div>
        )}

        {/* ═══ ENDING / ANALYSING — Full viewport centered ═══ */}
        {phase === "ending" && (
          <div className="min-h-full flex flex-col items-center justify-center gap-8 px-4 animate-fadeIn">
            <div className="ielts-orb ielts-orb-analyzing">
              <div className="ielts-orb-inner">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              </div>
            </div>
            <div className="text-center">
              <p className="font-sora font-bold text-[18px]" style={{ color: 'var(--ielts-text)' }}>Analysing your performance</p>
              <p className="text-[13px] mt-2 max-w-[260px] mx-auto" style={{ color: 'var(--ielts-text-muted)' }}>Evaluating fluency, vocabulary, grammar, and pronunciation...</p>
            </div>
            <div className="w-52 flex flex-col gap-3 mt-2">
              {["Fluency", "Vocabulary", "Grammar", "Pronunciation"].map((label, i) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-[10px] w-20 text-right uppercase tracking-wider" style={{ color: 'var(--ielts-text-muted)' }}>{label}</span>
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--ielts-score-track)' }}>
                    <div className="ielts-score-loading" style={{ animationDelay: `${i * 0.2}s` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Two-column layout for interactive phases ── */}
        <div className="max-w-[1400px] mx-auto px-4 py-6 flex gap-6 lg:gap-8">
          {/* Desktop sidebar */}
          {(phase === "identity" || phase === "part1" || phase.startsWith("part2") || phase === "part3") && partGroups.length > 0 && (
            <div className="hidden lg:block lg:w-[320px] xl:w-[360px] shrink-0">
              <div className="sticky top-6"><HistorySidebar /></div>
            </div>
          )}

          {/* Main conversation area */}
          <div className="flex-1 min-w-0 max-w-2xl mx-auto lg:mx-0 flex flex-col gap-5">

          {/* ═══ PART 2 INTRO ═══ */}
          {phase === "part2_intro" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 py-20 animate-fadeIn">
              <div className="ielts-orb ielts-orb-speaking">
                <div className="ielts-orb-inner">
                  <span className="text-[20px] font-bold" style={{ color: 'var(--ielts-text)' }}>2</span>
                </div>
              </div>
              <p className="font-sora font-bold text-[18px] text-center" style={{ color: 'var(--ielts-text)' }}>
                Moving to Part 2
              </p>
              <p className="text-[13px] text-center max-w-[260px]" style={{ color: 'var(--ielts-text-muted)' }}>
                You will receive a task card. You have 1 minute to prepare.
              </p>
            </div>
          )}

          {/* ═══ PART 2 PREP ═══ */}
          {phase === "part2_prep" && cueCard && (
            <div className="flex flex-col gap-5 animate-fadeIn">
              {/* Cue Card — official exam look */}
              <div className="ielts-cue-card">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-indigo-300">
                    Task Card
                  </span>
                </div>
                <p className="text-[18px] font-semibold leading-snug mb-4" style={{ color: 'var(--ielts-text)' }}>
                  {cueCard.topic}
                </p>
                <p className="text-[11px] font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--ielts-text-muted)' }}>
                  You should say:
                </p>
                <ul className="flex flex-col gap-2.5">
                  {cueCard.prompts.map((prompt, i) => (
                    <li key={i} className="flex gap-3 items-start">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5 bg-indigo-500/20 text-indigo-300">
                        {i + 1}
                      </span>
                      <span className="text-[14px] leading-relaxed" style={{ color: 'var(--ielts-text-secondary)' }}>{prompt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Timer + controls */}
              <div className="flex flex-col items-center gap-5">
                <div className={`ielts-timer ${timerUrgent ? "ielts-timer-urgent" : ""}`}>
                  <span className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--ielts-text-muted)' }}>Preparation time</span>
                  <span className="font-mono text-[36px] font-bold" style={{ color: 'var(--ielts-text)' }}>{timerDisplay}</span>
                </div>

                {/* Heartbeat pulse when timer is low */}
                {timerUrgent && (
                  <div className="ielts-heartbeat" />
                )}

                <button
                  onClick={handlePrepSkip}
                  className="ielts-btn-primary px-8 py-3 rounded-xl text-[14px] font-semibold"
                >
                  I&apos;m Ready — Start Speaking
                </button>
              </div>
            </div>
          )}

          {/* ═══ PART 2 SPEAKING ═══ */}
          {phase === "part2_speak" && cueCard && (
            <div className="flex flex-col gap-5 animate-fadeIn">
              {/* Compact cue card reminder */}
              <div className="ielts-cue-card-mini">
                <span className="text-[10px] uppercase tracking-wider text-indigo-300 font-bold">Topic:</span>
                <span className="text-[13px] ml-2" style={{ color: 'var(--ielts-text-secondary)' }}>{cueCard.topic}</span>
              </div>

              {/* Timer */}
              <div className="flex flex-col items-center gap-5">
                <div className={`ielts-timer ${timerUrgent ? "ielts-timer-urgent" : ""}`}>
                  <span className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--ielts-text-muted)' }}>Speaking time</span>
                  <span className="font-mono text-[36px] font-bold" style={{ color: 'var(--ielts-text)' }}>{timerDisplay}</span>
                </div>

                {/* Central mic orb */}
                <div className="relative">
                  {voice.isRecording && (
                    <div className="absolute -inset-4 rounded-full ielts-mic-pulse" />
                  )}
                  <button
                    onClick={voice.isRecording ? voice.stopRecording : voice.startRecording}
                    disabled={isProcessing || !voice.isSupported}
                    className={`ielts-mic-btn ${voice.isRecording ? "ielts-mic-active" : ""}`}
                  >
                    {voice.isRecording ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                    ) : (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                        <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                      </svg>
                    )}
                  </button>
                </div>

                {/* Live transcript */}
                {voice.isRecording && voice.interimTranscript && (
                  <div className="ielts-live-transcript">
                    {voice.interimTranscript}
                  </div>
                )}

                {/* V2: No silence nudge — realistic examiner silence protocol.
                    The absence of UI feedback IS the feature. */}

                {/* Nudge message when user tries to end too early */}
                {part2Nudge && (
                  <div className="px-4 py-2.5 rounded-xl text-[13px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 text-center max-w-[300px] animate-fadeIn">
                    {part2Nudge}
                  </div>
                )}

                <button
                  onClick={handlePart2End}
                  disabled={isProcessing}
                  className="ielts-btn-ghost px-6 py-2 rounded-xl text-[13px]"
                >
                  Finish Speaking
                </button>
              </div>
            </div>
          )}

          {/* ═══ IDENTITY, PART 1 & 3: Q&A Interface ═══ */}
          {(phase === "identity" || phase === "part1" || phase === "part3") && (
            <div className="flex flex-col gap-4">
              {/* Mobile-only: Grouped history (desktop uses sidebar) */}
              {qaPairs.length > 1 && (
                <div className="ielts-transcript lg:hidden">
                  {partGroups.map((group) => (
                    <div key={group.part} className="mb-4 last:mb-0">
                      <div className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2" style={{ color: 'var(--ielts-text-faint)' }}>
                        {group.label}
                      </div>
                      {group.pairs.map((pair) => (
                        <div key={pair.idx} className="mb-2.5 last:mb-0 pl-3 border-l-2" style={{ borderColor: 'var(--ielts-text-faint)' }}>
                          <p className="text-[11px] mb-0.5" style={{ color: 'var(--ielts-text-muted)' }}>{pair.q}</p>
                          <p className="text-[12px]" style={{ color: 'var(--ielts-text-secondary)' }}>{pair.a}</p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Current examiner question */}
              {latestExaminerMsg && !isProcessing && (
                <div className="ielts-question-block animate-questionIn">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`ielts-examiner-avatar ${examinerSpeaking ? "ielts-examiner-speaking" : ""}`}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-300">Examiner</span>
                      {examinerSpeaking && (
                        <span className="ml-2 text-[9px] text-indigo-400 animate-pulse">Speaking...</span>
                      )}
                    </div>
                  </div>
                  <p className="text-[17px] font-medium leading-relaxed" style={{ color: 'var(--ielts-text)' }}>
                    {latestExaminerMsg.content}
                  </p>
                </div>
              )}

              {/* Examiner thinking */}
              {isProcessing && (
                <div className="ielts-question-block animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <div className="ielts-examiner-avatar ielts-examiner-speaking">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                    <div className="flex gap-1.5">
                      {[0, 200, 400].map((d) => (
                        <span key={d} className="ielts-dot" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Last user answer */}
              {latestUserMsg && qaPairs.length > 0 && (
                <div className="ielts-user-answer animate-answerIn">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/60">Your answer</span>
                  <p className="text-[14px] mt-1" style={{ color: 'var(--ielts-answer-text)' }}>{latestUserMsg.content}</p>
                </div>
              )}
            </div>
          )}

          </div>{/* end main conversation area */}
        </div>{/* end flex row */}
      </div>

      {/* ── Input Area ── */}
      {showInput && (
        <div className="shrink-0 ielts-input-bar">
          <div className="max-w-2xl mx-auto px-4 py-3">
            {/* Voice recording indicator */}
            {voice.isRecording && (
              <div className="flex items-center gap-2 mb-2 animate-fadeIn">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[11px] text-red-400 font-medium">Recording</span>
                {voice.interimTranscript && (
                  <span className="text-[12px] italic truncate flex-1" style={{ color: 'var(--ielts-text-muted)' }}>{voice.interimTranscript}</span>
                )}
              </div>
            )}

            <div className="flex items-end gap-2">
              {/* Mic button */}
              {voice.isSupported && (
                <button
                  onClick={voice.isRecording ? voice.stopRecording : voice.startRecording}
                  disabled={isProcessing || examinerSpeaking}
                  className={`ielts-mic-btn-sm ${voice.isRecording ? "ielts-mic-active" : ""}`}
                >
                  {voice.isRecording ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" y1="19" x2="12" y2="23"/>
                    </svg>
                  )}
                </button>
              )}

              {/* Text input */}
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={examinerSpeaking ? "Examiner is speaking..." : phase === "identity" ? "Say your full name..." : "Type or speak your answer..."}
                disabled={examinerSpeaking}
                rows={2}
                className="ielts-textarea"
              />

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isProcessing || examinerSpeaking}
                className="ielts-send-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
            </div>

            {!voice.isSupported && (
              <p className="text-xs mt-2 px-3 py-1.5 rounded text-center" style={{ color: 'var(--ielts-text-faint)', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                Voice input is not available in this browser. Use Chrome or Edge for the best experience, or type your answers below.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
