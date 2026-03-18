"use client";

/**
 * IeltsConversation.tsx
 *
 * IELTS Speaking test simulation — designed as an EXAM interface, not a chat.
 *
 * Structure:
 *  - Examiner avatar + question block (not chat bubbles)
 *  - Answer area with voice-first input
 *  - Progress stepper showing Part 1 → 2 → 3
 *  - Session transcript that builds naturally
 *  - TTS-ready architecture (examiner speaks questions aloud)
 *
 * Phases: loading → part1 → part2_prep → part2_speaking → part3 → ending → summary
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
  IeltsPhase,
  IeltsCueCard,
} from "@/lib/types";
import IeltsTimer from "./IeltsTimer";
import ScenarioSummary from "./ScenarioSummary";
import { useVoiceInput } from "@/hooks/useVoiceInput";

// ─── Constants ─────────────────────────────────────────────────────────────

const PART1_MAX_TURNS = 6;
const PART3_MAX_TURNS = 5;
const PREP_SECONDS     = 60;
const SPEAKING_SECONDS = 120;
const STORAGE_KEY      = "ielts-session";

/** Natural delay range (ms) before showing examiner response — feels human */
const EXAMINER_DELAY_MIN = 1200;
const EXAMINER_DELAY_MAX = 2400;

const SAFE_SCORE_DEFAULTS: EndSessionResult = {
  overallScore:  60,
  fluency:       60,
  vocabulary:    60,
  grammar:       60,
  coachFeedback: "Good effort! Keep practicing to build your fluency and confidence.",
  turnFeedback:  [],
  turnCount:     0,
  wordCount:     0,
  durationMs:    0,
};

const PART_LABELS: Record<string, { name: string; desc: string }> = {
  part1: { name: "Part 1 — Introduction", desc: "Answer questions about familiar topics" },
  part2: { name: "Part 2 — Long Turn", desc: "Speak about a given topic for 2 minutes" },
  part3: { name: "Part 3 — Discussion", desc: "Discuss abstract ideas related to Part 2" },
};

// ─── Cue cards ─────────────────────────────────────────────────────────────

const CUE_CARDS: IeltsCueCard[] = [
  { topic: "Describe a place you would like to visit", prompts: ["Where the place is", "How you heard about it", "What you would do there", "Why you would like to visit it"] },
  { topic: "Describe a person who has inspired you", prompts: ["Who this person is", "How you know them", "What they have done that inspired you", "Why they have been important to you"] },
  { topic: "Describe a skill you would like to learn", prompts: ["What the skill is", "Why you want to learn it", "How you would learn it", "How useful this skill would be for you"] },
  { topic: "Describe a memorable journey you have made", prompts: ["Where you went", "Who you went with", "What happened during the journey", "Why this journey was memorable"] },
  { topic: "Describe a book or film you have enjoyed", prompts: ["What it is about", "When you read or watched it", "What you liked about it", "Why you would recommend it to others"] },
  { topic: "Describe a time you helped someone", prompts: ["Who you helped", "Why they needed help", "How you helped them", "How you felt afterwards"] },
  { topic: "Describe a tradition in your country", prompts: ["What the tradition is", "How long it has existed", "How it is celebrated or practised", "Why it is important"] },
  { topic: "Describe a piece of technology you use often", prompts: ["What it is", "How often you use it", "What you use it for", "Why it is important to you"] },
];

function pickRandomCueCard(): IeltsCueCard {
  return CUE_CARDS[Math.floor(Math.random() * CUE_CARDS.length)];
}

// ─── Phase detection ────────────────────────────────────────────────────────

function detectPhaseTransition(
  aiText: string,
  currentPhase: IeltsPhase,
  part1TurnCount: number,
  part3TurnCount: number,
): IeltsPhase | null {
  const lower = aiText.toLowerCase();

  if (currentPhase === "part1") {
    const toP2 =
      lower.includes("part 2") || lower.includes("part two") ||
      lower.includes("cue card") || lower.includes("long turn");
    if (toP2 || part1TurnCount >= PART1_MAX_TURNS) return "part2_prep";
  }

  if (currentPhase === "part2_speaking") {
    const toP3 =
      lower.includes("part 3") || lower.includes("part three") || lower.includes("discussion");
    if (toP3) return "part3";
  }

  if (currentPhase === "part3") {
    const keywordEnd =
      lower.includes("end of") || lower.includes("thank you very much") ||
      lower.includes("that concludes") || lower.includes("end of the speaking");
    if (keywordEnd || part3TurnCount >= PART3_MAX_TURNS) return "ending";
  }

  return null;
}

// ─── localStorage helpers ───────────────────────────────────────────────────

interface StoredSession {
  scenarioId: string;
  sessionId: string;
  phase: IeltsPhase;
  turns: ConversationTurn[];
  cueCard: IeltsCueCard | null;
  part1TurnCount: number;
  part3TurnCount: number;
}

function saveSession(data: StoredSession) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

function loadSession(scenarioId: string): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: StoredSession = JSON.parse(raw);
    return parsed.scenarioId === scenarioId ? parsed : null;
  } catch { return null; }
}

function clearSession() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

// ─── Examiner Avatar ────────────────────────────────────────────────────────

function ExaminerAvatar({ speaking = false, size = "md" }: { speaking?: boolean; size?: "sm" | "md" }) {
  const s = size === "sm" ? 36 : 48;
  return (
    <div
      className={`shrink-0 rounded-full flex items-center justify-center ${speaking ? "animate-examiner-pulse" : ""}`}
      style={{
        width: s,
        height: s,
        background: "linear-gradient(135deg, var(--color-examiner), var(--color-primary))",
        boxShadow: speaking ? "0 0 16px var(--color-examiner-soft)" : "none",
      }}
    >
      <svg width={s * 0.45} height={s * 0.45} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    </div>
  );
}

// ─── Progress Stepper ───────────────────────────────────────────────────────

function ProgressStepper({ phase, part1TurnCount, part3TurnCount }: { phase: IeltsPhase; part1TurnCount: number; part3TurnCount: number }) {
  const parts = [
    { key: "part1", label: "Part 1", number: 1 },
    { key: "part2", label: "Part 2", number: 2 },
    { key: "part3", label: "Part 3", number: 3 },
  ];

  function getActivePart(p: IeltsPhase): string {
    if (p === "part1") return "part1";
    if (p === "part2_prep" || p === "part2_speaking") return "part2";
    return "part3";
  }

  const active = getActivePart(phase);

  return (
    <div className="flex items-center gap-1">
      {parts.map((p, i) => {
        const isActive = p.key === active;
        const isPast =
          (p.key === "part1" && (active === "part2" || active === "part3")) ||
          (p.key === "part2" && active === "part3");

        return (
          <React.Fragment key={p.key}>
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all duration-300"
              style={{
                background: isActive ? "var(--color-examiner-soft)" : isPast ? "rgba(52,211,153,0.08)" : "transparent",
                color: isActive ? "var(--color-examiner)" : isPast ? "var(--color-success)" : "var(--color-text-secondary)",
                border: isActive ? "1px solid var(--color-examiner)" : "1px solid transparent",
              }}
            >
              {isPast ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold" style={{
                  background: isActive ? "var(--color-examiner)" : "var(--color-border)",
                  color: isActive ? "#fff" : "var(--color-text-secondary)",
                }}>
                  {p.number}
                </span>
              )}
              {p.label}
            </div>
            {i < parts.length - 1 && (
              <div className="w-3 h-px" style={{ background: isPast ? "var(--color-success)" : "var(--color-border)" }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Question counter ───────────────────────────────────────────────────────

function QuestionCounter({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
        Question
      </span>
      <span className="text-[12px] font-bold" style={{ color: "var(--color-examiner)" }}>
        {current}
      </span>
      <span className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>/</span>
      <span className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>{total}</span>
    </div>
  );
}

// ─── Transcript entry ───────────────────────────────────────────────────────

function TranscriptEntry({ question, answer, index }: { question: string; answer: string; index: number }) {
  return (
    <div className="flex flex-col gap-2 exam-answer-appear">
      <div className="flex items-start gap-2.5">
        <ExaminerAvatar size="sm" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--color-examiner)" }}>
            Question {index}
          </div>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
            {question}
          </p>
        </div>
      </div>
      <div className="ml-[46px]">
        <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--color-primary)" }}>
          Your answer
        </div>
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-text)" }}>
          {answer}
        </p>
      </div>
    </div>
  );
}

// ─── Examiner Question Block ────────────────────────────────────────────────

function ExaminerQuestion({ content, isSpeaking }: { content: string; isSpeaking?: boolean }) {
  return (
    <div className="flex items-start gap-3.5 exam-question-appear">
      <ExaminerAvatar speaking={isSpeaking} />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-examiner)" }}>
          Examiner
        </div>
        <div
          className="rounded-2xl p-4"
          style={{
            background: "var(--color-examiner-soft)",
            borderLeft: "3px solid var(--color-examiner)",
          }}
        >
          <p className="text-[16px] font-medium leading-relaxed" style={{ color: "var(--color-text)" }}>
            {content}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Cue card display ───────────────────────────────────────────────────────

function CueCardDisplay({ card }: { card: IeltsCueCard }) {
  return (
    <div
      className="rounded-2xl p-5 animate-phase-in"
      style={{
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border)",
        borderTop: "3px solid var(--color-examiner)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <ExaminerAvatar size="sm" />
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--color-examiner)" }}>
            Task Card
          </div>
          <div className="text-[10px]" style={{ color: "var(--color-text-secondary)" }}>Part 2 — Long Turn</div>
        </div>
      </div>
      <p className="text-[16px] font-semibold mb-3.5 leading-snug" style={{ color: "var(--color-text)" }}>
        {card.topic}
      </p>
      <div className="text-[11px] font-medium mb-2" style={{ color: "var(--color-text-secondary)" }}>
        You should say:
      </div>
      <ul className="flex flex-col gap-2 mb-4">
        {card.prompts.map((prompt, i) => (
          <li key={i} className="flex gap-2.5 items-start">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5" style={{ background: "var(--color-examiner-soft)", color: "var(--color-examiner)" }}>
              {i + 1}
            </span>
            <span className="text-[14px] leading-relaxed" style={{ color: "var(--color-text)" }}>
              {prompt}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2 pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        <span className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>
          1 minute to prepare, then speak for up to 2 minutes
        </span>
      </div>
    </div>
  );
}

// ─── Voice input button (large, central) ────────────────────────────────────

function VoiceButton({ voice, disabled, size = "md" }: {
  voice: { isSupported: boolean; isRecording: boolean; startRecording: () => void; stopRecording: () => void };
  disabled: boolean;
  size?: "sm" | "md" | "lg";
}) {
  if (!voice.isSupported) return null;

  const dims = size === "lg" ? "w-16 h-16" : size === "md" ? "w-12 h-12" : "w-10 h-10";
  const iconSize = size === "lg" ? 24 : size === "md" ? 20 : 16;

  return (
    <div className="relative flex items-center justify-center">
      {voice.isRecording && (
        <div className="absolute inset-0 rounded-full animate-recording-pulse" style={{ background: "rgba(239,68,68,0.2)" }} />
      )}
      <button
        onClick={voice.isRecording ? voice.stopRecording : voice.startRecording}
        disabled={disabled}
        title={voice.isRecording ? "Stop recording" : "Tap to speak"}
        className={`${dims} rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-40`}
        style={{
          background: voice.isRecording
            ? "linear-gradient(135deg, #ef4444, #dc2626)"
            : "linear-gradient(135deg, var(--color-examiner), var(--color-primary))",
          color: "#fff",
          boxShadow: voice.isRecording
            ? "0 4px 16px rgba(239,68,68,0.3)"
            : "0 4px 16px var(--color-primary-glow)",
        }}
      >
        {voice.isRecording ? (
          <svg width={iconSize * 0.7} height={iconSize * 0.7} viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="3" /></svg>
        ) : (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        )}
      </button>
    </div>
  );
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface IeltsConversationProps {
  scenario: Scenario;
  onClose: () => void;
  onComplete?: () => void;
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function IeltsConversation({
  scenario,
  onClose,
  onComplete,
}: IeltsConversationProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => !!s.user);
  const [phase, setPhase]               = useState<IeltsPhase>("loading");
  const [sessionId, setSessionId]       = useState<string | null>(null);
  const [turns, setTurns]               = useState<ConversationTurn[]>([]);
  const [cueCard, setCueCard]           = useState<IeltsCueCard | null>(null);
  const [part1TurnCount, setPart1TurnCount] = useState(0);
  const [part3TurnCount, setPart3TurnCount] = useState(0);
  const [isTyping, setIsTyping]         = useState(false);
  const [inputText, setInputText]       = useState("");
  const [scores, setScores]             = useState<EndSessionResult | null>(null);
  const [errorMsg, setErrorMsg]         = useState<string | null>(null);

  const startTimeRef  = useRef<number>(Date.now());
  const scrollRef     = useRef<HTMLDivElement>(null);
  const inputRef      = useRef<HTMLTextAreaElement>(null);

  const [examinerSpeaking, setExaminerSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Voice input — populates inputText, user sends manually
  const voice = useVoiceInput(
    useCallback((transcript: string) => {
      setInputText((prev) => (prev ? prev + " " + transcript : transcript));
    }, [])
  );

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns, isTyping, phase]);

  /**
   * Play examiner's question aloud via TTS, then optionally auto-start mic.
   * Gracefully falls back to no audio if TTS is unavailable.
   */
  const playExaminerVoice = useCallback(async (text: string, autoMic = true) => {
    setExaminerSpeaking(true);
    try {
      const blob = await synthesizeSpeech(text);
      if (blob && blob.size > 0) {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          setExaminerSpeaking(false);
          audioRef.current = null;
          // Auto-start mic after examiner finishes speaking
          if (autoMic && voice.isSupported && !voice.isRecording) {
            voice.startRecording();
          }
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          setExaminerSpeaking(false);
          audioRef.current = null;
        };
        await audio.play().catch(() => setExaminerSpeaking(false));
      } else {
        // No TTS — just clear speaking state after a brief moment
        setTimeout(() => setExaminerSpeaking(false), 800);
      }
    } catch {
      setExaminerSpeaking(false);
    }
  }, [voice]);

  /** Natural delay — returns a promise that resolves after a random human-like pause */
  function examinerDelay(): Promise<void> {
    const ms = EXAMINER_DELAY_MIN + Math.random() * (EXAMINER_DELAY_MAX - EXAMINER_DELAY_MIN);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Cleanup TTS audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // ── Session init ──────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Gate behind authentication — exam features require a logged-in user
      if (!useAuthStore.getState().accessToken) {
        setErrorMsg("Please log in to start the exam.");
        setPhase("error");
        return;
      }

      const saved = loadSession(scenario.id);
      if (saved && saved.sessionId) {
        if (!cancelled) {
          setSessionId(saved.sessionId);
          setTurns(saved.turns ?? []);
          setCueCard(saved.cueCard);
          setPart1TurnCount(saved.part1TurnCount ?? 0);
          setPart3TurnCount(saved.part3TurnCount ?? 0);
          setPhase(saved.phase ?? "part1");
        }
        return;
      }

      try {
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

        // Brief pause before revealing part 1 — feels like entering an exam room
        await examinerDelay();
        if (cancelled) return;

        setPhase("part1");
        saveSession({
          scenarioId: scenario.id,
          sessionId: result.sessionId,
          phase: "part1",
          turns: mappedTurns,
          cueCard: null,
          part1TurnCount: 0,
          part3TurnCount: 0,
        });

        // Auto-play TTS for the first examiner question
        const firstAi = mappedTurns.find((t) => t.role === "assistant");
        if (firstAi) {
          playExaminerVoice(firstAi.content, true);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Failed to start session";
        setErrorMsg(msg);
        setPhase("error");
      }
    }

    init();
    return () => { cancelled = true; };
  }, [scenario.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── End session ───────────────────────────────────────────────────────────

  const handleEndSession = useCallback(async (sid: string) => {
    setPhase("ending");
    clearSession();
    try {
      const durationMs = Date.now() - startTimeRef.current;
      // Start scoring + show ending UI for at least 2.5s (feels like real analysis)
      const [result] = await Promise.all([
        endScenarioSession(sid, durationMs),
        new Promise((r) => setTimeout(r, 2500)),
      ]);
      setScores(result as EndSessionResult);
      onComplete?.();
    } catch {
      setScores({ ...SAFE_SCORE_DEFAULTS });
    } finally {
      setPhase("summary");
    }
  }, [onComplete]);

  // ── Send message ──────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const content = inputText.trim();
    if (!sessionId || !content || isTyping) return;

    // Stop recording and TTS if active
    if (voice.isRecording) voice.stopRecording();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setExaminerSpeaking(false);
    }

    setInputText("");
    setIsTyping(true);

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

    const newPart1Count = phase === "part1" ? part1TurnCount + 1 : part1TurnCount;
    const newPart3Count = phase === "part3" ? part3TurnCount + 1 : part3TurnCount;

    try {
      const result = await submitScenarioTurn(sessionId, content);

      // Show user turn immediately, but hold back AI response for natural feel
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

      // Replace optimistic user message with confirmed
      setTurns((prev) => {
        const withoutTemp = prev.filter((t) => t.id !== tempId);
        return [...withoutTemp, userTurn];
      });

      // Natural examiner thinking delay
      await examinerDelay();

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

      const confirmedTurns = [userTurn, aiTurn];

      setTurns((prev) => {
        const withoutTemp = prev.filter((t) => t.id !== tempId && t.id !== userTurn.id);
        return [...withoutTemp, ...confirmedTurns];
      });

      // Play examiner response via TTS (auto-starts mic after)
      playExaminerVoice(result.aiTurn.content, true);

      if (phase === "part1") setPart1TurnCount(newPart1Count);
      if (phase === "part3") setPart3TurnCount(newPart3Count);

      const nextPhase = detectPhaseTransition(
        result.aiTurn.content,
        phase,
        newPart1Count,
        newPart3Count,
      );

      const allTurns = turns.filter((t) => t.id !== tempId).concat(confirmedTurns);

      if (nextPhase === "part2_prep") {
        const card = pickRandomCueCard();
        setCueCard(card);
        setPhase("part2_prep");
        setPart1TurnCount(0);
        saveSession({ scenarioId: scenario.id, sessionId, phase: "part2_prep", turns: allTurns, cueCard: card, part1TurnCount: 0, part3TurnCount: newPart3Count });
      } else if (nextPhase === "part3") {
        setPhase("part3");
        setPart3TurnCount(0);
        saveSession({ scenarioId: scenario.id, sessionId, phase: "part3", turns: allTurns, cueCard, part1TurnCount: newPart1Count, part3TurnCount: 0 });
      } else if (nextPhase === "ending") {
        await handleEndSession(sessionId);
      } else {
        saveSession({ scenarioId: scenario.id, sessionId, phase, turns: allTurns, cueCard, part1TurnCount: newPart1Count, part3TurnCount: newPart3Count });
      }
    } catch {
      setTurns((prev) => prev.filter((t) => t.id !== tempId));
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  }, [sessionId, inputText, isTyping, turns, phase, part1TurnCount, part3TurnCount, cueCard, scenario.id, handleEndSession, voice]);

  // ── Key handler ───────────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Phase handlers ────────────────────────────────────────────────────────

  const handlePrepSkip = () => {
    setPhase("part2_speaking");
    saveSession({ scenarioId: scenario.id, sessionId: sessionId!, phase: "part2_speaking", turns, cueCard, part1TurnCount, part3TurnCount });
  };

  const handleSpeakingEnd = useCallback(async () => {
    if (sessionId && !isTyping) {
      setIsTyping(true);
      try {
        await submitScenarioTurn(sessionId, "[No spoken response provided]");
      } catch { /* ignore */ } finally {
        setIsTyping(false);
      }
    }
    setPhase("part3");
    setPart3TurnCount(0);
    saveSession({ scenarioId: scenario.id, sessionId: sessionId!, phase: "part3", turns, cueCard, part1TurnCount, part3TurnCount: 0 });
  }, [sessionId, isTyping, scenario.id, turns, cueCard, part1TurnCount, part3TurnCount]);

  const handlePrepExpire = useCallback(() => {
    setPhase("part2_speaking");
    saveSession({ scenarioId: scenario.id, sessionId: sessionId!, phase: "part2_speaking", turns, cueCard, part1TurnCount, part3TurnCount });
  }, [scenario.id, sessionId, turns, cueCard, part1TurnCount, part3TurnCount]);

  const handleSpeakingExpire = useCallback(() => {
    handleSpeakingEnd();
  }, [handleSpeakingEnd]);

  const handleManualEnd = useCallback(() => {
    if (sessionId) handleEndSession(sessionId);
  }, [sessionId, handleEndSession]);

  const handleNewTest = useCallback(async () => {
    clearSession();
    setPhase("loading");
    setTurns([]);
    setCueCard(null);
    setPart1TurnCount(0);
    setPart3TurnCount(0);
    setInputText("");
    setScores(null);
    setErrorMsg(null);
    setIsTyping(false);
    startTimeRef.current = Date.now();
    try {
      const result = await startScenarioSession(scenario.id);
      const mappedTurns: ConversationTurn[] = (result.turns ?? []).map((t: { turnIndex: number; role: string; content: string; createdAt: string }) => ({
        id: `init-${t.turnIndex}`,
        turnIndex: t.turnIndex,
        role: t.role as "user" | "assistant",
        content: t.content,
        audioStorageKey: null,
        scores: null,
        feedback: null,
        createdAt: t.createdAt,
      }));
      setSessionId(result.sessionId);
      setTurns(mappedTurns);
      setPhase("part1");
      saveSession({
        scenarioId: scenario.id,
        sessionId: result.sessionId,
        phase: "part1",
        turns: mappedTurns,
        cueCard: null,
        part1TurnCount: 0,
        part3TurnCount: 0,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start session";
      setErrorMsg(msg);
      setPhase("error");
    }
  }, [scenario.id]);

  // ─── Derived state ──────────────────────────────────────────────────────

  // Extract Q&A pairs for transcript
  function extractQAPairs(turnsList: ConversationTurn[]) {
    const pairs: Array<{ question: string; answer: string; index: number }> = [];
    let latestQuestion: string | null = null;
    let qIndex = 0;

    for (let i = 0; i < turnsList.length; i++) {
      const turn = turnsList[i];
      if (turn.role === "assistant") {
        const nextTurn = turnsList[i + 1];
        if (nextTurn && nextTurn.role === "user") {
          qIndex++;
          pairs.push({ question: turn.content, answer: nextTurn.content, index: qIndex });
          i++;
        } else {
          latestQuestion = turn.content;
        }
      }
    }

    return { pairs, latestQuestion };
  }

  // Current part label
  function getActivePart(): string {
    if (phase === "part1") return "part1";
    if (phase === "part2_prep" || phase === "part2_speaking") return "part2";
    return "part3";
  }

  const activePart = getActivePart();
  const partInfo = PART_LABELS[activePart] ?? PART_LABELS.part1;

  // ─── Render ──────────────────────────────────────────────────────────────

  if (phase === "summary" && scores) {
    return <ScenarioSummary result={scores} onClose={onClose} />;
  }

  const showInput = phase === "part1" || phase === "part2_speaking" || phase === "part3";

  const currentQ = phase === "part1" ? part1TurnCount + 1 : phase === "part3" ? part3TurnCount + 1 : 0;
  const totalQ = phase === "part1" ? PART1_MAX_TURNS : PART3_MAX_TURNS;

  return (
    <div
      style={{ background: "var(--color-bg)" }}
      className="fixed inset-0 z-50 flex flex-col bg-exam"
    >
      {/* ── Header ── */}
      <div
        className="shrink-0"
        style={{
          background: "var(--color-bg-card)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
            style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-secondary)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <div className="font-sora font-bold text-[14px]" style={{ color: "var(--color-text)" }}>
              IELTS Speaking Test
            </div>
            <div className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
              {partInfo.name}
            </div>
          </div>

          {phase !== "loading" && phase !== "ending" && phase !== "summary" && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleNewTest}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold hover:opacity-80 transition-opacity"
                style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}
              >
                Restart
              </button>
              {phase === "part3" && (
                <button
                  onClick={handleManualEnd}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold hover:opacity-90 transition-opacity"
                  style={{ background: "var(--color-examiner)", color: "#fff" }}
                >
                  End Test
                </button>
              )}
            </div>
          )}
        </div>

        {/* Progress stepper */}
        {(phase === "part1" || phase === "part2_prep" || phase === "part2_speaking" || phase === "part3") && (
          <div className="flex items-center justify-between px-4 pb-3">
            <ProgressStepper phase={phase} part1TurnCount={part1TurnCount} part3TurnCount={part3TurnCount} />
            {(phase === "part1" || phase === "part3") && (
              <QuestionCounter current={currentQ} total={totalQ} />
            )}
          </div>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto px-4 py-5 flex flex-col gap-5">

          {/* Loading — entering the exam room */}
          {phase === "loading" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 py-20 animate-phase-in">
              <div className="relative">
                <ExaminerAvatar size="md" speaking />
                <div className="absolute -inset-3 rounded-full animate-examiner-pulse" style={{ background: "var(--color-examiner-soft)", opacity: 0.3 }} />
              </div>
              <div className="text-center">
                <p className="font-sora font-bold text-[17px]" style={{ color: "var(--color-text)" }}>
                  Entering exam room...
                </p>
                <p className="text-[13px] mt-2 max-w-[280px] mx-auto leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                  Your examiner is reviewing your profile. The test will begin shortly.
                </p>
              </div>
              <div className="flex gap-1.5 mt-2">
                {[0, 200, 400].map((delay) => (
                  <span key={delay} style={{ background: "var(--color-examiner)", animationDelay: `${delay}ms` }} className="w-2 h-2 rounded-full animate-typing-dot opacity-60" />
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {phase === "error" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
              <div className="text-[40px]">{!isAuthenticated ? "🔒" : "⚠️"}</div>
              <div style={{ color: "var(--color-warning)" }} className="text-lg font-medium text-center">
                {errorMsg || "Something went wrong"}
              </div>
              <div className="flex gap-3">
                {!isAuthenticated && (
                  <button
                    onClick={() => router.push("/login")}
                    className="px-6 py-2.5 rounded-xl text-[14px] font-semibold transition-all"
                    style={{ background: "var(--color-examiner)", color: "#fff" }}
                  >
                    Sign In
                  </button>
                )}
                <button onClick={onClose} style={{ color: "var(--color-examiner)" }} className="underline text-[15px]">
                  Go back
                </button>
              </div>
            </div>
          )}

          {/* Ending — score analysis moment */}
          {phase === "ending" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 py-20 animate-phase-in">
              <div className="relative">
                <ExaminerAvatar speaking />
                <div className="absolute -inset-4 rounded-full" style={{ background: "var(--color-examiner-soft)", opacity: 0.15, animation: "examinerPulse 2s ease-in-out infinite" }} />
              </div>
              <div className="text-center">
                <p className="font-sora font-bold text-[17px]" style={{ color: "var(--color-text)" }}>
                  That concludes the speaking test
                </p>
                <p className="text-[13px] mt-2 max-w-[260px] mx-auto leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                  Your examiner is analysing your fluency, vocabulary, and grammar...
                </p>
              </div>
              {/* Animated score bars loading */}
              <div className="w-48 flex flex-col gap-2 mt-2">
                {["Fluency", "Vocabulary", "Grammar"].map((label, i) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-[10px] w-16 text-right" style={{ color: "var(--color-text-secondary)" }}>{label}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          background: "var(--color-examiner)",
                          animation: `scoreBarLoad 2s ease-in-out ${i * 0.3}s infinite`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Part 2 Prep ── */}
          {phase === "part2_prep" && cueCard && (
            <div className="flex flex-col gap-5 animate-phase-in">
              <CueCardDisplay card={cueCard} />
              <div className="flex flex-col items-center gap-4">
                <IeltsTimer seconds={PREP_SECONDS} onExpire={handlePrepExpire} label="Preparation time" />
                <button
                  onClick={handlePrepSkip}
                  className="px-8 py-3 rounded-xl text-[14px] font-semibold hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "var(--color-examiner)", color: "#fff", boxShadow: "0 4px 16px var(--color-primary-glow)" }}
                >
                  I&apos;m Ready — Start Speaking
                </button>
              </div>
            </div>
          )}

          {/* ── Part 2 Speaking ── */}
          {phase === "part2_speaking" && cueCard && (
            <div className="flex flex-col gap-5 animate-phase-in">
              <CueCardDisplay card={cueCard} />
              <div className="flex flex-col items-center gap-4">
                <IeltsTimer seconds={SPEAKING_SECONDS} onExpire={handleSpeakingExpire} label="Speaking time remaining" />

                {/* Central mic button for Part 2 */}
                <VoiceButton voice={voice} disabled={isTyping} size="lg" />

                {voice.isRecording && voice.interimTranscript && (
                  <div
                    className="px-4 py-2 rounded-xl text-[14px] italic text-center max-w-sm"
                    style={{ background: "var(--color-examiner-soft)", color: "var(--color-text)" }}
                  >
                    {voice.interimTranscript}
                  </div>
                )}

                <button
                  onClick={handleSpeakingEnd}
                  disabled={isTyping}
                  className="px-6 py-2 rounded-xl text-[13px] font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
                  style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                >
                  Finish Speaking
                </button>
              </div>
            </div>
          )}

          {/* ── Part 1 & 3: Exam Q&A interface ── */}
          {(phase === "part1" || phase === "part3") && (() => {
            const { pairs, latestQuestion } = extractQAPairs(turns);
            return (
              <div className="flex flex-col gap-5">
                {/* Part description on first question */}
                {pairs.length === 0 && (
                  <div className="text-center py-2 animate-phase-in">
                    <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
                      {partInfo.desc}
                    </p>
                  </div>
                )}

                {/* Previous Q&A transcript */}
                {pairs.length > 0 && (
                  <div
                    className="rounded-2xl p-4 flex flex-col gap-4"
                    style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
                      Session Transcript
                    </div>
                    {pairs.map((pair) => (
                      <TranscriptEntry key={pair.index} question={pair.question} answer={pair.answer} index={pair.index} />
                    ))}
                  </div>
                )}

                {/* Current question from examiner */}
                {latestQuestion && (
                  <ExaminerQuestion content={latestQuestion} isSpeaking={examinerSpeaking} />
                )}

                {/* Thinking indicator */}
                {isTyping && (
                  <div className="flex items-center gap-3 px-2">
                    <ExaminerAvatar size="sm" speaking />
                    <div className="flex gap-1.5">
                      {[0, 200, 400].map((delay) => (
                        <span key={delay} style={{ background: "var(--color-examiner)", animationDelay: `${delay}ms` }} className="w-2 h-2 rounded-full animate-typing-dot opacity-60" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      </div>

      {/* ── Input area ── */}
      {showInput && (
        <div
          className="shrink-0"
          style={{ background: "var(--color-bg-card)", borderTop: "1px solid var(--color-border)" }}
        >
          <div className="max-w-xl mx-auto px-4 py-3.5">
            {/* Label */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-primary)" }}>
                Your Answer
              </span>
              {voice.isRecording && (
                <span className="text-[10px] font-semibold flex items-center gap-1.5" style={{ color: "#ef4444" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  Recording
                </span>
              )}
            </div>

            {/* Live transcript */}
            {voice.isRecording && voice.interimTranscript && (
              <div
                className="mb-2 px-3 py-2 rounded-xl text-[13px] italic"
                style={{ background: "var(--color-examiner-soft)", color: "var(--color-text)" }}
              >
                {voice.interimTranscript}
              </div>
            )}

            {/* Input row */}
            <div className="flex items-end gap-2">
              <VoiceButton voice={voice} disabled={isTyping} size="sm" />

              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type or speak your answer..."
                rows={2}
                className="flex-1 resize-none rounded-xl px-3.5 py-2.5 text-[15px] outline-none transition-colors placeholder:opacity-40"
                style={{
                  background: "var(--color-bg-secondary)",
                  color: "var(--color-text)",
                  border: "1px solid var(--color-border)",
                }}
              />

              <button
                onClick={() => handleSend()}
                disabled={!inputText.trim() || isTyping}
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 disabled:opacity-30"
                style={{
                  background: inputText.trim() && !isTyping ? "var(--color-examiner)" : "var(--color-border)",
                  color: inputText.trim() && !isTyping ? "#fff" : "var(--color-text-secondary)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
            </div>

            {!voice.isSupported && (
              <p className="text-[11px] mt-2 text-center" style={{ color: "var(--color-text-secondary)" }}>
                Voice input requires Chrome or Edge. You can type your answers instead.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
