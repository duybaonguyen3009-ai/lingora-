/**
 * GrammarLesson.tsx
 *
 * Full-screen lesson flow for grammar questions.
 *
 * Single-blank: user drags one option into one blank.
 * Multi-blank: options are split into individual tokens;
 *   each blank is an independent drop target requiring its own answer.
 *
 * Uses @dnd-kit for real drag-and-drop interaction.
 */

"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { GrammarLesson as GrammarLessonType } from "./grammarData";
import GrammarExplanation from "./GrammarExplanation";
import DragDropProvider, { type DragEndEvent } from "./exercises/DragDropProvider";
import DragToken, { DragTokenOverlay } from "./exercises/DragToken";
import DropSlot from "./exercises/DropSlot";
import { GrammarAmbientGlow, GRAMMAR_CARD_STYLE } from "./exercises/GrammarAmbient";
import { useGrammarSounds } from "./exercises/useGrammarSounds";
import {
  extractDragTokens,
  getCorrectParts,
  validateMultiBlankAnswer,
} from "./exercises/parseMultiBlank";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";

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
  const [correctCount, setCorrectCount] = useState(0);
  const [show, setShow] = useState(false);
  const { playCorrect, playWrong, playLevelUp } = useGrammarSounds();

  // Single-blank state
  const [droppedOption, setDroppedOption] = useState<string | null>(null);

  // Multi-blank state: per-blank answers
  const [blankAnswers, setBlankAnswers] = useState<(string | null)[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 50);
    return () => clearTimeout(t);
  }, []);

  const current = lesson.questions[index];
  const isLast = index === lesson.questions.length - 1;

  // Sentence analysis
  const sentenceParts = current.sentence.split("___");
  const blankCount = sentenceParts.length - 1;
  const isMultiBlank = blankCount > 1;

  // Correct answer parts
  const correctParts = useMemo(
    () => getCorrectParts(current.options as string[], current.correctIndex, blankCount),
    [current, blankCount]
  );

  // For multi-blank: individual drag tokens extracted from all options
  const dragTokens = useMemo(
    () => isMultiBlank ? extractDragTokens(current.options as string[], blankCount) : current.options as string[],
    [current, isMultiBlank, blankCount]
  );

  // Correctness check
  const isCorrect = isMultiBlank
    ? validateMultiBlankAnswer(blankAnswers, correctParts)
    : droppedOption === current.options[current.correctIndex];

  // Whether answer is committed (all blanks filled or single option dropped)
  const isAnswered = isMultiBlank
    ? blankAnswers.length === blankCount && blankAnswers.every((a) => a !== null)
    : droppedOption !== null;

  // Track which tokens are used in multi-blank
  const usedTokens = useMemo(
    () => new Set(blankAnswers.filter(Boolean) as string[]),
    [blankAnswers]
  );

  // Initialize blank answers when question changes
  useEffect(() => {
    if (isMultiBlank) {
      setBlankAnswers(new Array(blankCount).fill(null));
    }
  }, [index, isMultiBlank, blankCount]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (phase !== "question") return;
      const { active, over } = event;
      if (!over) return;

      const tokenText = String(active.id).replace("qopt-", "");
      const overId = String(over.id);

      if (isMultiBlank) {
        // Multi-blank: drop into specific blank slot "blank-0", "blank-1", etc.
        const match = overId.match(/^blank-(\d+)$/);
        if (!match) return;
        const slotIdx = parseInt(match[1], 10);
        if (slotIdx < 0 || slotIdx >= blankCount) return;

        setBlankAnswers((prev) => {
          const updated = [...prev];
          // Remove this token from any other slot first
          for (let i = 0; i < updated.length; i++) {
            if (updated[i] === tokenText) updated[i] = null;
          }
          updated[slotIdx] = tokenText;
          return updated;
        });
      } else {
        // Single-blank: existing behavior
        if (overId !== "answer-slot" || droppedOption !== null) return;
        setDroppedOption(tokenText);
        const wasCorrect = tokenText === current.options[current.correctIndex];
        if (wasCorrect) setCorrectCount((c) => c + 1);
        setTimeout(() => {
          wasCorrect ? playCorrect() : playWrong();
          setPhase("explanation");
        }, 300);
      }
    },
    [phase, isMultiBlank, blankCount, droppedOption, current, playCorrect, playWrong]
  );

  // Multi-blank: submit all answers
  const handleSubmitMultiBlank = useCallback(() => {
    if (!isAnswered || phase !== "question") return;
    const correct = validateMultiBlankAnswer(blankAnswers, correctParts);
    if (correct) setCorrectCount((c) => c + 1);
    setTimeout(() => {
      correct ? playCorrect() : playWrong();
      setPhase("explanation");
    }, 300);
  }, [isAnswered, phase, blankAnswers, correctParts, playCorrect, playWrong]);

  // Clear a multi-blank slot
  const handleClearSlot = useCallback(
    (slotIdx: number) => {
      if (phase !== "question") return;
      setBlankAnswers((prev) => {
        const updated = [...prev];
        updated[slotIdx] = null;
        return updated;
      });
    },
    [phase]
  );

  const handleNext = useCallback(() => {
    if (isLast) {
      const score = Math.round((correctCount / lesson.questions.length) * 100);
      setPhase("complete");
      playLevelUp();
      onComplete(score);
    } else {
      setIndex((i) => i + 1);
      setDroppedOption(null);
      setBlankAnswers([]);
      setPhase("question");
    }
  }, [isLast, correctCount, lesson.questions.length, onComplete, playLevelUp]);

  const score = Math.round((correctCount / lesson.questions.length) * 100);
  const progress = ((index + (phase === "complete" ? 1 : 0)) / lesson.questions.length) * 100;

  const diffColor =
    current.difficulty === "easy"
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      : current.difficulty === "medium"
      ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
      : "text-red-400 bg-red-500/10 border-red-500/20";

  const renderOverlay = useCallback(
    (activeId: string | number) => {
      const text = String(activeId).replace("qopt-", "");
      return <DragTokenOverlay>{text}</DragTokenOverlay>;
    },
    []
  );

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
          className="w-full max-w-[420px] rounded-lg p-6 flex flex-col items-center gap-5"
          style={{
            border: "1px solid var(--color-border)",
            background: "var(--color-bg)",
            boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
          }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
            style={{
              background: score >= 70
                ? "linear-gradient(135deg, var(--color-success), var(--color-accent))"
                : "linear-gradient(135deg, var(--color-warning), #D97706)",
              boxShadow: score >= 70
                ? "0 0 32px rgba(46,211,198,0.3)"
                : "0 0 32px rgba(245,158,11,0.3)",
            }}
          >
            {score >= 90 ? "\u{1F31F}" : score >= 70 ? "\u{1F3C6}" : "\u{1F4AA}"}
          </div>
          <div className="text-center">
            <p className="text-lg font-sora font-bold" style={{ color: "var(--color-text)" }}>
              {score >= 90 ? "Excellent!" : score >= 70 ? "Well done!" : "Keep practicing!"}
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
              {lesson.title}
            </p>
          </div>
          <div
            className="px-6 py-3 rounded-full"
            style={{ border: "1px solid rgba(46,211,198,0.25)", background: "rgba(46,211,198,0.08)" }}
          >
            <span className="text-xl font-sora font-bold" style={{ color: "var(--color-success)" }}>{score}%</span>
            <span className="text-sm ml-2" style={{ color: "var(--color-text-secondary)" }}>({correctCount}/{lesson.questions.length} correct)</span>
          </div>
          <Button variant="primary" size="lg" fullWidth onClick={onClose}>
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // ── Question phase ──
  const hasBlank = blankCount > 0;
  const showingFeedback = phase === "explanation";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "var(--color-bg)", opacity: show ? 1 : 0, transition: "opacity 0.3s ease" }}
    >
      <GrammarAmbientGlow />
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 relative z-10" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-base" style={{ background: "var(--color-primary-soft)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
          &times;
        </button>
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
          <div className="h-full rounded-full transition-all duration-slow ease-out" style={{ width: `${progress}%`, background: "linear-gradient(90deg, var(--color-success), var(--color-accent))" }} />
        </div>
        <span className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
          {index + 1}/{lesson.questions.length}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-6 pb-24 max-w-[500px] lg:max-w-[750px] xl:max-w-[900px] mx-auto w-full relative z-10 flex flex-col min-h-0 lg:justify-center lg:min-h-full">
        <DragDropProvider onDragEnd={handleDragEnd} renderOverlay={renderOverlay}>
          {/* Difficulty badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded border", diffColor)}>
              {current.difficulty.charAt(0).toUpperCase() + current.difficulty.slice(1)}
            </span>
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              {lesson.subtitle}
            </span>
          </div>

          {/* Instruction */}
          {phase === "question" && !isAnswered && (
            <p className="text-xs font-semibold mb-3" style={{ color: "var(--color-text-secondary)" }}>
              {isMultiBlank
                ? `Drag the correct word into each blank (${blankCount} blanks)`
                : "Drag the correct answer into the blank"}
            </p>
          )}

          {/* Question card with inline blanks */}
          <div className="rounded-lg p-5 mb-5" style={GRAMMAR_CARD_STYLE}>
            {hasBlank ? (
              <div className="text-base font-semibold leading-[2.2] flex flex-wrap items-center gap-x-1" style={{ color: "var(--color-text)" }}>
                {sentenceParts.map((part, i) => (
                  <React.Fragment key={i}>
                    {part && <span>{part}</span>}
                    {i < blankCount && (
                      isMultiBlank ? (
                        // Multi-blank: each blank is independent
                        showingFeedback ? (
                          <span
                            className={cn(
                              "inline-block px-2 py-0.5 rounded-lg font-bold text-sm border",
                              blankAnswers[i]?.toLowerCase().trim() === correctParts[i]?.toLowerCase().trim()
                                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                                : "border-red-500/40 bg-red-500/15 text-red-400"
                            )}
                          >
                            {blankAnswers[i] ?? "—"}
                          </span>
                        ) : blankAnswers[i] ? (
                          <button
                            onClick={() => handleClearSlot(i)}
                            className="inline-flex px-2 py-0.5 rounded-lg font-bold text-sm border cursor-pointer hover:opacity-80"
                            style={{
                              borderColor: "rgba(46,211,198,0.4)",
                              background: "rgba(46,211,198,0.1)",
                              color: "var(--color-success)",
                            }}
                          >
                            {blankAnswers[i]} ×
                          </button>
                        ) : (
                          <DropSlot
                            id={`blank-${i}`}
                            placeholder={`blank ${i + 1}`}
                            className="inline-flex min-w-[80px]"
                          />
                        )
                      ) : (
                        // Single-blank: existing behavior
                        droppedOption ? (
                          <span
                            className={cn(
                              "inline-block px-2 py-0.5 rounded-lg font-bold text-sm border",
                              showingFeedback && isCorrect && "border-emerald-500/40 bg-emerald-500/15 text-emerald-400",
                              showingFeedback && !isCorrect && "border-red-500/40 bg-red-500/15 text-red-400"
                            )}
                            style={!showingFeedback ? {
                              borderColor: "rgba(46,211,198,0.4)",
                              background: "rgba(46,211,198,0.1)",
                              color: "var(--color-success)",
                            } : undefined}
                          >
                            {droppedOption}
                          </span>
                        ) : (
                          <DropSlot
                            id="answer-slot"
                            placeholder="___"
                            className="inline-flex min-w-[90px]"
                          />
                        )
                      )
                    )}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <p className="text-base font-semibold leading-relaxed" style={{ color: "var(--color-text)" }}>
                {current.sentence}
              </p>
            )}
          </div>

          {/* Draggable tokens */}
          {phase === "question" && (
            <div className="flex flex-wrap gap-2.5 mb-5">
              {dragTokens.map((token, i) => {
                const isUsed = isMultiBlank ? usedTokens.has(token) : droppedOption !== null;
                return (
                  <DragToken
                    key={`${token}-${i}`}
                    id={`qopt-${token}`}
                    disabled={isUsed}
                    variant={isUsed ? "placed" : "default"}
                  >
                    {token}
                  </DragToken>
                );
              })}
            </div>
          )}

          {/* Multi-blank: Check Answer button */}
          {isMultiBlank && phase === "question" && isAnswered && (
            <Button variant="primary" size="lg" fullWidth className="mb-5" onClick={handleSubmitMultiBlank}>
              Check Answer
            </Button>
          )}

          {/* Correct answer (shown on wrong for multi-blank) */}
          {showingFeedback && !isCorrect && isMultiBlank && (
            <div
              className="rounded-xl p-3 mb-4"
              style={{ border: "1px solid rgba(16,185,129,0.2)", background: "rgba(16,185,129,0.05)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-success)" }}>
                Correct Answer
              </p>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                {correctParts.join(" + ")}
              </p>
            </div>
          )}

          {/* Explanation */}
          {showingFeedback && (
            <div className="mb-5 animate-in fade-in slide-in-from-bottom-2 duration-normal">
              <GrammarExplanation
                isCorrect={isCorrect}
                correctAnswer={current.options[current.correctIndex]}
                userAnswer={isMultiBlank ? (blankAnswers.filter(Boolean).join(" / ") || "") : (droppedOption ?? "")}
                explanation={current.explanation}
              />
            </div>
          )}

          {/* Next button */}
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
