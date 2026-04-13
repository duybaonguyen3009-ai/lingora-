"use client";

/**
 * StreakMilestoneHandler.tsx — Detects streak milestones and fires events.
 *
 * Milestone rules:
 *   7 days  → badge toast ("On Fire 🔥"), common rarity
 *   30 days → rare badge modal
 *   100 days → epic full ceremony
 *
 * Shield earning:
 *   Complete 7-day streak → +1 shield (checked when streak changes)
 *   Max 2 shields stored
 *
 * This is a render-less component — mount it once inside RewardProvider.
 * It watches streak data and fires events via useReward().
 */

import { useEffect, useRef } from "react";
import { useReward } from "@/contexts/RewardContext";
import type { StreakSummary } from "@/lib/types";

interface StreakMilestoneHandlerProps {
  streak: StreakSummary | undefined;
}

const MILESTONE_KEY_PREFIX = "lingona_streak_milestone_";

function hasFiredMilestone(days: number): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(`${MILESTONE_KEY_PREFIX}${days}`) === "true";
}

function markMilestoneFired(days: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${MILESTONE_KEY_PREFIX}${days}`, "true");
}

// Track when shields were last awarded for 7-day streaks
const SHIELD_STREAK_KEY = "lingona_shield_last_streak_award";

function getLastShieldStreakAward(): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(SHIELD_STREAK_KEY) || "0");
}

function setLastShieldStreakAward(streakDay: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SHIELD_STREAK_KEY, String(streakDay));
}

export default function StreakMilestoneHandler({ streak }: StreakMilestoneHandlerProps) {
  const { fireBadge, fireStreakMilestone, addShield } = useReward();
  const prevStreakRef = useRef<number>(0);

  useEffect(() => {
    if (!streak) return;
    const current = streak.currentStreak;
    const prev = prevStreakRef.current;
    prevStreakRef.current = current;

    // Don't fire on initial mount with same value
    if (prev === 0 && current > 0) {
      // First load — check milestones but don't re-fire already fired ones
    }

    // ── Milestone checks ──

    if (current >= 7 && !hasFiredMilestone(7)) {
      markMilestoneFired(7);
      fireBadge("streak_7", "On Fire 🔥", "common", "Streak", { badgeIcon: "🔥", xpReward: 50 });
    }

    if (current >= 30 && !hasFiredMilestone(30)) {
      markMilestoneFired(30);
      fireBadge("streak_30", "Unstoppable!", "rare", "Streak", { badgeIcon: "🔥", xpReward: 200 });
    }

    if (current >= 100 && !hasFiredMilestone(100)) {
      markMilestoneFired(100);
      fireStreakMilestone(100);
    }

    // ── Shield earning: +1 shield every 7 days ──

    const lastAward = getLastShieldStreakAward();
    const nextAwardAt = lastAward + 7;

    if (current >= nextAwardAt && current >= 7) {
      const added = addShield();
      if (added) {
        setLastShieldStreakAward(current);
        fireBadge("shield_earned", "Streak Shield Earned!", "common", "Shield", { badgeIcon: "🛡️" });
      }
    }
  }, [streak, fireBadge, fireStreakMilestone, addShield]);

  return null; // Render-less
}
