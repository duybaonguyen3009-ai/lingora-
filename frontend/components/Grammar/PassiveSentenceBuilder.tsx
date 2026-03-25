/**
 * PassiveSentenceBuilder.tsx
 *
 * Drag-and-drop (tap-to-build) exercise for Passive Voice.
 * Fully self-contained — owns its own exercise data and rendering.
 * Does NOT modify or depend on GrammarLessonView or MCQ system.
 *
 * UX: User taps word blocks to build a passive sentence from an active one.
 *      Tap a placed block to remove it. Submit to validate.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BuilderExercise {
  id: string;
  /** The active-voice sentence shown as prompt. */
  activeSentence: string;
  /** The correct passive sentence (for display after answer). */
  passiveSentence: string;
  /** Word blocks in correct order. */
  correctOrder: string[];
  /** Shuffled word blocks presented to the user. */
  shuffledBlocks: string[];
  /** Short explanation shown after answering. */
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
// Sub-components
// ---------------------------------------------------------------------------

function WordBlock({
  word,
  onClick,
  variant,
  disabled,
}: {
  word: string;
  onClick: () => void;
  variant: "available" | "placed" | "correct" | "wrong";
  disabled?: boolean;
}) {
  const styles: Record<string, React.CSSProperties> = {
    available: {
      background: "var(--color-primary-soft)",
      borderColor: "var(--color-border)",
      color: "var(--color-text)",
    },
    placed: {
      background: "rgba(46,211,198,0.1)",
      borderColor: "rgba(46,211,198,0.3)",
      color: "var(--color-success)",
    },
    correct: {
      background: "rgba(16,185,129,0.15)",
      borderColor: "rgba(16,185,129,0.4)",
      color: "#10B981",
    },
    wrong: {
      background: "rgba(239,68,68,0.15)",
      borderColor: "rgba(239,68,68,0.4)",
      color: "#EF4444",
    },
  };

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "px-3 py-2 rounded-lg border text-[13px] font-semibold transition-all duration-150",
        !disabled && "cursor-pointer active:scale-95",
        disabled && "cursor-default"
      )}
      style={styles[variant]}
    >
      {word}
    </button>
  );
}

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
  const [placed, setPlaced] = useState<string[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [isCurrentCorrect, setIsCurrentCorrect] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 50);
    return () => clearTimeout(t);
  }, []);

  const current = EXERCISES[exerciseIndex];
  const isLast = exerciseIndex === EXERCISES.length - 1;
  const progress = ((exerciseIndex + (phase === "complete" ? 1 : 0)) / EXERCISES.length) * 100;

  // Available blocks = shuffled blocks minus placed ones (by index tracking)
  const [availableIndices, setAvailableIndices] = useState<number[]>(() =>
    current.shuffledBlocks.map((_, i) => i)
  );

  // Reset available indices when exercise changes
  const resetForExercise = useCallback((idx: number) => {
    setPlaced([]);
    setAvailableIndices(EXERCISES[idx].shuffledBlocks.map((_, i) => i));
    setPhase("building");
  }, []);

  const handleTapAvailable = useCallback(
    (blockIndex: number) => {
      if (phase !== "building") return;
      const word = current.shuffledBlocks[blockIndex];
      setPlaced((p) => [...p, word]);
      setAvailableIndices((a) => a.filter((i) => i !== blockIndex));
    },
    [phase, current.shuffledBlocks]
  );

  const handleTapPlaced = useCallback(
    (placedIdx: number) => {
      if (phase !== "building") return;
      const word = placed[placedIdx];
      // Find the original index in shuffledBlocks for this word
      const originalIndex = current.shuffledBlocks.findIndex(
        (w, i) => w === word && !availableIndices.includes(i)
      );
      setPlaced((p) => p.filter((_, i) => i !== placedIdx));
      if (originalIndex !== -1) {
        setAvailableIndices((a) => [...a, originalIndex].sort((x, y) => x - y));
      }
    },
    [phase, placed, current.shuffledBlocks, availableIndices]
  );

  const handleSubmit = useCallback(() => {
    if (placed.length !== current.correctOrder.length) return;
    const correct = placed.every((w, i) => w === current.correctOrder[i]);
    setIsCurrentCorrect(correct);
    if (correct) {
      setCorrectCount((c) => c + 1);
    }
    setPhase("feedback");
  }, [placed, current.correctOrder]);

  const handleNext = useCallback(() => {
    if (isLast) {
      const finalScore = Math.round(
        ((correctCount + (isCurrentCorrect ? 0 : 0)) / EXERCISES.length) * 100
      );
      setPhase("complete");
      onComplete(finalScore);
    } else {
      const nextIdx = exerciseIndex + 1;
      setExerciseIndex(nextIdx);
      resetForExercise(nextIdx);
    }
  }, [isLast, correctCount, isCurrentCorrect, exerciseIndex, resetForExercise, onComplete]);

  const handleReset = useCallback(() => {
    resetForExercise(exerciseIndex);
  }, [exerciseIndex, resetForExercise]);

  const score = Math.round((correctCount / EXERCISES.length) * 100);

  // Difficulty badge color
  const diffColor =
    current.difficulty === "easy"
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      : current.difficulty === "medium"
      ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
      : "text-red-400 bg-red-500/10 border-red-500/20";

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
          className="w-full max-w-[420px] rounded-2xl p-6 flex flex-col items-center gap-5"
          style={{
            border: "1px solid var(--color-border)",
            background: "var(--color-bg)",
            boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
          }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
            style={{
              background:
                score >= 70
                  ? "linear-gradient(135deg, var(--color-success), var(--color-accent))"
                  : "linear-gradient(135deg, #F59E0B, #D97706)",
              boxShadow:
                score >= 70
                  ? "0 0 32px rgba(46,211,198,0.3)"
                  : "0 0 32px rgba(245,158,11,0.3)",
            }}
          >
            {score >= 90 ? "\u{1F31F}" : score >= 70 ? "\u{1F3C6}" : "\u{1F4AA}"}
          </div>

          <div className="text-center">
            <p className="text-[20px] font-sora font-bold" style={{ color: "var(--color-text)" }}>
              {score >= 90 ? "Excellent!" : score >= 70 ? "Well done!" : "Keep practicing!"}
            </p>
            <p className="text-[13px] mt-1" style={{ color: "var(--color-text-secondary)" }}>
              Build Passive Sentences
            </p>
          </div>

          <div
            className="px-6 py-3 rounded-full"
            style={{
              border: "1px solid rgba(46,211,198,0.25)",
              background: "rgba(46,211,198,0.08)",
            }}
          >
            <span className="text-[24px] font-sora font-bold" style={{ color: "var(--color-success)" }}>
              {score}%
            </span>
            <span className="text-[13px] ml-2" style={{ color: "var(--color-text-secondary)" }}>
              ({correctCount}/{EXERCISES.length} correct)
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-semibold text-[14px] text-white transition-all hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
            }}
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
      style={{
        background: "var(--color-bg)",
        opacity: show ? 1 : 0,
        transition: "opacity 0.3s ease",
      }}
    >
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[16px]"
          style={{
            background: "var(--color-primary-soft)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-secondary)",
          }}
        >
          &times;
        </button>

        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, var(--color-success), var(--color-accent))",
            }}
          />
        </div>

        <span className="text-[12px] font-semibold" style={{ color: "var(--color-text-secondary)" }}>
          {exerciseIndex + 1}/{EXERCISES.length}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-6 pb-24 max-w-[500px] mx-auto w-full">
        {/* Difficulty badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border", diffColor)}>
            {current.difficulty.charAt(0).toUpperCase() + current.difficulty.slice(1)}
          </span>
          <span className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
            Arrange words to form correct passive voice
          </span>
        </div>

        {/* Active sentence prompt */}
        <div
          className="rounded-2xl p-5 mb-4"
          style={{
            border: "1px solid var(--color-border)",
            background: "var(--color-bg-card)",
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-secondary)" }}>
            Active Voice
          </p>
          <p className="text-[15px] font-semibold leading-relaxed" style={{ color: "var(--color-text)" }}>
            {current.activeSentence}
          </p>
        </div>

        {/* Drop zone — placed blocks */}
        <div
          className="rounded-2xl p-4 mb-4 min-h-[64px]"
          style={{
            border: phase === "feedback"
              ? isCurrentCorrect
                ? "1.5px solid rgba(16,185,129,0.4)"
                : "1.5px solid rgba(239,68,68,0.4)"
              : "1.5px dashed var(--color-border)",
            background: phase === "feedback"
              ? isCurrentCorrect
                ? "rgba(16,185,129,0.05)"
                : "rgba(239,68,68,0.05)"
              : "rgba(46,211,198,0.03)",
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-secondary)" }}>
            {phase === "feedback" ? (isCurrentCorrect ? "\u2713 Correct!" : "\u2717 Not quite") : "Your Answer"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {placed.length === 0 && phase === "building" && (
              <span className="text-[12px] italic" style={{ color: "var(--color-text-secondary)" }}>
                Tap words below to build your sentence...
              </span>
            )}
            {placed.map((word, i) => {
              let variant: "placed" | "correct" | "wrong" = "placed";
              if (phase === "feedback") {
                variant = word === current.correctOrder[i] ? "correct" : "wrong";
              }
              return (
                <WordBlock
                  key={`placed-${i}`}
                  word={word}
                  onClick={() => handleTapPlaced(i)}
                  variant={variant}
                  disabled={phase !== "building"}
                />
              );
            })}
          </div>
        </div>

        {/* Correct answer (shown on wrong answer) */}
        {phase === "feedback" && !isCurrentCorrect && (
          <div
            className="rounded-xl p-3 mb-4"
            style={{
              border: "1px solid rgba(16,185,129,0.2)",
              background: "rgba(16,185,129,0.05)",
            }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#10B981" }}>
              Correct Answer
            </p>
            <p className="text-[13px] font-semibold" style={{ color: "var(--color-text)" }}>
              {current.passiveSentence}
            </p>
          </div>
        )}

        {/* Available blocks */}
        {phase === "building" && (
          <div className="flex flex-wrap gap-2 mb-5">
            {availableIndices.map((blockIdx) => (
              <WordBlock
                key={`avail-${blockIdx}`}
                word={current.shuffledBlocks[blockIdx]}
                onClick={() => handleTapAvailable(blockIdx)}
                variant="available"
              />
            ))}
          </div>
        )}

        {/* Explanation (shown in feedback phase) */}
        {phase === "feedback" && (
          <div
            className="rounded-xl p-4 mb-5"
            style={{
              border: "1px solid var(--color-border)",
              background: "var(--color-bg-card)",
            }}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-accent)" }}>
              Rule
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-text)" }}>
              {current.explanation}
            </p>
          </div>
        )}

        {/* Action buttons */}
        {phase === "building" && (
          <div className="flex gap-3">
            {placed.length > 0 && (
              <button
                onClick={handleReset}
                className="flex-1 py-3 rounded-xl font-semibold text-[13px] transition-all"
                style={{
                  border: "1px solid var(--color-border)",
                  background: "var(--color-primary-soft)",
                  color: "var(--color-text-secondary)",
                }}
              >
                Reset
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={placed.length !== current.correctOrder.length}
              className={cn(
                "flex-1 py-3 rounded-xl font-semibold text-[14px] transition-all",
                placed.length === current.correctOrder.length
                  ? "text-white cursor-pointer hover:opacity-90"
                  : "cursor-not-allowed"
              )}
              style={{
                background:
                  placed.length === current.correctOrder.length
                    ? "linear-gradient(135deg, var(--color-primary), var(--color-accent))"
                    : "var(--color-border)",
                color:
                  placed.length === current.correctOrder.length
                    ? "white"
                    : "rgba(166,179,194,0.4)",
              }}
            >
              Check Answer
            </button>
          </div>
        )}

        {phase === "feedback" && (
          <button
            onClick={handleNext}
            className="w-full py-3.5 rounded-xl font-semibold text-[14px] text-white transition-all hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
            }}
          >
            {isLast ? "See Results" : "Next Exercise \u2192"}
          </button>
        )}
      </div>
    </div>
  );
}
