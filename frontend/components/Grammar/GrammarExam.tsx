/**
 * GrammarExam.tsx
 *
 * Timed exam component — used for both mini exams (per unit) and final exam.
 * Shows questions sequentially with a countdown timer.
 * At the end, shows pass/fail result + score.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { GrammarQuestion } from "./grammarData";
import GrammarExplanation from "./GrammarExplanation";
import { cn } from "@/lib/utils";

interface GrammarExamProps {
  title: string;
  questions: GrammarQuestion[];
  timeLimitSeconds: number;
  passingScore: number; // 0-100
  onComplete: (score: number, passed: boolean) => void;
  onClose: () => void;
}

type ExamPhase = "intro" | "question" | "explanation" | "result";

export default function GrammarExam({
  title,
  questions,
  timeLimitSeconds,
  passingScore,
  onComplete,
  onClose,
}: GrammarExamProps) {
  const [phase, setPhase] = useState<ExamPhase>("intro");
  const [index, setIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimitSeconds);
  const [finalScore, setFinalScore] = useState(0);
  const [passed, setPassed] = useState(false);
  const completedRef = useRef(false);

  const current = questions[index];
  const isLast = index === questions.length - 1;

  // Timer
  useEffect(() => {
    if (phase !== "question" && phase !== "explanation") return;
    if (timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, timeLeft]);

  // Time's up
  useEffect(() => {
    if (timeLeft === 0 && !completedRef.current) {
      completedRef.current = true;
      const score = Math.round((correctCount / questions.length) * 100);
      setFinalScore(score);
      setPassed(score >= passingScore);
      onComplete(score, score >= passingScore);
      setPhase("result");
    }
  }, [timeLeft, correctCount, questions.length, passingScore, onComplete]);

  const handleStart = useCallback(() => {
    setPhase("question");
  }, []);

  const handleSelect = useCallback(
    (optIdx: number) => {
      if (phase !== "question" || selectedIndex !== null) return;
      setSelectedIndex(optIdx);
      if (optIdx === current.correctIndex) {
        setCorrectCount((c) => c + 1);
      }
      setTimeout(() => setPhase("explanation"), 300);
    },
    [phase, selectedIndex, current?.correctIndex]
  );

  const handleNext = useCallback(() => {
    if (isLast) {
      if (completedRef.current) return;
      completedRef.current = true;
      const score = Math.round((correctCount / questions.length) * 100);
      setFinalScore(score);
      setPassed(score >= passingScore);
      onComplete(score, score >= passingScore);
      setPhase("result");
    } else {
      setIndex((i) => i + 1);
      setSelectedIndex(null);
      setPhase("question");
    }
  }, [isLast, correctCount, questions.length, passingScore, onComplete]);

  // Format time
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  const timeWarning = timeLeft <= 60;

  // ── Intro Screen ──
  if (phase === "intro") {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          background: "color-mix(in srgb, var(--color-bg) 92%, transparent)",
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
          <div className="text-4xl">{"\u{1F4DD}"}</div>
          <div className="text-center">
            <p className="text-[20px] font-sora font-bold" style={{ color: "var(--color-text)" }}>
              {title}
            </p>
            <p className="text-[13px] mt-2" style={{ color: "var(--color-text-secondary)" }}>
              {questions.length} questions &middot; {Math.floor(timeLimitSeconds / 60)} minute{timeLimitSeconds >= 120 ? "s" : ""} &middot; Pass: {passingScore}%
            </p>
          </div>

          <div
            className="rounded-xl px-4 py-3 w-full"
            style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}
          >
            <p className="text-[12px] text-center leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              Read each question carefully. You&apos;ll see an explanation after each answer. The timer keeps running!
            </p>
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-semibold text-[14px] transition-all hover:opacity-90"
              style={{
                background: "var(--color-primary-soft)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-secondary)",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleStart}
              className="flex-1 py-3 rounded-xl font-semibold text-[14px] text-white transition-all hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
              }}
            >
              Start Exam
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Result Screen ──
  if (phase === "result") {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          background: "color-mix(in srgb, var(--color-bg) 92%, transparent)",
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
              background: passed
                ? "linear-gradient(135deg, var(--color-success), var(--color-accent))"
                : "linear-gradient(135deg, #EF4444, #DC2626)",
              boxShadow: passed
                ? "0 0 32px rgba(46,211,198,0.3)"
                : "0 0 32px rgba(239,68,68,0.3)",
            }}
          >
            {passed ? "\u{1F3C6}" : "\u{1F4AA}"}
          </div>

          <div className="text-center">
            <p className="text-[22px] font-sora font-bold" style={{ color: "var(--color-text)" }}>
              {passed ? "Exam Passed!" : "Not Quite Yet"}
            </p>
            <p className="text-[13px] mt-1" style={{ color: "var(--color-text-secondary)" }}>
              {passed ? "Great work! You can move forward." : `You need ${passingScore}% to pass. Keep practicing!`}
            </p>
          </div>

          <div
            className="px-6 py-3 rounded-full"
            style={{
              border: passed
                ? "1px solid rgba(46,211,198,0.25)"
                : "1px solid rgba(239,68,68,0.25)",
              background: passed
                ? "rgba(46,211,198,0.08)"
                : "rgba(239,68,68,0.08)",
            }}
          >
            <span
              className="text-[24px] font-sora font-bold"
              style={{ color: passed ? "var(--color-success)" : "#EF4444" }}
            >
              {finalScore}%
            </span>
            <span className="text-[13px] ml-2" style={{ color: "var(--color-text-secondary)" }}>
              ({correctCount}/{questions.length})
            </span>
          </div>

          {timeLeft === 0 && (
            <p className="text-[12px]" style={{ color: "#F59E0B" }}>
              {"\u23F0"} Time ran out!
            </p>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-semibold text-[14px] text-white transition-all hover:opacity-90"
            style={{
              background: passed
                ? "linear-gradient(135deg, var(--color-primary), var(--color-accent))"
                : "linear-gradient(135deg, #F59E0B, #D97706)",
            }}
          >
            {passed ? "Continue" : "Try Again Later"}
          </button>
        </div>
      </div>
    );
  }

  // ── Question/Explanation Phase ──
  const isCorrect = selectedIndex === current?.correctIndex;
  const progress = ((index + (phase === "explanation" ? 0.5 : 0)) / questions.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--color-bg)" }}>
      {/* Top bar with timer */}
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

        {/* Timer */}
        <div
          className={cn(
            "flex items-center gap-1 px-3 py-1 rounded-lg text-[13px] font-bold border",
            timeWarning
              ? "bg-red-500/10 border-red-500/25 text-red-400"
              : "border-transparent"
          )}
          style={
            !timeWarning
              ? { background: "var(--color-primary-soft)", color: "var(--color-text-secondary)" }
              : {}
          }
        >
          {"\u23F0"} {timeStr}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-6 pb-24 max-w-[500px] mx-auto w-full">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] font-bold" style={{ color: "var(--color-text-secondary)" }}>
            Question {index + 1} of {questions.length}
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
              } else if (isSelected) {
                borderStyle = {
                  borderColor: "rgba(239,68,68,0.5)",
                  background: "rgba(239,68,68,0.1)",
                };
                textClass = "text-red-300";
              } else {
                borderStyle = { ...borderStyle, opacity: 0.4 };
              }
            }

            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={answered}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left text-[13px] transition-all duration-200",
                  !answered && "cursor-pointer",
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
                    !answered || (!isAnswer && !isSelected)
                      ? {
                          borderColor: "var(--color-border)",
                          background: "var(--color-primary-soft)",
                          color: "var(--color-text-secondary)",
                          opacity: answered && !isAnswer && !isSelected ? 0.4 : 1,
                        }
                      : {}
                  }
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span style={{ color: "var(--color-text)" }}>{opt}</span>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {phase === "explanation" && current && (
          <div className="mb-5">
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
