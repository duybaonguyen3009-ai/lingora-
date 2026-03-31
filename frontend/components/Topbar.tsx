"use client";

import { IconFire } from "./Icons";
import ThemeToggle from "./ThemeToggle";
import Mascot from "@/components/ui/Mascot";

interface TopbarProps {
  streak?: number;
}

export default function Topbar({ streak = 0 }: TopbarProps) {
  return (
    <header
      className="h-16 px-5 flex items-center justify-between gap-4 flex-shrink-0"
      style={{
        backgroundColor: "var(--color-bg-card)",
        borderBottom: "1px solid var(--color-border)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Left — Streak badge */}
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
        style={{
          backgroundColor: "var(--color-warning-soft)",
          border: "1px solid color-mix(in srgb, var(--color-warning) 18%, transparent)",
          color: "var(--color-warning)",
          ...(streak > 0 ? { boxShadow: "0 0 10px rgba(251,191,36,0.3), 0 0 20px rgba(251,191,36,0.1)" } : {}),
        }}
      >
        <span
          className="inline-flex"
          style={streak > 0 ? { animation: "streakPulse 2s ease-in-out infinite" } : undefined}
        >
          <IconFire className="text-amber-400" />
        </span>
        {streak} Day{streak !== 1 ? "s" : ""}
      </div>

      {/* Center — Brand with mascot logomark */}
      <div className="flex items-center gap-2">
        <Mascot size={28} />
        <span
          className="font-sora font-bold text-lg tracking-[-0.3px]"
          style={{ color: "var(--color-text)" }}
        >
          Lingona
        </span>
      </div>

      {/* Right — Avatar + Theme */}
      <div className="flex items-center gap-2.5">
        <ThemeToggle />
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center font-sora font-bold text-xs text-white"
          style={{
            background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
          }}
        >
          AN
        </div>
      </div>
      {streak > 0 && (
        <style>{`
          @keyframes streakPulse {
            0%, 100% { transform: scale(1); }
            50%      { transform: scale(1.15); }
          }
        `}</style>
      )}
    </header>
  );
}
