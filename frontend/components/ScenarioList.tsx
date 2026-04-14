"use client";

import React, { useState } from "react";
import { useScenarios } from "@/hooks/useScenarios";
import Badge from "@/components/ui/Badge";
import type { Scenario } from "@/lib/types";

interface ScenarioListProps {
  onSelect: (scenario: Scenario) => void;
  excludeExam?: boolean;
}

const CATEGORIES = [
  { key: undefined, label: "All" },
  { key: "daily", label: "Daily" },
  { key: "food", label: "Food" },
  { key: "travel", label: "Travel" },
  { key: "work", label: "Work" },
  { key: "social", label: "Social" },
  { key: "academic", label: "Academic" },
] as const;

function difficultyBadgeVariant(d: string): "success" | "warning" | "error" | "muted" {
  switch (d) {
    case "beginner":
      return "success";
    case "intermediate":
      return "warning";
    case "advanced":
      return "error";
    default:
      return "muted";
  }
}

const ScenarioCard = React.memo(function ScenarioCard({
  scenario,
  onSelect,
}: {
  scenario: Scenario;
  onSelect: (s: Scenario) => void;
}) {
  return (
    <button
      onClick={() => onSelect(scenario)}
      className="flex items-center gap-4 p-4 rounded-lg text-left transition duration-normal card-hover"
      style={{
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
        style={{ background: "var(--color-primary-soft)" }}
      >
        {scenario.emoji}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-semibold text-base truncate" style={{ color: "var(--color-text)" }}>
          {scenario.title}
        </div>
        <div className="text-sm mt-0.5 line-clamp-1" style={{ color: "var(--color-text-secondary)" }}>
          {scenario.description}
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge variant={difficultyBadgeVariant(scenario.difficulty)} size="sm">
            {scenario.difficulty}
          </Badge>
          <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            ~{scenario.expected_turns} turns
          </span>
        </div>
      </div>

      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-text-secondary)" }} className="shrink-0">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
});

export default function ScenarioList({ onSelect, excludeExam }: ScenarioListProps) {
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);
  const { scenarios: rawScenarios, loading, error } = useScenarios(activeCategory);

  const scenarios = excludeExam
    ? rawScenarios.filter((s) => s.exam_type !== "ielts")
    : rawScenarios;

  return (
    <div className="flex flex-col gap-5">
      <h2
        className="text-xl font-sora font-bold"
        style={{ color: "var(--color-text)" }}
      >
        Speak Scenarios
      </h2>

      {/* Category filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.label}
              onClick={() => setActiveCategory(cat.key)}
              style={{
                background: isActive
                  ? "var(--color-primary)"
                  : "var(--color-bg-card)",
                color: isActive ? "#fff" : "var(--color-text-secondary)",
                border: isActive ? "none" : "1px solid var(--color-border)",
              }}
              className="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap shrink-0 transition duration-normal"
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div
            style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-primary)" }}
            className="w-8 h-8 border-2 rounded-full animate-spin"
          />
        </div>
      )}

      {error && (
        <div className="text-center py-10 text-base" style={{ color: "var(--color-warning)" }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="flex flex-col gap-3 stagger-children">
          {scenarios.length === 0 && (
            <div className="text-center py-10 text-base" style={{ color: "var(--color-text-secondary)" }}>
              Không tìm thấy kịch bản nào cho danh mục này
            </div>
          )}

          {scenarios.map((scenario) => (
            <ScenarioCard key={scenario.id} scenario={scenario} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}
