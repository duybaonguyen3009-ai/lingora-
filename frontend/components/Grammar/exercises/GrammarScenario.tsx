/**
 * GrammarScenario.tsx
 *
 * Reusable scenario-based grammar exercise component.
 * Shows a real-life situation and asks the user to pick the best response.
 * Designed for modal verbs but works for any context-based grammar choice.
 *
 * More engaging than plain MCQ — scenario framing makes it communication-oriented.
 */

"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types (exported for reuse)
// ---------------------------------------------------------------------------

export interface ScenarioExercise {
  id: string;
  /** The situation description. */
  scenario: string;
  /** What the user should do (e.g., "Give advice", "Express obligation"). */
  task: string;
  /** Response options. */
  options: string[];
  /** Index of the correct option. */
  correctIndex: number;
  /** Explanation of why the correct answer is best. */
  explanation: string;
  /** Which modal meaning is being tested. */
  category: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface ScenarioResult {
  exerciseId: string;
  isCorrect: boolean;
}

interface GrammarScenarioProps {
  exercise: ScenarioExercise;
  onAnswer: (result: ScenarioResult) => void;
  onNext: () => void;
  isLast: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GrammarScenario({
  exercise,
  onAnswer,
  onNext,
  isLast,
}: GrammarScenarioProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const isCorrect = selectedIdx === exercise.correctIndex;

  const handleSelect = useCallback(
    (idx: number) => {
      if (submitted) return;
      setSelectedIdx(idx);
    },
    [submitted]
  );

  const handleSubmit = useCallback(() => {
    if (selectedIdx === null || submitted) return;
    setSubmitted(true);
    onAnswer({ exerciseId: exercise.id, isCorrect: selectedIdx === exercise.correctIndex });
  }, [selectedIdx, submitted, exercise, onAnswer]);

  const diffColor =
    exercise.difficulty === "easy"
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      : exercise.difficulty === "medium"
      ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
      : "text-red-400 bg-red-500/10 border-red-500/20";

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border", diffColor)}>
          {exercise.difficulty.charAt(0).toUpperCase() + exercise.difficulty.slice(1)}
        </span>
        <span className="text-[11px] font-semibold" style={{ color: "var(--color-accent)" }}>
          {exercise.category}
        </span>
      </div>

      {/* Scenario card */}
      <div
        className="rounded-2xl p-5"
        style={{
          border: "1px solid rgba(168,85,247,0.2)",
          background: "rgba(168,85,247,0.04)",
        }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#A855F7" }}>
          💬 Situation
        </p>
        <p className="text-[15px] font-semibold leading-relaxed" style={{ color: "var(--color-text)" }}>
          {exercise.scenario}
        </p>
      </div>

      {/* Task */}
      <p className="text-[12px] font-semibold" style={{ color: "var(--color-text-secondary)" }}>
        {exercise.task}
      </p>

      {/* Options */}
      <div className="flex flex-col gap-2">
        {exercise.options.map((opt, i) => {
          const isSelected = selectedIdx === i;
          const isAnswer = i === exercise.correctIndex;

          let cardStyle: React.CSSProperties = {
            borderColor: isSelected ? "rgba(46,211,198,0.4)" : "var(--color-border)",
            background: isSelected ? "rgba(46,211,198,0.06)" : "var(--color-primary-soft)",
          };

          if (submitted) {
            if (isAnswer) {
              cardStyle = {
                borderColor: "rgba(16,185,129,0.5)",
                background: "rgba(16,185,129,0.1)",
              };
            } else if (isSelected && !isAnswer) {
              cardStyle = {
                borderColor: "rgba(239,68,68,0.5)",
                background: "rgba(239,68,68,0.1)",
              };
            } else {
              cardStyle = { ...cardStyle, opacity: 0.4 };
            }
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={submitted}
              className={cn(
                "w-full px-4 py-3 rounded-xl border text-left text-[13px] transition-all duration-200",
                !submitted && "cursor-pointer hover:opacity-80",
                submitted && "cursor-default"
              )}
              style={cardStyle}
            >
              <span
                style={{
                  color: submitted && isAnswer
                    ? "#10B981"
                    : submitted && isSelected && !isAnswer
                    ? "#EF4444"
                    : "var(--color-text)",
                }}
              >
                {opt}
              </span>
              {submitted && isAnswer && <span className="ml-2 text-emerald-400">✓</span>}
              {submitted && isSelected && !isAnswer && <span className="ml-2 text-red-400">✗</span>}
            </button>
          );
        })}
      </div>

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
            {isCorrect ? "✓ Correct!" : "✗ Not quite"} — Why?
          </p>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-text)" }}>
            {exercise.explanation}
          </p>
        </div>
      )}

      {/* Actions */}
      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={selectedIdx === null}
          className={cn(
            "w-full py-3 rounded-xl font-semibold text-[14px] transition-all",
            selectedIdx !== null ? "text-white cursor-pointer hover:opacity-90" : "cursor-not-allowed"
          )}
          style={{
            background: selectedIdx !== null
              ? "linear-gradient(135deg, var(--color-primary), var(--color-accent))"
              : "var(--color-border)",
            color: selectedIdx !== null ? "white" : "rgba(166,179,194,0.4)",
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
