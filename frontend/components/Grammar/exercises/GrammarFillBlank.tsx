/**
 * GrammarFillBlank.tsx
 *
 * Drag-and-drop fill-blank exercise component.
 * Users drag a modal/word token into a sentence blank.
 * Uses @dnd-kit for real drag interaction (mouse + touch).
 *
 * Props-driven — no hardcoded content. Caller provides exercise data.
 */

"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import DragDropProvider, { type DragEndEvent } from "./DragDropProvider";
import DragToken, { DragTokenOverlay } from "./DragToken";
import DropSlot from "./DropSlot";
import { GRAMMAR_CARD_STYLE } from "./GrammarAmbient";
import { useGrammarSounds } from "./useGrammarSounds";

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
  const { playCorrect, playWrong } = useGrammarSounds();

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (submitted) return;
      const { active, over } = event;
      if (over?.id === "blank-slot") {
        // Extract the option text from the drag id (format: "opt-{text}")
        const optText = String(active.id).replace("opt-", "");
        setSelected(optText);
      }
    },
    [submitted]
  );

  const handleClear = useCallback(() => {
    if (submitted) return;
    setSelected(null);
  }, [submitted]);

  const handleSubmit = useCallback(() => {
    if (!selected || submitted) return;
    setSubmitted(true);
    const wasCorrect = selected === exercise.correctAnswer;
    wasCorrect ? playCorrect() : playWrong();
    onAnswer({ exerciseId: exercise.id, isCorrect: wasCorrect });
  }, [selected, submitted, exercise, onAnswer, playCorrect, playWrong]);

  // Build the sentence display
  const parts = exercise.sentence.split("___");

  const diffColor =
    exercise.difficulty === "easy"
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      : exercise.difficulty === "medium"
      ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
      : "text-red-400 bg-red-500/10 border-red-500/20";

  const renderOverlay = useCallback(
    (activeId: string | number) => {
      const text = String(activeId).replace("opt-", "");
      return <DragTokenOverlay>{text}</DragTokenOverlay>;
    },
    []
  );

  return (
    <DragDropProvider onDragEnd={handleDragEnd} renderOverlay={renderOverlay}>
      <div className="flex flex-col gap-4">
        {/* Category + difficulty */}
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-bold px-2 py-0.5 rounded border", diffColor)}>
            {exercise.difficulty.charAt(0).toUpperCase() + exercise.difficulty.slice(1)}
          </span>
          {exercise.category && (
            <span className="text-xs font-semibold" style={{ color: "var(--color-accent)" }}>
              {exercise.category}
            </span>
          )}
        </div>

        {/* Instruction */}
        <p className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
          Drag the correct word into the blank
        </p>

        {/* Sentence card with inline drop slot */}
        <div
          className="rounded-lg p-5"
          style={GRAMMAR_CARD_STYLE}
        >
          <div className="text-base font-semibold leading-relaxed flex flex-wrap items-center gap-1" style={{ color: "var(--color-text)" }}>
            <span>{parts[0]}</span>
            {!submitted ? (
              <DropSlot
                id="blank-slot"
                placeholder="___"
                variant={selected ? "filled" : "empty"}
                className="inline-flex min-w-[90px]"
              >
                {selected && (
                  <button
                    onClick={handleClear}
                    className="px-2 py-0.5 rounded-lg font-bold text-sm cursor-pointer hover:opacity-80"
                    style={{
                      background: "rgba(46,211,198,0.1)",
                      border: "1px solid rgba(46,211,198,0.3)",
                      color: "var(--color-success)",
                    }}
                  >
                    {selected} ×
                  </button>
                )}
              </DropSlot>
            ) : (
              <span
                className={cn(
                  "inline-block px-2 py-0.5 mx-1 rounded-lg font-bold text-sm border",
                  isCorrect && "border-emerald-500/40 bg-emerald-500/15 text-emerald-400",
                  !isCorrect && "border-red-500/40 bg-red-500/15 text-red-400"
                )}
              >
                {selected}
              </span>
            )}
            <span>{parts[1]}</span>
          </div>
        </div>

        {/* Draggable options bank */}
        {!submitted && (
          <div className="flex flex-wrap gap-2">
            {exercise.options.map((opt) => (
              <DragToken
                key={opt}
                id={`opt-${opt}`}
                disabled={selected === opt}
              >
                {opt}
              </DragToken>
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
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-success)" }}>
              Correct Answer
            </p>
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
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
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-accent)" }}>
              {isCorrect ? "✓ Correct!" : "✗ Not quite"} — Rule
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>
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
              "w-full py-3 rounded-xl font-semibold text-sm transition-all",
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
            className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
            }}
          >
            {isLast ? "See Results" : "Next →"}
          </button>
        )}
      </div>
    </DragDropProvider>
  );
}
