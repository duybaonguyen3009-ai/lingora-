"use client";

/**
 * ProfileScreen.tsx — Navy/teal design with avatar ring, stats cards, badges
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import SpeakingMetrics from "./SpeakingMetrics";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { useAuthStore } from "@/lib/stores/authStore";
import { logoutUser } from "@/lib/api";
import type { SpeakingMetricsData, GamificationData } from "@/lib/types";

interface ProfileScreenProps {
  userId: string | null;
  metrics: SpeakingMetricsData | null;
  metricsLoading: boolean;
  gamification: GamificationData | null;
}

function LevelBadge({ level, xpInLevel, xpToNextLevel }: { level: number; xpInLevel: number; xpToNextLevel: number }) {
  const progress = xpToNextLevel > 0 ? Math.min((xpInLevel / xpToNextLevel) * 100, 100) : 100;
  return (
    <Card padding="md" className="flex items-center gap-4">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center font-display font-bold text-lg"
        style={{
          background: "linear-gradient(135deg, #1B2B4B, #2D4A7A)",
          color: "#fff",
          boxShadow: "0 4px 16px rgba(27,43,75,0.3)",
        }}
      >
        {level}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          Level {level}
        </div>
        <div className="text-xs mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
          {xpInLevel} / {xpToNextLevel} XP
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #00A896, #00C4B0)",
              transition: "width 600ms ease-out",
            }}
          />
        </div>
      </div>
    </Card>
  );
}

function StreakCard({ current, longest }: { current: number; longest: number }) {
  return (
    <Card padding="md" className="flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center"
        style={{ background: "rgba(245,158,11,0.10)" }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-display" style={{ color: "#F59E0B" }}>
            {current}
          </span>
          <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            day streak
          </span>
        </div>
        <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Longest: {longest} days
        </div>
      </div>
    </Card>
  );
}

function BadgeGrid({ badges }: { badges: Array<{ slug: string; name: string; awarded_at?: string }> }) {
  if (badges.length === 0) {
    return (
      <Card padding="md">
        <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-secondary)" }}>
          Badges
        </div>
        <div className="flex flex-col items-center gap-2 py-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: "var(--color-primary-soft)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
            </svg>
          </div>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Complete lessons to earn your first badge!
          </p>
        </div>
      </Card>
    );
  }

  const BADGE_ICONS: Record<string, { icon: string; color: string }> = {
    first_lesson: { icon: "target", color: "#00A896" },
    streak_3:     { icon: "flame",  color: "#F59E0B" },
    streak_7:     { icon: "zap",    color: "#F59E0B" },
    streak_30:    { icon: "star",   color: "#F59E0B" },
    perfect_score:{ icon: "check",  color: "#22C55E" },
    speed_demon:  { icon: "bolt",   color: "#00A896" },
  };

  return (
    <Card padding="md">
      <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-secondary)" }}>
        Badges Earned
      </div>
      <div className="grid grid-cols-3 gap-2">
        {badges.map((b) => {
          const config = BADGE_ICONS[b.slug];
          return (
            <Badge key={b.slug} variant="primary" size="md">
              <span
                className="w-4 h-4 rounded-full inline-flex items-center justify-center text-xs"
                style={{ background: config?.color ? `${config.color}20` : "var(--color-accent-soft)" }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={config?.color || "#00A896"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </span>
              {b.name}
            </Badge>
          );
        })}
      </div>
    </Card>
  );
}

export default function ProfileScreen({ userId, metrics, metricsLoading, gamification }: ProfileScreenProps) {
  const user = useAuthStore((s) => s.user);
  const isGuest = !user;
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await logoutUser();
    router.push("/login");
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center font-display font-bold text-xl text-white"
          style={{
            background: "linear-gradient(135deg, #1B2B4B, #2D4A7A)",
            border: "3px solid #00A896",
            boxShadow: "0 4px 16px rgba(27,43,75,0.3)",
          }}
        >
          {isGuest ? "G" : user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h2 className="text-lg font-display font-bold" style={{ color: "var(--color-text)" }}>
            {isGuest ? "Guest Learner" : "Your Profile"}
          </h2>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {isGuest ? "Sign in to save your progress" : "Track your speaking journey"}
          </p>
        </div>
      </div>

      {/* Level + Streak row */}
      {gamification && (
        <div className="flex flex-col gap-3">
          <LevelBadge
            level={gamification.xp.level}
            xpInLevel={gamification.xp.xpInLevel}
            xpToNextLevel={gamification.xp.xpToNextLevel}
          />
          <StreakCard
            current={gamification.streak.currentStreak}
            longest={gamification.streak.longestStreak}
          />
        </div>
      )}

      {/* Badges */}
      {gamification && (
        <BadgeGrid badges={gamification.badges} />
      )}

      {/* Speaking Metrics */}
      <SpeakingMetrics
        data={metrics ?? {
          trend: [],
          totalAttempts: 0,
          averageScore: 0,
          bestScore: 0,
          recentScore: null,
        }}
        loading={metricsLoading}
      />

      {/* Guest CTA */}
      {isGuest && (
        <Card
          padding="lg"
          className="text-center"
          style={{
            background: "rgba(0,168,150,0.06)",
            border: "1px solid rgba(0,168,150,0.15)",
          }}
        >
          <p className="text-base font-medium mb-1" style={{ color: "var(--color-text)" }}>
            Create an account to save your progress
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Your scores, streaks, and badges will persist across devices
          </p>
        </Card>
      )}

      {/* Logout */}
      {!isGuest && (
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full py-3 rounded-full text-sm font-semibold transition-colors duration-150"
          style={{
            background: "transparent",
            color: "var(--color-text-tertiary)",
            border: "1px solid var(--color-border)",
            opacity: loggingOut ? 0.6 : 1,
          }}
        >
          {loggingOut ? "Logging out..." : "Log out"}
        </button>
      )}
    </div>
  );
}
