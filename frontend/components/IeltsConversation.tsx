"use client";

/**
 * IeltsConversation.tsx
 *
 * REBUILT — Immersive IELTS Speaking exam simulation.
 *
 * Architecture:
 *  - Backend state machine controls Part 1/2/3 transitions (NOT keyword detection)
 *  - Deterministic flow: Part 1 (5 Q&A) → Part 2 (cue card + prep + speak) → Part 3 (5 Q&A)
 *  - TTS auto-play → mic auto-start lifecycle (no stuck states)
 *  - Voice-first with text fallback
 *  - Dark immersive UI — exam room atmosphere
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  startScenarioSession,
  submitScenarioTurn,
  endScenarioSession,
  synthesizeSpeech,
} from "@/lib/api";
import { useAuthStore } from "@/lib/stores/authStore";
import type {
  Scenario,
  ConversationTurn,
  EndSessionResult,
  IeltsCueCard,
} from "@/lib/types";
import ScenarioSummary from "./ScenarioSummary";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useSpeechTiming } from "@/hooks/useSpeechTiming";
import type { SpeechMetrics } from "@/hooks/useSpeechTiming";

// ─── Constants ─────────────────────────────────────────────────────────────

type ExamPhase =
  | "entering"     // fade-in intro sequence
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

interface IeltsConversationProps {
  scenario: Scenario;
  onClose: () => void;
  onComplete?: () => void;
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function IeltsConversation({
  scenario,
  onClose,
  onComplete,
}: IeltsConversationProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => !!s.user);

  // ── Core state ──
  const [phase, setPhase] = useState<ExamPhase>("entering");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [cueCard, setCueCard] = useState<IeltsCueCard | null>(null);
  const [userTurnCount, setUserTurnCount] = useState(0);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [examinerSpeaking, setExaminerSpeaking] = useState(false);
  const [scores, setScores] = useState<EndSessionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [part2Nudge, setPart2Nudge] = useState<string | null>(null);

  // Part 2 timer
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

    // Voice just stopped — start a 4-second silence timer
    silenceTimerRef.current = setTimeout(() => {
      if (consecutiveShortSegmentsRef.current >= 3) {
        setPart2SilenceNudge("Try to keep speaking. Think about the points on your card.");
      } else {
        setPart2SilenceNudge("You can continue speaking.");
      }
      // Auto-restart mic after nudge
      if (voice.isSupported) {
        setTimeout(() => {
          startMicWithTiming();
          setPart2SilenceNudge(null);
        }, 2000);
      }
    }, 4000);

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };
  }, [phase, voice.isRecording, timerActive, isProcessing, voice.isSupported, startMicWithTiming]);

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
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive, timerSeconds]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (timerRef.current) clearInterval(timerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  // ─── TTS Playback ───────────────────────────────────────────────────────

  const playTTS = useCallback(async (text: string, autoMic = true) => {
    setExaminerSpeaking(true);
    micEnabledRef.current = false;

    // Guard: prevent double mic-start if both audio.onerror and .play().catch fire
    let micStarted = false;
    const tryStartMic = () => {
      if (micStarted) return;
      micStarted = true;
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

        audio.onended = () => {
          URL.revokeObjectURL(url);
          audioRef.current = null;
          tryStartMic();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          audioRef.current = null;
          tryStartMic();
        };
        await audio.play().catch(() => {
          tryStartMic();
        });
      } else {
        // No TTS available — brief pause then enable mic
        setTimeout(() => {
          tryStartMic();
        }, 600);
      }
    } catch {
      tryStartMic();
    }
  }, [voice, startMicWithTiming]);

  // ─── Session Init ───────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!useAuthStore.getState().accessToken) {
        setErrorMsg("Sign in to start the exam and track your progress.");
        setPhase("error");
        return;
      }

      try {
        // Entering sequence — 2s dramatic pause
        await new Promise((r) => setTimeout(r, 2000));
        if (cancelled) return;

        const result = await startScenarioSession(scenario.id);
        if (cancelled) return;

        const mappedTurns: ConversationTurn[] = (result.turns ?? []).map((t) => ({
          id: `init-${t.turnIndex}`,
          turnIndex: t.turnIndex,
          role: t.role,
          content: t.content,
          audioStorageKey: null,
          scores: null,
          feedback: null,
          createdAt: t.createdAt,
        }));

        setSessionId(result.sessionId);
        setTurns(mappedTurns);

        // Store cue card from backend
        if (result.cueCard) {
          setCueCard(result.cueCard);
        }

        setPhase("part1");

        // Play the first examiner question via TTS
        const firstAi = mappedTurns.find((t) => t.role === "assistant");
        if (firstAi) {
          await new Promise((r) => setTimeout(r, 500));
          if (!cancelled) playTTS(firstAi.content, true);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : "Hmm, something didn't work. Let's try again!");
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
      setScores(result as EndSessionResult);
      onComplete?.();
    } catch {
      setScores({ ...SAFE_SCORES });
    } finally {
      setPhase("summary");
    }
  }, [onComplete]);

  // ─── Submit Turn ────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const content = inputText.trim();
    if (!sessionId || !content || isProcessing) return;

    // During Part 2 speaking, redirect to handlePart2End
    if (phase === "part2_speak") {
      handlePart2End();
      return;
    }

    // Stop recording + TTS
    if (voice.isRecording) voice.stopRecording();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setExaminerSpeaking(false);
    }

    // Finalize speech timing for this turn
    const metrics = speechTiming.finalizeTurn();

    setInputText("");
    setIsProcessing(true);

    // Optimistic user turn
    const tempId = `temp-${Date.now()}`;
    const optimistic: ConversationTurn = {
      id: tempId,
      turnIndex: turns.length,
      role: "user",
      content,
      audioStorageKey: null,
      scores: null,
      feedback: null,
      createdAt: new Date().toISOString(),
    };
    setTurns((prev) => [...prev, optimistic]);

    try {
      const result = await submitScenarioTurn(sessionId, content, metrics);

      const userTurn: ConversationTurn = {
        id: `user-${result.userTurn.turnIndex}`,
        turnIndex: result.userTurn.turnIndex,
        role: "user",
        content: result.userTurn.content,
        audioStorageKey: null,
        scores: null,
        feedback: null,
        createdAt: result.userTurn.createdAt,
      };

      const aiTurn: ConversationTurn = {
        id: `ai-${result.aiTurn.turnIndex}`,
        turnIndex: result.aiTurn.turnIndex,
        role: "assistant",
        content: result.aiTurn.content,
        audioStorageKey: null,
        scores: null,
        feedback: null,
        createdAt: result.aiTurn.createdAt,
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
        console.log(`[ielts-ui] part=${state.part} phase=${state.phase} qIdx=${state.questionIndex}`);

        if (state.phase === "part1_transition") {
          // Hardcoded transition: "Now let's start Part 1."
          // Play TTS, brief pause, then auto-advance to first question
          await playTTS(result.aiTurn.content, false);
          await new Promise((r) => setTimeout(r, 1200));
          setIsProcessing(false);
          const q1Result = await submitScenarioTurn(sessionId, "[READY FOR PART 1]");
          if (q1Result.ieltsState) {
            const q1Turn: ConversationTurn = {
              id: `ai-${q1Result.aiTurn.turnIndex}`,
              turnIndex: q1Result.aiTurn.turnIndex,
              role: "assistant",
              content: q1Result.aiTurn.content,
              audioStorageKey: null, scores: null, feedback: null,
              createdAt: q1Result.aiTurn.createdAt,
            };
            setTurns((prev) => [...prev, q1Turn]);
            await new Promise((r) => setTimeout(r, 500));
            playTTS(q1Result.aiTurn.content, true);
          }

        } else if (state.phase === "transition_to_part2") {
          // Hardcoded transition: "Okay, let's move on to Part 2."
          setPhase("part2_intro");
          await playTTS(result.aiTurn.content, false);
          await new Promise((r) => setTimeout(r, 2000));
          // Auto-advance to cue_card
          setIsProcessing(false);
          const cueResult = await submitScenarioTurn(sessionId, "[READY FOR PART 2]");
          if (cueResult.ieltsState?.phase === "cue_card") {
            if (cueResult.ieltsState.cueCard) setCueCard(cueResult.ieltsState.cueCard);
            setPhase("part2_prep");
            setTimerSeconds(PREP_SECONDS);
            setTimerActive(true);
            await new Promise((r) => setTimeout(r, 500));
            playTTS(cueResult.aiTurn.content, false);
          }

        } else if (state.phase === "cue_card") {
          // Show cue card + prep timer
          setPhase("part2_prep");
          setTimerSeconds(PREP_SECONDS);
          setTimerActive(true);
          // Play the cue card instruction
          await new Promise((r) => setTimeout(r, 500));
          playTTS(result.aiTurn.content, false);

        } else if (state.phase === "long_turn") {
          // User's 2-minute speaking window
          setPhase("part2_speak");
          setTimerSeconds(SPEAK_SECONDS);
          setTimerActive(true);
          await new Promise((r) => setTimeout(r, 500));
          playTTS(result.aiTurn.content, false);
          // Auto-start mic after TTS finishes (handled in playTTS onended)

        } else if (state.phase === "follow_up") {
          // Examiner asks 1 follow-up after long turn — switch to Q&A mode
          setPhase("part1"); // Reuse part1 layout for follow-up Q&A
          setTimerActive(false);
          setTimerSeconds(0);
          await new Promise((r) => setTimeout(r, 800));
          playTTS(result.aiTurn.content, true);

        } else if (state.phase === "transition_to_part3") {
          // Hardcoded transition: "Okay, let's move on to Part 3."
          setPhase("part3");
          await playTTS(result.aiTurn.content, false);
          await new Promise((r) => setTimeout(r, 1500));
          // Auto-advance to first Part 3 question
          setIsProcessing(false);
          const p3Result = await submitScenarioTurn(sessionId, "[READY FOR PART 3]");
          if (p3Result.ieltsState) {
            const aiT: ConversationTurn = {
              id: `ai-${p3Result.aiTurn.turnIndex}`,
              turnIndex: p3Result.aiTurn.turnIndex,
              role: "assistant",
              content: p3Result.aiTurn.content,
              audioStorageKey: null, scores: null, feedback: null,
              createdAt: p3Result.aiTurn.createdAt,
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
  }, [sessionId, inputText, isProcessing, turns, userTurnCount, voice, playTTS, handleEndSession, speechTiming]);

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

      const userTurn: ConversationTurn = {
        id: `user-${result.userTurn.turnIndex}`,
        turnIndex: result.userTurn.turnIndex,
        role: "user",
        content: result.userTurn.content,
        audioStorageKey: null,
        scores: null,
        feedback: null,
        createdAt: result.userTurn.createdAt,
      };
      const aiTurn: ConversationTurn = {
        id: `ai-${result.aiTurn.turnIndex}`,
        turnIndex: result.aiTurn.turnIndex,
        role: "assistant",
        content: result.aiTurn.content,
        audioStorageKey: null,
        scores: null,
        feedback: null,
        createdAt: result.aiTurn.createdAt,
      };

      setTurns((prev) => [...prev, userTurn, aiTurn]);
      setUserTurnCount((c) => c + 1);

      // Check the IELTS state from the response
      const state = result.ieltsState;
      if (state) {
        console.log(`[ielts-ui] handlePart2End: part=${state.part} phase=${state.phase}`);
        if (state.phase === "long_turn") {
          // Backend was still at cue_card when we submitted — re-submit to advance
          setIsProcessing(false);
          const retry = await submitScenarioTurn(sessionId, "[Speaking completed]");
          if (retry.ieltsState?.phase === "follow_up") {
            const followAi: ConversationTurn = {
              id: `ai-${retry.aiTurn.turnIndex}`, turnIndex: retry.aiTurn.turnIndex,
              role: "assistant", content: retry.aiTurn.content,
              audioStorageKey: null, scores: null, feedback: null,
              createdAt: retry.aiTurn.createdAt,
            };
            setTurns((prev) => [...prev, followAi]);
            setPhase("part1");
            setTimerActive(false);
            setTimerSeconds(0);
            await new Promise((r) => setTimeout(r, 800));
            playTTS(retry.aiTurn.content, true);
          }
        } else if (state.phase === "follow_up") {
          // Show follow-up as Q&A (reuse part1 layout)
          setPhase("part1");
          setTimerActive(false);
          setTimerSeconds(0);
          await new Promise((r) => setTimeout(r, 800));
          playTTS(result.aiTurn.content, true);
        } else if (state.phase === "transition_to_part3") {
          setPhase("part3");
          await playTTS(result.aiTurn.content, false);
          await new Promise((r) => setTimeout(r, 2000));
          setIsProcessing(false);
          const p3Result = await submitScenarioTurn(sessionId, "[READY FOR PART 3]");
          if (p3Result.ieltsState) {
            const p3Turn: ConversationTurn = {
              id: `ai-${p3Result.aiTurn.turnIndex}`,
              turnIndex: p3Result.aiTurn.turnIndex,
              role: "assistant",
              content: p3Result.aiTurn.content,
              audioStorageKey: null, scores: null, feedback: null,
              createdAt: p3Result.aiTurn.createdAt,
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
        const announceTurn: ConversationTurn = {
          id: `ai-${result.aiTurn.turnIndex}`,
          turnIndex: result.aiTurn.turnIndex,
          role: "assistant",
          content: result.aiTurn.content,
          audioStorageKey: null,
          scores: null,
          feedback: null,
          createdAt: result.aiTurn.createdAt,
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
    setTimerSeconds(SPEAK_SECONDS);
    setTimerActive(true);

    // Start mic with timing after a brief pause (TTS has already finished via await)
    if (voice.isSupported) {
      setTimeout(() => startMicWithTiming(), 300);
    }
  }, [sessionId, voice, playTTS, startMicWithTiming]);

  // ── Timer expiry handlers ──
  useEffect(() => {
    if (timerSeconds === 0 && !timerActive && phase === "part2_prep") {
      handlePrepSkip();
    }
  }, [timerSeconds, timerActive, phase, handlePrepSkip]);

  useEffect(() => {
    if (timerSeconds === 0 && !timerActive && phase === "part2_speak") {
      part2EndByTimerRef.current = true; // Timer expiry — skip minimum enforcement
      handlePart2End();
    }
  }, [timerSeconds, timerActive, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ──
  const currentPart = phase === "part1" ? 1 : (phase.startsWith("part2") ? 2 : 3);
  const latestExaminerMsg = [...turns].reverse().find((t) => t.role === "assistant");
  const latestUserMsg = [...turns].reverse().find((t) => t.role === "user");

  // Q&A pairs for transcript
  const qaPairs: Array<{ q: string; a: string; idx: number }> = [];
  for (let i = 0; i < turns.length - 1; i++) {
    if (turns[i].role === "assistant" && turns[i + 1]?.role === "user") {
      qaPairs.push({ q: turns[i].content, a: turns[i + 1].content, idx: qaPairs.length + 1 });
      i++;
    }
  }

  // Timer format
  const timerMin = Math.floor(timerSeconds / 60);
  const timerSec = timerSeconds % 60;
  const timerDisplay = `${timerMin}:${timerSec.toString().padStart(2, "0")}`;
  const timerUrgent = timerSeconds <= 10 && timerSeconds > 0;

  // ─── Render ──────────────────────────────────────────────────────────────

  if (phase === "summary" && scores) {
    return <ScenarioSummary result={scores} onClose={onClose} />;
  }

  const showInput = phase === "part1" || phase === "part2_speak" || phase === "part3";

  return (
    <div className="fixed inset-0 z-50 flex flex-col ielts-exam-bg">
      {/* ── Top Bar ── */}
      <div className="shrink-0 ielts-header">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center ielts-btn-ghost"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <div className="font-sora font-bold text-sm" style={{ color: 'var(--ielts-text)' }}>
              IELTS Speaking Test
            </div>
            <div className="text-xs" style={{ color: 'var(--ielts-text-secondary)' }}>
              {phase === "part1" ? "Part 1 — Interview" :
               phase.startsWith("part2") ? "Part 2 — Long Turn" :
               phase === "part3" ? "Part 3 — Discussion" :
               ""}
            </div>
          </div>

          {/* Part indicator pills */}
          {(phase === "part1" || phase.startsWith("part2") || phase === "part3") && (
            <div className="flex gap-1">
              {[1, 2, 3].map((p) => (
                <div
                  key={p}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-slow ${
                    p === currentPart ? "ielts-part-active" :
                    p < currentPart ? "ielts-part-done" :
                    "ielts-part-future"
                  }`}
                >
                  {p < currentPart ? "✓" : p}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-5">

          {/* ═══ ENTERING ═══ */}
          {phase === "entering" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-8 py-24 animate-fadeIn">
              {/* Soundwave orb */}
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
                <p className="font-sora font-bold text-lg" style={{ color: 'var(--ielts-text)' }}>
                  Entering exam room
                </p>
                <p className="text-sm mt-3 max-w-[280px] mx-auto leading-relaxed" style={{ color: 'var(--ielts-text-muted)' }}>
                  Your examiner is preparing. The test will begin shortly.
                </p>
              </div>
              <div className="flex gap-2">
                {[0, 200, 400].map((d) => (
                  <span key={d} className="ielts-dot" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          )}

          {/* ═══ ERROR ═══ */}
          {phase === "error" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 py-24">
              <div className="text-2xl">{!isAuthenticated ? "🔒" : "⚠️"}</div>
              <p className="text-base font-medium text-center" style={{ color: 'var(--ielts-text-secondary)' }}>
                {errorMsg || "Oops! Let's try that again"}
              </p>
              <div className="flex gap-3">
                {!isAuthenticated && (
                  <button onClick={() => router.push("/login")} className="ielts-btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold">
                    Sign In
                  </button>
                )}
                <button onClick={onClose} className="underline text-sm" style={{ color: 'var(--ielts-text-secondary)' }}>Go back</button>
              </div>
            </div>
          )}

          {/* ═══ ENDING ═══ */}
          {phase === "ending" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-8 py-24 animate-fadeIn">
              <div className="ielts-orb ielts-orb-analyzing">
                <div className="ielts-orb-inner">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <p className="font-sora font-bold text-lg" style={{ color: 'var(--ielts-text)' }}>
                  Analysing your performance
                </p>
                <p className="text-sm mt-2 max-w-[260px] mx-auto" style={{ color: 'var(--ielts-text-muted)' }}>
                  Evaluating fluency, vocabulary, grammar, and pronunciation...
                </p>
              </div>
              {/* Score bar loading animation */}
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

          {/* ═══ PART 2 INTRO ═══ */}
          {phase === "part2_intro" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 py-20 animate-fadeIn">
              <div className="ielts-orb ielts-orb-speaking">
                <div className="ielts-orb-inner">
                  <span className="text-lg font-bold" style={{ color: 'var(--ielts-text)' }}>2</span>
                </div>
              </div>
              <p className="font-sora font-bold text-lg text-center" style={{ color: 'var(--ielts-text)' }}>
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
                  <span className="text-xs font-bold uppercase tracking-[0.15em] text-indigo-300">
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
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 bg-indigo-500/20 text-indigo-300">
                        {i + 1}
                      </span>
                      <span className="text-sm leading-relaxed" style={{ color: 'var(--ielts-text-secondary)' }}>{prompt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Timer + controls */}
              <div className="flex flex-col items-center gap-5">
                <div className={`ielts-timer ${timerUrgent ? "ielts-timer-urgent" : ""}`}>
                  <span className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--ielts-text-muted)' }}>Preparation time</span>
                  <span className="font-mono text-2xl font-bold" style={{ color: 'var(--ielts-text)' }}>{timerDisplay}</span>
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
                <span className="text-xs uppercase tracking-wider text-indigo-300 font-bold">Topic:</span>
                <span className="text-sm ml-2" style={{ color: 'var(--ielts-text-secondary)' }}>{cueCard.topic}</span>
              </div>

              {/* Timer */}
              <div className="flex flex-col items-center gap-5">
                <div className={`ielts-timer ${timerUrgent ? "ielts-timer-urgent" : ""}`}>
                  <span className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--ielts-text-muted)' }}>Speaking time</span>
                  <span className="font-mono text-2xl font-bold" style={{ color: 'var(--ielts-text)' }}>{timerDisplay}</span>
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

                {/* Silence nudge — triggered by 4s of no speech during Part 2 */}
                {part2SilenceNudge && !part2Nudge && (
                  <div className="px-4 py-2.5 rounded-xl text-sm text-blue-300/90 bg-blue-500/10 border border-blue-500/20 text-center max-w-[300px] animate-fadeIn">
                    {part2SilenceNudge}
                  </div>
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

          {/* ═══ PART 1 & 3: Q&A Interface ═══ */}
          {(phase === "part1" || phase === "part3") && (
            <div className="flex flex-col gap-4">
              {/* Previous Q&A transcript (collapsed) */}
              {qaPairs.length > 1 && (
                <div className="ielts-transcript">
                  <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--ielts-text-faint)' }}>
                    Previous responses
                  </div>
                  {qaPairs.slice(0, -1).map((pair) => (
                    <div key={pair.idx} className="mb-3 last:mb-0">
                      <p className="text-xs mb-0.5" style={{ color: 'var(--ielts-text-muted)' }}>Q{pair.idx}: {pair.q}</p>
                      <p className="text-xs" style={{ color: 'var(--ielts-text-secondary)' }}>{pair.a}</p>
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
                      <span className="text-xs font-bold uppercase tracking-[0.15em] text-indigo-300">Examiner</span>
                      {examinerSpeaking && (
                        <span className="ml-2 text-xs text-indigo-400 animate-pulse">Speaking...</span>
                      )}
                    </div>
                  </div>
                  <p className="text-lg font-medium leading-relaxed" style={{ color: 'var(--ielts-text)' }}>
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
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400/60">Your answer</span>
                  <p className="text-sm mt-1" style={{ color: 'var(--ielts-answer-text)' }}>{latestUserMsg.content}</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Input Area ── */}
      {showInput && (
        <div className="shrink-0 ielts-input-bar">
          <div className="max-w-lg mx-auto px-4 py-3">
            {/* Voice recording indicator */}
            {voice.isRecording && (
              <div className="flex items-center gap-2 mb-2 animate-fadeIn">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-red-400 font-medium">Recording</span>
                {voice.interimTranscript && (
                  <span className="text-xs italic truncate flex-1" style={{ color: 'var(--ielts-text-muted)' }}>{voice.interimTranscript}</span>
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
                placeholder={examinerSpeaking ? "Examiner is speaking..." : "Type or speak your answer..."}
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
              <p className="text-xs mt-2 text-center" style={{ color: 'var(--ielts-text-faint)' }}>
                Voice input requires Chrome or Edge
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
