"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { getStatColorConfig } from "@/lib/utils";
import { mockStats } from "@/lib/mockData";
import { IconFire, IconPen, IconAward, IconClock } from "./Icons";
import type { StatCard } from "@/lib/types";

const ICONS: Record<string, React.ReactNode> = {
  streak: <IconFire size={18} />,
  vocab:  <IconPen  size={18} />,
  rank:   <IconAward size={18} />,
  time:   <IconClock size={18} />,
};

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * ease));
      if (progress < 1) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [target, duration]);
  return value;
}

function StatCardItem({ stat, delay }: { stat: StatCard; delay: number }) {
  const config = getStatColorConfig(stat.color);
  const barRef = useRef<HTMLDivElement>(null);
  const [barLoaded, setBarLoaded] = useState(false);
  const numericTarget = typeof stat.value === "number" ? stat.value : 4;
  const animatedNum = useCountUp(typeof stat.value === "number" ? numericTarget : 0);

  useEffect(() => {
    const timer = setTimeout(() => setBarLoaded(true), delay + 300);
    return () => clearTimeout(timer);
  }, [delay]);

  const displayValue = typeof stat.value === "string"
    ? stat.value
    : stat.id === "rank" ? `#${animatedNum}` : animatedNum.toLocaleString();

  return (
    <div
      className={cn(
        "rounded-lg p-4 border border-white/[0.07]",
        "transition duration-normal cursor-default",
        "hover:-translate-y-[2px] hover:border-emerald-400/20",
        "animate-fadeSlideUp"
      )}
      style={{ animationDelay: `${delay}ms`, boxShadow: "none", background: "var(--color-bg-card)" }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = "none")}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-9 h-9 rounded-md flex items-center justify-center", config.iconBg)}>
          {ICONS[stat.id]}
        </div>
        <span className="text-xs font-semibold text-green-400 flex items-center gap-0.5">
          {stat.trend}
        </span>
      </div>

      <div className="font-sora font-black text-xl tracking-[-0.5px] leading-none mb-1">
        {displayValue}
        <span className="text-sm font-medium ml-0.5" style={{ color: "var(--color-text-muted)" }}>{stat.unit}</span>
      </div>
      <div className="text-xs uppercase tracking-[0.5px]" style={{ color: "var(--color-text-muted)" }}>{stat.label}</div>

      {/* Progress bar */}
      <div className="h-[3px] bg-white/5 rounded-full mt-3.5 overflow-hidden">
        <div
          ref={barRef}
          className={cn("h-full rounded-full", config.barClass)}
          style={{
            width: barLoaded ? `${stat.barPercent}%` : "0%",
            transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>
    </div>
  );
}

interface StatsRowProps {
  streak?: number;
  /** Real vocabulary count derived from completed lessons × vocab_count. */
  vocabLearned?: number;
  /** Estimated study time in minutes (completedLessons × avg lesson duration). */
  studyMinutes?: number;
  /** Global rank from the leaderboard. null = not yet computed, undefined = show placeholder. */
  rank?: number | null;
}

export default function StatsRow({ streak, vocabLearned, studyMinutes, rank }: StatsRowProps) {
  const stats = mockStats.map((s): StatCard => {
    if (s.id === "streak" && streak !== undefined) {
      return { ...s, value: streak, trend: "", barPercent: Math.min(Math.round((streak / 30) * 100), 100) };
    }
    if (s.id === "vocab" && vocabLearned !== undefined) {
      return {
        ...s,
        value: vocabLearned,
        trend: "",
        // 500 words ≈ full bar for an intermediate learner
        barPercent: Math.min(Math.round((vocabLearned / 500) * 100), 100),
      };
    }
    if (s.id === "rank") {
      if (rank != null) {
        return { ...s, value: rank, unit: "", trend: "" };
      }
      // No rank yet — show a clean placeholder
      return { ...s, value: "—", unit: "", trend: "—" };
    }
    if (s.id === "time" && studyMinutes !== undefined) {
      // Display as minutes below 60, hours above
      const isHours = studyMinutes >= 60;
      const displayValue = isHours
        ? Math.round((studyMinutes / 60) * 10) / 10
        : studyMinutes;
      return {
        ...s,
        value: displayValue,
        unit: isHours ? "hrs" : "min",
        trend: "",
        // 600 min (10 hrs) ≈ full bar
        barPercent: Math.min(Math.round((studyMinutes / 600) * 100), 100),
      };
    }
    return s;
  });

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      {stats.map((stat, i) => (
        <StatCardItem key={stat.id} stat={stat} delay={i * 80} />
      ))}
    </div>
  );
}
