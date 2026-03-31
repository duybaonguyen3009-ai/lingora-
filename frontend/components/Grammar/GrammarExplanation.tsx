/**
 * GrammarExplanation.tsx
 *
 * Standardized AI-style explanation card shown after each answer.
 *
 * Format (strict):
 *  - Result: Correct / Incorrect
 *  - Why: explanation
 *  - Rule: one-sentence grammar rule
 *  - Example: additional example sentence
 */

"use client";

import type { GrammarExplanation as ExplanationType } from "./grammarData";

interface GrammarExplanationProps {
  isCorrect: boolean;
  correctAnswer: string;
  userAnswer: string;
  explanation: ExplanationType;
}

export default function GrammarExplanation({
  isCorrect,
  correctAnswer,
  userAnswer,
  explanation,
}: GrammarExplanationProps) {
  return (
    <div
      className="rounded-lg overflow-hidden transition-all duration-normal"
      style={{
        border: isCorrect
          ? "1px solid rgba(16,185,129,0.3)"
          : "1px solid rgba(239,68,68,0.3)",
        background: isCorrect
          ? "rgba(16,185,129,0.06)"
          : "rgba(239,68,68,0.06)",
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-2.5"
        style={{
          borderBottom: isCorrect
            ? "1px solid rgba(16,185,129,0.15)"
            : "1px solid rgba(239,68,68,0.15)",
        }}
      >
        <span className="text-lg">{isCorrect ? "\u2705" : "\u274C"}</span>
        <span
          className="text-sm font-bold"
          style={{ color: isCorrect ? "var(--color-success)" : "var(--color-error)" }}
        >
          {isCorrect ? "Correct!" : "Incorrect"}
        </span>
        {!isCorrect && (
          <span className="text-xs ml-auto" style={{ color: "var(--color-text-secondary)" }}>
            Correct answer: <strong style={{ color: "var(--color-success)" }}>{correctAnswer}</strong>
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3.5 flex flex-col gap-3">
        {/* Why */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
            Why
          </span>
          <p className="text-sm mt-0.5 leading-relaxed" style={{ color: "var(--color-text)" }}>
            {isCorrect ? explanation.whyCorrect : (explanation.whyWrong ?? explanation.whyCorrect)}
          </p>
        </div>

        {/* Rule */}
        <div
          className="rounded-xl px-3.5 py-2.5"
          style={{
            background: "rgba(139,92,246,0.08)",
            border: "1px solid rgba(139,92,246,0.15)",
          }}
        >
          <span className="text-xs font-bold uppercase tracking-wider text-violet-400">
            Rule
          </span>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--color-text)" }}>
            {explanation.rule}
          </p>
        </div>

        {/* Example */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
            Example
          </span>
          <p
            className="text-sm mt-0.5 italic leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            &ldquo;{explanation.example}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
