"use client";

import { IconArrowRight } from "./Icons";

interface Scenario {
  id: string;
  emoji: string;
  title: string;
  description: string;
}

const SCENARIOS: Scenario[] = [
  { id: "cafe", emoji: "☕", title: "Order at a cafe", description: "Practice ordering food & drinks" },
  { id: "interview", emoji: "💼", title: "Job interview", description: "Answer common questions" },
  { id: "daily", emoji: "💬", title: "Daily conversation", description: "Chat about your day" },
];

interface PracticeScenariosProps {
  onSelect: (scenarioId: string) => void;
}

export default function PracticeScenarios({ onSelect }: PracticeScenariosProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <h3
        className="font-sora font-semibold text-[14px] px-1"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Practice a scenario
      </h3>
      <div className="flex flex-col gap-2">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className="flex items-center gap-3.5 p-3.5 rounded-xl transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] text-left"
            style={{
              backgroundColor: "var(--color-bg-card)",
              border: "1px solid var(--color-border)",
            }}
          >
            <span className="text-2xl flex-shrink-0">{s.emoji}</span>
            <div className="flex-1 min-w-0">
              <p
                className="font-semibold text-[14px]"
                style={{ color: "var(--color-text)" }}
              >
                {s.title}
              </p>
              <p
                className="text-[12px] mt-0.5"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {s.description}
              </p>
            </div>
            <span className="flex-shrink-0" style={{ color: "var(--color-text-secondary)" }}>
              <IconArrowRight size={14} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
