"use client";

/**
 * ScenarioList.tsx
 *
 * Scenario browser with category filter pills.
 * Fetches real scenarios from the API and displays them as cards.
 */

import React, { useState } from "react";
import { useScenarios } from "@/hooks/useScenarios";
import type { Scenario } from "@/lib/types";

// ─── Props ────────────────────────────────────────────────────────────

interface ScenarioListProps {
  onSelect: (scenario: Scenario) => void;
}

// ─── Category pills ───────────────────────────────────────────────────

const CATEGORIES = [
  { key: undefined, label: "All" },
  { key: "daily", label: "Daily" },
  { key: "food", label: "Food" },
  { key: "travel", label: "Travel" },
  { key: "work", label: "Work" },
  { key: "social", label: "Social" },
  { key: "academic", label: "Academic" },
  { key: "exam", label: "🎓 Exam" },
] as const;

// ─── Difficulty badge colors ──────────────────────────────────────────

function difficultyColor(d: string) {
  switch (d) {
    case "beginner":
      return { bg: "rgba(74, 222, 128, 0.15)", text: "#4ade80" };
    case "intermediate":
      return { bg: "rgba(251, 191, 36, 0.15)", text: "#fbbf24" };
    case "advanced":
      return { bg: "rgba(248, 113, 113, 0.15)", text: "#f87171" };
    default:
      return { bg: "rgba(148, 163, 184, 0.15)", text: "#94a3b8" };
  }
}

// ─── Component ────────────────────────────────────────────────────────

export default function ScenarioList({ onSelect }: ScenarioListProps) {
  const [activeCategory, setActiveCategory] = useState<string | undefined>(
    undefined,
  );
  const { scenarios, loading, error } = useScenarios(activeCategory);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <h2
        className="text-lg font-sora font-bold"
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
                border: isActive
                  ? "none"
                  : "1px solid var(--color-border)",
              }}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors"
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div
            style={{
              borderColor: "var(--color-border)",
              borderTopColor: "var(--color-primary)",
            }}
            className="w-8 h-8 border-2 rounded-full animate-spin"
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="text-center py-8"
          style={{ color: "var(--color-warning)" }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Scenario cards */}
      {!loading && !error && (
        <div className="flex flex-col gap-3">
          {scenarios.length === 0 && (
            <div
              className="text-center py-8 text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              No scenarios found for this category.
            </div>
          )}

          {scenarios.map((scenario) => {
            const dc = difficultyColor(scenario.difficulty);
            const isIelts = scenario.exam_type === "ielts";
            return (
              <button
                key={scenario.id}
                onClick={() => onSelect(scenario)}
                style={{
                  background: "var(--color-bg-card)",
                  border: isIelts
                    ? "1px solid rgba(251, 191, 36, 0.5)"
                    : "1px solid var(--color-border)",
                }}
                className="flex items-center gap-3 p-4 rounded-xl text-left hover:opacity-90 transition-opacity"
              >
                {/* Emoji */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: "var(--color-primary-soft)" }}
                >
                  {scenario.emoji}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div
                    className="font-semibold text-sm truncate"
                    style={{ color: "var(--color-text)" }}
                  >
                    {scenario.title}
                  </div>
                  <div
                    className="text-xs mt-0.5 line-clamp-1"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {scenario.description}
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {isIelts && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: "rgba(251, 191, 36, 0.15)",
                          color: "#fbbf24",
                        }}
                      >
                        EXAM
                      </span>
                    )}
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{ background: dc.bg, color: dc.text }}
                    >
                      {scenario.difficulty}
                    </span>
                    <span
                      className="text-[10px]"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      ~{scenario.expected_turns} turns
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: "var(--color-text-secondary)" }}
                  className="shrink-0"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
