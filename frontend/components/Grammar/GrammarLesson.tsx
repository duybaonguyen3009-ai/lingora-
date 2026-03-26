/**
 * GrammarLesson.tsx
 *
 * Full-screen lesson flow for grammar questions.
 * Flow: question → drag answer → explanation → next → completion.
 *
 * Each question shows a sentence with a blank. User drags
 * the correct option into the blank. After dropping, shows
 * GrammarExplanation card. At the end, shows score + XP earned.
 *
 * Uses @dnd-kit for real drag-and-drop interaction.
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { GrammarLesson as GrammarLessonType, GrammarQuestion } from "./grammarData";
import GrammarExplanation from "./GrammarExplanation";
import DragDropProvider, { type DragEndEvent } from "./exercises/DragDropProvider";
import DragToken, { DragTokenOverlay } from "./exercises/DragToken";
import DropSlot from "./exercises/DropSlot";
import { GrammarAmbientGlow, GRAMMAR_CARD_STYLE } from "./exercises/GrammarAmbient";
import { useGrammarSounds } from "./exercises/useGrammarSounds";
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
  const [droppedOption, setDroppedOption] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [show, setShow] = useState(false);
  const { playCorrect, playWrong, playLevelUp } = useGrammarSounds();

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 50);
    return () => clearTimeout(t);
  }, []);

  const current = lesson.questions[index];
  const isLast = index === lesson.questions.length - 1;
  const isCorrect = droppedOption === current.options[current.correctIndex];

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (phase !== "question" || droppedOption !== null) return;
      const { active, over } = event;
      if (over?.id === "answer-slot") {
        const optText = String(active.id).replace("qopt-", "");
        setDroppedOption(optText);
        const wasCorrect = optText === current.options[current.correctIndex];
        if (wasCorrect) {
          setCorrectCount((c) => c + 1);
        }
        // Audio feedback after drop
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
      const score = Math.round((correctCount / lesson.questions.length) * 100);
      setPhase("complete");
      playLevelUp();
      onComplete(score);
    } else {
      setIndex((i) => i + 1);
      setDroppedOption(null);
      setPhase("question");
    }
  }, [isLast, correctCount, lesson.questions.length, onComplete]);

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
          <div
            className="px-6 py-3 rounded-full"
            style={{ border: "1px solid rgba(46,211,198,0.25)", background: "rgba(46,211,198,0.08)" }}
          >
            <span className="text-[24px] font-sora font-bold" style={{ color: "var(--color-success)" }}>{score}%</span>
            <span className="text-[13px] ml-2" style={{ color: "var(--color-text-secondary)" }}>({correctCount}/{lesson.questions.length} correct)</span>
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-semibold text-[14px] text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Build sentence display with inline drop slot(s)
  const sentenceParts = current.sentence.split("___");
  const hasBlank = sentenceParts.length > 1;
  const blankCount = sentenceParts.length - 1;

  // Split dropped answer into parts for multi-blank sentences.
  // Handles mixed separators: "tried / had ... tried" → ["tried", "had", "tried"]
  // Regex-based to tolerate whitespace variation around "/" and "...".
  // On mismatch: pad with "—" so blanks never show confusing duplicated full-answer text.
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
      // Capitalize first part if it fills a sentence-initial blank
      if (sentenceParts[0].trim() === "" && parts[0]) {
        parts[0] = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      }
      return parts;
    }
    // Mismatch fallback: log warning, pad with empty strings so blanks stay silent
    if (process.env.NODE_ENV === "development") {
      console.warn(`[Grammar] answer-part count (${parts.length}) ≠ blank count (${blankCount}) for: "${droppedOption}"`);
    }
    while (parts.length < blankCount) parts.push("");
    return parts.slice(0, blankCount);
  })();

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
      <div className="flex items-center gap-3 px-4 py-3 relative z-10" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[16px]"
          style={{ background: "var(--color-primary-soft)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
        >
          &times;
        </button>
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%`, background: "linear-gradient(90deg, var(--color-success), var(--color-accent))" }}
          />
        </div>
        <span className="text-[12px] font-semibold" style={{ color: "var(--color-text-secondary)" }}>
          {index + 1}/{lesson.questions.length}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-6 pb-24 max-w-[500px] mx-auto w-full relative z-10">
        <DragDropProvider onDragEnd={handleDragEnd} renderOverlay={renderOverlay}>
          {/* Difficulty badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border", diffColor)}>
              {current.difficulty.charAt(0).toUpperCase() + current.difficulty.slice(1)}
            </span>
            <span className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
              {lesson.subtitle}
            </span>
          </div>

          {/* Instruction */}
          {phase === "question" && !droppedOption && (
            <p className="text-[11px] font-semibold mb-3" style={{ color: "var(--color-text-secondary)" }}>
              Drag the correct answer into the blank
            </p>
          )}

          {/* Question card with drop slot */}
          <div
            className="rounded-2xl p-5 mb-5"
            style={GRAMMAR_CARD_STYLE}
          >
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
                          style={phase !== "explanation" ? {
                            borderColor: "rgba(46,211,198,0.4)",
                            background: "rgba(46,211,198,0.1)",
                            color: "var(--color-success)",
                          } : undefined}
                        >
                          {answerParts[i] ?? droppedOption}
                        </span>
                      ) : (
                        i === 0 ? (
                          <DropSlot
                            id="answer-slot"
                            placeholder="___"
                            className="inline-flex min-w-[90px]"
                          />
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
                <DragToken
                  key={`${opt}-${i}`}
                  id={`qopt-${opt}`}
                >
                  {opt}
                </DragToken>
              ))}
            </div>
          )}

          {/* Explanation */}
          {phase === "explanation" && (
            <div className="mb-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
              {isLast ? "See Results" : "Next Question →"}
            </button>
          )}
        </DragDropProvider>
      </div>
    </div>
  );
}
