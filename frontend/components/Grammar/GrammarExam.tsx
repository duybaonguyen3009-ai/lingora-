/**
 * GrammarExam.tsx
 *
 * Timed exam component with multi-blank support.
 * Single-blank: drag one option into one blank.
 * Multi-blank: options split into individual tokens; each blank independent.
 */

"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { GrammarQuestion } from "./grammarData";
import GrammarExplanation from "./GrammarExplanation";
import DragDropProvider, { type DragEndEvent } from "./exercises/DragDropProvider";
import DragToken, { DragTokenOverlay } from "./exercises/DragToken";
import DropSlot from "./exercises/DropSlot";
import { GrammarAmbientGlow, GRAMMAR_CARD_STYLE, GRAMMAR_CONTENT_CONTAINER } from "./exercises/GrammarAmbient";
import { useGrammarSounds } from "./exercises/useGrammarSounds";
import {
  extractDragTokens,
  getCorrectParts,
  validateMultiBlankAnswer,
} from "./exercises/parseMultiBlank";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";

interface GrammarExamProps {
  title: string;
  questions: GrammarQuestion[];
  timeLimitSeconds: number;
  passingScore: number;
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
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimitSeconds);
  const [finalScore, setFinalScore] = useState(0);
  const [passed, setPassed] = useState(false);
  const completedRef = useRef(false);
  const { playCorrect, playWrong, playLevelUp } = useGrammarSounds();

  // Single-blank state
  const [droppedOption, setDroppedOption] = useState<string | null>(null);
  // Multi-blank state
  const [blankAnswers, setBlankAnswers] = useState<(string | null)[]>([]);

  const current = questions[index];
  const isLast = index === questions.length - 1;

  // Sentence analysis
  const sentenceParts = current ? current.sentence.split("___") : [""];
  const blankCount = sentenceParts.length - 1;
  const isMultiBlank = blankCount > 1;
  const hasBlank = blankCount > 0;

  const correctParts = useMemo(
    () => current ? getCorrectParts(current.options as string[], current.correctIndex, blankCount) : [],
    [current, blankCount]
  );

  const dragTokens = useMemo(
    () => current ? (isMultiBlank ? extractDragTokens(current.options as string[], blankCount) : current.options as string[]) : [],
    [current, isMultiBlank, blankCount]
  );

  const isCorrect = isMultiBlank
    ? validateMultiBlankAnswer(blankAnswers, correctParts)
    : droppedOption === current?.options[current?.correctIndex];

  const isAnswered = isMultiBlank
    ? blankAnswers.length === blankCount && blankAnswers.every((a) => a !== null)
    : droppedOption !== null;

  const usedTokens = useMemo(
    () => new Set(blankAnswers.filter(Boolean) as string[]),
    [blankAnswers]
  );

  // Initialize blank answers on question change
  useEffect(() => {
    if (isMultiBlank) {
      setBlankAnswers(new Array(blankCount).fill(null));
    }
  }, [index, isMultiBlank, blankCount]);

  // Timer
  useEffect(() => {
    if (phase !== "question" && phase !== "explanation") return;
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => { if (t <= 1) { clearInterval(interval); return 0; } return t - 1; });
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

  const handleStart = useCallback(() => setPhase("question"), []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (phase !== "question") return;
      const { active, over } = event;
      if (!over) return;
      const tokenText = String(active.id).replace("eopt-", "");
      const overId = String(over.id);

      if (isMultiBlank) {
        const match = overId.match(/^exam-blank-(\d+)$/);
        if (!match) return;
        const slotIdx = parseInt(match[1], 10);
        if (slotIdx < 0 || slotIdx >= blankCount) return;
        setBlankAnswers((prev) => {
          const updated = [...prev];
          for (let i = 0; i < updated.length; i++) { if (updated[i] === tokenText) updated[i] = null; }
          updated[slotIdx] = tokenText;
          return updated;
        });
      } else {
        if (overId !== "exam-slot") return;
        setDroppedOption(tokenText);
      }
    },
    [phase, isMultiBlank, blankCount]
  );

  const handleCheckAnswer = useCallback(() => {
    if (!isAnswered || phase !== "question") return;
    const correct = isMultiBlank
      ? validateMultiBlankAnswer(blankAnswers, correctParts)
      : droppedOption === current.options[current.correctIndex];
    if (correct) setCorrectCount((c) => c + 1);
    setTimeout(() => { correct ? playCorrect() : playWrong(); setPhase("explanation"); }, 300);
  }, [isAnswered, phase, isMultiBlank, blankAnswers, correctParts, droppedOption, current, playCorrect, playWrong]);

  const handleClearSlot = useCallback(
    (slotIdx: number) => {
      if (phase !== "question") return;
      setBlankAnswers((prev) => { const u = [...prev]; u[slotIdx] = null; return u; });
    },
    [phase]
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
      setBlankAnswers([]);
      setPhase("question");
    }
  }, [isLast, correctCount, questions.length, passingScore, onComplete, playLevelUp]);

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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "color-mix(in srgb, var(--color-bg) 92%, transparent)", backdropFilter: "blur(12px)" }}>
        <div className="w-full max-w-[420px] rounded-lg p-6 flex flex-col items-center gap-5" style={{ border: "1px solid var(--color-border)", background: "var(--color-bg)", boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}>
          <div className="text-4xl">📝</div>
          <div className="text-center">
            <p className="text-lg font-sora font-bold" style={{ color: "var(--color-text)" }}>{title}</p>
            <p className="text-sm mt-2" style={{ color: "var(--color-text-secondary)" }}>
              {questions.length} questions &middot; {Math.floor(timeLimitSeconds / 60)} minute{timeLimitSeconds >= 120 ? "s" : ""} &middot; Pass: {passingScore}%
            </p>
          </div>
          <div className="rounded-xl px-4 py-3 w-full" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}>
            <p className="text-xs text-center leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              Drag the correct answer into each blank. The timer keeps running!
            </p>
          </div>
          <div className="flex gap-3 w-full">
            <Button variant="ghost" size="lg" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="lg" className="flex-1" onClick={handleStart}>Start Exam</Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Result Screen ──
  if (phase === "result") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "color-mix(in srgb, var(--color-bg) 92%, transparent)", backdropFilter: "blur(12px)" }}>
        <div className="w-full max-w-[420px] rounded-lg p-6 flex flex-col items-center gap-5" style={{ border: "1px solid var(--color-border)", background: "var(--color-bg)", boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl" style={{ background: passed ? "linear-gradient(135deg, var(--color-success), var(--color-accent))" : "linear-gradient(135deg, var(--color-error), #DC2626)", boxShadow: passed ? "0 0 32px rgba(46,211,198,0.3)" : "0 0 32px rgba(239,68,68,0.3)" }}>
            {passed ? "🏆" : "💪"}
          </div>
          <div className="text-center">
            <p className="text-xl font-sora font-bold" style={{ color: "var(--color-text)" }}>{passed ? "Exam Passed!" : "Not Quite Yet"}</p>
            <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>{passed ? "Great work!" : `Need ${passingScore}% to pass.`}</p>
          </div>
          <div className="px-6 py-3 rounded-full" style={{ border: passed ? "1px solid rgba(46,211,198,0.25)" : "1px solid rgba(239,68,68,0.25)", background: passed ? "rgba(46,211,198,0.08)" : "rgba(239,68,68,0.08)" }}>
            <span className="text-xl font-sora font-bold" style={{ color: passed ? "var(--color-success)" : "var(--color-error)" }}>{finalScore}%</span>
            <span className="text-sm ml-2" style={{ color: "var(--color-text-secondary)" }}>({correctCount}/{questions.length})</span>
          </div>
          {timeLeft === 0 && <p className="text-xs" style={{ color: "var(--color-warning)" }}>⏰ Time ran out!</p>}
          <Button variant={passed ? "primary" : "soft"} size="lg" fullWidth onClick={onClose} style={!passed ? { background: "linear-gradient(135deg, var(--color-warning), #D97706)", color: "white", borderColor: "transparent" } : undefined}>
            {passed ? "Continue" : "Try Again Later"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Question/Explanation Phase ──
  const progress = ((index + (phase === "explanation" ? 0.5 : 0)) / questions.length) * 100;
  const showingFeedback = phase === "explanation";

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--color-bg)" }}>
      <GrammarAmbientGlow />
      <div className="flex items-center gap-3 px-4 py-3 relative z-10" style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-bg)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-base" style={{ background: "var(--color-primary-soft)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>&times;</button>
        <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
          <div className="h-full rounded-full transition duration-slow ease-out" style={{ width: `${progress}%`, background: "linear-gradient(90deg, var(--color-success), var(--color-accent))" }} />
        </div>
        <div className={cn("flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-bold border", timeWarning ? "bg-red-500/10 border-red-500/25 text-red-400" : "border-transparent")} style={!timeWarning ? { background: "var(--color-primary-soft)", color: "var(--color-text-secondary)" } : {}}>
          ⏰ {timeStr}
        </div>
      </div>

      {/* Content */}
      <div className={GRAMMAR_CONTENT_CONTAINER}>
        <DragDropProvider onDragEnd={handleDragEnd} renderOverlay={renderOverlay}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold" style={{ color: "var(--color-text-secondary)" }}>Question {index + 1} of {questions.length}</span>
          </div>

          {phase === "question" && !isAnswered && hasBlank && (
            <p className="text-xs font-semibold mb-3" style={{ color: "var(--color-text-secondary)" }}>
              {isMultiBlank ? `Drag the correct word into each blank (${blankCount} blanks)` : "Drag the correct answer into the blank"}
            </p>
          )}

          {/* Question card */}
          <div className="rounded-lg p-4 lg:p-3.5 mb-3 w-full" style={GRAMMAR_CARD_STYLE}>
            {hasBlank ? (
              <div className="text-base font-semibold leading-[2.2] flex flex-wrap items-center gap-x-1" style={{ color: "var(--color-text)" }}>
                {sentenceParts.map((part, i) => (
                  <React.Fragment key={i}>
                    {part && <span>{part}</span>}
                    {i < blankCount && (
                      isMultiBlank ? (
                        showingFeedback ? (
                          <span className={cn("inline-block px-2 py-0.5 rounded-lg font-bold text-sm border",
                            blankAnswers[i]?.toLowerCase().trim() === correctParts[i]?.toLowerCase().trim()
                              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                              : "border-red-500/40 bg-red-500/15 text-red-400"
                          )}>
                            {blankAnswers[i] ?? "—"}
                          </span>
                        ) : blankAnswers[i] ? (
                          <button onClick={() => handleClearSlot(i)} className="inline-flex px-2 py-0.5 rounded-lg font-bold text-sm border cursor-pointer hover:opacity-80" style={{ borderColor: "rgba(46,211,198,0.4)", background: "rgba(46,211,198,0.1)", color: "var(--color-success)" }}>
                            {blankAnswers[i]} ×
                          </button>
                        ) : (
                          <DropSlot id={`exam-blank-${i}`} placeholder={`blank ${i + 1}`} className="inline-flex min-w-[80px]" />
                        )
                      ) : (
                        droppedOption ? (
                          showingFeedback ? (
                            <span className={cn("inline-block px-2 py-0.5 rounded-lg font-bold text-sm border",
                              isCorrect ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400" : "border-red-500/40 bg-red-500/15 text-red-400"
                            )}>
                              {droppedOption}
                            </span>
                          ) : (
                            <button onClick={() => setDroppedOption(null)} className="inline-flex px-2 py-0.5 rounded-lg font-bold text-sm border cursor-pointer hover:opacity-80" style={{ borderColor: "rgba(46,211,198,0.4)", background: "rgba(46,211,198,0.1)", color: "var(--color-success)" }}>
                              {droppedOption} ×
                            </button>
                          )
                        ) : (
                          <DropSlot id="exam-slot" placeholder="___" className="inline-flex min-w-[90px]" />
                        )
                      )
                    )}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <p className="text-base font-semibold leading-relaxed" style={{ color: "var(--color-text)" }}>{current.sentence}</p>
            )}
          </div>

          {/* Drag tokens */}
          {phase === "question" && (
            <div className="flex flex-wrap gap-2.5 mb-3 w-full">
              {dragTokens.map((token, i) => {
                const isUsed = isMultiBlank ? usedTokens.has(token) : droppedOption === token;
                return (
                  <DragToken key={`${token}-${i}`} id={`eopt-${token}`} disabled={isUsed} variant={isUsed ? "placed" : "default"}>
                    {token}
                  </DragToken>
                );
              })}
            </div>
          )}

          {/* Check Answer button */}
          {phase === "question" && isAnswered && (
            <Button variant="primary" size="lg" fullWidth className="mb-4 w-full" onClick={handleCheckAnswer}>
              Check Answer
            </Button>
          )}

          {/* Correct answer on wrong multi-blank */}
          {showingFeedback && !isCorrect && isMultiBlank && (
            <div className="rounded-xl p-3 mb-4" style={{ border: "1px solid rgba(16,185,129,0.2)", background: "rgba(16,185,129,0.05)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-success)" }}>Correct Answer</p>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{correctParts.join(" + ")}</p>
            </div>
          )}

          {showingFeedback && current && (
            <div className="mb-3 lg:mb-2 w-full">
              <GrammarExplanation
                isCorrect={isCorrect}
                correctAnswer={current.options[current.correctIndex]}
                userAnswer={isMultiBlank ? (blankAnswers.filter(Boolean).join(" / ") || "") : (droppedOption ?? "")}
                explanation={current.explanation}
              />
            </div>
          )}

          {showingFeedback && (
            <Button variant="primary" size="lg" fullWidth onClick={handleNext}>
              {isLast ? "See Results" : "Next Question →"}
            </Button>
          )}
        </DragDropProvider>
      </div>
    </div>
  );
}
