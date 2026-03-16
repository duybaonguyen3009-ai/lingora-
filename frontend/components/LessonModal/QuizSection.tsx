"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { ApiQuizItem } from "@/lib/api";

interface QuizSectionProps {
  items:      ApiQuizItem[];
  onContinue: (score: number) => void;
}

type OptionKey = "a" | "b" | "c" | "d";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalise(s: string): string {
  return s.trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QuizSection({ items, onContinue }: QuizSectionProps) {
  const [index,        setIndex]        = useState(0);
  const [selected,     setSelected]     = useState<OptionKey | null>(null);
  // fill_in_blank state
  const [fillInput,    setFillInput]    = useState("");
  const [fillAnswered, setFillAnswered] = useState(false);
  const [fillCorrect,  setFillCorrect]  = useState(false);
  const [correct,      setCorrect]      = useState(0);
  const fillRef = useRef<HTMLInputElement>(null);

  const current  = items[index];
  const isLast   = index === items.length - 1;
  const isFill   = current.question_type === "fill_in_blank";
  const options: OptionKey[] = ["a", "b", "c", "d"];

  // Reset per-question state when index changes.
  useEffect(() => {
    setSelected(null);
    setFillInput("");
    setFillAnswered(false);
    setFillCorrect(false);
    if (isFill) fillRef.current?.focus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // ── Multiple choice ───────────────────────────────────────────────────────

  function handleSelect(key: OptionKey) {
    if (selected) return;
    setSelected(key);
    if (key === current.correct_option) setCorrect((c) => c + 1);
  }

  // Auto-advance 700ms after multiple-choice answer.
  useEffect(() => {
    if (!selected || isFill) return;
    const timer = setTimeout(() => {
      if (isLast) {
        const finalCorrect = correct + (selected === current.correct_option ? 1 : 0);
        onContinue(Math.round((finalCorrect / items.length) * 100));
      } else {
        setIndex((i) => i + 1);
      }
    }, 700);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // ── Fill-in-blank ─────────────────────────────────────────────────────────

  function handleFillSubmit() {
    if (fillAnswered || !fillInput.trim()) return;
    const isCorrect =
      current.correct_answer != null &&
      normalise(fillInput) === normalise(current.correct_answer);
    setFillCorrect(isCorrect);
    setFillAnswered(true);
    if (isCorrect) setCorrect((c) => c + 1);
  }

  // Auto-advance 1200ms after fill-in-blank answer.
  useEffect(() => {
    if (!fillAnswered || !isFill) return;
    const timer = setTimeout(() => {
      if (isLast) {
        const finalCorrect = correct + (fillCorrect ? 1 : 0);
        onContinue(Math.round((finalCorrect / items.length) * 100));
      } else {
        setIndex((i) => i + 1);
      }
    }, 1200);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillAnswered]);

  // ── Style helpers ─────────────────────────────────────────────────────────

  const optionStyle = (key: OptionKey) => {
    if (!selected)
      return "cursor-pointer";
    if (key === current.correct_option)
      return "border-emerald-500/50 bg-emerald-500/10 text-emerald-300";
    if (key === selected && key !== current.correct_option)
      return "border-red-500/50 bg-red-500/10 text-red-300";
    return "opacity-50";
  };

  const optionInlineStyle = (key: OptionKey): React.CSSProperties => {
    if (!selected)
      return { borderColor: "var(--color-border)", background: "var(--color-primary-soft)" };
    if (key === current.correct_option || (key === selected && key !== current.correct_option))
      return {};
    return { borderColor: "var(--color-border)", background: "var(--color-primary-soft)" };
  };

  const fillBorderClass = !fillAnswered
    ? ""
    : fillCorrect
    ? "border-emerald-500/50 bg-emerald-500/[0.06]"
    : "border-red-500/50 bg-red-500/[0.06]";

  const fillBorderInline: React.CSSProperties = !fillAnswered
    ? { borderColor: "color-mix(in srgb, var(--color-text-secondary) 30%, transparent)" }
    : {};

  return (
    <div className="flex flex-col gap-5">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ background: "linear-gradient(to right, var(--color-success), var(--color-accent))", width: `${(index / items.length) * 100}%` }}
          />
        </div>
        <span className="text-[11px]" style={{ color: "color-mix(in srgb, var(--color-text-secondary) 60%, transparent)" }}>{index + 1}/{items.length}</span>
      </div>

      {/* Question */}
      <div className="rounded-2xl p-5" style={{ border: "1px solid var(--color-border)", background: "var(--color-bg-card)" }}>
        <p className="text-[15px] font-semibold leading-relaxed" style={{ color: "var(--color-text)" }}>
          {current.question}
        </p>
        {isFill && (
          <p className="text-[11px] mt-1.5" style={{ color: "color-mix(in srgb, var(--color-text-secondary) 60%, transparent)" }}>Type your answer below</p>
        )}
      </div>

      {/* ── Multiple choice ── */}
      {!isFill && (
        <div className="grid grid-cols-1 gap-2.5">
          {options.map((key) => (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-[13px] transition-all duration-200",
                optionStyle(key)
              )}
              style={optionInlineStyle(key)}
            >
              <span className={cn(
                "w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 border",
                selected && key === current.correct_option
                  ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
                  : selected && key === selected
                  ? "border-red-500/50 bg-red-500/20 text-red-300"
                  : ""
              )}
              style={
                !selected
                  ? { borderColor: "var(--color-border)", background: "var(--color-primary-soft)", color: "var(--color-text-secondary)" }
                  : (key !== current.correct_option && key !== selected)
                  ? { borderColor: "var(--color-border)", background: "var(--color-primary-soft)", color: "color-mix(in srgb, var(--color-text-secondary) 40%, transparent)" }
                  : {}
              }>
                {key.toUpperCase()}
              </span>
              <span style={{ color: "var(--color-text)" }}>{current.options?.[key]}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Fill-in-blank ── */}
      {isFill && (
        <div className="flex flex-col gap-3">
          <div className={cn("rounded-xl border transition-all duration-200", fillBorderClass)} style={{ background: "var(--color-primary-soft)", ...fillBorderInline }}>
            <input
              ref={fillRef}
              type="text"
              value={fillInput}
              onChange={(e) => setFillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleFillSubmit(); }}
              disabled={fillAnswered}
              placeholder="Type your answer…"
              className="w-full bg-transparent px-4 py-3.5 text-[14px] outline-none rounded-xl"
              style={{ color: "var(--color-text)" }}
            />
          </div>

          {/* Feedback */}
          {fillAnswered && (
            <div className={cn(
              "rounded-xl px-4 py-2.5 text-[13px] font-medium",
              fillCorrect
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                : "bg-red-500/10 border border-red-500/30 text-red-300"
            )}>
              {fillCorrect
                ? "Correct!"
                : `Correct answer: ${current.correct_answer}`}
            </div>
          )}

          <button
            onClick={handleFillSubmit}
            disabled={fillAnswered || !fillInput.trim()}
            className="self-end px-5 py-2.5 rounded-xl text-[13px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            style={{ background: "linear-gradient(135deg, var(--color-success), var(--color-accent))", color: "var(--color-bg)" }}
          >
            Check Answer
          </button>
        </div>
      )}
    </div>
  );
}
