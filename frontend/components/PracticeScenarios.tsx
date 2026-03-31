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
    <div className="flex flex-col gap-3">
      <h3
        className="font-sora font-semibold text-base px-1"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Practice a scenario
      </h3>
      <div className="flex flex-col gap-3 stagger-children">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className="flex items-center gap-4 p-4 rounded-lg transition-all duration-normal card-hover text-left"
            style={{
              backgroundColor: "var(--color-bg-card)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: "var(--color-primary-soft)" }}
            >
              {s.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="font-semibold text-base"
                style={{ color: "var(--color-text)" }}
              >
                {s.title}
              </p>
              <p
                className="text-sm mt-0.5"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {s.description}
              </p>
            </div>
            <span className="flex-shrink-0" style={{ color: "var(--color-text-secondary)" }}>
              <IconArrowRight size={16} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
