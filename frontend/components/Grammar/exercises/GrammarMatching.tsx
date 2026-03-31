/**
 * GrammarMatching.tsx
 *
 * Drag-and-drop matching exercise component.
 * Users drag items from the left column to drop slots on the right.
 * Uses @dnd-kit for real drag interaction (mouse + touch).
 *
 * Props-driven — caller provides pairs data.
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
// Types (exported for reuse)
// ---------------------------------------------------------------------------

export interface MatchingPair {
  left: string;
  right: string;
}

export interface MatchingExercise {
  id: string;
  instruction: string;
  /** The correct pairs. Order determines right column display. */
  pairs: MatchingPair[];
  /** Explanation shown after submission. */
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface MatchingResult {
  exerciseId: string;
  correctCount: number;
  totalPairs: number;
}

interface GrammarMatchingProps {
  exercise: MatchingExercise;
  onAnswer: (result: MatchingResult) => void;
  onNext: () => void;
  isLast: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GrammarMatching({
  exercise,
  onAnswer,
  onNext,
  isLast,
}: GrammarMatchingProps) {
  const leftItems = exercise.pairs.map((p) => p.left);
  const [rightItems] = useState(() => shuffleArray(exercise.pairs.map((p) => p.right)));

  // matches: rightIndex → left item text (which left was dropped on which right)
  const [matches, setMatches] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const { playCorrect, playWrong } = useGrammarSounds();

  const correctMap = new Map(exercise.pairs.map((p) => [p.left, p.right]));
  const matchedLeftItems = new Set(Object.values(matches));
  const allMatched = Object.keys(matches).length === leftItems.length;

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (submitted) return;
      const { active, over } = event;
      if (!over) return;

      const leftText = String(active.id).replace("left-", "");
      const rightIdx = Number(String(over.id).replace("right-", ""));
      if (isNaN(rightIdx)) return;

      // Remove any existing match for this left item
      setMatches((prev) => {
        const updated = { ...prev };
        // Remove this left item from any other slot
        for (const [key, val] of Object.entries(updated)) {
          if (val === leftText) delete updated[Number(key)];
        }
        // Place in the new slot (replace what was there)
        updated[rightIdx] = leftText;
        return updated;
      });
    },
    [submitted]
  );

  const handleClearSlot = useCallback(
    (rightIdx: number) => {
      if (submitted) return;
      setMatches((prev) => {
        const updated = { ...prev };
        delete updated[rightIdx];
        return updated;
      });
    },
    [submitted]
  );

  const handleSubmit = useCallback(() => {
    if (!allMatched || submitted) return;
    let correct = 0;
    for (const [rightIdx, leftText] of Object.entries(matches)) {
      const rightText = rightItems[Number(rightIdx)];
      if (correctMap.get(leftText) === rightText) correct++;
    }
    setSubmitted(true);
    correct === exercise.pairs.length ? playCorrect() : playWrong();
    onAnswer({ exerciseId: exercise.id, correctCount: correct, totalPairs: exercise.pairs.length });
  }, [allMatched, submitted, matches, rightItems, correctMap, exercise, onAnswer, playCorrect, playWrong]);

  const correctCount = submitted
    ? Object.entries(matches).filter(
        ([ri, lt]) => correctMap.get(lt) === rightItems[Number(ri)]
      ).length
    : 0;
  const allCorrect = correctCount === exercise.pairs.length;

  const diffColor =
    exercise.difficulty === "easy"
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      : exercise.difficulty === "medium"
      ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
      : "text-red-400 bg-red-500/10 border-red-500/20";

  const renderOverlay = useCallback(
    (activeId: string | number) => {
      const text = String(activeId).replace("left-", "");
      return <DragTokenOverlay>{text}</DragTokenOverlay>;
    },
    []
  );

  return (
    <DragDropProvider onDragEnd={handleDragEnd} renderOverlay={renderOverlay}>
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-bold px-2 py-0.5 rounded border", diffColor)}>
            {exercise.difficulty.charAt(0).toUpperCase() + exercise.difficulty.slice(1)}
          </span>
        </div>

        <div
          className="rounded-lg p-4"
          style={GRAMMAR_CARD_STYLE}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            {exercise.instruction}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Drag items from the left into the matching slot on the right
          </p>
        </div>

        {/* Draggable left items (unmatched ones) */}
        {!submitted && (
          <div className="flex flex-wrap gap-2">
            {leftItems
              .filter((item) => !matchedLeftItems.has(item))
              .map((item) => (
                <DragToken key={item} id={`left-${item}`}>
                  {item}
                </DragToken>
              ))}
          </div>
        )}

        {/* Right column with drop slots */}
        <div className="flex flex-col gap-2.5">
          {rightItems.map((rightText, ri) => {
            const matchedLeft = matches[ri] ?? null;
            let slotVariant: "empty" | "filled" | "correct" | "wrong" = matchedLeft ? "filled" : "empty";

            if (submitted && matchedLeft) {
              const isRight = correctMap.get(matchedLeft) === rightText;
              slotVariant = isRight ? "correct" : "wrong";
            }

            return (
              <div key={ri} className="flex items-center gap-3">
                {/* Drop slot */}
                <DropSlot
                  id={`right-${ri}`}
                  placeholder="Drag here"
                  variant={slotVariant}
                  disabled={submitted}
                  className="flex-1 min-h-[44px]"
                >
                  {matchedLeft && (
                    <button
                      onClick={() => handleClearSlot(ri)}
                      disabled={submitted}
                      className={cn(
                        "px-2.5 py-1 rounded-lg font-semibold text-xs transition-all",
                        !submitted && "cursor-pointer hover:opacity-80"
                      )}
                      style={{
                        background: submitted
                          ? slotVariant === "correct"
                            ? "rgba(16,185,129,0.15)"
                            : "rgba(239,68,68,0.15)"
                          : "rgba(46,211,198,0.1)",
                        border: "1px solid " + (submitted
                          ? slotVariant === "correct"
                            ? "rgba(16,185,129,0.4)"
                            : "rgba(239,68,68,0.4)"
                          : "rgba(46,211,198,0.3)"),
                        color: submitted
                          ? slotVariant === "correct"
                            ? "var(--color-success)"
                            : "var(--color-error)"
                          : "var(--color-success)",
                      }}
                    >
                      {matchedLeft} {!submitted && "×"}
                    </button>
                  )}
                </DropSlot>

                {/* Right label */}
                <div
                  className="flex-1 px-3 py-2.5 rounded-xl text-xs font-semibold text-center"
                  style={{
                    background: "var(--color-primary-soft)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                  }}
                >
                  {rightText}
                </div>
              </div>
            );
          })}
        </div>

        {/* Correct answers on wrong */}
        {submitted && !allCorrect && (
          <div
            className="rounded-xl p-3"
            style={{
              border: "1px solid rgba(16,185,129,0.2)",
              background: "rgba(16,185,129,0.05)",
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-success)" }}>
              Correct Matches
            </p>
            <div className="flex flex-col gap-1">
              {exercise.pairs.map((p) => (
                <p key={p.left} className="text-xs" style={{ color: "var(--color-text)" }}>
                  <strong>{p.left}</strong> → {p.right}
                </p>
              ))}
            </div>
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
              {allCorrect ? `✓ Perfect! ${correctCount}/${exercise.pairs.length}` : `${correctCount}/${exercise.pairs.length} correct`} — Summary
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>
              {exercise.explanation}
            </p>
          </div>
        )}

        {/* Actions */}
        {!submitted && (
          <button
            onClick={handleSubmit}
            disabled={!allMatched}
            className={cn(
              "w-full py-3 rounded-xl font-semibold text-sm transition-all",
              allMatched ? "text-white cursor-pointer hover:opacity-90" : "cursor-not-allowed"
            )}
            style={{
              background: allMatched
                ? "linear-gradient(135deg, var(--color-primary), var(--color-accent))"
                : "var(--color-border)",
              color: allMatched ? "white" : "rgba(166,179,194,0.4)",
            }}
          >
            Check Matches
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
