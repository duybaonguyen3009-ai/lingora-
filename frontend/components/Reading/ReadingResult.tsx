"use client";

/**
 * ReadingResult.tsx — Score display with per-question review accordion.
 */

import { useState } from "react";
import type { ReadingPracticeResult } from "@/lib/types";

interface ReadingResultProps {
  result: ReadingPracticeResult;
  onPracticeAgain: () => void;
  onClose: () => void;
}

function bandColor(band: number): string {
  if (band >= 7) return "#22C55E";
  if (band >= 6) return "#00A896";
  if (band >= 5) return "#F59E0B";
  return "#EF4444";
}

export default function ReadingResult({ result, onPracticeAgain, onClose }: ReadingResultProps) {
  const [expandedQ, setExpandedQ] = useState<number | null>(null);
  const { score, total, band_estimate, per_question_results } = result;
  const pct = Math.round((score / total) * 100);
  const color = bandColor(band_estimate);

  const mcqResults = per_question_results.filter((r) => r.type === "mcq");
  const tfngResults = per_question_results.filter((r) => r.type === "tfng");
  const matchResults = per_question_results.filter((r) => r.type === "matching");

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto" style={{ background: "var(--color-bg)" }}>
      <div className="max-w-2xl mx-auto w-full px-5 py-8 flex flex-col gap-6">
        {/* Score hero */}
        <div className="text-center">
          <div className="text-5xl font-display font-bold mb-2" style={{ color }}>{score}/{total}</div>
          <div className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
            Band {band_estimate.toFixed(1)} performance
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--color-text-tertiary)" }}>
            {pct}% accuracy · {Math.floor(result.time_seconds / 60)}m {result.time_seconds % 60}s
          </div>
        </div>

        {/* Type breakdown */}
        <div className="flex gap-3 justify-center">
          {[{ label: "MCQ", items: mcqResults }, { label: "T/F/NG", items: tfngResults }, { label: "Match", items: matchResults }]
            .filter((g) => g.items.length > 0)
            .map((g) => {
              const correct = g.items.filter((r) => r.is_correct).length;
              return (
                <div key={g.label} className="px-4 py-2 rounded-lg text-center" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
                  <div className="text-sm font-bold" style={{ color: "var(--color-text)" }}>{correct}/{g.items.length}</div>
                  <div className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>{g.label}</div>
                </div>
              );
            })}
        </div>

        {/* Per-question review */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-tertiary)" }}>
            Question Review
          </div>
          <div className="flex flex-col gap-2">
            {per_question_results.map((q) => (
              <div key={q.order_index} className="rounded-lg overflow-hidden" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
                <button
                  onClick={() => setExpandedQ(expandedQ === q.order_index ? null : q.order_index)}
                  className="w-full flex items-center gap-3 p-3 text-left"
                >
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: q.is_correct ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", color: q.is_correct ? "#22C55E" : "#EF4444" }}>
                    {q.is_correct ? "✓" : "✗"}
                  </span>
                  <span className="text-sm flex-1" style={{ color: "var(--color-text)" }}>
                    Q{q.order_index}
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-tertiary)" }}>
                      {q.type.toUpperCase()}
                    </span>
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ color: "var(--color-text-tertiary)", transform: expandedQ === q.order_index ? "rotate(180deg)" : "rotate(0)", transition: "transform 200ms" }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {expandedQ === q.order_index && (
                  <div className="px-3 pb-3 flex flex-col gap-2 text-sm" style={{ borderTop: "1px solid var(--color-border)" }}>
                    <div className="pt-2 flex gap-2">
                      <span style={{ color: q.is_correct ? "#22C55E" : "#EF4444" }}>Your answer: {q.user_answer || "—"}</span>
                    </div>
                    {!q.is_correct && (
                      <div style={{ color: "#22C55E" }}>Correct: {q.correct_answer}</div>
                    )}
                    {q.explanation && (
                      <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{q.explanation}</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button onClick={onPracticeAgain} className="w-full py-3 rounded-xl text-sm font-bold" style={{ background: "#00A896", color: "#fff" }}>
            Practice Again
          </button>
          <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-medium" style={{ background: "var(--color-bg-card)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}>
            Back to Reading
          </button>
        </div>
      </div>
    </div>
  );
}
