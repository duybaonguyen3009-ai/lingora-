"use client";

/**
 * DailyGoalBar.tsx
 *
 * Compact daily XP goal progress bar for the Practice tab.
 * Shows: "12 / 20 XP today" with animated fill and streak count.
 * Celebrates when daily goal is met.
 */

import { useEffect, useState } from "react";
import { IconFire, IconZap } from "./Icons";
import Card from "@/components/ui/Card";
import type { DailyGoalState } from "@/hooks/useDailyGoal";

interface DailyGoalBarProps {
  goal: DailyGoalState;
  streak: number;
}

export default function DailyGoalBar({ goal, streak }: DailyGoalBarProps) {
  const [animatedPct, setAnimatedPct] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedPct(goal.progressPct), 100);
    return () => clearTimeout(timer);
  }, [goal.progressPct]);

  return (
    <Card
      padding="md"
      className="flex flex-col gap-3"
      style={goal.goalMet ? {
        border: "1px solid rgba(251,191,36,0.25)",
        background: "linear-gradient(135deg, rgba(251,191,36,0.06), rgba(245,158,11,0.04))",
      } : undefined}
    >
      {/* Top row — daily XP + streak */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: goal.goalMet
                ? "linear-gradient(135deg, var(--color-warning), #D97706)"
                : "rgba(46,211,198,0.12)",
            }}
          >
            <IconZap size={14} className={goal.goalMet ? "text-white" : "text-emerald-400"} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              {goal.goalMet ? "Daily goal reached!" : "Daily Goal"}
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              {goal.todayXp} / {goal.dailyGoal} XP today
              {goal.todayLessons > 0 && ` · ${goal.todayLessons} lesson${goal.todayLessons !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        {/* Streak badge */}
        {streak > 0 && (
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{
              backgroundColor: "var(--color-warning-soft)",
              border: "1px solid color-mix(in srgb, var(--color-warning) 18%, transparent)",
              color: "var(--color-warning)",
            }}
          >
            <IconFire size={12} className="text-amber-400" />
            {streak}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-border)" }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${animatedPct}%`,
            background: goal.goalMet
              ? "linear-gradient(90deg, var(--color-warning), #D97706)"
              : "linear-gradient(90deg, var(--color-success), var(--color-accent))",
            boxShadow: goal.goalMet ? "0 0 8px rgba(245,158,11,0.4)" : undefined,
          }}
        />
      </div>
    </Card>
  );
}
