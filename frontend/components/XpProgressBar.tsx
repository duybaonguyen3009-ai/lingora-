"use client";

import { useEffect, useRef } from "react";

interface XpProgressBarProps {
  level:         number;
  xpInLevel:     number;
  xpToNextLevel: number;
  /** Width class override, e.g. "w-48". Defaults to full width of container. */
  className?: string;
}

/**
 * XpProgressBar
 *
 * Displays the user's current level badge and an animated fill bar showing
 * progress toward the next level.  Uses a CSS transition so the bar
 * animates smoothly on mount and whenever the XP values change.
 */
export default function XpProgressBar({
  level,
  xpInLevel,
  xpToNextLevel,
  className = "",
}: XpProgressBarProps) {
  const fillRef = useRef<HTMLDivElement>(null);

  const isMaxLevel   = xpToNextLevel === 0;
  const totalInLevel = isMaxLevel ? xpInLevel : xpInLevel + xpToNextLevel;
  const pct          = isMaxLevel ? 100 : totalInLevel > 0 ? Math.round((xpInLevel / totalInLevel) * 100) : 0;

  // Animate on mount and when pct changes.
  useEffect(() => {
    if (!fillRef.current) return;
    // Defer so the CSS transition actually fires (not skipped by layout flush).
    const id = requestAnimationFrame(() => {
      if (fillRef.current) fillRef.current.style.width = `${pct}%`;
    });
    return () => cancelAnimationFrame(id);
  }, [pct]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Level badge */}
      <div
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold font-sora text-[#071A2F]"
        style={{ background: "linear-gradient(135deg, #2ED3C6, #2DA8FF)" }}
        title={`Level ${level}`}
      >
        {level}
      </div>

      {/* Bar + labels */}
      <div className="flex-1 min-w-0">
        {/* Track */}
        <div className="h-[5px] rounded-full bg-white/10 overflow-hidden">
          {/* Fill — starts at 0, animates to pct via CSS transition */}
          <div
            ref={fillRef}
            style={{
              width: "0%",
              transition: "width 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
              background: "linear-gradient(90deg, #2ED3C6, #2DA8FF)",
            }}
            className="h-full rounded-full"
          />
        </div>

        {/* XP labels */}
        <div className="flex justify-between mt-[3px]">
          <span className="text-[10px] text-[#A6B3C2]">
            {xpInLevel.toLocaleString()} XP
          </span>
          <span className="text-[10px] text-[#A6B3C2]">
            {isMaxLevel ? "MAX" : `${(xpInLevel + xpToNextLevel).toLocaleString()} XP`}
          </span>
        </div>
      </div>
    </div>
  );
}
