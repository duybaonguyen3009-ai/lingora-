"use client";

import { useEffect, useState } from "react";
import type { ApiCompleteBadge } from "@/lib/api";

interface BadgeToastProps {
  badges:    ApiCompleteBadge[];
  /** Auto-dismiss delay in ms. Default: 4000 */
  duration?: number;
}

/**
 * BadgeToast
 *
 * Shows a stacked list of newly-earned badges as auto-dismissing toasts
 * in the bottom-right corner.  Each badge fades in, then fades out after
 * `duration` ms.  Multiple badges are stacked vertically.
 */
export default function BadgeToast({ badges, duration = 4000 }: BadgeToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (badges.length === 0) return;
    setVisible(true);
    const id = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(id);
  }, [badges, duration]);

  if (badges.length === 0 || !visible) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-label="Badge notifications"
    >
      {badges.map((badge) => (
        <div
          key={badge.id}
          className="flex items-center gap-3 px-4 py-3 rounded-[14px] border border-amber-500/30 backdrop-blur-md shadow-2xl animate-fade-in"
          style={{ backgroundColor: "rgba(13,33,55,0.9)", animation: "fadeInUp 0.4s ease forwards" }}
        >
          {/* Icon or emoji placeholder */}
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg bg-amber-500/20 border border-amber-500/30 flex-shrink-0">
            {badge.icon_url ? (
              <img src={badge.icon_url} alt={badge.name} className="w-6 h-6 object-contain" />
            ) : (
              "\u{1F3C5}"
            )}
          </div>

          <div className="min-w-0">
            <p className="text-[11px] text-amber-400 font-semibold uppercase tracking-wide">
              Badge Unlocked!
            </p>
            <p className="text-[13px] font-semibold font-sora truncate" style={{ color: "var(--color-text)" }}>
              {badge.name}
            </p>
            {badge.xp_reward > 0 && (
              <p className="text-[11px]" style={{ color: "var(--color-success)" }}>+{badge.xp_reward} XP</p>
            )}
          </div>
        </div>
      ))}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
