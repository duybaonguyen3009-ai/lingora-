/**
 * GrammarFillBlank.tsx
 *
 * Reusable tap-to-fill-blank exercise component.
 * Shows a sentence with a blank and a bank of options to tap.
 * Designed for modal verbs but works for any fill-in-blank grammar exercise.
 *
 * Props-driven — no hardcoded content. Caller provides exercise data.
 */

"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types (exported for reuse by other grammar modules)
// ---------------------------------------------------------------------------

export interface FillBlankExercise {
  id: string;
  /** Sentence with ___ as the blank marker. */
  sentence: string;
  /** Options to choose from. */
  options: string[];
  /** The correct answer string. */
  correctAnswer: string;
  /** Short explanation shown after answering. */
  explanation: string;
  /** Context hint shown above the sentence (e.g., "Ability", "Obligation"). */
  category?: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface FillBlankResult {
  exerciseId: string;
  isCorrect: boolean;
}

interface GrammarFillBlankProps {
  exercise: FillBlankExercise;
  /** Called when user submits an answer. */
  onAnswer: (result: FillBlankResult) => void;
  /** Called when user clicks "Next" after seeing feedback. */
  onNext: () => void;
  /** Whether this is the last exercise (changes button text). */
  isLast: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GrammarFillBlank({
  exercise,
  onAnswer,
  onNext,
  isLast,
}: GrammarFillBlankProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const isCorrect = selected === exercise.correctAnswer;

  const handleSelect = useCallback(
    (option: string) => {
      if (submitted) return;
      setSelected(option);
    },
    [submitted]
  );

  const handleSubmit = useCallback(() => {
    if (!selected || submitted) return;
    setSubmitted(true);
    onAnswer({ exerciseId: exercise.id, isCorrect: selected === exercise.correctAnswer });
  }, [selected, submitted, exercise, onAnswer]);

  // Build the sentence with the blank filled
  const parts = exercise.sentence.split("___");
  const filledDisplay = selected ? (
    <span className="inline-flex items-center">
      {parts[0]}
      <span
        className={cn(
          "inline-block px-2 py-0.5 mx-1 rounded-lg font-bold text-[14px] border transition-all",
          !submitted && "border-[rgba(46,211,198,0.4)] bg-[rgba(46,211,198,0.1)]",
          submitted && isCorrect && "border-emerald-500/40 bg-emerald-500/15 text-emerald-400",
          submitted && !isCorrect && "border-red-500/40 bg-red-500/15 text-red-400"
        )}
        style={!submitted ? { color: "var(--color-success)" } : undefined}
      >
        {selected}
      </span>
      {parts[1]}
    </span>
  ) : (
    <span>
      {parts[0]}
      <span
        className="inline-block w-20 h-6 mx-1 rounded border-2 border-dashed align-middle"
        style={{ borderColor: "var(--color-border)" }}
      />
      {parts[1]}
    </span>
  );

  const diffColor =
    exercise.difficulty === "easy"
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      : exercise.difficulty === "medium"
      ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
      : "text-red-400 bg-red-500/10 border-red-500/20";

  return (
    <div className="flex flex-col gap-4">
      {/* Category + difficulty */}
      <div className="flex items-center gap-2">
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border", diffColor)}>
          {exercise.difficulty.charAt(0).toUpperCase() + exercise.difficulty.slice(1)}
        </span>
        {exercise.category && (
          <span className="text-[11px] font-semibold" style={{ color: "var(--color-accent)" }}>
            {exercise.category}
          </span>
        )}
      </div>

      {/* Sentence card */}
      <div
        className="rounded-2xl p-5"
        style={{
          border: "1px solid var(--color-border)",
          background: "var(--color-bg-card)",
        }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-secondary)" }}>
          Complete the sentence
        </p>
        <p className="text-[15px] font-semibold leading-relaxed" style={{ color: "var(--color-text)" }}>
          {filledDisplay}
        </p>
      </div>

      {/* Options bank */}
      {!submitted && (
        <div className="flex flex-wrap gap-2">
          {exercise.options.map((opt) => (
            <button
              key={opt}
              onClick={() => handleSelect(opt)}
              className={cn(
                "px-4 py-2.5 rounded-xl border text-[13px] font-semibold transition-all duration-150",
                "cursor-pointer active:scale-95",
                selected === opt ? "ring-2 ring-offset-1" : ""
              )}
              style={{
                borderColor: selected === opt ? "rgba(46,211,198,0.5)" : "var(--color-border)",
                background: selected === opt ? "rgba(46,211,198,0.1)" : "var(--color-primary-soft)",
                color: selected === opt ? "var(--color-success)" : "var(--color-text)",
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Correct answer shown on wrong */}
      {submitted && !isCorrect && (
        <div
          className="rounded-xl p-3"
          style={{
            border: "1px solid rgba(16,185,129,0.2)",
            background: "rgba(16,185,129,0.05)",
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#10B981" }}>
            Correct Answer
          </p>
          <p className="text-[13px] font-semibold" style={{ color: "var(--color-text)" }}>
            {exercise.sentence.replace("___", exercise.correctAnswer)}
          </p>
        </div>
      )}

      {/* Explanation */}
      {submitted && (
        <div
          className="rounded-xl p-4"
          style={{
            border: "1px solid var(--color-border)",
            background: "var(--color-bg-card)",
          }}
        >
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-accent)" }}>
            {isCorrect ? "✓ Correct!" : "✗ Not quite"} — Rule
          </p>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-text)" }}>
            {exercise.explanation}
          </p>
        </div>
      )}

      {/* Action buttons */}
      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!selected}
          className={cn(
            "w-full py-3 rounded-xl font-semibold text-[14px] transition-all",
            selected ? "text-white cursor-pointer hover:opacity-90" : "cursor-not-allowed"
          )}
          style={{
            background: selected
              ? "linear-gradient(135deg, var(--color-primary), var(--color-accent))"
              : "var(--color-border)",
            color: selected ? "white" : "rgba(166,179,194,0.4)",
          }}
        >
          Check Answer
        </button>
      )}

      {submitted && (
        <button
          onClick={onNext}
          className="w-full py-3.5 rounded-xl font-semibold text-[14px] text-white transition-all hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
          }}
        >
          {isLast ? "See Results" : "Next →"}
        </button>
      )}
    </div>
  );
}
