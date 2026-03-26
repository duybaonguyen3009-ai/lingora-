/**
 * GrammarExam.tsx
 *
 * Timed exam component — used for both mini exams (per unit) and final exam.
 * Shows questions sequentially with a countdown timer.
 * User drags the correct answer into the blank using @dnd-kit.
 * At the end, shows pass/fail result + score.
 */

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { GrammarQuestion } from "./grammarData";
import GrammarExplanation from "./GrammarExplanation";
import DragDropProvider, { type DragEndEvent } from "./exercises/DragDropProvider";
import DragToken, { DragTokenOverlay } from "./exercises/DragToken";
import DropSlot from "./exercises/DropSlot";
import { GrammarAmbientGlow, GRAMMAR_CARD_STYLE } from "./exercises/GrammarAmbient";
import { useGrammarSounds } from "./exercises/useGrammarSounds";
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
  const [droppedOption, setDroppedOption] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimitSeconds);
  const [finalScore, setFinalScore] = useState(0);
  const [passed, setPassed] = useState(false);
  const completedRef = useRef(false);
  const { playCorrect, playWrong, playLevelUp } = useGrammarSounds();

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

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (phase !== "question" || droppedOption !== null) return;
      const { active, over } = event;
      if (over?.id === "exam-slot") {
        const optText = String(active.id).replace("eopt-", "");
        setDroppedOption(optText);
        const wasCorrect = optText === current.options[current.correctIndex];
        if (wasCorrect) {
          setCorrectCount((c) => c + 1);
        }
        setTimeout(() => {
          wasCorrect ? playCorrect() : playWrong();
          setPhase("explanation");
        }, 300);
      }
    },
    [phase, droppedOption, current, playCorrect, playWrong]
  );

  const handleNext = useCallback(() => {
    if (isLast) {
      if (completedRef.current) return;
      completedRef.current = true;
      const score = Math.round((correctCount / questions.length) * 100);
      setFinalScore(score);
      setPassed(score >= passingScore);
      onComplete(score, score >= passingScore);
      playLevelUp();
      setPhase("result");
    } else {
      setIndex((i) => i + 1);
      setDroppedOption(null);
      setPhase("question");
    }
  }, [isLast, correctCount, questions.length, passingScore, onComplete, playLevelUp]);

  // Format time
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  const timeWarning = timeLeft <= 60;

  const renderOverlay = useCallback(
    (activeId: string | number) => {
      const text = String(activeId).replace("eopt-", "");
      return <DragTokenOverlay>{text}</DragTokenOverlay>;
    },
    []
  );

  // ── Intro Screen ──
  if (phase === "intro") {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "color-mix(in srgb, var(--color-bg) 92%, transparent)", backdropFilter: "blur(12px)" }}
      >
        <div
          className="w-full max-w-[420px] rounded-2xl p-6 flex flex-col items-center gap-5"
          style={{ border: "1px solid var(--color-border)", background: "var(--color-bg)", boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}
        >
          <div className="text-4xl">{"\u{1F4DD}"}</div>
          <div className="text-center">
            <p className="text-[20px] font-sora font-bold" style={{ color: "var(--color-text)" }}>{title}</p>
            <p className="text-[13px] mt-2" style={{ color: "var(--color-text-secondary)" }}>
              {questions.length} questions &middot; {Math.floor(timeLimitSeconds / 60)} minute{timeLimitSeconds >= 120 ? "s" : ""} &middot; Pass: {passingScore}%
            </p>
          </div>
          <div className="rounded-xl px-4 py-3 w-full" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}>
            <p className="text-[12px] text-center leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              Drag the correct answer into the blank. The timer keeps running!
            </p>
          </div>
          <div className="flex gap-3 w-full">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl font-semibold text-[14px] transition-all hover:opacity-90" style={{ background: "var(--color-primary-soft)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
              Cancel
            </button>
            <button onClick={handleStart} className="flex-1 py-3 rounded-xl font-semibold text-[14px] text-white transition-all hover:opacity-90" style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}>
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
        style={{ background: "color-mix(in srgb, var(--color-bg) 92%, transparent)", backdropFilter: "blur(12px)" }}
      >
        <div
          className="w-full max-w-[420px] rounded-2xl p-6 flex flex-col items-center gap-5"
          style={{ border: "1px solid var(--color-border)", background: "var(--color-bg)", boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
            style={{
              background: passed ? "linear-gradient(135deg, var(--color-success), var(--color-accent))" : "linear-gradient(135deg, #EF4444, #DC2626)",
              boxShadow: passed ? "0 0 32px rgba(46,211,198,0.3)" : "0 0 32px rgba(239,68,68,0.3)",
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
              border: passed ? "1px solid rgba(46,211,198,0.25)" : "1px solid rgba(239,68,68,0.25)",
              background: passed ? "rgba(46,211,198,0.08)" : "rgba(239,68,68,0.08)",
            }}
          >
            <span className="text-[24px] font-sora font-bold" style={{ color: passed ? "var(--color-success)" : "#EF4444" }}>
              {finalScore}%
            </span>
            <span className="text-[13px] ml-2" style={{ color: "var(--color-text-secondary)" }}>({correctCount}/{questions.length})</span>
          </div>
          {timeLeft === 0 && (
            <p className="text-[12px]" style={{ color: "#F59E0B" }}>{"\u23F0"} Time ran out!</p>
          )}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-semibold text-[14px] text-white transition-all hover:opacity-90"
            style={{ background: passed ? "linear-gradient(135deg, var(--color-primary), var(--color-accent))" : "linear-gradient(135deg, #F59E0B, #D97706)" }}
          >
            {passed ? "Continue" : "Try Again Later"}
          </button>
        </div>
      </div>
    );
  }

  // ── Question/Explanation Phase ──
  const isCorrect = droppedOption === current?.options[current?.correctIndex];
  const progress = ((index + (phase === "explanation" ? 0.5 : 0)) / questions.length) * 100;

  // Split sentence on ___ (supports multi-blank)
  const sentenceParts = current.sentence.split("___");
  const hasBlank = sentenceParts.length > 1;
  const blankCount = sentenceParts.length - 1;

  // Split answer for multi-blank: "tried / had ... tried" → ["tried", "had", "tried"]
  // Regex-based to tolerate whitespace variation. Mismatch pads with "—".
  const answerParts: string[] = (() => {
    if (!droppedOption) return [];
    if (blankCount <= 1) return [droppedOption];
    const SEP_SLASH = /\s*\/\s*/;
    const SEP_DOTS = /\s*\.{2,}\s*/;
    const parts = droppedOption
      .split(SEP_SLASH)
      .flatMap((p) => (SEP_DOTS.test(p) ? p.split(SEP_DOTS) : [p]))
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === blankCount) {
      if (sentenceParts[0].trim() === "" && parts[0]) {
        parts[0] = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      }
      return parts;
    }
    if (process.env.NODE_ENV === "development") {
      console.warn(`[Grammar] answer-part count (${parts.length}) ≠ blank count (${blankCount}) for: "${droppedOption}"`);
    }
    while (parts.length < blankCount) parts.push("");
    return parts.slice(0, blankCount);
  })();

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--color-bg)" }}>
      <GrammarAmbientGlow />
      {/* Top bar with timer */}
      <div className="flex items-center gap-3 px-4 py-3 relative z-10" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-[16px]" style={{ background: "var(--color-primary-soft)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
          &times;
        </button>
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
          <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%`, background: "linear-gradient(90deg, var(--color-success), var(--color-accent))" }} />
        </div>
        <div
          className={cn("flex items-center gap-1 px-3 py-1 rounded-lg text-[13px] font-bold border", timeWarning ? "bg-red-500/10 border-red-500/25 text-red-400" : "border-transparent")}
          style={!timeWarning ? { background: "var(--color-primary-soft)", color: "var(--color-text-secondary)" } : {}}
        >
          {"\u23F0"} {timeStr}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-6 pb-24 max-w-[500px] mx-auto w-full relative z-10">
        <DragDropProvider onDragEnd={handleDragEnd} renderOverlay={renderOverlay}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[11px] font-bold" style={{ color: "var(--color-text-secondary)" }}>
              Question {index + 1} of {questions.length}
            </span>
          </div>

          {/* Instruction */}
          {phase === "question" && !droppedOption && hasBlank && (
            <p className="text-[11px] font-semibold mb-3" style={{ color: "var(--color-text-secondary)" }}>
              Drag the correct answer into the blank
            </p>
          )}

          {/* Question with inline drop slot */}
          <div className="rounded-2xl p-5 mb-5" style={GRAMMAR_CARD_STYLE}>
            {hasBlank ? (
              <div className="text-[15px] font-semibold leading-relaxed flex flex-wrap items-center gap-1" style={{ color: "var(--color-text)" }}>
                {sentenceParts.map((part, i) => (
                  <React.Fragment key={i}>
                    <span>{part}</span>
                    {i < blankCount && (
                      droppedOption ? (
                        <span
                          className={cn(
                            "inline-block px-2 py-0.5 rounded-lg font-bold text-[14px] border",
                            phase === "explanation" && isCorrect && "border-emerald-500/40 bg-emerald-500/15 text-emerald-400",
                            phase === "explanation" && !isCorrect && "border-red-500/40 bg-red-500/15 text-red-400"
                          )}
                          style={phase !== "explanation" ? { borderColor: "rgba(46,211,198,0.4)", background: "rgba(46,211,198,0.1)", color: "var(--color-success)" } : undefined}
                        >
                          {answerParts[i] ?? droppedOption}
                        </span>
                      ) : (
                        i === 0 ? (
                          <DropSlot id="exam-slot" placeholder="___" className="inline-flex min-w-[90px]" />
                        ) : (
                          <span
                            className="inline-block w-16 h-6 mx-1 rounded border-2 border-dashed align-middle"
                            style={{ borderColor: "var(--color-border)" }}
                          />
                        )
                      )
                    )}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <p className="text-[15px] font-semibold leading-relaxed" style={{ color: "var(--color-text)" }}>
                {current.sentence}
              </p>
            )}
          </div>

          {/* Draggable options */}
          {phase === "question" && !droppedOption && (
            <div className="flex flex-wrap gap-2.5 mb-5">
              {current.options.map((opt, i) => (
                <DragToken key={`${opt}-${i}`} id={`eopt-${opt}`}>
                  {opt}
                </DragToken>
              ))}
            </div>
          )}

          {/* Explanation */}
          {phase === "explanation" && current && (
            <div className="mb-5">
              <GrammarExplanation
                isCorrect={isCorrect}
                correctAnswer={current.options[current.correctIndex]}
                userAnswer={droppedOption ?? ""}
                explanation={current.explanation}
              />
            </div>
          )}

          {/* Next button */}
          {phase === "explanation" && (
            <button
              onClick={handleNext}
              className="w-full py-3.5 rounded-xl font-semibold text-[14px] text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}
            >
              {isLast ? "See Results" : "Next Question \u2192"}
            </button>
          )}
        </DragDropProvider>
      </div>
    </div>
  );
}
