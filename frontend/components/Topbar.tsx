"use client";

import { useRouter } from "next/navigation";
import { IconFire } from "./Icons";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "./Social/NotificationBell";
import Mascot from "@/components/ui/Mascot";
import { useAuthStore } from "@/lib/stores/authStore";

interface TopbarProps {
  streak?: number;
}

export default function Topbar({ streak = 0 }: TopbarProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <header
      className="h-16 px-5 flex items-center justify-between gap-4 flex-shrink-0"
      style={{
        backgroundColor: "var(--color-bg-card)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      {/* Left — Streak badge */}
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold"
        style={{
          background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.08))",
          border: "1px solid rgba(245,158,11,0.2)",
          color: "#F59E0B",
          ...(streak > 0 ? { boxShadow: "0 0 10px rgba(245,158,11,0.2)" } : {}),
        }}
      >
        <span
          className="inline-flex"
          style={streak > 0 ? { animation: "streakPulse 2s ease-in-out infinite" } : undefined}
        >
          <IconFire className="text-amber-500" />
        </span>
        <span className="text-base font-bold">{streak}</span>
        <span className="text-xs font-medium opacity-80">Day{streak !== 1 ? "s" : ""}</span>
      </div>

      {/* Center — Brand with mascot logomark */}
      <div className="flex items-center gap-2">
        <Mascot size={28} />
        <span
          className="font-display font-bold text-lg tracking-[-0.3px]"
          style={{ color: "var(--color-text)" }}
        >
          Lingona
        </span>
      </div>

      {/* Right — Leaderboard + Theme + Avatar */}
      <div className="flex items-center gap-2.5">
        {user && (
          <button
            onClick={() => router.push("/leaderboard")}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-95"
            style={{
              background: "rgba(245,158,11,0.10)",
              border: "1px solid rgba(245,158,11,0.15)",
            }}
            title="Leaderboard"
          >
            <span className="text-base">🏆</span>
          </button>
        )}
        <NotificationBell />
        <ThemeToggle />
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center font-sans font-bold text-xs text-white"
          style={{
            background: "linear-gradient(135deg, #1B2B4B, #2D4A7A)",
            border: "2px solid rgba(0, 168, 150, 0.3)",
          }}
        >
          {initials}
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
