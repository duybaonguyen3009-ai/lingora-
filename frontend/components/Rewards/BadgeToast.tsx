"use client";

/**
 * BadgeToast.tsx — Upgraded badge unlock toast.
 *
 * Slides in from right side via framer-motion.
 * Gold border shimmer animation via CSS keyframe.
 * Rarity-aware: common=amber, rare=purple, epic=gold.
 * Auto-dismiss after 3.5s.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Mascot from "@/components/ui/Mascot";
import type { RewardEvent } from "@/contexts/RewardContext";

interface BadgeToastProps {
  event: RewardEvent & { type: "badge_unlock" };
  onDone: () => void;
}

const RARITY_STYLES = {
  common: {
    border: "rgba(245,158,11,0.4)",
    glow: "rgba(245,158,11,0.15)",
    label: "Badge Unlocked",
    labelColor: "#F59E0B",
    bg: "rgba(245,158,11,0.06)",
  },
  rare: {
    border: "rgba(139,92,246,0.5)",
    glow: "rgba(139,92,246,0.2)",
    label: "Rare Badge!",
    labelColor: "#8B5CF6",
    bg: "rgba(139,92,246,0.06)",
  },
  epic: {
    border: "rgba(255,215,0,0.5)",
    glow: "rgba(255,215,0,0.2)",
    label: "Epic Badge!",
    labelColor: "#FFD700",
    bg: "rgba(255,215,0,0.06)",
  },
};

export default function BadgeToast({ event, onDone }: BadgeToastProps) {
  const [visible, setVisible] = useState(true);
  const style = RARITY_STYLES[event.rarity] ?? RARITY_STYLES.common;

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence onExitComplete={onDone}>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: 80 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-6 right-6 z-overlay pointer-events-auto badge-shimmer-border"
          style={{
            ["--shimmer-color" as string]: style.border,
          }}
        >
          <div
            className="flex items-center gap-3.5 px-5 py-4 rounded-xl min-w-[260px]"
            style={{
              background: `linear-gradient(135deg, rgba(13,33,55,0.95), rgba(15,30,51,0.98))`,
              border: `1px solid ${style.border}`,
              boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${style.glow}`,
              backdropFilter: "blur(12px)",
            }}
          >
            {/* Badge icon */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{
                background: style.bg,
                border: `1px solid ${style.border}`,
              }}
            >
              {event.badgeIcon ?? "🏅"}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: style.labelColor }}>
                {style.label}
              </p>
              <p className="text-sm font-bold truncate mt-0.5" style={{ color: "var(--color-text)" }}>
                {event.badgeName}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                {event.category}
                {event.xpReward ? ` · +${event.xpReward} XP` : ""}
              </p>
            </div>

            <Mascot size={32} mood="happy" className="shrink-0" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
