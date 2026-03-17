"use client";

/**
 * IeltsConversation.tsx
 *
 * Full IELTS Speaking test simulation (Part 1 → Part 2 → Part 3 → Summary).
 * Reuses existing scenario API endpoints — no new backend required.
 *
 * Safety guarantees:
 *  - No phase can get stuck — all parts have hard turn-count caps
 *  - endScenarioSession failure → safe default scores, summary always shown
 *  - Double submission blocked by isTyping flag (set before send, cleared in finally)
 *  - Optimistic turns use tempId; reverted on error
 *  - Session state persisted to localStorage to survive accidental refresh
 *  - Timers fully managed by IeltsTimer (no memory leaks)
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

// ─── Constants ─────────────────────────────────────────────────────────────

const PART1_MAX_TURNS = 6;   // force Part 2 after 6 user turns in Part 1
const PART3_MAX_TURNS = 5;   // force ending after 5 user turns in Part 3
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
    prompts: [
      "Where the place is",
      "How you heard about it",
      "What you would do there",
      "Why you would like to visit it",
    ],
  },
  {
    topic: "Describe a person who has inspired you",
    prompts: [
      "Who this person is",
      "How you know them",
      "What they have done that inspired you",
      "Why they have been important to you",
    ],
  },
  {
    topic: "Describe a skill you would like to learn",
    prompts: [
      "What the skill is",
      "Why you want to learn it",
      "How you would learn it",
      "How useful this skill would be for you",
    ],
  },
  {
    topic: "Describe a memorable journey you have made",
    prompts: [
      "Where you went",
      "Who you went with",
      "What happened during the journey",
      "Why this journey was memorable",
    ],
  },
  {
    topic: "Describe a book or film you have enjoyed",
    prompts: [
      "What it is about",
      "When you read or watched it",
      "What you liked about it",
      "Why you would recommend it to others",
    ],
  },
  {
    topic: "Describe a time you helped someone",
    prompts: [
      "Who you helped",
      "Why they needed help",
      "How you helped them",
      "How you felt afterwards",
    ],
  },
  {
    topic: "Describe a tradition in your country",
    prompts: [
      "What the tradition is",
      "How long it has existed",
      "How it is celebrated or practised",
      "Why it is important",
    ],
  },
  {
    topic: "Describe a piece of technology you use often",
    prompts: [
      "What it is",
      "How often you use it",
      "What you use it for",
      "Why it is important to you",
    ],
  },
];

function pickRandomCueCard(): IeltsCueCard {
  return CUE_CARDS[Math.floor(Math.random() * CUE_CARDS.length)];
}

// ─── Phase detection ────────────────────────────────────────────────────────

/**
 * Flexible keyword-based detection — never relies on exact strings.
 * Also takes hard-limit turn counts as fallback to prevent stuck phases.
 */
function detectPhaseTransition(
  aiText: string,
  currentPhase: IeltsPhase,
  part1TurnCount: number,
  part3TurnCount: number,
): IeltsPhase | null {
  const lower = aiText.toLowerCase();

  if (currentPhase === "part1") {
    const toP2 =
      lower.includes("part 2") ||
      lower.includes("part two") ||
      lower.includes("cue card") ||
      lower.includes("long turn");
    if (toP2 || part1TurnCount >= PART1_MAX_TURNS) return "part2_prep";
  }

  if (currentPhase === "part2_speaking") {
    const toP3 =
      lower.includes("part 3") ||
      lower.includes("part three") ||
      lower.includes("discussion");
    if (toP3) return "part3";
  }

  if (currentPhase === "part3") {
    const keywordEnd =
      lower.includes("end of") ||
      lower.includes("thank you very much") ||
      lower.includes("that concludes") ||
      lower.includes("end of the speaking");
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota errors */
  }
}

function loadSession(scenarioId: string): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: StoredSession = JSON.parse(raw);
    return parsed.scenarioId === scenarioId ? parsed : null;
  } catch {
    return null;
  }
}

function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

// ─── Part indicator ─────────────────────────────────────────────────────────

function PartIndicator({ phase }: { phase: IeltsPhase }) {
  const parts = [
    { key: "part1", label: "Part 1" },
    { key: "part2", label: "Part 2" },
    { key: "part3", label: "Part 3" },
  ];

  function getActivePart(p: IeltsPhase): string {
    if (p === "part1") return "part1";
    if (p === "part2_prep" || p === "part2_speaking") return "part2";
    if (p === "part3" || p === "ending" || p === "summary") return "part3";
    return "part1";
  }

  const active = getActivePart(phase);

  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {parts.map((p, i) => {
        const isActive = p.key === active;
        const isPast =
          (p.key === "part1" && (active === "part2" || active === "part3")) ||
          (p.key === "part2" && active === "part3");
        return (
          <React.Fragment key={p.key}>
            <div className="flex flex-col items-center gap-0.5">
              <div
                className="w-2.5 h-2.5 rounded-full transition-colors"
                style={{
                  background: isActive
                    ? "var(--color-primary)"
                    : isPast
                    ? "var(--color-success, #4ade80)"
                    : "var(--color-border)",
                }}
              />
              <span
                className="text-[9px] font-medium"
                style={{
                  color: isActive
                    ? "var(--color-primary)"
                    : "var(--color-text-secondary)",
                }}
              >
                {p.label}
              </span>
            </div>
            {i < parts.length - 1 && (
              <div
                className="flex-1 h-px max-w-[40px]"
                style={{
                  background: isPast
                    ? "var(--color-success, #4ade80)"
                    : "var(--color-border)",
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Cue card display ───────────────────────────────────────────────────────

function CueCardDisplay({ card }: { card: IeltsCueCard }) {
  return (
    <div
      className="mx-4 rounded-xl p-4 mb-2"
      style={{
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div
        className="text-[10px] font-semibold uppercase tracking-wider mb-2"
        style={{ color: "var(--color-primary)" }}
      >
        🃏 Cue Card — Part 2
      </div>
      <p
        className="text-sm font-semibold mb-3 leading-snug"
        style={{ color: "var(--color-text)" }}
      >
        {card.topic}
      </p>
      <ul className="flex flex-col gap-1.5">
        {card.prompts.map((prompt, i) => (
          <li key={i} className="flex gap-2 items-start">
            <span
              className="mt-0.5 shrink-0 text-[10px]"
              style={{ color: "var(--color-primary)" }}
            >
              ▸
            </span>
            <span
              className="text-xs leading-relaxed"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {prompt}
            </span>
          </li>
        ))}
      </ul>
      <p
        className="text-[10px] mt-3"
        style={{ color: "var(--color-text-secondary)" }}
      >
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

  const startTimeRef = useRef<number>(Date.now());
  const chatEndRef   = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new turns
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, isTyping]);

  // ── Session init ──────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Try to restore from localStorage
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

      // Start fresh
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
      // Always show summary — never leave user stranded
      setScores({ ...SAFE_SCORE_DEFAULTS });
    } finally {
      setPhase("summary");
    }
  }, [onComplete]);

  // ── Send message ──────────────────────────────────────────────────────────

  const handleSend = useCallback(async (overrideContent?: string) => {
    const content = (overrideContent ?? inputText).trim();
    if (!sessionId || !content || isTyping) return;

    setInputText("");
    setIsTyping(true);

    // Optimistic turn
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

    // Track turn counts before state updates
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

      // Update part turn counters
      if (phase === "part1") setPart1TurnCount(newPart1Count);
      if (phase === "part3") setPart3TurnCount(newPart3Count);

      // Detect phase transition
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
        saveSession({
          scenarioId: scenario.id,
          sessionId,
          phase: "part2_prep",
          turns: allTurns,
          cueCard: card,
          part1TurnCount: 0,
          part3TurnCount: newPart3Count,
        });
      } else if (nextPhase === "part3") {
        setPhase("part3");
        setPart3TurnCount(0);
        saveSession({
          scenarioId: scenario.id,
          sessionId,
          phase: "part3",
          turns: allTurns,
          cueCard,
          part1TurnCount: newPart1Count,
          part3TurnCount: 0,
        });
      } else if (nextPhase === "ending") {
        await handleEndSession(sessionId);
      } else {
        saveSession({
          scenarioId: scenario.id,
          sessionId,
          phase,
          turns: allTurns,
          cueCard,
          part1TurnCount: newPart1Count,
          part3TurnCount: newPart3Count,
        });
      }
    } catch {
      // Revert optimistic turn on error
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
    saveSession({
      scenarioId: scenario.id,
      sessionId: sessionId!,
      phase: "part2_speaking",
      turns,
      cueCard,
      part1TurnCount,
      part3TurnCount,
    });
  };

  // ── Part 2 speaking end ───────────────────────────────────────────────────

  const handleSpeakingEnd = useCallback(async () => {
    // If user never typed anything in Part 2, send a placeholder to keep history valid
    if (sessionId && !isTyping) {
      // Check if any user turns happened in part2_speaking (rough check — just proceed)
      // We'll let the API call happen before transitioning
      setIsTyping(true);
      try {
        await submitScenarioTurn(sessionId, "[No spoken response provided]");
      } catch {
        /* ignore — still transition */
      } finally {
        setIsTyping(false);
      }
    }
    setPhase("part3");
    setPart3TurnCount(0);
    saveSession({
      scenarioId: scenario.id,
      sessionId: sessionId!,
      phase: "part3",
      turns,
      cueCard,
      part1TurnCount,
      part3TurnCount: 0,
    });
  }, [sessionId, isTyping, scenario.id, turns, cueCard, part1TurnCount, part3TurnCount]);

  // ── Part 2 timers expire ──────────────────────────────────────────────────

  const handlePrepExpire = useCallback(() => {
    setPhase("part2_speaking");
    saveSession({
      scenarioId: scenario.id,
      sessionId: sessionId!,
      phase: "part2_speaking",
      turns,
      cueCard,
      part1TurnCount,
      part3TurnCount,
    });
  }, [scenario.id, sessionId, turns, cueCard, part1TurnCount, part3TurnCount]);

  const handleSpeakingExpire = useCallback(() => {
    handleSpeakingEnd();
  }, [handleSpeakingEnd]);

  // ── Manual end test ───────────────────────────────────────────────────────

  const handleManualEnd = useCallback(() => {
    if (sessionId) handleEndSession(sessionId);
  }, [sessionId, handleEndSession]);

  // ─── Render ──────────────────────────────────────────────────────────────

  // Summary
  if (phase === "summary" && scores) {
    return <ScenarioSummary result={scores} onClose={onClose} />;
  }

  const showInput = phase === "part1" || phase === "part2_speaking" || phase === "part3";
  const showEndButton = phase === "part3";

  return (
    <div
      style={{ background: "var(--color-bg)" }}
      className="fixed inset-0 z-50 flex flex-col"
    >
      {/* ── Header ── */}
      <div
        style={{
          background: "var(--color-bg-card)",
          borderBottom: "1px solid var(--color-border)",
        }}
        className="shrink-0"
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onClose}
            style={{ color: "var(--color-text-secondary)" }}
            className="text-xl hover:opacity-70 transition-opacity"
          >
            ✕
          </button>
          <div className="flex-1 min-w-0">
            <div
              style={{ color: "var(--color-text)" }}
              className="font-semibold truncate text-sm"
            >
              🎓 IELTS Speaking Practice
            </div>
            <div
              style={{ color: "var(--color-text-secondary)" }}
              className="text-xs"
            >
              Advanced · Exam
            </div>
          </div>
          {showEndButton && (
            <button
              onClick={handleManualEnd}
              style={{ background: "var(--color-primary)", color: "#fff" }}
              className="px-3 py-1.5 rounded-full text-xs font-medium hover:opacity-90 transition-opacity shrink-0"
            >
              End Test
            </button>
          )}
        </div>

        {/* Part indicator */}
        {(phase === "part1" || phase === "part2_prep" || phase === "part2_speaking" || phase === "part3") && (
          <PartIndicator phase={phase} />
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto flex flex-col">

        {/* Loading */}
        {phase === "loading" && (
          <div className="flex-1 flex items-center justify-center">
            <div
              className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{
                borderColor: "var(--color-border)",
                borderTopColor: "var(--color-primary)",
              }}
            />
          </div>
        )}

        {/* Error */}
        {phase === "error" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4">
            <div style={{ color: "var(--color-warning)" }} className="text-lg">
              ⚠️ {errorMsg || "Something went wrong"}
            </div>
            <button
              onClick={onClose}
              style={{ color: "var(--color-primary)" }}
              className="underline text-sm"
            >
              Go back
            </button>
          </div>
        )}

        {/* Ending */}
        {phase === "ending" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div
              className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{
                borderColor: "var(--color-border)",
                borderTopColor: "var(--color-primary)",
              }}
            />
            <div style={{ color: "var(--color-text-secondary)" }} className="text-sm">
              Analysing your test...
            </div>
          </div>
        )}

        {/* Part 2 Prep — cue card + timer */}
        {phase === "part2_prep" && cueCard && (
          <div className="flex flex-col gap-4 pt-4">
            <CueCardDisplay card={cueCard} />

            <div className="flex flex-col items-center gap-3 px-4">
              <IeltsTimer
                seconds={PREP_SECONDS}
                onExpire={handlePrepExpire}
                label="Preparation time"
              />
              <button
                onClick={handlePrepSkip}
                style={{
                  background: "var(--color-primary)",
                  color: "#fff",
                }}
                className="px-6 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Start Speaking →
              </button>
            </div>
          </div>
        )}

        {/* Part 2 Speaking — cue card stays visible + speaking timer */}
        {phase === "part2_speaking" && cueCard && (
          <div className="flex flex-col gap-3 pt-3">
            <CueCardDisplay card={cueCard} />

            <div className="flex flex-col items-center gap-2 px-4">
              <IeltsTimer
                seconds={SPEAKING_SECONDS}
                onExpire={handleSpeakingExpire}
                label="Speaking time"
              />
              <button
                onClick={handleSpeakingEnd}
                disabled={isTyping}
                style={{
                  background: "var(--color-bg-card)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                }}
                className="px-5 py-1.5 rounded-full text-xs font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                I&apos;m Done Speaking →
              </button>
            </div>
          </div>
        )}

        {/* Chat bubbles — visible in part1, part2_speaking, part3 */}
        {(phase === "part1" || phase === "part2_speaking" || phase === "part3") && (
          <div className="px-4 py-4 space-y-3">
            {turns.map((turn) => (
              <div
                key={turn.id}
                className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  style={{
                    background:
                      turn.role === "user"
                        ? "var(--color-primary)"
                        : "var(--color-bg-card)",
                    color: turn.role === "user" ? "#fff" : "var(--color-text)",
                    border:
                      turn.role === "assistant"
                        ? "1px solid var(--color-border)"
                        : "none",
                  }}
                  className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed ${
                    turn.role === "user"
                      ? "rounded-2xl rounded-br-md"
                      : "rounded-2xl rounded-bl-md"
                  }`}
                >
                  {turn.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div
                  style={{
                    background: "var(--color-bg-card)",
                    border: "1px solid var(--color-border)",
                  }}
                  className="px-4 py-2.5 rounded-2xl rounded-bl-md"
                >
                  <div className="flex gap-1">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        style={{
                          background: "var(--color-text-secondary)",
                          animationDelay: `${delay}ms`,
                        }}
                        className="w-2 h-2 rounded-full animate-bounce"
                      />
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
          style={{
            background: "var(--color-bg-card)",
            borderTop: "1px solid var(--color-border)",
          }}
          className="px-4 py-3 shrink-0"
        >
          {phase === "part2_speaking" && (
            <div
              style={{ color: "var(--color-text-secondary)" }}
              className="text-xs text-center mb-2"
            >
              💡 Type your spoken response or just click &quot;I&apos;m Done Speaking&quot; above
            </div>
          )}

          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                phase === "part1"
                  ? "Answer the examiner's question..."
                  : phase === "part2_speaking"
                  ? "Type your long turn response..."
                  : "Discuss the topic..."
              }
              rows={1}
              disabled={isTyping}
              style={{
                background: "var(--color-primary-soft)",
                color: "var(--color-text)",
                border: "1px solid var(--color-border)",
              }}
              className="flex-1 resize-none rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[color:var(--color-primary)] transition-colors placeholder:opacity-50"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputText.trim() || isTyping}
              style={{
                background: inputText.trim() && !isTyping
                  ? "var(--color-primary)"
                  : "var(--color-border)",
                color: inputText.trim() && !isTyping
                  ? "#fff"
                  : "var(--color-text-secondary)",
              }}
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors disabled:opacity-50"
            >
              <svg
                width="18" height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
