"use client";

/**
 * RewardContext.tsx — Global reward event queue (Wave 5.4.4 cleanup).
 *
 * Event types: xp_gain, badge_unlock, level_up, rank_up, streak_milestone.
 * Queue processes one event at a time. Duplicate XP events within 1s
 * suppressed.
 *
 * Streak rewards posture (Wave 5.4.4 audit):
 *   - Milestones (streak_7 / streak_30 / streak_100) are server-side
 *     authoritative via badgeService.checkStreakBadges. xp_ledger
 *     emit uses reason='badge_award' with the UNIQUE
 *     (user_id, reason, ref_id) idempotency contract from migration
 *     0041. BE seed XP: streak_7=150, streak_30=500, streak_100=1500.
 *     This context only fires the badge UNLOCK ANIMATION;
 *     StreakMilestoneHandler dedupes via an in-memory ref set so the
 *     toast doesn't replay every page reload.
 *   - Shield subsystem REMOVED in Wave 5.4.4: useShield() had zero
 *     callers in any wave; BE had no shield column, no consume
 *     logic; user miss-day always broke the streak regardless. Pure
 *     dead code. If a real shield mechanic comes back, Wave 6 will
 *     add it server-side first (users.streak_shields + consume hook
 *     in streak service) and re-introduce the FE methods backed by
 *     real state — not localStorage.
 */

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import type { BattleRankTier } from "@/lib/types";

// ─── Event types ─────────────────────────────────────────────────────────────

export type RewardEvent =
  | { type: "xp_gain"; amount: number; bonus?: number; source: "speaking" | "writing" | "battle" | "mission" | "lesson" }
  | { type: "badge_unlock"; badgeId: string; badgeName: string; badgeIcon?: string; rarity: "common" | "rare" | "epic"; category: string; xpReward?: number }
  | { type: "level_up"; oldLevel: number; newLevel: number; totalXp: number }
  | { type: "rank_up"; oldRank: BattleRankTier; newRank: BattleRankTier; percentile?: number }
  | { type: "streak_milestone"; days: 7 | 30 | 100 };

// ─── Context value ───────────────────────────────────────────────────────────

interface RewardContextValue {
  activeEvent: RewardEvent | null;
  fireXP: (amount: number, source: "speaking" | "writing" | "battle" | "mission" | "lesson", bonus?: number) => void;
  fireBadge: (badgeId: string, badgeName: string, rarity: "common" | "rare" | "epic", category: string, opts?: { badgeIcon?: string; xpReward?: number }) => void;
  fireLevel: (oldLevel: number, newLevel: number, totalXp: number) => void;
  fireRank: (oldRank: BattleRankTier, newRank: BattleRankTier, percentile?: number) => void;
  fireStreakMilestone: (days: 7 | 30 | 100) => void;
  dismiss: () => void;
}

const RewardContext = createContext<RewardContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function RewardProvider({ children }: { children: ReactNode }) {
  const [activeEvent, setActiveEvent] = useState<RewardEvent | null>(null);
  const queueRef = useRef<RewardEvent[]>([]);
  const lastXpRef = useRef<number>(0);

  const processNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      setActiveEvent(null);
      return;
    }
    const next = queueRef.current.shift()!;
    setActiveEvent(next);
  }, []);

  const enqueue = useCallback((event: RewardEvent) => {
    if (event.type === "xp_gain") {
      const now = Date.now();
      if (now - lastXpRef.current < 1000) return;
      lastXpRef.current = now;
    }

    if (activeEvent) {
      queueRef.current.push(event);
    } else {
      setActiveEvent(event);
    }
  }, [activeEvent]);

  const dismiss = useCallback(() => {
    setTimeout(processNext, 150);
  }, [processNext]);

  // ── Fire helpers ──

  const fireXP = useCallback((amount: number, source: "speaking" | "writing" | "battle" | "mission" | "lesson", bonus?: number) => {
    enqueue({ type: "xp_gain", amount, source, bonus });
  }, [enqueue]);

  const fireBadge = useCallback((badgeId: string, badgeName: string, rarity: "common" | "rare" | "epic", category: string, opts?: { badgeIcon?: string; xpReward?: number }) => {
    enqueue({ type: "badge_unlock", badgeId, badgeName, rarity, category, ...opts });
  }, [enqueue]);

  const fireLevel = useCallback((oldLevel: number, newLevel: number, totalXp: number) => {
    enqueue({ type: "level_up", oldLevel, newLevel, totalXp });
  }, [enqueue]);

  const fireRank = useCallback((oldRank: BattleRankTier, newRank: BattleRankTier, percentile?: number) => {
    enqueue({ type: "rank_up", oldRank, newRank, percentile });
  }, [enqueue]);

  const fireStreakMilestone = useCallback((days: 7 | 30 | 100) => {
    enqueue({ type: "streak_milestone", days });
  }, [enqueue]);

  return (
    <RewardContext.Provider value={{
      activeEvent,
      fireXP, fireBadge, fireLevel, fireRank, fireStreakMilestone,
      dismiss,
    }}>
      {children}
    </RewardContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useReward(): RewardContextValue {
  const ctx = useContext(RewardContext);
  if (!ctx) throw new Error("useReward must be used within RewardProvider");
  return ctx;
}
