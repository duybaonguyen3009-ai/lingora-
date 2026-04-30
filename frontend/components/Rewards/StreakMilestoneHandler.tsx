"use client";

/**
 * StreakMilestoneHandler.tsx — Detects streak milestones and fires
 * unlock-badge animations.
 *
 * Wave 5.4.4 cleanup state:
 *   - Animations only — the actual badge + xp_ledger row is awarded
 *     server-side by badgeService.checkStreakBadges (idempotent via
 *     migration 0041's UNIQUE (user_id, reason, ref_id)). This
 *     component triggers the client-side toast/celebration when the
 *     streak crosses 7 / 30 / 100.
 *   - xpReward props are now synced with BE seed values
 *     (streak_7=150, streak_30=500, streak_100=1500). Previously
 *     drifted at 50/200 — visual lie.
 *   - Dedupe is now in-memory via a useRef Set. Page reload may
 *     replay one animation per session; acceptable UX (BE state is
 *     unchanged across reloads, so the badge is already real).
 *   - Shield earn-block REMOVED. Shields had no consumer in any
 *     wave (useShield was 0-caller, BE had no shield infrastructure).
 *
 * If a real shield mechanic is reintroduced (Wave 6 conversation),
 * BE goes first: users.streak_shields column + consume hook in the
 * streak service when a miss-day would break the streak. Only then
 * does the FE re-add useShield/addShield wired against real state.
 *
 * Render-less component — mount once inside RewardProvider.
 */

import { useEffect, useRef } from "react";
import { useReward } from "@/contexts/RewardContext";
import type { StreakSummary } from "@/lib/types";

interface StreakMilestoneHandlerProps {
  streak: StreakSummary | undefined;
}

export default function StreakMilestoneHandler({ streak }: StreakMilestoneHandlerProps) {
  const { fireBadge, fireStreakMilestone } = useReward();
  const prevStreakRef = useRef<number>(0);
  // Tracks which milestones have already animated this session so a
  // streak that stays above the threshold across re-renders doesn't
  // re-fire the toast every render. Resets on full page reload —
  // intentional, see file header.
  const shownMilestonesRef = useRef<Set<7 | 30 | 100>>(new Set());

  useEffect(() => {
    if (!streak) return;
    const current = streak.currentStreak;
    prevStreakRef.current = current;

    if (current >= 7 && !shownMilestonesRef.current.has(7)) {
      shownMilestonesRef.current.add(7);
      fireBadge("streak_7", "On Fire 🔥", "common", "Streak", { badgeIcon: "🔥", xpReward: 150 });
    }

    if (current >= 30 && !shownMilestonesRef.current.has(30)) {
      shownMilestonesRef.current.add(30);
      fireBadge("streak_30", "Unstoppable!", "rare", "Streak", { badgeIcon: "🔥", xpReward: 500 });
    }

    if (current >= 100 && !shownMilestonesRef.current.has(100)) {
      shownMilestonesRef.current.add(100);
      fireStreakMilestone(100);
    }
  }, [streak, fireBadge, fireStreakMilestone]);

  return null;
}
