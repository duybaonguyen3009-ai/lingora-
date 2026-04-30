"use client";

/**
 * HomeDashboard.tsx — "Mission Control" home screen.
 *
 * Layout (desktop ≥1024px):
 *   TOP ROW:    Hero (welcome + CTA) | Stats pills (streak, rank, XP)
 *   MIDDLE ROW: Quick Actions | Battle Now | Friends Activity
 *   BOTTOM ROW: Weekly XP chart | Recent achievements
 *
 * Mobile: stacks vertically, priority order preserved.
 */

import { useState, useEffect, useCallback } from "react";
import { IconMic, IconPen, IconOpenBook, IconBook, IconSwords, IconFire } from "./Icons";
import Skeleton from "@/components/ui/Skeleton";
import Mascot from "@/components/ui/Mascot";
import DailyMissionPanel from "@/components/DailyMissions/DailyMissionPanel";
import StreakWarningBanner from "@/components/StreakWarningBanner";
import { getBattleHome, getFriends } from "@/lib/api";
import type {
  GamificationData,
  FocusRecommendation,
  BattleRankTier,
  BattleHome,
  Friend,
  Badge,
} from "@/lib/types";

// ─── Rank config ─────────────────────────────────────────────────────────────

const RANK_META: Record<string, { label: string; color: string }> = {
  iron:       { label: "Iron",       color: "#9CA3AF" },
  bronze:     { label: "Bronze",     color: "#CD7F32" },
  silver:     { label: "Silver",     color: "#C0C0C0" },
  gold:       { label: "Gold",       color: "#FFD700" },
  platinum:   { label: "Platinum",   color: "#00FFFF" },
  diamond:    { label: "Diamond",    color: "#B9A0E8" },
  challenger: { label: "Challenger", color: "#FF6B35" },
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface HomeDashboardProps {
  userName: string;
  gamification: GamificationData | null;
  focusRecs: FocusRecommendation[];
  focusLoading: boolean;
  rankTier: BattleRankTier;
  onNavigate: (tab: string) => void;
  onFocusAction: (rec: FocusRecommendation) => void;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function HomeDashboard({
  userName,
  gamification,
  focusRecs,
  focusLoading,
  rankTier,
  onNavigate,
  onFocusAction,
}: HomeDashboardProps) {
  const [battleData, setBattleData] = useState<BattleHome | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);

  useEffect(() => {
    getBattleHome().then(setBattleData).catch(() => {});
    getFriends()
      .then((d) => setFriends(d.friends))
      .catch(() => {})
      .finally(() => setFriendsLoading(false));
  }, []);

  const xp = gamification?.xp;
  const streak = gamification?.streak;
  const badges = gamification?.badges ?? [];
  const rank = RANK_META[rankTier] ?? RANK_META.iron;

  // Streak urgency — warn if last activity > 16h ago
  const streakUrgent = (() => {
    if (!streak?.lastActivityAt) return false;
    const hoursSince = (Date.now() - new Date(streak.lastActivityAt).getTime()) / 3600000;
    return hoursSince > 16;
  })();

  // Primary CTA from focus recommendations
  const primaryRec = focusRecs[0] ?? null;

  const firstName = userName.split(" ")[0];

  return (
    <div className="flex flex-col gap-6 animate-fadeSlideUp">
      {/* ══════════════════════════════════════════════════════════════════════
          TOP ROW — Hero + Stats
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
        {/* Hero — Welcome + CTA */}
        <div
          className="rounded-2xl p-6 lg:p-8 relative overflow-hidden"
          style={{
            background: "var(--dash-hero-bg)",
            border: "1px solid var(--dash-hero-border)",
            boxShadow: "var(--dash-card-shadow)",
          }}
        >
          {/* Ambient glow */}
          <div
            className="absolute -top-20 -right-20 w-60 h-60 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(0,168,150,0.12), transparent 70%)" }}
          />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-1">
              <Mascot size={36} mood="happy" />
              <p className="text-sm" style={{ color: "var(--dash-hero-sub)" }}>
                Chào bạn! Hôm nay luyện gì nhỉ? 🐙
              </p>
            </div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold leading-tight" style={{ color: "var(--dash-hero-text)" }}>
              {firstName} 👋
            </h1>

            {/* Today's progress */}
            <p className="text-sm mt-2 mb-6" style={{ color: "var(--dash-hero-sub)" }}>
              {xp ? `${xp.xpInLevel} XP để lên Level ${xp.level + 1}` : "Bắt đầu luyện để nhận XP"}
              {streak && streak.currentStreak > 0 && ` · Streak ${streak.currentStreak} ngày 🔥`}
            </p>

            {/* Primary CTA */}
            {focusLoading ? (
              <div className="h-12 w-48 rounded-xl animate-pulse" style={{ background: "var(--surface-skeleton)" }} />
            ) : primaryRec ? (
              <button
                onClick={() => onFocusAction(primaryRec)}
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #00A896, #00C4B0)",
                  color: "#fff",
                  boxShadow: "0 4px 20px rgba(0,168,150,0.3)",
                }}
              >
                {primaryRec.actionLabel || "Continue"}
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => onNavigate("exam")}
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #00A896, #00C4B0)",
                  color: "#fff",
                  boxShadow: "0 4px 20px rgba(0,168,150,0.3)",
                }}
              >
                Start Speaking
                <IconMic size={16} />
              </button>
            )}

            {primaryRec && (
              <p className="text-xs mt-3" style={{ color: "var(--color-text-tertiary)" }}>
                {primaryRec.title}
              </p>
            )}
          </div>
        </div>

        {/* Stats pills — streak, rank, XP */}
        <div className="flex flex-row lg:flex-col gap-3">
          {/* Streak */}
          <div
            className="flex-1 rounded-2xl p-4 flex items-center gap-3"
            style={{
              background: "var(--dash-stat-bg)",
              border: streakUrgent
                ? "1px solid rgba(245,158,11,0.3)"
                : "1px solid var(--dash-stat-border)",
              boxShadow: streakUrgent ? "0 0 16px rgba(245,158,11,0.1)" : "var(--dash-card-shadow)",
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(245,158,11,0.1)" }}
            >
              <IconFire size={18} className="text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-lg font-bold text-amber-400 leading-none">
                {streak?.currentStreak ?? 0}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                {streakUrgent ? "Streak at risk!" : "day streak"}
              </div>
            </div>
          </div>

          {/* Rank */}
          <div
            className="flex-1 rounded-2xl p-4 flex items-center gap-3"
            style={{
              background: "var(--dash-stat-bg)",
              border: "1px solid var(--dash-stat-border)",
              boxShadow: "var(--dash-card-shadow)",
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black"
              style={{ backgroundColor: `${rank.color}15`, color: rank.color }}
            >
              {rank.label[0]}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-none" style={{ color: rank.color }}>
                {rank.label}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                {battleData?.profile?.current_rank_points ?? 0} pts
              </div>
            </div>
          </div>

          {/* XP today */}
          <div
            className="flex-1 rounded-2xl p-4 flex items-center gap-3"
            style={{
              background: "var(--dash-stat-bg)",
              border: "1px solid var(--dash-stat-border)",
              boxShadow: "var(--dash-card-shadow)",
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(0,168,150,0.1)" }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#00A896" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold leading-none" style={{ color: "#00A896" }}>
                {xp?.totalXp?.toLocaleString() ?? 0}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                total XP · Lv {xp?.level ?? 1}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Streak warning — inline banner */}
      <StreakWarningBanner streak={streak} onNavigate={onNavigate} />

      {/* ══════════════════════════════════════════════════════════════════════
          MIDDLE ROW — Quick Actions | Battle | Friends
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Quick Actions */}
        <QuickActions onNavigate={onNavigate} />

        {/* Battle Now */}
        <BattleCard
          battleData={battleData}
          rankTier={rankTier}
          onNavigate={onNavigate}
        />

        {/* Friends Activity */}
        <FriendsActivity
          friends={friends}
          loading={friendsLoading}
          onNavigate={onNavigate}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          BOTTOM ROW — XP Chart | Daily Missions
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
        <WeeklyXpChart xp={xp} />
        <DailyMissionPanel gamification={gamification} />
      </div>
    </div>
  );
}

// ─── Quick Actions ───────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { id: "learn-speaking",  label: "Speaking",  Icon: IconMic,      color: "#00A896", bg: "rgba(0,168,150,0.08)" },
  { id: "learn-grammar",   label: "Grammar",   Icon: IconPen,      color: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
  { id: "learn-reading",   label: "Reading",   Icon: IconOpenBook,  color: "#22C55E", bg: "rgba(34,197,94,0.08)" },
  { id: "learn-writing",   label: "Writing",   Icon: IconBook,      color: "#6366F1", bg: "rgba(99,102,241,0.08)" },
];

function QuickActions({ onNavigate }: { onNavigate: (tab: string) => void }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "var(--dash-card-bg)",
        border: "1px solid var(--dash-card-border)",
        boxShadow: "var(--dash-card-shadow)",
      }}
    >
      <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--color-text-tertiary)" }}>
        Quick Practice
      </div>
      <div className="grid grid-cols-2 gap-3">
        {QUICK_ACTIONS.map(({ id, label, Icon, color, bg }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className="flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.97] cursor-pointer"
            style={{ backgroundColor: bg, border: `1px solid ${color}15` }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${color}15`; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = bg; }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${color}15`, color }}
            >
              <Icon size={18} />
            </div>
            <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Battle Card ─────────────────────────────────────────────────────────────

function BattleCard({
  battleData,
  rankTier,
  onNavigate,
}: {
  battleData: BattleHome | null;
  rankTier: BattleRankTier;
  onNavigate: (tab: string) => void;
}) {
  const rank = RANK_META[rankTier] ?? RANK_META.iron;
  const profile = battleData?.profile;
  const wins = profile?.wins ?? 0;
  const losses = profile?.losses ?? 0;

  return (
    <div
      className="rounded-2xl p-5 flex flex-col items-center text-center relative overflow-hidden"
      style={{
        background: "linear-gradient(160deg, rgba(99,102,241,0.08) 0%, rgba(0,168,150,0.06) 100%)",
        border: "1px solid rgba(99,102,241,0.12)",
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.1), transparent 70%)" }}
      />

      <div className="relative z-10 flex flex-col items-center gap-3 flex-1">
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>
          Battle Arena
        </div>

        {/* Rank + stats */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: rank.color }}>{rank.label}</span>
          {profile && (
            <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              {wins}W {losses}L
            </span>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={() => onNavigate("battle")}
          className="mt-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] cursor-pointer"
          style={{
            background: "linear-gradient(135deg, #6366F1, #00A896)",
            color: "#fff",
            boxShadow: "0 4px 16px rgba(99,102,241,0.2)",
          }}
        >
          <IconSwords size={16} />
          Jump into Battle
        </button>

        <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
          ~12s average queue
        </p>
      </div>
    </div>
  );
}

// ─── Friends Activity ────────────────────────────────────────────────────────

function FriendsActivity({
  friends,
  loading,
  onNavigate,
}: {
  friends: Friend[];
  loading: boolean;
  onNavigate: (tab: string) => void;
}) {
  const active = friends.filter((f) => f.practiced_today);
  const displayFriends = active.length > 0 ? active : friends;

  return (
    <div
      className="rounded-2xl p-5 flex flex-col"
      style={{
        background: "var(--dash-card-bg)",
        border: "1px solid var(--dash-card-border)",
        boxShadow: "var(--dash-card-shadow)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>
          Friends
        </span>
        <button
          onClick={() => onNavigate("social")}
          className="text-xs font-medium cursor-pointer"
          style={{ color: "#00A896" }}
        >
          See all
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: "var(--surface-skeleton)" }} />
              <div className="flex-1 h-3 rounded animate-pulse" style={{ background: "var(--surface-skeleton)" }} />
            </div>
          ))}
        </div>
      ) : displayFriends.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
          <div className="text-2xl mb-2">👥</div>
          <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
            Add friends to see their progress
          </p>
          <button
            onClick={() => onNavigate("social")}
            className="mt-2 text-xs font-medium cursor-pointer"
            style={{ color: "#00A896" }}
          >
            Find friends
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 flex-1">
          {displayFriends.slice(0, 4).map((f) => (
            <div key={f.id} className="flex items-center gap-2.5">
              <div className="relative">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{ background: "linear-gradient(135deg, #1B2B4B, #2D4A7A)", color: "#fff" }}
                >
                  {f.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                  style={{
                    background: f.practiced_today ? "#22C55E" : "#9CA3AF",
                    borderColor: "rgba(10,15,26,0.8)",
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium truncate block" style={{ color: "var(--color-text)" }}>
                  {f.name.split(" ")[0]}
                </span>
              </div>
              <span className="text-xs" style={{ color: f.practiced_today ? "#22C55E" : "var(--color-text-tertiary)" }}>
                {f.practiced_today ? "Active" : "Idle"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Weekly XP Chart ─────────────────────────────────────────────────────────

function WeeklyXpChart({ xp }: { xp: GamificationData["xp"] | undefined }) {
  // Generate mock weekly data since there's no daily XP API yet
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const dayLabel = d.toLocaleDateString("vi-VN", { weekday: "short" }).slice(0, 2);
    // Pseudo-random based on date seed for visual consistency across renders
    const seed = d.getDate() * 7 + d.getMonth();
    const val = i === 6 ? (xp?.xpInLevel ?? 0) : Math.floor(((seed * 17 + 31) % 100) + 10);
    return { label: dayLabel, value: val, isToday: i === 6 };
  });

  const maxVal = Math.max(...days.map((d) => d.value), 1);

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "var(--dash-card-bg)",
        border: "1px solid var(--dash-card-border)",
        boxShadow: "var(--dash-card-shadow)",
      }}
    >
      <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--color-text-tertiary)" }}>
        This Week
      </div>

      <div className="flex items-end gap-2 h-24">
        {days.map(({ label, value, isToday }) => (
          <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="w-full relative" style={{ height: 80 }}>
              <div
                className="absolute bottom-0 w-full rounded-md transition-all"
                style={{
                  height: `${Math.max((value / maxVal) * 100, 6)}%`,
                  background: isToday
                    ? "linear-gradient(180deg, #00A896, #00A89680)"
                    : "var(--surface-skeleton)",
                  boxShadow: isToday ? "0 0 8px rgba(0,168,150,0.2)" : "none",
                }}
              />
            </div>
            <span
              className="text-xs font-medium"
              style={{ color: isToday ? "#00A896" : "var(--color-text-tertiary)" }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
          Level {xp?.level ?? 1}
        </span>
        <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
          {xp?.xpInLevel ?? 0} / {xp?.xpToNextLevel ?? 100} XP
        </span>
      </div>
      {/* XP progress bar */}
      <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-skeleton)" }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${xp ? Math.min((xp.xpInLevel / xp.xpToNextLevel) * 100, 100) : 0}%`,
            background: "linear-gradient(90deg, #00A896, #00C4B0)",
          }}
        />
      </div>
    </div>
  );
}

// ─── Recent Badges ───────────────────────────────────────────────────────────

const BADGE_ICONS: Record<string, string> = {
  first_lesson: "📚",
  streak_3: "🔥",
  streak_7: "🔥",
  streak_30: "🔥",
  perfect_score: "💯",
  speed_demon: "⚡",
};

function RecentBadges({ badges }: { badges: Badge[] }) {
  const recent = badges.slice(-3).reverse();

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "var(--dash-card-bg)",
        border: "1px solid var(--dash-card-border)",
        boxShadow: "var(--dash-card-shadow)",
      }}
    >
      <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--color-text-tertiary)" }}>
        Achievements
      </div>

      {recent.length === 0 ? (
        <div className="text-center py-4">
          <div className="text-2xl mb-2">🏅</div>
          <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
            Complete lessons and battles to earn badges
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {recent.map((b) => (
            <div key={b.id || b.slug} className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                style={{ backgroundColor: "rgba(245,158,11,0.08)" }}
              >
                {BADGE_ICONS[b.slug] ?? "🏅"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>
                  {b.name}
                </div>
                {b.description && (
                  <div className="text-xs truncate" style={{ color: "var(--color-text-tertiary)" }}>
                    {b.description}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
