"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { ApiQuizItem } from "@/lib/api";

interface QuizSectionProps {
  items: ApiQuizItem[];
  onContinue: (score: number) => void;
}

type OptionKey = "a" | "b" | "c" | "d";

export default function QuizSection({ items, onContinue }: QuizSectionProps) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<OptionKey | null>(null);
  const [correct, setCorrect] = useState(0);

  const current = items[index];
  const isLast = index === items.length - 1;
  const options: OptionKey[] = ["a", "b", "c", "d"];

  function handleSelect(key: OptionKey) {
    if (selected) return; // already answered
    setSelected(key);
    if (key === current.correct_option) setCorrect((c) => c + 1);
  }

  // Auto-advance 700ms after answer
  useEffect(() => {
    if (!selected) return;
    const timer = setTimeout(() => {
      if (isLast) {
        // correct state is stale in this closure — add 1 here if this answer was right
        const finalCorrect = correct + (selected === current.correct_option ? 1 : 0);
        onContinue(Math.round((finalCorrect / items.length) * 100));
      } else {
        setSelected(null);
        setIndex((i) => i + 1);
      }
    }, 700);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const optionStyle = (key: OptionKey) => {
    if (!selected) return "border-white/[0.08] bg-white/[0.03] hover:border-[#2DA8FF]/40 hover:bg-[#2DA8FF]/[0.06] cursor-pointer";
    if (key === current.correct_option) return "border-emerald-500/50 bg-emerald-500/10 text-emerald-300";
    if (key === selected && key !== current.correct_option) return "border-red-500/50 bg-red-500/10 text-red-300";
    return "border-white/[0.04] bg-white/[0.02] opacity-50";
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Progress */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#2ED3C6] to-[#2DA8FF] transition-all duration-500"
            style={{ width: `${((index) / items.length) * 100}%` }}
          />
        </div>
        <span className="text-[11px] text-[#A6B3C2]/60">{index + 1}/{items.length}</span>
      </div>

      {/* Question */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#0B2239] p-5">
        <p className="text-[15px] font-semibold text-[#E6EDF3] leading-relaxed">{current.question}</p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 gap-2.5">
        {options.map((key) => (
          <button
            key={key}
            onClick={() => handleSelect(key)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-[13px] transition-all duration-200",
              optionStyle(key)
            )}
          >
            <span className={cn(
              "w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 border",
              !selected ? "border-white/[0.12] bg-white/[0.05] text-[#A6B3C2]"
                : key === current.correct_option ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
                : key === selected ? "border-red-500/50 bg-red-500/20 text-red-300"
                : "border-white/[0.06] bg-white/[0.03] text-[#A6B3C2]/40"
            )}>
              {key.toUpperCase()}
            </span>
            <span className="text-[#E6EDF3]">{current.options[key]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
