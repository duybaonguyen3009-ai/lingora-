"use client";

import { useState } from "react";
import { IconHome, IconSwords, IconUsers, IconUser, IconBook, IconMic, IconPen, IconOpenBook, IconHeadphones } from "./Icons";
import Mascot from "@/components/ui/Mascot";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "./Social/NotificationBell";
import useSound from "@/hooks/useSound";
import { useReward } from "@/contexts/RewardContext";
import type { GamificationData } from "@/lib/types";
import type { BattleRankTier } from "@/lib/types";

/* ── Rank config ── */
const RANK_CONFIG: Record<string, { label: string; color: string; glow: string }> = {
  iron:       { label: "Iron",       color: "#9CA3AF", glow: "rgba(156,163,175,0.2)" },
  bronze:     { label: "Bronze",     color: "#CD7F32", glow: "rgba(205,127,50,0.2)" },
  silver:     { label: "Silver",     color: "#C0C0C0", glow: "rgba(192,192,192,0.2)" },
  gold:       { label: "Gold",       color: "#FFD700", glow: "rgba(255,215,0,0.2)" },
  platinum:   { label: "Platinum",   color: "#00FFFF", glow: "rgba(0,255,255,0.2)" },
  diamond:    { label: "Diamond",    color: "#B9A0E8", glow: "rgba(185,160,232,0.2)" },
  challenger: { label: "Challenger", color: "#FF6B35", glow: "rgba(255,107,53,0.2)" },
};

/* ── Learn sub-skills ── */
const LEARN_SKILLS = [
  { id: "learn-speaking",  label: "Speaking",  Icon: IconMic },
  { id: "learn-grammar",   label: "Grammar",   Icon: IconPen },
  { id: "learn-reading",   label: "Reading",   Icon: IconOpenBook },
  { id: "learn-writing",   label: "Writing",   Icon: IconPen },
  { id: "learn-listening", label: "Listening",  Icon: IconHeadphones },
] as const;

const NAV_ITEMS = [
  { id: "home",    label: "Home",    Icon: IconHome },
  { id: "learn",   label: "Learn",   Icon: IconBook },
  { id: "battle",  label: "Battle",  Icon: IconSwords },
  { id: "social",  label: "Friends", Icon: IconUsers },
  { id: "profile", label: "Profile", Icon: IconUser },
] as const;

interface AppSidebarProps {
  active: string;
  onChange: (id: string) => void;
  gamification: GamificationData | null;
  rankTier?: BattleRankTier;
  userName?: string;
}

export default function AppSidebar({ active, onChange, gamification, rankTier = "iron", userName }: AppSidebarProps) {
  const { play } = useSound();
  const { shields } = useReward();
  const [learnOpen, setLearnOpen] = useState(
    active.startsWith("learn") || active === "exam"
  );

  const xp = gamification?.xp;
  const streak = gamification?.streak;
  const xpPercent = xp ? Math.min(100, (xp.xpInLevel / xp.xpToNextLevel) * 100) : 0;
  const rank = RANK_CONFIG[rankTier] || RANK_CONFIG.iron;

  const initials = userName
    ? userName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const handleNav = (id: string) => {
    play("click", 0.2);
    if (id === "learn") {
      setLearnOpen((v) => !v);
      if (!active.startsWith("learn") && active !== "exam") {
        onChange("exam");
      }
    } else {
      onChange(id);
    }
  };

  const handleSubNav = (id: string) => {
    play("click", 0.15);
    onChange(id);
  };

  /* Determine which top-level item is "active" */
  const resolvedActive = active.startsWith("learn") || active === "exam" ? "learn" : active;

  return (
    <aside
      className="hidden lg:flex flex-col fixed top-0 left-0 h-dvh z-50"
      style={{
        width: "var(--sidebar-width)",
        backgroundColor: "var(--sidebar-bg)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      {/* ── Brand ── */}
      <div
        className="flex items-center gap-2.5 px-5 h-16 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        <Mascot size={28} />
        <span
          className="font-display font-bold text-lg tracking-[-0.3px]"
          style={{ color: "var(--color-text)" }}
        >
          Lingona
        </span>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = resolvedActive === id;

          return (
            <div key={id}>
              <button
                onClick={() => handleNav(id)}
                className="relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer"
                style={{
                  backgroundColor: isActive ? "var(--sidebar-item-active-bg)" : "transparent",
                  color: isActive ? "var(--sidebar-active-indicator)" : "var(--color-text-secondary)",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = "var(--sidebar-item-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {/* Active left bar */}
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full sidebar-nav-glow"
                    style={{ backgroundColor: "var(--sidebar-active-indicator)" }}
                  />
                )}

                <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  <Icon size={20} />
                </span>
                <span className="text-sm font-medium flex-1">{label}</span>

                {/* Learn chevron */}
                {id === "learn" && (
                  <svg
                    width={14} height={14} viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="transition-transform"
                    style={{ transform: learnOpen ? "rotate(90deg)" : "rotate(0deg)", opacity: 0.5 }}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
              </button>

              {/* ── Learn sub-menu ── */}
              {id === "learn" && learnOpen && (
                <div className="animate-sub-nav ml-5 mt-0.5 mb-1 pl-3 space-y-0.5"
                  style={{ borderLeft: "1px solid var(--sidebar-border)" }}
                >
                  {LEARN_SKILLS.map(({ id: subId, label: subLabel, Icon: SubIcon }) => {
                    const subActive = active === subId;
                    return (
                      <button
                        key={subId}
                        onClick={() => handleSubNav(subId)}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors cursor-pointer"
                        style={{
                          backgroundColor: subActive ? "var(--sidebar-item-active-bg)" : "transparent",
                          color: subActive ? "var(--sidebar-active-indicator)" : "var(--color-text-tertiary)",
                          fontSize: "13px",
                        }}
                        onMouseEnter={(e) => {
                          if (!subActive) e.currentTarget.style.backgroundColor = "var(--sidebar-item-hover)";
                        }}
                        onMouseLeave={(e) => {
                          if (!subActive) e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <SubIcon size={16} />
                        <span className="font-medium">{subLabel}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Bottom section: identity anchors ── */}
      <div
        className="flex-shrink-0 px-4 py-4 space-y-3"
        style={{ borderTop: "1px solid var(--sidebar-border)" }}
      >
        {/* Streak + Shields */}
        <div className="flex items-center gap-2.5">
          <span className="text-base" style={{ color: "#F59E0B" }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2c0 0-7 7-7 13a7 7 0 0 0 14 0c0-6-7-13-7-13z" />
            </svg>
          </span>
          <span className="text-sm font-bold" style={{ color: "#F59E0B" }}>
            {streak?.currentStreak ?? 0}
          </span>
          <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
            day streak
          </span>
          {shields > 0 && (
            <span
              className="text-[11px] font-bold flex items-center gap-0.5 ml-auto"
              style={{ color: "#60A5FA" }}
              title={`${shields} streak shield${shields > 1 ? "s" : ""}`}
            >
              🛡️ {shields}
            </span>
          )}
        </div>

        {/* Rank */}
        <div className="flex items-center gap-2.5">
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
            style={{
              backgroundColor: `${rank.color}20`,
              color: rank.color,
              boxShadow: `0 0 8px ${rank.glow}`,
            }}
          >
            {rank.label[0]}
          </span>
          <span className="text-sm font-bold" style={{ color: rank.color }}>
            {rank.label}
          </span>
        </div>

        {/* XP bar — easeOutCubic animated fill */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold" style={{ color: "var(--color-text-secondary)" }}>
              Lv {xp?.level ?? 1}
            </span>
            <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              {xp?.xpInLevel ?? 0} / {xp?.xpToNextLevel ?? 100} XP
            </span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: "var(--sidebar-xp-track)" }}
          >
            <div
              className="h-full rounded-full xp-bar-animated"
              style={{
                width: `${xpPercent}%`,
                background: "var(--sidebar-xp-fill)",
              }}
            />
          </div>
        </div>

        {/* Utility row */}
        <div className="flex items-center gap-2 pt-1">
          <NotificationBell />
          <ThemeToggle />
          <div className="flex-1" />
          {/* Settings gear */}
          <button
            onClick={() => onChange("settings")}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
            style={{
              backgroundColor: active === "settings" ? "var(--sidebar-item-active-bg)" : "transparent",
              color: active === "settings" ? "var(--sidebar-active-indicator)" : "var(--color-text-tertiary)",
            }}
            title="Settings"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-sans font-bold text-[11px] text-white cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #1B2B4B, #2D4A7A)",
              border: "2px solid rgba(0,168,150,0.3)",
            }}
            onClick={() => onChange("profile")}
          >
            {initials}
          </div>
        </div>
      </div>
    </aside>
  );
}
