"use client";

import { IconArrowRight } from "./Icons";

const HIGHLIGHTS = [
  { emoji: "☕", label: "Café" },
  { emoji: "💼", label: "Interview" },
  { emoji: "💬", label: "Daily chat" },
  { emoji: "✈️", label: "Travel" },
  { emoji: "🎓", label: "Academic" },
  { emoji: "🍕", label: "Food" },
];

interface PracticeScenariosProps {
  onSelect: (scenarioId: string) => void;
}

export default function PracticeScenarios({ onSelect }: PracticeScenariosProps) {
  return (
    <button
      onClick={() => onSelect("browse")}
      className="flex items-center gap-4 p-4 rounded-lg transition-all duration-normal card-hover text-left w-full"
      style={{
        backgroundColor: "var(--color-bg-card)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="flex-1 min-w-0">
        <p
          className="font-sora font-semibold text-base mb-1.5"
          style={{ color: "var(--color-text)" }}
        >
          Practice a scenario
        </p>
        <div className="flex flex-wrap gap-2">
          {HIGHLIGHTS.map((h) => (
            <span
              key={h.label}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
              style={{
                backgroundColor: "var(--color-primary-soft)",
                color: "var(--color-text-secondary)",
              }}
            >
              {h.emoji} {h.label}
            </span>
          ))}
        </div>
      </div>
      <span className="flex-shrink-0" style={{ color: "var(--color-text-secondary)" }}>
        <IconArrowRight size={16} />
      </span>
    </button>
  );
}
