"use client";

/**
 * ProfileScreen.tsx
 *
 * Full profile view with speaking metrics, session history, account info.
 * Designed to feel connected to the rest of Lingona — not a dead-end.
 */

import SpeakingMetrics from "./SpeakingMetrics";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { useAuthStore } from "@/lib/stores/authStore";
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
    <Card padding="md" className="flex items-center gap-3">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center font-sora font-bold text-lg"
        style={{
          background: "linear-gradient(135deg, var(--color-examiner), var(--color-primary))",
          color: "#fff",
          boxShadow: "0 4px 16px var(--color-primary-glow)",
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
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progress}%`, background: "var(--color-primary)" }}
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
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
        style={{ background: "var(--color-warning-soft)" }}
      >
        🔥
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold font-sora" style={{ color: "var(--color-warning)" }}>
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
          <span className="text-2xl">🏅</span>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Complete lessons to earn your first badge!
          </p>
        </div>
      </Card>
    );
  }

  const BADGE_ICONS: Record<string, string> = {
    first_lesson: "🎯",
    streak_3: "🔥",
    streak_7: "💪",
    streak_30: "⭐",
    perfect_score: "💯",
    speed_demon: "⚡",
  };

  return (
    <Card padding="md">
      <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-secondary)" }}>
        Badges Earned
      </div>
      <div className="flex flex-wrap gap-2">
        {badges.map((b) => (
          <Badge key={b.slug} variant="primary" size="md">
            <span>{BADGE_ICONS[b.slug] || "🏅"}</span>
            {b.name}
          </Badge>
        ))}
      </div>
    </Card>
  );
}

export default function ProfileScreen({ userId, metrics, metricsLoading, gamification }: ProfileScreenProps) {
  const user = useAuthStore((s) => s.user);
  const isGuest = !user;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center font-sora font-bold text-xl text-white"
          style={{
            background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
          }}
        >
          {isGuest ? "G" : user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h2 className="text-lg font-sora font-bold" style={{ color: "var(--color-text)" }}>
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
            background: "var(--color-primary-soft)",
            border: "1px solid var(--color-primary)",
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
    </div>
  );
}
