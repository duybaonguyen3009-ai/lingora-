"use client";

import { IconFire } from "./Icons";
import ThemeToggle from "./ThemeToggle";

interface TopbarProps {
  streak?: number;
}

export default function Topbar({ streak = 0 }: TopbarProps) {
  return (
    <header
      className="h-14 px-5 flex items-center justify-between gap-4 flex-shrink-0"
      style={{
        backgroundColor: "var(--color-bg)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      {/* Left — Streak badge */}
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-semibold"
        style={{
          backgroundColor: "rgba(251,191,36,0.1)",
          border: "1px solid rgba(251,191,36,0.2)",
          color: "#F59E0B",
        }}
      >
        <IconFire className="text-amber-400" />
        {streak} Day{streak !== 1 ? "s" : ""}
      </div>

      {/* Center — Brand */}
      <span
        className="font-sora font-bold text-[15px] tracking-[-0.3px]"
        style={{ color: "var(--color-text)" }}
      >
        Lingona
      </span>

      {/* Right — Avatar + Theme */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center font-sora font-bold text-[11px] text-white"
          style={{
            background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
          }}
        >
          AN
        </div>
      </div>
    </header>
  );
}
