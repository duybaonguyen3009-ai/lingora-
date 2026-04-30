"use client";

import { useEffect, useState } from "react";
import Mascot from "@/components/ui/Mascot";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "./Social/NotificationBell";
import useSound from "@/hooks/useSound";
import { itemsForSurface, parentGroupId, type NavItem } from "@/config/nav";
import type { GamificationData } from "@/lib/types";
import type { BattleRankTier } from "@/lib/types";

const EXPAND_STORAGE_KEY = "lingona.sidebar.expandedGroups";
const DEFAULT_EXPANDED = ["exam", "learn"];

function loadExpanded(): Set<string> {
  if (typeof window === "undefined") return new Set(DEFAULT_EXPANDED);
  try {
    const raw = window.localStorage.getItem(EXPAND_STORAGE_KEY);
    if (!raw) return new Set(DEFAULT_EXPANDED);
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.filter((s) => typeof s === "string"));
  } catch {}
  return new Set(DEFAULT_EXPANDED);
}

function saveExpanded(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(EXPAND_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

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

/* Nav items now sourced from @/config/nav (shared with BottomNav). */
const SIDEBAR_ITEMS = itemsForSurface("sidebar");

interface AppSidebarProps {
  active: string;
  onChange: (id: string) => void;
  gamification: GamificationData | null;
  rankTier?: BattleRankTier;
  userName?: string;
  /** Fallback streak count when gamification data hasn't loaded yet */
  displayStreak?: number;
}

export default function AppSidebar({ active, onChange, gamification, rankTier = "iron", userName, displayStreak }: AppSidebarProps) {
  const { play } = useSound();
  const [expanded, setExpanded] = useState<Set<string>>(loadExpanded);

  // Auto-expand the parent of the active child whenever active changes.
  const activeParent = parentGroupId(active);
  useEffect(() => {
    if (!activeParent) return;
    setExpanded((prev) => {
      if (prev.has(activeParent)) return prev;
      const next = new Set(prev);
      next.add(activeParent);
      saveExpanded(next);
      return next;
    });
  }, [activeParent]);

  const xp = gamification?.xp;
  const streak = gamification?.streak;
  const xpPercent = xp ? Math.min(100, (xp.xpInLevel / xp.xpToNextLevel) * 100) : 0;
  const rank = RANK_CONFIG[rankTier] || RANK_CONFIG.iron;

  const initials = userName
    ? userName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const toggleGroup = (id: string) => {
    play("click", 0.15);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveExpanded(next);
      return next;
    });
  };

  const handleRowClick = (item: NavItem) => {
    play("click", 0.2);
    if (item.href) {
      onChange(item.id);
      return;
    }
    if (item.children && item.children.length > 0) {
      toggleGroup(item.id);
      return;
    }
    onChange(item.id);
  };

  const handleChildClick = (item: NavItem) => {
    play("click", 0.15);
    onChange(item.id);
  };

  /** Top-level item is "active" when active === item.id OR active is one of its children. */
  const isTopActive = (item: NavItem) => {
    if (active === item.id) return true;
    if (activeParent && activeParent === item.id) return true;
    return false;
  };

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
          className="font-display font-bold text-lg tracking-tighter"
          style={{ color: "var(--color-text)" }}
        >
          Lingona
        </span>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {SIDEBAR_ITEMS.map((item) => {
          const { id, label, icon: Icon, children } = item;
          const hasChildren = !!children && children.length > 0;
          const isActive = isTopActive(item);
          const isExpanded = expanded.has(id);
          const isSelfActive = active === id;

          return (
            <div key={id}>
              <button
                onClick={() => handleRowClick(item)}
                className="relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer"
                style={{
                  backgroundColor: isSelfActive ? "var(--sidebar-item-active-bg)" : "transparent",
                  color: isActive ? "var(--sidebar-active-indicator)" : "var(--color-text-secondary)",
                }}
                onMouseEnter={(e) => {
                  if (!isSelfActive) e.currentTarget.style.backgroundColor = "var(--sidebar-item-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelfActive) e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {/* Active left bar */}
                {isSelfActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full sidebar-nav-glow"
                    style={{ backgroundColor: "var(--sidebar-active-indicator)" }}
                  />
                )}

                <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  <Icon size={20} />
                </span>
                <span className="text-sm font-medium flex-1">{label}</span>

                {/* Group chevron — toggles expand independently of row navigation */}
                {hasChildren && (
                  <span
                    role={item.href ? "button" : undefined}
                    onClick={(e) => {
                      if (!item.href) return;
                      // When the row also navigates, the chevron is a secondary target.
                      e.stopPropagation();
                      toggleGroup(id);
                    }}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <svg
                      width={14} height={14} viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className="transition-transform"
                      style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", opacity: 0.5 }}
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </span>
                )}
              </button>

              {/* Group children */}
              {hasChildren && isExpanded && (
                <div className="animate-sub-nav ml-5 mt-0.5 mb-1 pl-3 space-y-0.5"
                  style={{ borderLeft: "1px solid var(--sidebar-border)" }}
                >
                  {children!.map((child) => {
                    const ChildIcon = child.icon;
                    const childActive = active === child.id;
                    return (
                      <button
                        key={child.id}
                        onClick={() => handleChildClick(child)}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors cursor-pointer"
                        style={{
                          backgroundColor: childActive ? "var(--sidebar-item-active-bg)" : "transparent",
                          color: childActive ? "var(--sidebar-active-indicator)" : "var(--color-text-tertiary)",
                          fontSize: "13px",
                        }}
                        onMouseEnter={(e) => {
                          if (!childActive) e.currentTarget.style.backgroundColor = "var(--sidebar-item-hover)";
                        }}
                        onMouseLeave={(e) => {
                          if (!childActive) e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <ChildIcon size={16} />
                        <span className="font-medium">{child.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Quick links (standalone routes outside the tab system) ── */}
      <div className="px-3 pb-2 flex-shrink-0">
        <a
          href="/writing/progress"
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors cursor-pointer"
          style={{ color: "var(--color-text-tertiary)", fontSize: "13px" }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--sidebar-item-hover)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
          <span className="font-medium">Tiến độ Writing</span>
        </a>
      </div>

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
          <span className="text-sm font-semibold" style={{ color: "#F59E0B" }}>
            {streak?.currentStreak ?? displayStreak ?? 0}
          </span>
          <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
            day streak
          </span>
        </div>

        {/* Rank */}
        <div className="flex items-center gap-2.5">
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black"
            style={{
              backgroundColor: `${rank.color}20`,
              color: rank.color,
              boxShadow: `0 0 8px ${rank.glow}`,
            }}
          >
            {rank.label[0]}
          </span>
          <span className="text-sm font-semibold" style={{ color: rank.color }}>
            {rank.label}
          </span>
        </div>

        {/* XP bar — easeOutCubic animated fill */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
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
            className="w-8 h-8 rounded-full flex items-center justify-center font-sans font-semibold text-xs text-white cursor-pointer"
            style={{
              background: "linear-gradient(135deg, var(--color-avatar-from), var(--color-avatar-to))",
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
