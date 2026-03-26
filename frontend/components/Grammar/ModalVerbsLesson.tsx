/**
 * ModalVerbsLesson.tsx
 *
 * Orchestrator for Modal Verbs interactive lessons.
 * Runs a mixed sequence of exercises: explanation panels, fill-blank,
 * matching, and scenario exercises. Tracks score and shows completion.
 *
 * Accepts a lessonId to determine which exercise set to run:
 * - "modal-fill-blank" → explanation panels + fill-blank exercises
 * - "modal-mastery" → matching + scenario exercises
 *
 * Same contract as GrammarLessonView: onComplete(score) + onClose().
 */

"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { GrammarAmbientGlow } from "./exercises/GrammarAmbient";
import GrammarFillBlank, { type FillBlankResult } from "./exercises/GrammarFillBlank";
import GrammarMatching, { type MatchingResult } from "./exercises/GrammarMatching";
import GrammarScenario, { type ScenarioResult } from "./exercises/GrammarScenario";
import {
  MODAL_EXPLANATIONS,
  FILL_BLANK_EXERCISES,
  MATCHING_EXERCISES,
  SCENARIO_EXERCISES,
  type ModalExplanation,
} from "./exercises/modalVerbsData";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StepType = "explanation" | "fill-blank" | "matching" | "scenario";

interface Step {
  type: StepType;
  /** Index into the respective data array. */
  dataIndex: number;
}

interface ModalVerbsLessonProps {
  lessonId: "modal-fill-blank" | "modal-mastery";
  onComplete: (score: number) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Build step sequences
// ---------------------------------------------------------------------------

function buildFillBlankSteps(): Step[] {
  const steps: Step[] = [];
  // Interleave explanations with exercises
  // Show 2 explanations first, then all fill-blank exercises
  steps.push({ type: "explanation", dataIndex: 0 }); // can/could
  steps.push({ type: "explanation", dataIndex: 2 }); // should
  steps.push({ type: "explanation", dataIndex: 1 }); // must/have to
  steps.push({ type: "explanation", dataIndex: 3 }); // may/might
  steps.push({ type: "explanation", dataIndex: 4 }); // will/would
  for (let i = 0; i < FILL_BLANK_EXERCISES.length; i++) {
    steps.push({ type: "fill-blank", dataIndex: i });
  }
  return steps;
}

function buildMasterySteps(): Step[] {
  const steps: Step[] = [];
  // Matching first, then scenarios
  for (let i = 0; i < MATCHING_EXERCISES.length; i++) {
    steps.push({ type: "matching", dataIndex: i });
  }
  for (let i = 0; i < SCENARIO_EXERCISES.length; i++) {
    steps.push({ type: "scenario", dataIndex: i });
  }
  return steps;
}

// Count only scorable steps (not explanations)
function countScorableSteps(steps: Step[]): number {
  return steps.filter((s) => s.type !== "explanation").length;
}

// ---------------------------------------------------------------------------
// Explanation Panel sub-component
// ---------------------------------------------------------------------------

function ExplanationPanel({
  explanation,
  onNext,
}: {
  explanation: ModalExplanation;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-2xl p-5"
        style={{
          border: "1px solid rgba(46,211,198,0.2)",
          background: "rgba(46,211,198,0.04)",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">📖</span>
          <p className="text-[16px] font-sora font-bold" style={{ color: "var(--color-text)" }}>
            {explanation.title}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-success)" }}>
              Modal
            </p>
            <p
              className="text-[15px] font-bold px-3 py-1.5 rounded-lg inline-block"
              style={{
                background: "rgba(46,211,198,0.1)",
                border: "1px solid rgba(46,211,198,0.25)",
                color: "var(--color-success)",
              }}
            >
              {explanation.modal}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-accent)" }}>
              Meaning
            </p>
            <p className="text-[13px] font-semibold" style={{ color: "var(--color-text)" }}>
              {explanation.meaning}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-secondary)" }}>
              When to use
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-text)" }}>
              {explanation.usage}
            </p>
          </div>

          <div
            className="rounded-xl p-3 mt-1"
            style={{
              background: "var(--color-primary-soft)",
              border: "1px solid var(--color-border)",
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-secondary)" }}>
              Example
            </p>
            <p className="text-[13px] italic" style={{ color: "var(--color-text)" }}>
              {explanation.example}
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full py-3.5 rounded-xl font-semibold text-[14px] text-white transition-all hover:opacity-90"
        style={{
          background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
        }}
      >
        Got it →
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ModalVerbsLesson({
  lessonId,
  onComplete,
  onClose,
}: ModalVerbsLessonProps) {
  const steps = useMemo(
    () => (lessonId === "modal-fill-blank" ? buildFillBlankSteps() : buildMasterySteps()),
    [lessonId]
  );

  const totalScorable = useMemo(() => countScorableSteps(steps), [steps]);

  const [stepIndex, setStepIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [phase, setPhase] = useState<"exercise" | "complete">("exercise");
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 50);
    return () => clearTimeout(t);
  }, []);

  const current = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const scorableStepsSoFar = steps.slice(0, stepIndex + 1).filter((s) => s.type !== "explanation").length;
  const progress = ((stepIndex + (phase === "complete" ? 1 : 0)) / steps.length) * 100;

  const advanceOrComplete = useCallback(() => {
    if (isLastStep) {
      const score = totalScorable > 0 ? Math.round((correctCount / totalScorable) * 100) : 100;
      setPhase("complete");
      onComplete(score);
    } else {
      setStepIndex((i) => i + 1);
    }
  }, [isLastStep, correctCount, totalScorable, onComplete]);

  const handleFillBlankAnswer = useCallback((result: FillBlankResult) => {
    if (result.isCorrect) setCorrectCount((c) => c + 1);
  }, []);

  const handleMatchingAnswer = useCallback((result: MatchingResult) => {
    // Count matching as correct if > 50% of pairs matched
    if (result.correctCount > result.totalPairs / 2) setCorrectCount((c) => c + 1);
  }, []);

  const handleScenarioAnswer = useCallback((result: ScenarioResult) => {
    if (result.isCorrect) setCorrectCount((c) => c + 1);
  }, []);

  const score = totalScorable > 0 ? Math.round((correctCount / totalScorable) * 100) : 100;

  const lessonTitle = lessonId === "modal-fill-blank" ? "Fill the Modal" : "Modal Mastery";

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
              {lessonTitle}
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
              ({correctCount}/{totalScorable} correct)
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
      <GrammarAmbientGlow />
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 relative z-10"
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
          {stepIndex + 1}/{steps.length}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-6 pb-24 max-w-[500px] mx-auto w-full relative z-10">
        {current.type === "explanation" && (
          <ExplanationPanel
            key={`exp-${current.dataIndex}`}
            explanation={MODAL_EXPLANATIONS[current.dataIndex]}
            onNext={advanceOrComplete}
          />
        )}

        {current.type === "fill-blank" && (
          <GrammarFillBlank
            key={`fb-${current.dataIndex}`}
            exercise={FILL_BLANK_EXERCISES[current.dataIndex]}
            onAnswer={handleFillBlankAnswer}
            onNext={advanceOrComplete}
            isLast={isLastStep}
          />
        )}

        {current.type === "matching" && (
          <GrammarMatching
            key={`m-${current.dataIndex}`}
            exercise={MATCHING_EXERCISES[current.dataIndex]}
            onAnswer={handleMatchingAnswer}
            onNext={advanceOrComplete}
            isLast={isLastStep}
          />
        )}

        {current.type === "scenario" && (
          <GrammarScenario
            key={`sc-${current.dataIndex}`}
            exercise={SCENARIO_EXERCISES[current.dataIndex]}
            onAnswer={handleScenarioAnswer}
            onNext={advanceOrComplete}
            isLast={isLastStep}
          />
        )}
      </div>
    </div>
  );
}
