"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ApiSpeakingPrompt } from "@/lib/api";

interface SpeakingSectionProps {
  items: ApiSpeakingPrompt[];
  onContinue: () => void;
}

export default function SpeakingSection({ items, onContinue }: SpeakingSectionProps) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const current = items[index];
  const isLast = index === items.length - 1;

  function handleNext() {
    setRevealed(false);
    setTimeout(() => setIndex((i) => i + 1), 150);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Progress dots */}
      <div className="flex items-center gap-1.5">
        {items.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === index ? "w-6 bg-[#A064FF]" : i < index ? "w-2.5 bg-[#A064FF]/40" : "w-2.5 bg-white/[0.1]"
            )}
          />
        ))}
      </div>

      {/* Prompt */}
      <div className="rounded-2xl border border-[#A064FF]/20 bg-[#A064FF]/[0.05] p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.8px] text-[#A064FF] mb-3">Speaking Prompt</p>
        <p className="text-[16px] font-semibold text-[#E6EDF3] leading-relaxed">{current.prompt_text}</p>
        {current.hint && (
          <p className="text-[12px] text-[#A6B3C2]/60 mt-3 italic">💡 {current.hint}</p>
        )}
      </div>

      {/* Sample answer toggle */}
      {current.sample_answer && (
        <div>
          <button
            onClick={() => setRevealed((v) => !v)}
            className={cn(
              "text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200",
              revealed
                ? "bg-[#A064FF]/15 border-[#A064FF]/25 text-[#A064FF]"
                : "bg-white/[0.04] border-white/[0.08] text-[#A6B3C2] hover:border-[#A064FF]/25 hover:text-[#A064FF]"
            )}
          >
            {revealed ? "Hide Sample Answer" : "Reveal Sample Answer"}
          </button>
          {revealed && (
            <div className="mt-3 px-4 py-3 rounded-xl bg-[#0B2239] border border-[#A064FF]/15 text-[13px] text-[#A6B3C2] leading-relaxed">
              {current.sample_answer}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      {!isLast ? (
        <button
          onClick={handleNext}
          className="py-3 rounded-xl font-semibold text-[14px] bg-[#A064FF]/20 border border-[#A064FF]/25 text-[#A064FF] hover:bg-[#A064FF]/30 transition-all duration-200"
        >
          Next →
        </button>
      ) : (
        <button
          onClick={onContinue}
          className="py-3 rounded-xl font-semibold text-[14px] bg-gradient-to-r from-[#2ED3C6] to-[#2DA8FF] text-[#071A2F] hover:opacity-90 transition-all duration-200"
        >
          Finish Lesson
        </button>
      )}

      <p className="text-[12px] text-[#A6B3C2]/50 text-center">
        {index + 1} / {items.length} prompts
      </p>
    </div>
  );
}
