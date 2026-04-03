/**
 * PassiveSentenceBuilder.tsx
 *
 * Drag-and-drop sentence building exercise for Passive Voice.
 * Users drag word blocks from a bank into ordered drop slots to
 * construct the correct passive sentence.
 *
 * Uses @dnd-kit for real drag interaction (mouse + touch).
 * Fully self-contained — owns its own exercise data and rendering.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import DragDropProvider, { type DragEndEvent } from "./exercises/DragDropProvider";
import DragToken, { DragTokenOverlay } from "./exercises/DragToken";
import DropSlot from "./exercises/DropSlot";
import { GrammarAmbientGlow, GRAMMAR_CARD_STYLE, GRAMMAR_CONTENT_CONTAINER } from "./exercises/GrammarAmbient";
import { useGrammarSounds } from "./exercises/useGrammarSounds";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BuilderExercise {
  id: string;
  activeSentence: string;
  passiveSentence: string;
  correctOrder: string[];
  shuffledBlocks: string[];
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
}

// ---------------------------------------------------------------------------
// Exercise Data
// ---------------------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const EXERCISES: BuilderExercise[] = [
  {
    id: "sb-1",
    activeSentence: "People speak English in many countries.",
    passiveSentence: "English is spoken in many countries.",
    correctOrder: ["English", "is", "spoken", "in", "many", "countries."],
    shuffledBlocks: shuffle(["English", "is", "spoken", "in", "many", "countries."]),
    explanation:
      "Present Simple Passive: Subject (English) + is + past participle (spoken). The doer (\"people\") is omitted because it's obvious.",
    difficulty: "easy",
  },
  {
    id: "sb-2",
    activeSentence: "Someone built this bridge in 1965.",
    passiveSentence: "This bridge was built in 1965.",
    correctOrder: ["This", "bridge", "was", "built", "in", "1965."],
    shuffledBlocks: shuffle(["This", "bridge", "was", "built", "in", "1965."]),
    explanation:
      "Past Simple Passive: Subject (This bridge) + was + past participle (built). Time marker \"in 1965\" stays at the end.",
    difficulty: "easy",
  },
  {
    id: "sb-3",
    activeSentence: "The company produces over 1,000 phones every day.",
    passiveSentence: "Over 1,000 phones are produced every day.",
    correctOrder: ["Over", "1,000", "phones", "are", "produced", "every", "day."],
    shuffledBlocks: shuffle(["Over", "1,000", "phones", "are", "produced", "every", "day."]),
    explanation:
      "Present Simple Passive with plural subject: are + produced. The doer (\"the company\") is dropped when unimportant.",
    difficulty: "medium",
  },
  {
    id: "sb-4",
    activeSentence: "A famous architect designed the museum.",
    passiveSentence: "The museum was designed by a famous architect.",
    correctOrder: ["The", "museum", "was", "designed", "by", "a", "famous", "architect."],
    shuffledBlocks: shuffle(["The", "museum", "was", "designed", "by", "a", "famous", "architect."]),
    explanation:
      "Past Simple Passive with agent: was + designed + by + agent. Use \"by\" when the doer is important information.",
    difficulty: "medium",
  },
  {
    id: "sb-5",
    activeSentence: "They clean the office every evening.",
    passiveSentence: "The office is cleaned every evening.",
    correctOrder: ["The", "office", "is", "cleaned", "every", "evening."],
    shuffledBlocks: shuffle(["The", "office", "is", "cleaned", "every", "evening."]),
    explanation:
      "Present Simple Passive: is + cleaned. \"Every evening\" is the time clue for present simple. The doer (\"they\") is omitted.",
    difficulty: "easy",
  },
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface PassiveSentenceBuilderProps {
  onComplete: (score: number) => void;
  onClose: () => void;
}

type Phase = "building" | "feedback" | "complete";

export default function PassiveSentenceBuilder({
  onComplete,
  onClose,
}: PassiveSentenceBuilderProps) {
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("building");
  // placed: array of (word | null) for each slot
  const [placed, setPlaced] = useState<(string | null)[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [isCurrentCorrect, setIsCurrentCorrect] = useState(false);
  const { playCorrect, playWrong, playLevelUp } = useGrammarSounds();
  const [show, setShow] = useState(false);

  const current = EXERCISES[exerciseIndex];
  const isLast = exerciseIndex === EXERCISES.length - 1;
  const progress = ((exerciseIndex + (phase === "complete" ? 1 : 0)) / EXERCISES.length) * 100;

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Initialize slots for current exercise
  useEffect(() => {
    setPlaced(new Array(current.correctOrder.length).fill(null));
  }, [exerciseIndex, current.correctOrder.length]);

  // Words already placed in slots
  const placedWords = new Set(placed.filter(Boolean));
  const allSlotsFilled = placed.every((w) => w !== null);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (phase !== "building") return;
      const { active, over } = event;
      if (!over) return;

      const word = String(active.id).replace("word-", "");
      const slotIdx = Number(String(over.id).replace("slot-", ""));
      if (isNaN(slotIdx)) return;

      setPlaced((prev) => {
        const updated = [...prev];
        // Remove this word from any other slot first
        for (let i = 0; i < updated.length; i++) {
          if (updated[i] === word) updated[i] = null;
        }
        // Place in new slot (replace existing)
        updated[slotIdx] = word;
        return updated;
      });
    },
    [phase]
  );

  const handleClearSlot = useCallback(
    (slotIdx: number) => {
      if (phase !== "building") return;
      setPlaced((prev) => {
        const updated = [...prev];
        updated[slotIdx] = null;
        return updated;
      });
    },
    [phase]
  );

  const handleSubmit = useCallback(() => {
    if (!allSlotsFilled || phase !== "building") return;
    const correct = placed.every((w, i) => w === current.correctOrder[i]);
    setIsCurrentCorrect(correct);
    if (correct) setCorrectCount((c) => c + 1);
    correct ? playCorrect() : playWrong();
    setPhase("feedback");
  }, [allSlotsFilled, phase, placed, current.correctOrder, playCorrect, playWrong]);

  const handleNext = useCallback(() => {
    if (isLast) {
      const score = Math.round((correctCount / EXERCISES.length) * 100);
      setPhase("complete");
      playLevelUp();
      onComplete(score);
    } else {
      setExerciseIndex((i) => i + 1);
      setPhase("building");
      setIsCurrentCorrect(false);
    }
  }, [isLast, correctCount, onComplete, playLevelUp]);

  const handleReset = useCallback(() => {
    setPlaced(new Array(current.correctOrder.length).fill(null));
  }, [current.correctOrder.length]);

  const score = Math.round((correctCount / EXERCISES.length) * 100);

  const diffColor =
    current.difficulty === "easy"
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      : current.difficulty === "medium"
      ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
      : "text-red-400 bg-red-500/10 border-red-500/20";

  const renderOverlay = useCallback(
    (activeId: string | number) => {
      const word = String(activeId).replace("word-", "");
      return <DragTokenOverlay>{word}</DragTokenOverlay>;
    },
    []
  );

  // ── Completion screen ──
  if (phase === "complete") {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          background: "color-mix(in srgb, var(--color-bg) 90%, transparent)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          className="w-full max-w-[420px] rounded-lg p-6 flex flex-col items-center gap-5"
          style={{
            border: "1px solid var(--color-border)",
            background: "var(--color-bg)",
            boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
          }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
            style={{
              background: score >= 70
                ? "linear-gradient(135deg, var(--color-success), var(--color-accent))"
                : "linear-gradient(135deg, var(--color-warning), #D97706)",
              boxShadow: score >= 70
                ? "0 0 32px rgba(46,211,198,0.3)"
                : "0 0 32px rgba(245,158,11,0.3)",
            }}
          >
            {score >= 90 ? "\u{1F31F}" : score >= 70 ? "\u{1F3C6}" : "\u{1F4AA}"}
          </div>
          <div className="text-center">
            <p className="text-lg font-sora font-bold" style={{ color: "var(--color-text)" }}>
              {score >= 90 ? "Excellent!" : score >= 70 ? "Well done!" : "Keep practicing!"}
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
              Build Passive Sentences
            </p>
          </div>
          <div
            className="px-6 py-3 rounded-full"
            style={{ border: "1px solid rgba(46,211,198,0.25)", background: "rgba(46,211,198,0.08)" }}
          >
            <span className="text-xl font-sora font-bold" style={{ color: "var(--color-success)" }}>{score}%</span>
            <span className="text-sm ml-2" style={{ color: "var(--color-text-secondary)" }}>({correctCount}/{EXERCISES.length} correct)</span>
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition hover:opacity-90"
            style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ── Exercise view ──
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "var(--color-bg)", opacity: show ? 1 : 0, transition: "opacity 0.3s ease" }}
    >
      <GrammarAmbientGlow />
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 relative z-10" style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-bg)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center text-base"
          style={{ background: "var(--color-primary-soft)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
        >
          &times;
        </button>
        <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
          <div
            className="h-full rounded-full transition duration-slow ease-out"
            style={{ width: `${progress}%`, background: "linear-gradient(90deg, var(--color-success), var(--color-accent))" }}
          />
        </div>
        <span className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
          {exerciseIndex + 1}/{EXERCISES.length}
        </span>
      </div>

      {/* Content */}
      <div className={GRAMMAR_CONTENT_CONTAINER}>
        <DragDropProvider onDragEnd={handleDragEnd} renderOverlay={renderOverlay}>
          {/* Difficulty badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded border", diffColor)}>
              {current.difficulty.charAt(0).toUpperCase() + current.difficulty.slice(1)}
            </span>
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              Drag words to build the passive sentence
            </span>
          </div>

          {/* Active sentence prompt */}
          <div
            className="rounded-lg p-5 mb-4"
            style={GRAMMAR_CARD_STYLE}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-secondary)" }}>
              Active Voice
            </p>
            <p className="text-base font-semibold leading-relaxed" style={{ color: "var(--color-text)" }}>
              {current.activeSentence}
            </p>
          </div>

          {/* Drop slots */}
          <div
            className="rounded-lg p-4 mb-4"
            style={{
              border: phase === "feedback"
                ? isCurrentCorrect
                  ? "1.5px solid rgba(16,185,129,0.4)"
                  : "1.5px solid rgba(239,68,68,0.4)"
                : "1.5px solid var(--color-border)",
              background: phase === "feedback"
                ? isCurrentCorrect ? "rgba(16,185,129,0.05)" : "rgba(239,68,68,0.05)"
                : "rgba(46,211,198,0.03)",
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-secondary)" }}>
              {phase === "feedback" ? (isCurrentCorrect ? "✓ Correct!" : "✗ Not quite") : "Your Answer — drop words here"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {placed.map((word, i) => {
                let slotVariant: "empty" | "filled" | "correct" | "wrong" = word ? "filled" : "empty";
                if (phase === "feedback" && word) {
                  slotVariant = word === current.correctOrder[i] ? "correct" : "wrong";
                }

                return (
                  <DropSlot
                    key={i}
                    id={`slot-${i}`}
                    placeholder={`${i + 1}`}
                    variant={slotVariant}
                    disabled={phase !== "building"}
                    className="min-w-[60px]"
                  >
                    {word && (
                      <button
                        onClick={() => handleClearSlot(i)}
                        disabled={phase !== "building"}
                        className={cn(
                          "px-2 py-0.5 rounded-lg font-semibold text-xs",
                          phase === "building" && "cursor-pointer hover:opacity-80"
                        )}
                        style={{
                          color: phase === "feedback"
                            ? slotVariant === "correct" ? "var(--color-success)" : "var(--color-error)"
                            : "var(--color-success)",
                        }}
                      >
                        {word} {phase === "building" && "×"}
                      </button>
                    )}
                  </DropSlot>
                );
              })}
            </div>
          </div>

          {/* Correct answer on wrong */}
          {phase === "feedback" && !isCurrentCorrect && (
            <div
              className="rounded-xl p-3 mb-4"
              style={{ border: "1px solid rgba(16,185,129,0.2)", background: "rgba(16,185,129,0.05)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-success)" }}>
                Correct Answer
              </p>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                {current.passiveSentence}
              </p>
            </div>
          )}

          {/* Draggable word bank */}
          {phase === "building" && (
            <div className="flex flex-wrap gap-2 mb-3 w-full">
              {current.shuffledBlocks.map((word, i) => (
                <DragToken
                  key={`${word}-${i}`}
                  id={`word-${word}`}
                  disabled={placedWords.has(word)}
                  variant={placedWords.has(word) ? "placed" : "default"}
                >
                  {word}
                </DragToken>
              ))}
            </div>
          )}

          {/* Explanation */}
          {phase === "feedback" && (
            <div
              className="rounded-xl p-4 mb-4 w-full"
              style={{ border: "1px solid var(--color-border)", background: "var(--color-bg-card)" }}
            >
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-accent)" }}>
                Rule
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>
                {current.explanation}
              </p>
            </div>
          )}

          {/* Action buttons */}
          {phase === "building" && (
            <div className="flex gap-3">
              {placed.some((w) => w !== null) && (
                <button
                  onClick={handleReset}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm transition"
                  style={{ border: "1px solid var(--color-border)", background: "var(--color-primary-soft)", color: "var(--color-text-secondary)" }}
                >
                  Reset
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={!allSlotsFilled}
                className={cn(
                  "flex-1 py-3 rounded-xl font-semibold text-sm transition",
                  allSlotsFilled ? "text-white cursor-pointer hover:opacity-90" : "cursor-not-allowed"
                )}
                style={{
                  background: allSlotsFilled
                    ? "linear-gradient(135deg, var(--color-primary), var(--color-accent))"
                    : "var(--color-border)",
                  color: allSlotsFilled ? "white" : "rgba(166,179,194,0.4)",
                }}
              >
                Check Answer
              </button>
            </div>
          )}

          {phase === "feedback" && (
            <button
              onClick={handleNext}
              className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}
            >
              {isLast ? "See Results" : "Next Exercise →"}
            </button>
          )}
        </DragDropProvider>
      </div>
    </div>
  );
}
