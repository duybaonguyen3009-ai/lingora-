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
  getScenarioAudioUploadUrl,
  putAudioToStorage,
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
  ExaminerPersona,
} from "@/lib/types";
import IeltsDiagnosticReport from "./IeltsDiagnosticReport";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

// ─── V2: Diagnostic data builder ────────────────────────────────────────────

// Band ranges come from the backend (EndSessionResult.bandRanges). Never
// convert 0-100 → band on the client — backend is the single source of truth.
// A defensive fallback kicks in only if an older backend omits the field.

const FALLBACK_BAND_RANGE: BandRange = { low: 2, high: 2 };

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
  const ranges = result.bandRanges ?? null;
  const criteria: CriterionDiagnostic[] = [
    {
      label: "Fluency & Coherence",
      bandRange: ranges?.fluency ?? FALLBACK_BAND_RANGE,
      score100: result.fluency,
      justification: result.criteriaFeedback?.fluency || "Score based on overall speaking flow and idea development.",
      action: result.fluency < 60
        ? "Use discourse markers (\"However\", \"On the other hand\") to connect ideas and maintain flow."
        : "Maintain your current fluency level. Focus on reducing any remaining hesitations.",
      l1Tag: undefined,
    },
    {
      label: "Lexical Resource",
      bandRange: ranges?.vocabulary ?? FALLBACK_BAND_RANGE,
      score100: result.vocabulary,
      justification: result.criteriaFeedback?.vocabulary || "Score based on vocabulary range and precision.",
      action: result.vocabulary < 60
        ? "Replace common words (\"good\", \"nice\", \"important\") with topic-specific vocabulary."
        : "Continue using varied vocabulary. Try incorporating more idiomatic expressions.",
    },
    {
      label: "Grammatical Range & Accuracy",
      bandRange: ranges?.grammar ?? FALLBACK_BAND_RANGE,
      score100: result.grammar,
      justification: result.criteriaFeedback?.grammar || "Score based on sentence structure variety and accuracy.",
      action: result.grammar < 60
        ? "Practice using complex sentences with \"although\", \"if\", \"which\" to demonstrate range."
        : "Your grammar is solid. Focus on consistent tense marking in longer responses.",
    },
    {
      label: "Pronunciation",
      bandRange: ranges?.pronunciation ?? FALLBACK_BAND_RANGE,
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

  // Both values come from backend (diagnosticOverall100 + bandRanges.overall).
  // If an older backend omits them, fall back to the same avg-of-4 formula
  // the backend uses so the two never visibly disagree.
  const overallScore100 = result.diagnosticOverall100 ?? Math.round(
    criteria.reduce((s, c) => s + c.score100, 0) / criteria.length
  );

  return {
    overallBandRange: ranges?.overall ?? FALLBACK_BAND_RANGE,
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

// V2: Examiner opening is built server-side (persona + time-of-day greeting) and
// returned as turns[0] from POST /scenarios/:id/start. Do not hardcode it here.

// Fallback persona for sessions started before the multi-persona rollout — their
// session_meta has no examinerPersona, so TTS would otherwise send no voice.
// "alloy" is the historical default so audio continuity is preserved.
const FALLBACK_PERSONA: ExaminerPersona = { name: "Sarah", voice: "alloy" };

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
  // Examiner persona from backend. Ref mirrors it so playTTS (memoized) picks up
  // the latest voice without being re-created on every persona change.
  const [, setExaminerPersona] = useState<ExaminerPersona>(FALLBACK_PERSONA);
  const personaRef = useRef<ExaminerPersona>(FALLBACK_PERSONA);
  const setPersona = useCallback((p: ExaminerPersona) => {
    personaRef.current = p;
    setExaminerPersona(p);
  }, []);
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
  // Threshold is populated per question from the backend response
  // (result.part1AnswerTimeoutMs). A random fallback covers sessions talking
  // to an older backend that doesn't send the field yet.
  const PART1_TIMEOUT_FALLBACK_MS = () => 25000 + Math.floor(Math.random() * 10001);
  const part1SpeechStartRef = useRef<number | null>(null);
  const part1InterruptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const part1ThresholdMsRef = useRef<number>(PART1_TIMEOUT_FALLBACK_MS());
  // Tick state for the visible countdown. null when the timer is not active.
  const [part1RemainingSec, setPart1RemainingSec] = useState<number | null>(null);

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

  // Upload pipeline state — shown while audio is being shipped to R2 and
  // the server is transcribing via Whisper. Distinct from isProcessing so the
  // UI can communicate WHICH step is in flight.
  const [uploadPhase, setUploadPhase] = useState<"idle" | "uploading" | "transcribing">("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const lastPendingBlobRef = useRef<Blob | null>(null);

  // Part 2 pause handling: after the SpeechRecognition auto-stops on silence,
  // we need to restart the mic so the candidate can keep going. No UI nudge —
  // the silence is part of the exam (real examiners stay quiet).
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consecutiveShortSegmentsRef = useRef(0);

  // Part 2 notepad: free-form jottings the candidate makes during the 60s prep.
  // Editable during part2_prep, read-only during part2_speak, unmounted elsewhere.
  // Persisted to session_meta on the prep→speak transition turn.
  const [part2Notes, setPart2Notes] = useState("");
  const notepadRef = useRef<HTMLTextAreaElement>(null);

  // Autofocus the notepad when prep starts — candidate can begin typing
  // immediately without clicking.
  useEffect(() => {
    if (phase === "part2_prep" && notepadRef.current) {
      notepadRef.current.focus();
    }
  }, [phase]);

  // Cross-browser audio capture — MediaRecorder only. Replaces the old
  // Web-Speech-API hook; transcription is now the backend's job.
  const recorder = useAudioRecorder();

  // ── Smart mic start: arms the recorder and clears any stale silence timer ──
  const startMicWithTiming = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    void recorder.start();
  }, [recorder]);

  // ── Part 2 mic auto-restart: when SpeechRecognition auto-stops during the
  // 120s long turn, silently re-arm the mic so the candidate can keep going.
  // No UI nudge — real IELTS examiners stay silent while the candidate pauses.
  useEffect(() => {
    if (phase !== "part2_speak" || recorder.isRecording || !timerActive || isProcessing) return;

    silenceTimerRef.current = setTimeout(() => {
      if (recorder.isSupported) startMicWithTiming();
    }, 8000);

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };
  }, [phase, recorder.isRecording, timerActive, isProcessing, recorder.isSupported, startMicWithTiming]);

  // ── V2: Part 1 interruption timer — auto-submit after 25-35s of speaking ──
  // Also drives the visible countdown the candidate sees while answering.
  useEffect(() => {
    if (phase !== "part1" || !recorder.isRecording || isProcessing || examinerSpeaking) {
      if (part1InterruptTimerRef.current) {
        clearTimeout(part1InterruptTimerRef.current);
        part1InterruptTimerRef.current = null;
      }
      part1SpeechStartRef.current = null;
      setPart1RemainingSec(null);
      return;
    }

    // User started recording in Part 1 — arm the interrupt.
    if (part1SpeechStartRef.current === null) {
      part1SpeechStartRef.current = Date.now();
    }

    const thresholdMs = part1ThresholdMsRef.current;
    const startedAt = part1SpeechStartRef.current;

    const computeRemaining = () =>
      Math.max(0, Math.ceil((thresholdMs - (Date.now() - startedAt)) / 1000));

    setPart1RemainingSec(computeRemaining());

    // 1Hz display tick — updates the visible countdown without restarting
    // the interrupt setTimeout.
    const tickId = setInterval(() => {
      setPart1RemainingSec(computeRemaining());
    }, 1000);

    // Hard deadline — examiner cuts in. Stops recording + uploads so the
    // candidate's answer so far still counts. In the Web-Speech days this
    // read inputText; with Whisper we commit whatever audio was captured.
    part1InterruptTimerRef.current = setTimeout(() => {
      if (recorder.isRecording) {
        void handleRecordingComplete();
      }
      part1SpeechStartRef.current = null;
    }, Math.max(0, thresholdMs - (Date.now() - startedAt)));

    return () => {
      clearInterval(tickId);
      if (part1InterruptTimerRef.current) {
        clearTimeout(part1InterruptTimerRef.current);
        part1InterruptTimerRef.current = null;
      }
    };
  }, [phase, recorder.isRecording, isProcessing, examinerSpeaking]); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (autoMic && recorder.isSupported && !recorder.isRecording) {
        setTimeout(() => startMicWithTiming(), 300);
      }
    };

    try {
      const blob = await synthesizeSpeech(text, personaRef.current.voice);
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
  }, [recorder, startMicWithTiming, stopCurrentAudio]);

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

        // Backend is the source of truth for greeting + persona — just render.
        const persona = result.examinerPersona ?? FALLBACK_PERSONA;
        setPersona(persona);

        const openingContent = result.turns[0]?.content ?? "";

        // V2: Scripted greeting includes identity check — NOT scored
        const greetingTurn: TaggedTurn = {
          id: "greeting-0",
          turnIndex: -1,
          role: "assistant",
          content: openingContent,
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
          await playTTS(openingContent, true); // auto-mic for name response
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
    setPart2Notes("");
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

    if (recorder.isRecording) recorder.cancel();
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
      const result = await submitScenarioTurn(sessionId, { content: name });

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
        const q1Result = await submitScenarioTurn(sessionId, { content: "[READY FOR PART 1]" });
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
          if (q1Result.part1AnswerTimeoutMs) {
            part1ThresholdMsRef.current = q1Result.part1AnswerTimeoutMs;
          } else {
            part1ThresholdMsRef.current = PART1_TIMEOUT_FALLBACK_MS();
          }
          await new Promise((r) => setTimeout(r, 500));
          playTTS(q1Result.aiTurn.content, true);
        }
      }
    } catch (err) {
      console.error("[ielts-ui] handleIdentitySubmit error:", err);
    } finally {
      setIsProcessing(false);
    }
  }, [sessionId, inputText, isProcessing, recorder, playTTS]);

  const handleSend = useCallback(async (audioStorageKey?: string) => {
    // Either we submit typed text (inputText), or we submit a recorded
    // audio turn that was already uploaded to R2 (audioStorageKey). The
    // state-machine logic after the submit is identical either way.
    const useAudio = typeof audioStorageKey === "string" && audioStorageKey.length > 0;
    const content = useAudio ? "[Transcribing…]" : inputText.trim();
    if (!sessionId || isProcessing) return;
    if (!useAudio && !content) return;

    // Identity phase has its own handler (text-only path)
    if (phase === "identity" && !useAudio) {
      handleIdentitySubmit();
      return;
    }

    // During Part 2 speaking, redirect to handlePart2End (which owns the
    // min-duration check). Audio submissions for Part 2 go through that path.
    if (phase === "part2_speak" && !useAudio) {
      handlePart2End();
      return;
    }

    // Stop any non-submitted recording + any current TTS
    if (!useAudio && recorder.isRecording) recorder.cancel();
    stopCurrentAudio();
    setExaminerSpeaking(false);

    if (!useAudio) setInputText("");
    setIsProcessing(true);

    // Optimistic user turn — replaced once server responds with the real one.
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
      const submission = useAudio
        ? { storageKey: audioStorageKey as string }
        : { content };
      const result = await submitScenarioTurn(sessionId, submission);

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

      // Arm the next Part 1 answer-timeout from the backend response. Only
      // populated when the examiner's reply IS a Part 1 question — so this
      // naturally no-ops on Part 2/3 and on transitions.
      if (result.part1AnswerTimeoutMs) {
        part1ThresholdMsRef.current = result.part1AnswerTimeoutMs;
      }

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
          const q1Result = await submitScenarioTurn(sessionId, { content: "[READY FOR PART 1]" });
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
            if (q1Result.part1AnswerTimeoutMs) {
              part1ThresholdMsRef.current = q1Result.part1AnswerTimeoutMs;
            }
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
          const cueResult = await submitScenarioTurn(sessionId, { content: "[READY FOR PART 2]" });
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
          if (recorder.isSupported && !recorder.isRecording) {
            setTimeout(() => startMicWithTiming(), 300);
          }

        } else if (state.phase === "transition_to_part3") {
          // Hardcoded transition: "Okay, let's move on to Part 3."
          setPhase("part3");
          await playTTS(result.aiTurn.content, false);
          await new Promise((r) => setTimeout(r, 1500));
          // Auto-advance to first Part 3 question
          setIsProcessing(false);
          const p3Result = await submitScenarioTurn(sessionId, { content: "[READY FOR PART 3]" });
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
  }, [sessionId, inputText, isProcessing, turns, userTurnCount, recorder, playTTS, handleEndSession, phase, handleIdentitySubmit, stopCurrentAudio]);

  // ── Audio submission pipeline ────────────────────────────────────────────
  //
  //   record → stop (get blob) → request presigned URL → PUT to R2 →
  //   POST /turns with { storageKey } via handleSend(storageKey)
  //
  // Backend does Whisper transcription inside the /turns handler. Retries:
  //   - upload-url + R2 PUT   : 2 attempts, 1s backoff
  //   - (the /turns call itself is retried inside handleSend's wrapper below)
  //
  // On unrecoverable failure we surface `uploadError`. The last recorded blob
  // is held in `lastPendingBlobRef` so a manual "retry" button can re-run
  // the pipeline against the same audio.
  const uploadBlobToStorage = useCallback(async (sid: string, blob: Blob): Promise<string> => {
    // Get presigned URL — 2 attempts.
    let storageKey = "";
    let uploadUrl = "";
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const presigned = await getScenarioAudioUploadUrl(sid, "audio/webm");
        storageKey = presigned.storageKey;
        uploadUrl = presigned.uploadUrl;
        break;
      } catch (e) {
        lastErr = e;
        if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
      }
    }
    if (!uploadUrl) throw lastErr ?? new Error("Could not obtain upload URL");

    // PUT to R2 — 2 attempts.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await putAudioToStorage(uploadUrl, blob);
        return storageKey;
      } catch (e) {
        lastErr = e;
        if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
      }
    }
    throw lastErr ?? new Error("R2 upload failed");
  }, []);

  const handleRecordingComplete = useCallback(async () => {
    if (!sessionId || isProcessing || uploadPhase !== "idle") return;

    // Stop recording and wait for the final blob.
    const blob = recorder.isRecording ? await recorder.stop() : recorder.audioBlob;
    if (!blob || blob.size === 0) {
      setUploadError("No audio captured. Please try recording again.");
      return;
    }

    lastPendingBlobRef.current = blob;
    setUploadError(null);
    setUploadPhase("uploading");

    let storageKey: string;
    try {
      storageKey = await uploadBlobToStorage(sessionId, blob);
    } catch (err) {
      setUploadPhase("idle");
      setUploadError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      return;
    }

    setUploadPhase("transcribing");
    try {
      // handleSend accepts the storageKey and drives the full state-machine
      // flow that a typed submission would.
      await handleSend(storageKey);
      lastPendingBlobRef.current = null;
      setUploadError(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Transcription failed. Please try again.");
    } finally {
      setUploadPhase("idle");
    }
  }, [sessionId, isProcessing, uploadPhase, recorder, uploadBlobToStorage, handleSend]);

  const handleRetryUpload = useCallback(async () => {
    const blob = lastPendingBlobRef.current;
    if (!blob || !sessionId || isProcessing) return;
    setUploadError(null);
    setUploadPhase("uploading");
    let storageKey: string;
    try {
      storageKey = await uploadBlobToStorage(sessionId, blob);
    } catch (err) {
      setUploadPhase("idle");
      setUploadError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      return;
    }
    setUploadPhase("transcribing");
    try {
      await handleSend(storageKey);
      lastPendingBlobRef.current = null;
      setUploadError(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Transcription failed. Please try again.");
    } finally {
      setUploadPhase("idle");
    }
  }, [sessionId, isProcessing, uploadBlobToStorage, handleSend]);

  const handleMicToggle = useCallback(() => {
    if (recorder.isRecording) {
      void handleRecordingComplete();
    } else {
      startMicWithTiming();
    }
  }, [recorder.isRecording, handleRecordingComplete, startMicWithTiming]);

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
    if (!sessionId || isProcessing || uploadPhase !== "idle") return;

    const isTimerExpiry = part2EndByTimerRef.current;
    part2EndByTimerRef.current = false;

    // Stop recording first so we have an accurate blob + duration for the
    // min-duration check below. `stop()` resolves with the final webm blob.
    const recordedBlob = recorder.isRecording
      ? await recorder.stop()
      : recorder.audioBlob;
    const speakingDurationMs = recorder.durationMs;

    // Minimum-duration nudge — 30s real speaking. Word count can't be
    // checked pre-transcription (Whisper runs server-side), so we rely on
    // duration alone. Skip on timer expiry (timer already ran the full 2 min).
    if (!isTimerExpiry && recordedBlob && speakingDurationMs > 0 && speakingDurationMs < 30000) {
      setPart2Nudge("You've been speaking for less than 30 seconds. Try to develop your ideas more.");
      if (recorder.isSupported) {
        setTimeout(() => startMicWithTiming(), 300);
      }
      return;
    }

    consecutiveShortSegmentsRef.current = 0;
    setPart2Nudge(null);
    // Part 2 speak is ending — notes have already been persisted on the
    // prep→speak transition, so drop them from local state now that we are
    // leaving Part 2. Defensive: guards against stale notes if the user later
    // retries inline or hits a back-button flow.
    setPart2Notes("");
    setTimerActive(false);
    setInputText("");

    // Figure out what to submit: if we captured audio, upload + send
    // storageKey; otherwise fall back to the text placeholder (user never
    // recorded anything).
    let submission: { content: string } | { storageKey: string };
    if (recordedBlob && recordedBlob.size > 0) {
      lastPendingBlobRef.current = recordedBlob;
      setUploadError(null);
      setUploadPhase("uploading");
      try {
        const storageKey = await uploadBlobToStorage(sessionId, recordedBlob);
        submission = { storageKey };
        setUploadPhase("transcribing");
      } catch (err) {
        setUploadPhase("idle");
        setUploadError(err instanceof Error ? err.message : "Upload failed. Please try again.");
        return;
      }
    } else {
      submission = { content: "[Speaking completed]" };
    }
    const content = "storageKey" in submission ? "[Transcribing…]" : submission.content;

    setIsProcessing(true);

    try {
      const result = await submitScenarioTurn(sessionId, submission);

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
          const retry = await submitScenarioTurn(sessionId, { content: "[Speaking completed]" });
          if (retry.ieltsState?.phase === "transition_to_part3") {
            // Direct to Part 3 (no follow-up)
            setPhase("part3");
            setTimerActive(false);
            setTimerSeconds(0);
            await playTTS(retry.aiTurn.content, false);
            await new Promise((r) => setTimeout(r, 1500));
            setIsProcessing(false);
            const p3Result = await submitScenarioTurn(sessionId, { content: "[READY FOR PART 3]" });
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
          const p3Result = await submitScenarioTurn(sessionId, { content: "[READY FOR PART 3]" });
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
      setUploadPhase("idle");
    }
  }, [sessionId, isProcessing, uploadPhase, inputText, recorder, playTTS, startMicWithTiming, uploadBlobToStorage]);

  const prepSkipFiredRef = useRef(false);
  const handlePrepSkip = useCallback(async () => {
    if (!sessionId || prepSkipFiredRef.current) return;
    prepSkipFiredRef.current = true;
    setTimerActive(false);

    // Advance backend from cue_card → long_turn, and persist the candidate's
    // prep notes into session_meta.part2Notes on this same transition turn.
    // Empty string is intentional — it signals "candidate entered prep but
    // wrote nothing" to any future history UI.
    try {
      const result = await submitScenarioTurn(
        sessionId,
        { content: "[PREP TIME COMPLETE — I AM READY TO SPEAK]" },
        { part2Notes },
      );

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
    if (recorder.isSupported) {
      setTimeout(() => startMicWithTiming(), 300);
    }
  }, [sessionId, recorder, playTTS, startMicWithTiming, part2Notes]);

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
      // Fresh session — wipe any Part 2 notes left from the previous attempt.
      setPart2Notes("");
      try {
        await new Promise((r) => setTimeout(r, 2000));
        if (cancelled) return;

        // V2: Pass saved cue card index to reuse exact same Part 2 topic
        const result = await startScenarioSession(scenario.id, {
          cueCardIndex: savedCueCardIndex,
        });
        if (cancelled) return;

        // On retry the backend picks a fresh persona + greeting — we do not carry
        // the old ones over. User may see a different examiner, which is intended.
        const persona = result.examinerPersona ?? FALLBACK_PERSONA;
        setPersona(persona);

        const openingContent = result.turns[0]?.content ?? "";

        const greetingTurn: TaggedTurn = {
          id: "greeting-retry",
          turnIndex: -1,
          role: "assistant",
          content: openingContent,
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
          await playTTS(openingContent, true);
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
        <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--ielts-text-faint)' }}>
          Session Transcript
        </div>
        {partGroups.map((group) => (
          <div key={group.part} className="mb-5 last:mb-0">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold ${
                group.part <= currentPart ? "ielts-part-done" : "ielts-part-future"
              }`}>
                {group.part < currentPart ? "\u2713" : group.part}
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ielts-text-secondary)' }}>
                {group.label}
              </span>
            </div>
            <div className="flex flex-col gap-2.5 pl-7">
              {group.pairs.map((pair) => (
                <div key={pair.idx} className="ielts-history-item">
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--ielts-text-muted)' }}>
                    {pair.q}
                  </p>
                  <p className="text-xs leading-relaxed mt-1" style={{ color: 'var(--ielts-text-secondary)' }}>
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
            <div className="font-semibold text-sm" style={{ color: 'var(--ielts-text)' }}>
              IELTS Speaking Test
            </div>
            <div className="text-xs" style={{ color: 'var(--ielts-text-secondary)' }}>
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
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition duration-500 ${
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
              <p className="font-bold text-lg" style={{ color: 'var(--ielts-text)' }}>Entering exam room</p>
              <p className="text-sm mt-3 max-w-[280px] mx-auto leading-relaxed" style={{ color: 'var(--ielts-text-muted)' }}>Your examiner is preparing. The test will begin shortly.</p>
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
            <div className="text-3xl">{!isAuthenticated ? "🔒" : "⚠️"}</div>
            <p className="text-base font-medium text-center" style={{ color: 'var(--ielts-text-secondary)' }}>{errorMsg || "Something went wrong"}</p>
            <div className="flex gap-3">
              {!isAuthenticated && (
                <button onClick={() => router.push("/login")} className="ielts-btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold">Sign In</button>
              )}
              <button onClick={onClose} className="underline text-sm" style={{ color: 'var(--ielts-text-secondary)' }}>Go back</button>
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
              <p className="font-bold text-lg" style={{ color: 'var(--ielts-text)' }}>Analysing your performance</p>
              <p className="text-sm mt-2 max-w-[260px] mx-auto" style={{ color: 'var(--ielts-text-muted)' }}>Evaluating fluency, vocabulary, grammar, and pronunciation...</p>
            </div>
            <div className="w-52 flex flex-col gap-3 mt-2">
              {["Fluency", "Vocabulary", "Grammar", "Pronunciation"].map((label, i) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs w-20 text-right uppercase tracking-wider" style={{ color: 'var(--ielts-text-muted)' }}>{label}</span>
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
                  <span className="text-lg font-bold" style={{ color: 'var(--ielts-text)' }}>2</span>
                </div>
              </div>
              <p className="font-bold text-lg text-center" style={{ color: 'var(--ielts-text)' }}>
                Moving to Part 2
              </p>
              <p className="text-sm text-center max-w-[260px]" style={{ color: 'var(--ielts-text-muted)' }}>
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
                  <span className="text-xs font-semibold uppercase tracking-widest text-indigo-300">
                    Task Card
                  </span>
                </div>
                <p className="text-lg font-semibold leading-snug mb-4" style={{ color: 'var(--ielts-text)' }}>
                  {cueCard.topic}
                </p>
                <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--ielts-text-muted)' }}>
                  You should say:
                </p>
                <ul className="flex flex-col gap-2.5">
                  {cueCard.prompts.map((prompt, i) => (
                    <li key={i} className="flex gap-3 items-start">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5 bg-indigo-500/20 text-indigo-300">
                        {i + 1}
                      </span>
                      <span className="text-sm leading-relaxed" style={{ color: 'var(--ielts-text-secondary)' }}>{prompt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Notepad — lined paper for prep jottings */}
              <textarea
                ref={notepadRef}
                className="ielts-notepad"
                value={part2Notes}
                onChange={(e) => setPart2Notes(e.target.value)}
                placeholder="You may make some notes here. (Optional)"
                spellCheck={false}
                autoCorrect="off"
                aria-label="Part 2 preparation notes"
              />

              {/* Timer + controls */}
              <div className="flex flex-col items-center gap-5">
                <div className={`ielts-timer ${timerUrgent ? "ielts-timer-urgent" : ""}`}>
                  <span className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--ielts-text-muted)' }}>Preparation time</span>
                  <span className="font-mono text-4xl font-bold" style={{ color: 'var(--ielts-text)' }}>{timerDisplay}</span>
                </div>

                {/* Heartbeat pulse when timer is low */}
                {timerUrgent && (
                  <div className="ielts-heartbeat" />
                )}

                <button
                  onClick={handlePrepSkip}
                  className="ielts-btn-primary px-8 py-3 rounded-xl text-sm font-semibold"
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
                <span className="text-xs uppercase tracking-wider text-indigo-300 font-semibold">Topic:</span>
                <span className="text-sm ml-2" style={{ color: 'var(--ielts-text-secondary)' }}>{cueCard.topic}</span>
              </div>

              {/* Notepad — read-only during the long turn so the candidate can
                  glance at their prep notes while speaking. Only render if
                  they actually wrote something; otherwise it is just clutter. */}
              {part2Notes.trim().length > 0 && (
                <textarea
                  className="ielts-notepad"
                  value={part2Notes}
                  readOnly
                  aria-label="Part 2 preparation notes (read-only)"
                />
              )}

              {/* Timer */}
              <div className="flex flex-col items-center gap-5">
                <div className={`ielts-timer ${timerUrgent ? "ielts-timer-urgent" : ""}`}>
                  <span className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--ielts-text-muted)' }}>Speaking time</span>
                  <span className="font-mono text-4xl font-bold" style={{ color: 'var(--ielts-text)' }}>{timerDisplay}</span>
                </div>

                {/* Central mic orb */}
                <div className="relative">
                  {recorder.isRecording && (
                    <div className="absolute -inset-4 rounded-full ielts-mic-pulse" />
                  )}
                  <button
                    onClick={handleMicToggle}
                    disabled={isProcessing || !recorder.isSupported || uploadPhase !== "idle"}
                    className={`ielts-mic-btn ${recorder.isRecording ? "ielts-mic-active" : ""}`}
                  >
                    {recorder.isRecording ? (
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

                {/* Upload / transcribe status. Whisper doesn't stream like Web
                    Speech did, so there's no interim transcript — we show the
                    pipeline phase instead so the user knows something is happening. */}
                {uploadPhase === "uploading" && (
                  <div className="ielts-live-transcript">Uploading…</div>
                )}
                {uploadPhase === "transcribing" && (
                  <div className="ielts-live-transcript">Processing…</div>
                )}

                {/* Nudge message when user tries to end too early */}
                {part2Nudge && (
                  <div className="px-4 py-2.5 rounded-xl text-sm text-amber-300/90 bg-amber-500/10 border border-amber-500/20 text-center max-w-[300px] animate-fadeIn">
                    {part2Nudge}
                  </div>
                )}

                <button
                  onClick={handlePart2End}
                  disabled={isProcessing}
                  className="ielts-btn-ghost px-6 py-2 rounded-xl text-sm"
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
                      <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--ielts-text-faint)' }}>
                        {group.label}
                      </div>
                      {group.pairs.map((pair) => (
                        <div key={pair.idx} className="mb-2.5 last:mb-0 pl-3 border-l-2" style={{ borderColor: 'var(--ielts-text-faint)' }}>
                          <p className="text-xs mb-0.5" style={{ color: 'var(--ielts-text-muted)' }}>{pair.q}</p>
                          <p className="text-xs" style={{ color: 'var(--ielts-text-secondary)' }}>{pair.a}</p>
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
                      <span className="text-xs font-semibold uppercase tracking-widest text-indigo-300">Examiner</span>
                      {examinerSpeaking && (
                        <span className="ml-2 text-xs text-indigo-400 animate-pulse">Speaking...</span>
                      )}
                    </div>
                  </div>
                  <p className="text-base font-medium leading-relaxed" style={{ color: 'var(--ielts-text)' }}>
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

              {/* Part 1 answer countdown — visible only while the candidate
                  is actively answering. Same visual as Part 2 timers. */}
              {phase === "part1" && part1RemainingSec !== null && (
                <div className="flex justify-center">
                  <div className={`ielts-timer ${part1RemainingSec <= 5 ? "ielts-timer-urgent" : ""}`}>
                    <span className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--ielts-text-muted)' }}>
                      Answer time
                    </span>
                    <span className="font-mono text-3xl font-bold tabular-nums" style={{ color: 'var(--ielts-text)' }}>
                      {`0:${String(part1RemainingSec).padStart(2, "0")}`}
                    </span>
                  </div>
                </div>
              )}

              {/* Last user answer */}
              {latestUserMsg && qaPairs.length > 0 && (
                <div className="ielts-user-answer animate-answerIn">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400/60">Your answer</span>
                  <p className="text-sm mt-1" style={{ color: 'var(--ielts-answer-text)' }}>{latestUserMsg.content}</p>
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
            {/* Recording indicator — no live transcript (Whisper doesn't stream). */}
            {recorder.isRecording && (
              <div className="flex items-center gap-2 mb-2 animate-fadeIn">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-red-400 font-medium">Recording</span>
              </div>
            )}
            {uploadPhase === "uploading" && (
              <div className="flex items-center gap-2 mb-2 animate-fadeIn">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs text-amber-400 font-medium">Uploading…</span>
              </div>
            )}
            {uploadPhase === "transcribing" && (
              <div className="flex items-center gap-2 mb-2 animate-fadeIn">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-xs text-teal-400 font-medium">Processing…</span>
              </div>
            )}
            {uploadError && (
              <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 animate-fadeIn">
                <span className="text-xs text-red-400 flex-1">{uploadError}</span>
                <button
                  onClick={handleRetryUpload}
                  disabled={uploadPhase !== "idle" || !lastPendingBlobRef.current}
                  className="text-xs font-semibold text-red-200 underline disabled:opacity-50"
                >
                  Retry
                </button>
              </div>
            )}

            <div className="flex items-end gap-2">
              {/* Mic button */}
              {recorder.isSupported && (
                <button
                  onClick={handleMicToggle}
                  disabled={isProcessing || examinerSpeaking || uploadPhase !== "idle"}
                  className={`ielts-mic-btn-sm ${recorder.isRecording ? "ielts-mic-active" : ""}`}
                >
                  {recorder.isRecording ? (
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
                onClick={() => handleSend()}
                disabled={!inputText.trim() || isProcessing || examinerSpeaking}
                className="ielts-send-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
            </div>

            {!recorder.isSupported && (
              <p className="text-xs mt-2 px-3 py-1.5 rounded text-center" style={{ color: 'var(--ielts-text-faint)', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                Your browser doesn&apos;t support audio recording. Please use Chrome, Safari, Firefox, or Edge latest version, or type your answers below.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
