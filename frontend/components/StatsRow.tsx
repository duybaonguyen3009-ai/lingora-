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
        "rounded-[16px] p-[18px] bg-[#0B2239] border border-white/[0.07]",
        "transition-all duration-200 cursor-default",
        "hover:-translate-y-[2px] hover:border-[#2ED3C6]/20",
        "animate-fadeSlideUp"
      )}
      style={{ animationDelay: `${delay}ms`, boxShadow: "none" }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = "none")}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-9 h-9 rounded-[10px] flex items-center justify-center", config.iconBg)}>
          {ICONS[stat.id]}
        </div>
        <span className="text-[11px] font-semibold text-green-400 flex items-center gap-0.5">
          {stat.trend}
        </span>
      </div>

      <div className="font-sora font-black text-[26px] tracking-[-0.5px] leading-none mb-1">
        {displayValue}
        <span className="text-[14px] font-medium text-[#A6B3C2] ml-0.5">{stat.unit}</span>
      </div>
      <div className="text-[11.5px] text-[#A6B3C2] uppercase tracking-[0.5px]">{stat.label}</div>

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

export default function StatsRow() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      {mockStats.map((stat, i) => (
        <StatCardItem key={stat.id} stat={stat} delay={i * 80} />
      ))}
    </div>
  );
}
