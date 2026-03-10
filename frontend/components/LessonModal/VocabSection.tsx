"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ApiVocabItem } from "@/lib/api";

interface VocabSectionProps {
  items: ApiVocabItem[];
  onContinue: () => void;
}

export default function VocabSection({ items, onContinue }: VocabSectionProps) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [seen, setSeen] = useState<Set<number>>(new Set());

  const current = items[index];
  const isLast = index === items.length - 1;
  const allSeen = seen.size === items.length;

  function handleFlip() {
    const next = !flipped;
    setFlipped(next);
    if (next) setSeen((s) => new Set(s).add(index));
  }

  function handleNext() {
    if (index >= items.length - 1) return; // guard against OOB
    setFlipped(false);
    setTimeout(() => setIndex((i) => Math.min(i + 1, items.length - 1)), 150);
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Progress dots */}
      <div className="flex items-center gap-1.5">
        {items.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === index ? "w-6 bg-[#2ED3C6]" : seen.has(i) ? "w-2.5 bg-[#2ED3C6]/40" : "w-2.5 bg-white/[0.1]"
            )}
          />
        ))}
      </div>

      {/* Card */}
      <div
        className="relative w-full max-w-[360px] h-[200px] cursor-pointer"
        style={{ perspective: "1000px" }}
        onClick={handleFlip}
      >
        <div
          className="relative w-full h-full transition-transform duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 rounded-2xl border border-white/[0.08] bg-[#0B2239] flex flex-col items-center justify-center gap-3 px-6 select-none"
            style={{ backfaceVisibility: "hidden" }}
          >
            <p className="text-[28px] font-sora font-bold text-[#E6EDF3] text-center">{current.word}</p>
            {current.pronunciation && (
              <p className="text-[14px] text-[#A6B3C2]">{current.pronunciation}</p>
            )}
            <p className="text-[11px] text-[#A6B3C2]/50 mt-2">Tap to reveal meaning</p>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 rounded-2xl border border-[#2ED3C6]/20 bg-[#0B2239] flex flex-col items-center justify-center gap-3 px-6 select-none"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <p className="text-[18px] font-semibold text-[#2ED3C6] text-center">{current.meaning}</p>
            {current.example_sentence && (
              <p className="text-[12px] text-[#A6B3C2]/70 text-center italic">
                &ldquo;{current.example_sentence}&rdquo;
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3 w-full max-w-[360px]">
        {!isLast ? (
          <button
            onClick={handleNext}
            disabled={!seen.has(index)}
            className={cn(
              "flex-1 py-3 rounded-xl font-semibold text-[14px] transition-all duration-200",
              seen.has(index)
                ? "bg-[#2ED3C6] text-[#071A2F] hover:opacity-90"
                : "bg-white/[0.05] text-[#A6B3C2]/40 cursor-not-allowed"
            )}
          >
            Next →
          </button>
        ) : (
          <button
            onClick={onContinue}
            disabled={!allSeen}
            className={cn(
              "flex-1 py-3 rounded-xl font-semibold text-[14px] transition-all duration-200",
              allSeen
                ? "bg-gradient-to-r from-[#2ED3C6] to-[#2DA8FF] text-[#071A2F] hover:opacity-90"
                : "bg-white/[0.05] text-[#A6B3C2]/40 cursor-not-allowed"
            )}
          >
            Continue
          </button>
        )}
      </div>

      <p className="text-[12px] text-[#A6B3C2]/50">
        {index + 1} / {items.length} words
      </p>
    </div>
  );
}
