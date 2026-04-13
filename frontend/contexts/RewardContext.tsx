"use client";

/**
 * RewardContext.tsx — Global reward event queue + shield system.
 *
 * Event types: xp_gain, badge_unlock, level_up, rank_up, streak_milestone
 * Shield system: earn shields (7-day streak, 3 weekly battle wins), max 2.
 * When streak would break: auto-consume shield → fire "Streak Protected!" toast.
 *
 * Queue processes one event at a time. Duplicate XP events within 1s suppressed.
 */

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import type { BattleRankTier } from "@/lib/types";

// ─── Event types ─────────────────────────────────────────────────────────────

export type RewardEvent =
  | { type: "xp_gain"; amount: number; bonus?: number; source: "speaking" | "writing" | "battle" | "mission" | "lesson" }
  | { type: "badge_unlock"; badgeId: string; badgeName: string; badgeIcon?: string; rarity: "common" | "rare" | "epic"; category: string; xpReward?: number }
  | { type: "level_up"; oldLevel: number; newLevel: number; totalXp: number }
  | { type: "rank_up"; oldRank: BattleRankTier; newRank: BattleRankTier; percentile?: number }
  | { type: "streak_milestone"; days: 7 | 30 | 100 };

// ─── Shield helpers (localStorage) ───────────────────────────────────────────

const SHIELD_KEY = "lingona_shields";
const SHIELD_MAX = 2;

function loadShields(): number {
  if (typeof window === "undefined") return 0;
  const v = localStorage.getItem(SHIELD_KEY);
  return v ? Math.min(Number(v) || 0, SHIELD_MAX) : 0;
}

function saveShields(count: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SHIELD_KEY, String(Math.min(count, SHIELD_MAX)));
}

// ─── Context value ───────────────────────────────────────────────────────────

interface RewardContextValue {
  activeEvent: RewardEvent | null;
  shields: number;
  fireXP: (amount: number, source: "speaking" | "writing" | "battle" | "mission" | "lesson", bonus?: number) => void;
  fireBadge: (badgeId: string, badgeName: string, rarity: "common" | "rare" | "epic", category: string, opts?: { badgeIcon?: string; xpReward?: number }) => void;
  fireLevel: (oldLevel: number, newLevel: number, totalXp: number) => void;
  fireRank: (oldRank: BattleRankTier, newRank: BattleRankTier, percentile?: number) => void;
  fireStreakMilestone: (days: 7 | 30 | 100) => void;
  useShield: () => boolean;
  addShield: () => boolean;
  dismiss: () => void;
}

const RewardContext = createContext<RewardContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function RewardProvider({ children }: { children: ReactNode }) {
  const [activeEvent, setActiveEvent] = useState<RewardEvent | null>(null);
  const [shields, setShields] = useState(0);
  const queueRef = useRef<RewardEvent[]>([]);
  const lastXpRef = useRef<number>(0);

  // Load shields from localStorage on mount
  useEffect(() => {
    setShields(loadShields());
  }, []);

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

  // ── Shield methods ──

  const useShield = useCallback((): boolean => {
    const current = loadShields();
    if (current <= 0) return false;
    const next = current - 1;
    saveShields(next);
    setShields(next);
    // Fire a toast to inform user
    enqueue({
      type: "badge_unlock",
      badgeId: "shield_used",
      badgeName: "Streak Protected!",
      badgeIcon: "🛡️",
      rarity: "rare",
      category: "Streak Shield",
    });
    return true;
  }, [enqueue]);

  const addShield = useCallback((): boolean => {
    const current = loadShields();
    if (current >= SHIELD_MAX) return false;
    const next = current + 1;
    saveShields(next);
    setShields(next);
    return true;
  }, []);

  return (
    <RewardContext.Provider value={{
      activeEvent, shields,
      fireXP, fireBadge, fireLevel, fireRank, fireStreakMilestone,
      useShield, addShield, dismiss,
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
