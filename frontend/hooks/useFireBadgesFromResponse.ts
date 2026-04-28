"use client";

/**
 * useFireBadgesFromResponse — Wave 1.5b Fix 2.
 *
 * Activity-completion endpoints (endScenarioSession, submitReadingPractice,
 * submitReadingFullTest, pronunciation assess, ...) now return a
 * `newBadges: Badge[]` array in their response. This hook reads that array
 * and dispatches one BadgeToast per entry through the existing RewardContext
 * fireBadge channel.
 *
 * Idempotent: tracks fired badge slugs in a ref so re-renders or stale
 * response refs don't double-fire. Caller passes the array reference;
 * the hook fires every entry it hasn't seen before in this component
 * lifetime.
 */

import { useEffect, useRef } from "react";
import { useReward } from "@/contexts/RewardContext";

export interface BadgeResponse {
  id?: string;
  slug?: string;
  name?: string;
  description?: string | null;
  rarity?: "common" | "rare" | "epic" | string;
  category?: string;
  icon_url?: string | null;
  xp_reward?: number;
}

export function useFireBadgesFromResponse(
  badges: BadgeResponse[] | null | undefined,
) {
  const { fireBadge } = useReward();
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!Array.isArray(badges) || badges.length === 0) return;
    badges.forEach((b) => {
      const key = b.slug || b.id;
      if (!key || firedRef.current.has(key)) return;
      firedRef.current.add(key);
      const rarity = (b.rarity === "rare" || b.rarity === "epic") ? b.rarity : "common";
      fireBadge(
        key,
        b.name || "Achievement",
        rarity,
        b.category || "Achievement",
        {
          xpReward: typeof b.xp_reward === "number" ? b.xp_reward : undefined,
          badgeIcon: b.icon_url || undefined,
        },
      );
    });
  }, [badges, fireBadge]);
}
