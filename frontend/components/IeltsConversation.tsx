"use client";

/**
 * IeltsConversation.tsx
 *
 * Full IELTS Speaking test simulation (Part 1 → Part 2 → Part 3 → Summary).
 * Premium chat UI with voice input that populates the input field (user sends manually).
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  startScenarioSession,
  submitScenarioTurn,
  endScenarioSession,
} from "@/lib/api";
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

// ─── Cue cards ─────────────────────────────────────────────────────────────

const CUE_CARDS: IeltsCueCard[] = [
  {
    topic: "Describe a place you would like to visit",
    prompts: ["Where the place is", "How you heard about it", "What you would do there", "Why you would like to visit it"],
  },
  {
    topic: "Describe a person who has inspired you",
    prompts: ["Who this person is", "How you know them", "What they have done that inspired you", "Why they have been important to you"],
  },
  {
    topic: "Describe a skill you would like to learn",
    prompts: ["What the skill is", "Why you want to learn it", "How you would learn it", "How useful this skill would be for you"],
  },
  {
    topic: "Describe a memorable journey you have made",
    prompts: ["Where you went", "Who you went with", "What happened during the journey", "Why this journey was memorable"],
  },
  {
    topic: "Describe a book or film you have enjoyed",
    prompts: ["What it is about", "When you read or watched it", "What you liked about it", "Why you would recommend it to others"],
  },
  {
    topic: "Describe a time you helped someone",
    prompts: ["Who you helped", "Why they needed help", "How you helped them", "How you felt afterwards"],
  },
  {
    topic: "Describe a tradition in your country",
    prompts: ["What the tradition is", "How long it has existed", "How it is celebrated or practised", "Why it is important"],
  },
  {
    topic: "Describe a piece of technology you use often",
    prompts: ["What it is", "How often you use it", "What you use it for", "Why it is important to you"],
  },
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

// ─── Part indicator ─────────────────────────────────────────────────────────

function PartIndicator({ phase, part1TurnCount, part3TurnCount }: { phase: IeltsPhase; part1TurnCount: number; part3TurnCount: number }) {
  const parts = [
    { key: "part1", label: "Introduction", number: 1 },
    { key: "part2", label: "Long Turn", number: 2 },
    { key: "part3", label: "Discussion", number: 3 },
  ];

  function getActivePart(p: IeltsPhase): string {
    if (p === "part1") return "part1";
    if (p === "part2_prep" || p === "part2_speaking") return "part2";
    return "part3";
  }

  const active = getActivePart(phase);

  function getQuestionLabel(): string | null {
    if (active === "part1") return `Q${part1TurnCount + 1} of ${PART1_MAX_TURNS}`;
    if (active === "part3") return `Q${part3TurnCount + 1} of ${PART3_MAX_TURNS}`;
    return null;
  }

  const qLabel = getQuestionLabel();

  return (
    <div className="flex items-center justify-center gap-2 py-4 px-5">
      {parts.map((p, i) => {
        const isActive = p.key === active;
        const isPast =
          (p.key === "part1" && (active === "part2" || active === "part3")) ||
          (p.key === "part2" && active === "part3");
        return (
          <React.Fragment key={p.key}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold transition-all duration-300"
                style={{
                  background: isActive
                    ? "var(--color-primary)"
                    : isPast
                    ? "var(--color-success)"
                    : "var(--color-border)",
                  color: isActive || isPast ? "#fff" : "var(--color-text-secondary)",
                  boxShadow: isActive ? "0 0 12px var(--color-primary-glow)" : "none",
                }}
              >
                {isPast ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  p.number
                )}
              </div>
              <span
                className="text-[10px] font-semibold"
                style={{ color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)" }}
              >
                {p.label}
              </span>
              {isActive && qLabel && (
                <span className="text-[9px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
                  {qLabel}
                </span>
              )}
            </div>
            {i < parts.length - 1 && (
              <div
                className="flex-1 h-0.5 max-w-[40px] rounded-full mt-[-20px]"
                style={{ background: isPast ? "var(--color-success)" : "var(--color-border)" }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Exam UI components ─────────────────────────────────────────────────────

function extractQAPairs(turns: ConversationTurn[]): {
  pairs: Array<{ question: string; answer: string; index: number }>;
  latestQuestion: string | null;
} {
  const pairs: Array<{ question: string; answer: string; index: number }> = [];
  let latestQuestion: string | null = null;
  let qIndex = 0;

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    if (turn.role === "assistant") {
      const nextTurn = turns[i + 1];
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

function ExamQuestionBlock({ content }: { content: string }) {
  return (
    <div
      className="mx-5 rounded-2xl p-5 animate-message-in"
      style={{
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border)",
        borderLeft: "4px solid var(--color-primary)",
      }}
    >
      <div
        className="text-[11px] font-bold uppercase tracking-wider mb-2"
        style={{ color: "var(--color-primary)" }}
      >
        Question
      </div>
      <p
        className="text-[16px] font-medium leading-relaxed"
        style={{ color: "var(--color-text)" }}
      >
        {content}
      </p>
    </div>
  );
}

function CompactQAHistory({ pairs }: { pairs: Array<{ question: string; answer: string; index: number }> }) {
  if (pairs.length === 0) return null;
  return (
    <div
      className="mx-5 rounded-2xl p-4 flex flex-col gap-3 max-h-[200px] overflow-y-auto"
      style={{
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
        Previous Questions
      </div>
      {pairs.map((pair) => (
        <div key={pair.index} className="flex flex-col gap-0.5">
          <div className="text-[12px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
            Q{pair.index}: {pair.question}
          </div>
          <div className="text-[12px]" style={{ color: "var(--color-text-secondary)", opacity: 0.7 }}>
            A: {pair.answer}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Cue card display ───────────────────────────────────────────────────────

function CueCardDisplay({ card }: { card: IeltsCueCard }) {
  return (
    <div
      className="mx-5 rounded-2xl p-5 mb-2"
      style={{
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div
        className="text-[11px] font-bold uppercase tracking-wider mb-2.5"
        style={{ color: "var(--color-primary)" }}
      >
        Cue Card — Part 2
      </div>
      <p
        className="text-[15px] font-semibold mb-3 leading-snug"
        style={{ color: "var(--color-text)" }}
      >
        {card.topic}
      </p>
      <ul className="flex flex-col gap-2">
        {card.prompts.map((prompt, i) => (
          <li key={i} className="flex gap-2 items-start">
            <span className="mt-0.5 shrink-0 text-[10px]" style={{ color: "var(--color-primary)" }}>▸</span>
            <span className="text-[13px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              {prompt}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] mt-3.5" style={{ color: "var(--color-text-secondary)" }}>
        You will have 1 minute to prepare, then speak for up to 2 minutes.
      </p>
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
  const chatEndRef    = useRef<HTMLDivElement>(null);
  const inputRef      = useRef<HTMLTextAreaElement>(null);

  // Voice input — populates inputText, user sends manually
  const voice = useVoiceInput(
    useCallback((transcript: string) => {
      setInputText((prev) => (prev ? prev + " " + transcript : transcript));
    }, [])
  );

  // Auto-scroll on new turns
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, isTyping]);

  // ── Session init ──────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function init() {
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
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Failed to start session";
        setErrorMsg(msg);
        setPhase("error");
      }
    }

    init();
    return () => { cancelled = true; };
  }, [scenario.id]);

  // ── End session ───────────────────────────────────────────────────────────

  const handleEndSession = useCallback(async (sid: string) => {
    setPhase("ending");
    clearSession();
    try {
      const durationMs = Date.now() - startTimeRef.current;
      const result = await endScenarioSession(sid, durationMs);
      setScores(result);
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

      const confirmedTurns: ConversationTurn[] = [
        {
          id: `user-${result.userTurn.turnIndex}`,
          turnIndex: result.userTurn.turnIndex,
          role: "user",
          content: result.userTurn.content,
          audioStorageKey: null,
          scores: null,
          feedback: null,
          createdAt: result.userTurn.createdAt,
        },
        {
          id: `ai-${result.aiTurn.turnIndex}`,
          turnIndex: result.aiTurn.turnIndex,
          role: "assistant",
          content: result.aiTurn.content,
          audioStorageKey: null,
          scores: null,
          feedback: null,
          createdAt: result.aiTurn.createdAt,
        },
      ];

      setTurns((prev) => {
        const withoutTemp = prev.filter((t) => t.id !== tempId);
        return [...withoutTemp, ...confirmedTurns];
      });

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
  }, [sessionId, inputText, isTyping, turns, phase, part1TurnCount, part3TurnCount, cueCard, scenario.id, handleEndSession]);

  // ── Key handler ───────────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Part 2 prep skip ──────────────────────────────────────────────────────

  const handlePrepSkip = () => {
    setPhase("part2_speaking");
    saveSession({ scenarioId: scenario.id, sessionId: sessionId!, phase: "part2_speaking", turns, cueCard, part1TurnCount, part3TurnCount });
  };

  // ── Part 2 speaking end ───────────────────────────────────────────────────

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

  // ─── Render ──────────────────────────────────────────────────────────────

  if (phase === "summary" && scores) {
    return <ScenarioSummary result={scores} onClose={onClose} />;
  }

  const showInput = phase === "part1" || phase === "part2_speaking" || phase === "part3";
  const showEndButton = phase === "part3";

  return (
    <div
      style={{ background: "var(--color-bg)" }}
      className="fixed inset-0 z-50 flex flex-col bg-exam"
    >
      {/* ── Header ── */}
      <div
        style={{
          background: "var(--color-bg-card)",
          borderBottom: "1px solid var(--color-border)",
        }}
        className="shrink-0"
      >
        <div className="flex items-center gap-3 px-5 py-3.5">
          <button
            onClick={onClose}
            style={{ color: "var(--color-text-secondary)" }}
            className="text-xl hover:opacity-70 transition-opacity"
          >
            ✕
          </button>
          <div className="flex-1 min-w-0">
            <div style={{ color: "var(--color-text)" }} className="font-semibold text-[15px] truncate">
              IELTS Speaking Test
            </div>
            <div style={{ color: "var(--color-text-secondary)" }} className="text-[12px]">
              {phase === "part1" ? "Part 1 — Introduction"
                : phase === "part2_prep" || phase === "part2_speaking" ? "Part 2 — Long Turn"
                : phase === "part3" ? "Part 3 — Discussion"
                : "Exam"}
            </div>
          </div>
          {phase !== "loading" && phase !== "ending" && phase !== "summary" && (
            <button
              onClick={handleNewTest}
              style={{
                background: "var(--color-bg-secondary)",
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border)",
              }}
              className="px-3 py-2 rounded-xl text-[12px] font-semibold hover:opacity-80 transition-opacity shrink-0"
            >
              New Test
            </button>
          )}
          {showEndButton && (
            <button
              onClick={handleManualEnd}
              style={{ background: "var(--color-primary)", color: "#fff" }}
              className="px-4 py-2 rounded-xl text-[13px] font-semibold hover:opacity-90 transition-opacity shrink-0"
            >
              End Test
            </button>
          )}
        </div>

        {(phase === "part1" || phase === "part2_prep" || phase === "part2_speaking" || phase === "part3") && (
          <PartIndicator phase={phase} part1TurnCount={part1TurnCount} part3TurnCount={part3TurnCount} />
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto flex flex-col">

        {phase === "loading" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-primary)" }} />
          </div>
        )}

        {phase === "error" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-5">
            <div style={{ color: "var(--color-warning)" }} className="text-lg">{errorMsg || "Something went wrong"}</div>
            <button onClick={onClose} style={{ color: "var(--color-primary)" }} className="underline text-[15px]">Go back</button>
          </div>
        )}

        {phase === "ending" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-primary)" }} />
            <div style={{ color: "var(--color-text-secondary)" }} className="text-[15px]">Analysing your test...</div>
          </div>
        )}

        {/* Part 2 Prep */}
        {phase === "part2_prep" && cueCard && (
          <div className="flex flex-col gap-4 pt-5">
            <CueCardDisplay card={cueCard} />
            <div className="flex flex-col items-center gap-3 px-5">
              <IeltsTimer seconds={PREP_SECONDS} onExpire={handlePrepExpire} label="Preparation time" />
              <button
                onClick={handlePrepSkip}
                style={{ background: "var(--color-primary)", color: "#fff" }}
                className="px-6 py-2.5 rounded-xl text-[14px] font-semibold hover:opacity-90 transition-opacity"
              >
                Start Speaking
              </button>
            </div>
          </div>
        )}

        {/* Part 2 Speaking */}
        {phase === "part2_speaking" && cueCard && (
          <div className="flex flex-col gap-4 pt-4">
            <CueCardDisplay card={cueCard} />
            <div className="flex flex-col items-center gap-2.5 px-5">
              <IeltsTimer seconds={SPEAKING_SECONDS} onExpire={handleSpeakingExpire} label="Speaking time" />
              <button
                onClick={handleSpeakingEnd}
                disabled={isTyping}
                style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                className="px-5 py-2 rounded-xl text-[13px] font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                I&apos;m Done Speaking
              </button>
            </div>
          </div>
        )}

        {/* Exam Q&A interface (Parts 1 & 3) */}
        {(phase === "part1" || phase === "part3") && (() => {
          const { pairs, latestQuestion } = extractQAPairs(turns);
          return (
            <div className="flex flex-col gap-4 py-5">
              <CompactQAHistory pairs={pairs} />
              {latestQuestion && <ExamQuestionBlock content={latestQuestion} />}
              {isTyping && (
                <div className="flex justify-center py-3">
                  <div className="flex gap-1.5">
                    {[0, 200, 400].map((delay) => (
                      <span key={delay} style={{ background: "var(--color-text-secondary)", animationDelay: `${delay}ms` }} className="w-2 h-2 rounded-full animate-typing-dot" />
                    ))}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          );
        })()}

        {/* Part 2 speaking — keep chat style for free-form talk */}
        {phase === "part2_speaking" && (
          <div className="px-5 py-5 space-y-4">
            {turns.map((turn) => (
              <div
                key={turn.id}
                className={`flex animate-message-in ${turn.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  style={{
                    background: turn.role === "user" ? "var(--color-primary)" : "var(--color-bg-card)",
                    color: turn.role === "user" ? "#fff" : "var(--color-text)",
                    border: turn.role === "assistant" ? "1px solid var(--color-border)" : "none",
                    borderLeft: turn.role === "assistant" ? "3px solid var(--color-accent)" : "none",
                  }}
                  className={`max-w-[70%] px-4 py-3 text-[15px] leading-relaxed ${
                    turn.role === "user" ? "rounded-2xl rounded-br-md" : "rounded-2xl rounded-bl-md"
                  }`}
                >
                  {turn.content}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start animate-message-in">
                <div
                  style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
                  className="px-4 py-3 rounded-2xl rounded-bl-md"
                >
                  <div className="flex gap-1.5">
                    {[0, 200, 400].map((delay) => (
                      <span key={delay} style={{ background: "var(--color-text-secondary)", animationDelay: `${delay}ms` }} className="w-2 h-2 rounded-full animate-typing-dot" />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* ── Input area ── */}
      {showInput && (
        <div
          style={{ background: "var(--color-bg-card)", borderTop: "1px solid var(--color-border)" }}
          className="px-5 py-4 shrink-0"
        >
          {phase !== "part2_speaking" && (
            <div
              className="text-[11px] font-bold uppercase tracking-wider mb-2"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Your Answer
            </div>
          )}

          {phase === "part2_speaking" && (
            <div style={{ color: "var(--color-text-secondary)" }} className="text-[12px] text-center mb-3">
              Tap the mic to speak, or type your response below
            </div>
          )}

          {/* Live transcript preview */}
          {voice.isRecording && voice.interimTranscript && (
            <div
              className="mb-3 px-3 py-2 rounded-xl text-[13px] italic"
              style={{ background: "var(--color-primary-soft)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}
            >
              🎤 &ldquo;{voice.interimTranscript}&rdquo;
            </div>
          )}

          <div className="flex items-end gap-2.5">
            {voice.isSupported && (
              <button
                onClick={voice.isRecording ? voice.stopRecording : voice.startRecording}
                disabled={isTyping}
                title={voice.isRecording ? "Stop recording" : "Speak your answer"}
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-50"
                style={{
                  background: voice.isRecording ? "#ef4444" : "var(--color-primary-soft)",
                  color: voice.isRecording ? "#fff" : "var(--color-primary)",
                  boxShadow: voice.isRecording ? "0 0 12px rgba(239,68,68,0.3)" : "none",
                }}
              >
                {voice.isRecording ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                )}
              </button>
            )}

            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Answer the question above..."
              rows={2}
              disabled={isTyping}
              style={{
                background: "var(--color-primary-soft)",
                color: "var(--color-text)",
                border: "1px solid var(--color-border)",
              }}
              className="flex-1 resize-none rounded-xl px-4 py-3 text-[15px] outline-none focus:border-[color:var(--color-primary)] transition-colors placeholder:opacity-50"
            />
          </div>

          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim() || isTyping}
            style={{
              background: inputText.trim() && !isTyping ? "var(--color-primary)" : "var(--color-border)",
              color: inputText.trim() && !isTyping ? "#fff" : "var(--color-text-secondary)",
            }}
            className="w-full mt-3 py-3 rounded-xl font-semibold text-[14px] transition-colors disabled:opacity-50"
          >
            Submit Answer
          </button>

          {!voice.isSupported && (
            <p className="text-[11px] mt-2 text-center" style={{ color: "var(--color-text-secondary)" }}>
              Voice input requires Chrome or Edge.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
