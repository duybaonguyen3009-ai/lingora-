"use client";

/**
 * RewardOverlay.tsx — Global overlay that renders the active reward event.
 *
 * Handles: xp_gain, badge_unlock, level_up, rank_up, streak_milestone.
 * Place once at app level inside RewardProvider.
 */

import { useReward } from "@/contexts/RewardContext";
import XPToast from "./XPToast";
import BadgeToast from "./BadgeToast";
import LevelUpOverlay from "./LevelUpOverlay";
import RankPromotionOverlay from "./RankPromotionOverlay";

export default function RewardOverlay() {
  const { activeEvent, dismiss, fireBadge } = useReward();

  if (!activeEvent) return null;

  switch (activeEvent.type) {
    case "xp_gain":
      return <XPToast event={activeEvent} onDone={dismiss} />;
    case "badge_unlock":
      return <BadgeToast event={activeEvent} onDone={dismiss} />;
    case "level_up":
      return <LevelUpOverlay event={activeEvent} onDone={dismiss} />;
    case "rank_up":
      return <RankPromotionOverlay event={activeEvent} onDone={dismiss} />;
    case "streak_milestone":
      // 100-day streak → reuse LevelUpOverlay as epic ceremony
      if (activeEvent.days === 100) {
        return (
          <LevelUpOverlay
            event={{ type: "level_up", oldLevel: 99, newLevel: 100, totalXp: 0 }}
            onDone={() => {
              fireBadge("streak_100", "Legendary Streak!", "epic", "Streak", { badgeIcon: "👑", xpReward: 500 });
              dismiss();
            }}
          />
        );
      }
      // Other milestones handled by StreakMilestoneHandler as badge_unlock
      dismiss();
      return null;
    default:
      return null;
  }
}
