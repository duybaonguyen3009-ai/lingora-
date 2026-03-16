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
              i === index ? "w-6" : "w-2.5"
            )}
            style={{
              background:
                i === index
                  ? "var(--color-success)"
                  : seen.has(i)
                  ? "color-mix(in srgb, var(--color-success) 40%, transparent)"
                  : "var(--color-border)",
            }}
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
            className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-3 px-6 select-none"
            style={{ border: "1px solid var(--color-border)", background: "var(--color-bg-card)", backfaceVisibility: "hidden" }}
          >
            <p className="text-[28px] font-sora font-bold text-center" style={{ color: "var(--color-text)" }}>{current.word}</p>
            {current.pronunciation && (
              <p className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>{current.pronunciation}</p>
            )}
            <p className="text-[11px] mt-2" style={{ color: "color-mix(in srgb, var(--color-text-secondary) 50%, transparent)" }}>Tap to reveal meaning</p>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-3 px-6 select-none"
            style={{ border: "1px solid color-mix(in srgb, var(--color-success) 20%, transparent)", background: "var(--color-bg-card)", backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <p className="text-[18px] font-semibold text-center" style={{ color: "var(--color-success)" }}>{current.meaning}</p>
            {current.example_sentence && (
              <p className="text-[12px] text-center italic" style={{ color: "color-mix(in srgb, var(--color-text-secondary) 70%, transparent)" }}>
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
              !seen.has(index) && "cursor-not-allowed"
            )}
            style={
              seen.has(index)
                ? { background: "var(--color-success)", color: "var(--color-bg)" }
                : { background: "var(--color-primary-soft)", color: "color-mix(in srgb, var(--color-text-secondary) 40%, transparent)" }
            }
          >
            Next →
          </button>
        ) : (
          <button
            onClick={onContinue}
            disabled={!allSeen}
            className={cn(
              "flex-1 py-3 rounded-xl font-semibold text-[14px] transition-all duration-200",
              !allSeen && "cursor-not-allowed"
            )}
            style={
              allSeen
                ? { background: "linear-gradient(to right, var(--color-success), var(--color-accent))", color: "var(--color-bg)" }
                : { background: "var(--color-primary-soft)", color: "color-mix(in srgb, var(--color-text-secondary) 40%, transparent)" }
            }
          >
            Continue
          </button>
        )}
      </div>

      <p className="text-[12px]" style={{ color: "color-mix(in srgb, var(--color-text-secondary) 50%, transparent)" }}>
        {index + 1} / {items.length} words
      </p>
    </div>
  );
}
