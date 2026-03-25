/**
 * GrammarMatching.tsx
 *
 * Reusable tap-to-match exercise component.
 * Users match items from left column to right column by tapping pairs.
 * Designed for modal verbs (modal → meaning) but works for any matching exercise.
 *
 * UX: Tap a left item, then tap a right item to create a match.
 * Tap a matched pair to unmatch. Submit when all pairs are set.
 */

"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

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
  /** The correct pairs. Order determines left column display. */
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
  // Left items in original order, right items shuffled
  const [rightItems] = useState(() => shuffleArray(exercise.pairs.map((p) => p.right)));
  const leftItems = exercise.pairs.map((p) => p.left);

  // User's matches: leftIndex → rightIndex
  const [matches, setMatches] = useState<Record<number, number>>({});
  const [activeLeft, setActiveLeft] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Correct answer map for validation
  const correctMap = new Map(exercise.pairs.map((p) => [p.left, p.right]));

  const usedRightIndices = new Set(Object.values(matches));
  const allMatched = Object.keys(matches).length === leftItems.length;

  const handleLeftTap = useCallback(
    (leftIdx: number) => {
      if (submitted) return;
      // If already matched, unmatch it
      if (leftIdx in matches) {
        setMatches((m) => {
          const copy = { ...m };
          delete copy[leftIdx];
          return copy;
        });
        return;
      }
      setActiveLeft(leftIdx);
    },
    [submitted, matches]
  );

  const handleRightTap = useCallback(
    (rightIdx: number) => {
      if (submitted || activeLeft === null) return;
      // If this right is already used, ignore
      if (usedRightIndices.has(rightIdx) && matches[activeLeft] !== rightIdx) return;
      setMatches((m) => ({ ...m, [activeLeft]: rightIdx }));
      setActiveLeft(null);
    },
    [submitted, activeLeft, usedRightIndices, matches]
  );

  const handleSubmit = useCallback(() => {
    if (!allMatched || submitted) return;
    let correct = 0;
    for (const [leftIdx, rightIdx] of Object.entries(matches)) {
      const leftItem = leftItems[Number(leftIdx)];
      const rightItem = rightItems[rightIdx];
      if (correctMap.get(leftItem) === rightItem) correct++;
    }
    setSubmitted(true);
    onAnswer({ exerciseId: exercise.id, correctCount: correct, totalPairs: exercise.pairs.length });
  }, [allMatched, submitted, matches, leftItems, rightItems, correctMap, exercise, onAnswer]);

  const correctCount = submitted
    ? Object.entries(matches).filter(([li, ri]) => correctMap.get(leftItems[Number(li)]) === rightItems[ri]).length
    : 0;
  const allCorrect = correctCount === exercise.pairs.length;

  const diffColor =
    exercise.difficulty === "easy"
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      : exercise.difficulty === "medium"
      ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
      : "text-red-400 bg-red-500/10 border-red-500/20";

  // Match colors for visual pairing
  const MATCH_COLORS = [
    { bg: "rgba(46,211,198,0.12)", border: "rgba(46,211,198,0.4)", text: "#2ED3C6" },
    { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.4)", text: "#3B82F6" },
    { bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.4)", text: "#A855F7" },
    { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.4)", text: "#F59E0B" },
    { bg: "rgba(236,72,153,0.12)", border: "rgba(236,72,153,0.4)", text: "#EC4899" },
    { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.4)", text: "#10B981" },
  ];

  function getMatchColor(leftIdx: number) {
    if (!(leftIdx in matches)) return null;
    const matchIndex = Object.keys(matches)
      .sort()
      .indexOf(String(leftIdx));
    return MATCH_COLORS[matchIndex % MATCH_COLORS.length];
  }

  function getRightMatchColor(rightIdx: number) {
    for (const [li, ri] of Object.entries(matches)) {
      if (ri === rightIdx) return getMatchColor(Number(li));
    }
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border", diffColor)}>
          {exercise.difficulty.charAt(0).toUpperCase() + exercise.difficulty.slice(1)}
        </span>
      </div>

      <div
        className="rounded-2xl p-4"
        style={{
          border: "1px solid var(--color-border)",
          background: "var(--color-bg-card)",
        }}
      >
        <p className="text-[13px] font-semibold" style={{ color: "var(--color-text)" }}>
          {exercise.instruction}
        </p>
        {!submitted && activeLeft !== null && (
          <p className="text-[11px] mt-1" style={{ color: "var(--color-success)" }}>
            Now tap a meaning on the right →
          </p>
        )}
      </div>

      {/* Matching grid */}
      <div className="flex gap-3">
        {/* Left column */}
        <div className="flex-1 flex flex-col gap-2">
          {leftItems.map((item, i) => {
            const matchColor = getMatchColor(i);
            const isActive = activeLeft === i;
            const isMatched = i in matches;

            let resultStyle: React.CSSProperties | undefined;
            if (submitted && isMatched) {
              const leftItem = leftItems[i];
              const rightItem = rightItems[matches[i]];
              const isRight = correctMap.get(leftItem) === rightItem;
              resultStyle = {
                borderColor: isRight ? "rgba(16,185,129,0.5)" : "rgba(239,68,68,0.5)",
                background: isRight ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
              };
            }

            return (
              <button
                key={`l-${i}`}
                onClick={() => handleLeftTap(i)}
                disabled={submitted}
                className={cn(
                  "px-3 py-2.5 rounded-xl border text-[12px] font-bold transition-all text-center",
                  !submitted && "cursor-pointer active:scale-95",
                  isActive && "ring-2 ring-offset-1"
                )}
                style={
                  resultStyle ??
                  (matchColor
                    ? { background: matchColor.bg, borderColor: matchColor.border, color: matchColor.text }
                    : {
                        background: isActive ? "rgba(46,211,198,0.08)" : "var(--color-primary-soft)",
                        borderColor: isActive ? "rgba(46,211,198,0.5)" : "var(--color-border)",
                        color: "var(--color-text)",
                      })
                }
              >
                {item}
              </button>
            );
          })}
        </div>

        {/* Connector dots */}
        <div className="flex flex-col items-center justify-around py-2">
          {leftItems.map((_, i) => (
            <div
              key={`dot-${i}`}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: i in matches ? "var(--color-success)" : "var(--color-border)" }}
            />
          ))}
        </div>

        {/* Right column */}
        <div className="flex-1 flex flex-col gap-2">
          {rightItems.map((item, i) => {
            const matchColor = getRightMatchColor(i);
            const isUsed = usedRightIndices.has(i);

            let resultStyle: React.CSSProperties | undefined;
            if (submitted && isUsed) {
              // Find which left matched this right
              const leftIdx = Object.entries(matches).find(([, ri]) => ri === i)?.[0];
              if (leftIdx !== undefined) {
                const leftItem = leftItems[Number(leftIdx)];
                const isRight = correctMap.get(leftItem) === item;
                resultStyle = {
                  borderColor: isRight ? "rgba(16,185,129,0.5)" : "rgba(239,68,68,0.5)",
                  background: isRight ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                };
              }
            }

            return (
              <button
                key={`r-${i}`}
                onClick={() => handleRightTap(i)}
                disabled={submitted || (isUsed && activeLeft === null)}
                className={cn(
                  "px-3 py-2.5 rounded-xl border text-[12px] font-semibold transition-all text-center",
                  !submitted && !isUsed && "cursor-pointer active:scale-95",
                  isUsed && !submitted && "cursor-pointer"
                )}
                style={
                  resultStyle ??
                  (matchColor
                    ? { background: matchColor.bg, borderColor: matchColor.border, color: matchColor.text }
                    : {
                        background: "var(--color-primary-soft)",
                        borderColor: "var(--color-border)",
                        color: "var(--color-text)",
                        opacity: isUsed && activeLeft === null ? 0.4 : 1,
                      })
                }
              >
                {item}
              </button>
            );
          })}
        </div>
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
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#10B981" }}>
            Correct Matches
          </p>
          <div className="flex flex-col gap-1">
            {exercise.pairs.map((p) => (
              <p key={p.left} className="text-[12px]" style={{ color: "var(--color-text)" }}>
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
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-accent)" }}>
            {allCorrect ? `✓ Perfect! ${correctCount}/${exercise.pairs.length}` : `${correctCount}/${exercise.pairs.length} correct`} — Summary
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
          disabled={!allMatched}
          className={cn(
            "w-full py-3 rounded-xl font-semibold text-[14px] transition-all",
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
