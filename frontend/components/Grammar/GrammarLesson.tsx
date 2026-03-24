/**
 * GrammarLesson.tsx
 *
 * Full-screen lesson flow for grammar questions.
 * Flow: question → answer → explanation → next → completion.
 *
 * Each question shows context-based sentence, 4 options.
 * After answering, shows GrammarExplanation card.
 * At the end, shows score + XP earned.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import type { GrammarLesson as GrammarLessonType, GrammarQuestion } from "./grammarData";
import GrammarExplanation from "./GrammarExplanation";
import { cn } from "@/lib/utils";

interface GrammarLessonProps {
  lesson: GrammarLessonType;
  onComplete: (score: number) => void;
  onClose: () => void;
}

type LessonPhase = "question" | "explanation" | "complete";

export default function GrammarLessonView({
  lesson,
  onComplete,
  onClose,
}: GrammarLessonProps) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<LessonPhase>("question");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 50);
    return () => clearTimeout(t);
  }, []);

  const current = lesson.questions[index];
  const isLast = index === lesson.questions.length - 1;
  const isCorrect = selectedIndex === current.correctIndex;

  const handleSelect = useCallback(
    (optIdx: number) => {
      if (phase !== "question" || selectedIndex !== null) return;
      setSelectedIndex(optIdx);
      if (optIdx === current.correctIndex) {
        setCorrectCount((c) => c + 1);
      }
      // Show explanation after brief delay
      setTimeout(() => setPhase("explanation"), 300);
    },
    [phase, selectedIndex, current.correctIndex]
  );

  const handleNext = useCallback(() => {
    if (isLast) {
      const finalCorrect = correctCount + (isCorrect ? 0 : 0); // already counted
      const score = Math.round((correctCount / lesson.questions.length) * 100);
      // Adjust: if current answer was correct, correctCount already includes it
      // If not last, just advance
      setPhase("complete");
      onComplete(score);
    } else {
      setIndex((i) => i + 1);
      setSelectedIndex(null);
      setPhase("question");
    }
  }, [isLast, correctCount, isCorrect, lesson.questions.length, onComplete]);

  const score = Math.round((correctCount / lesson.questions.length) * 100);
  const progress = ((index + (phase === "complete" ? 1 : 0)) / lesson.questions.length) * 100;

  // Difficulty badge color
  const diffColor =
    current.difficulty === "easy"
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      : current.difficulty === "medium"
      ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
      : "text-red-400 bg-red-500/10 border-red-500/20";

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
          {/* Trophy */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
            style={{
              background: score >= 70
                ? "linear-gradient(135deg, var(--color-success), var(--color-accent))"
                : "linear-gradient(135deg, #F59E0B, #D97706)",
              boxShadow: score >= 70
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
              {lesson.title}
            </p>
          </div>

          {/* Score */}
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
              ({correctCount}/{lesson.questions.length} correct)
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
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
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

        {/* Progress bar */}
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
          {index + 1}/{lesson.questions.length}
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
            {lesson.subtitle}
          </span>
        </div>

        {/* Question */}
        <div
          className="rounded-2xl p-5 mb-5"
          style={{
            border: "1px solid var(--color-border)",
            background: "var(--color-bg-card)",
          }}
        >
          <p className="text-[15px] font-semibold leading-relaxed" style={{ color: "var(--color-text)" }}>
            {current.sentence}
          </p>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-2.5 mb-5">
          {current.options.map((opt, i) => {
            const isSelected = selectedIndex === i;
            const isAnswer = i === current.correctIndex;
            const answered = selectedIndex !== null;

            let borderStyle: React.CSSProperties = {
              borderColor: "var(--color-border)",
              background: "var(--color-primary-soft)",
            };
            let textClass = "";

            if (answered) {
              if (isAnswer) {
                borderStyle = {
                  borderColor: "rgba(16,185,129,0.5)",
                  background: "rgba(16,185,129,0.1)",
                };
                textClass = "text-emerald-300";
              } else if (isSelected && !isAnswer) {
                borderStyle = {
                  borderColor: "rgba(239,68,68,0.5)",
                  background: "rgba(239,68,68,0.1)",
                };
                textClass = "text-red-300";
              } else {
                borderStyle = {
                  ...borderStyle,
                  opacity: 0.4,
                };
              }
            }

            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={answered}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left text-[13px] transition-all duration-200",
                  !answered && "cursor-pointer hover:opacity-80",
                  answered && "cursor-default",
                  textClass
                )}
                style={borderStyle}
              >
                <span
                  className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 border",
                    answered && isAnswer && "border-emerald-500/50 bg-emerald-500/20 text-emerald-300",
                    answered && isSelected && !isAnswer && "border-red-500/50 bg-red-500/20 text-red-300"
                  )}
                  style={
                    !answered
                      ? {
                          borderColor: "var(--color-border)",
                          background: "var(--color-primary-soft)",
                          color: "var(--color-text-secondary)",
                        }
                      : !isAnswer && !isSelected
                      ? {
                          borderColor: "var(--color-border)",
                          background: "var(--color-primary-soft)",
                          color: "var(--color-text-secondary)",
                          opacity: 0.4,
                        }
                      : {}
                  }
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span style={{ color: answered && !isAnswer && !isSelected ? "var(--color-text-secondary)" : "var(--color-text)" }}>
                  {opt}
                </span>
                {answered && isAnswer && (
                  <span className="ml-auto text-emerald-400">{"\u2713"}</span>
                )}
                {answered && isSelected && !isAnswer && (
                  <span className="ml-auto text-red-400">{"\u2717"}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {phase === "explanation" && (
          <div className="mb-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <GrammarExplanation
              isCorrect={isCorrect}
              correctAnswer={current.options[current.correctIndex]}
              userAnswer={selectedIndex !== null ? current.options[selectedIndex] : ""}
              explanation={current.explanation}
            />
          </div>
        )}

        {/* Next button */}
        {phase === "explanation" && (
          <button
            onClick={handleNext}
            className="w-full py-3.5 rounded-xl font-semibold text-[14px] text-white transition-all hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
            }}
          >
            {isLast ? "See Results" : "Next Question \u2192"}
          </button>
        )}
      </div>
    </div>
  );
}
