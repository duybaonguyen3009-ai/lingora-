"use client";

import { useEffect, useState } from "react";
import { IconTrophy } from "./Icons";

const CHALLENGE_PROGRESS = 71;

export default function WeeklyChallenge() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="relative rounded-lg p-5 overflow-hidden cursor-pointer"
      style={{
        background: "var(--color-bg-card)",
        border: "1px solid rgba(255,255,255,0.07)",
        transition: "border-color 0.2s, transform 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,167,38,0.2)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      {/* Chip */}
      <div className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-[0.8px] px-2 py-1 rounded-lg mb-3">
        <IconTrophy />
        Weekly Challenge
      </div>

      <h4 className="font-sora font-bold text-base mb-1.5">7-Day Speaking Sprint</h4>

      <p className="text-xs leading-[1.5] mb-3.5" style={{ color: "var(--color-text-muted)" }}>
        Complete one speaking exercise each day this week and earn 500 bonus XP + a certificate.
      </p>

      <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--color-text-muted)" }}>
        <span>5 of 7 days completed</span>
        <span className="font-semibold text-amber-400">{CHALLENGE_PROGRESS}%</span>
      </div>

      <div className="h-[5px] bg-white/[0.05] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300"
          style={{
            width: loaded ? `${CHALLENGE_PROGRESS}%` : "0%",
            transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)",
            boxShadow: "0 0 8px rgba(255,167,38,0.4)",
          }}
        />
      </div>
    </div>
  );
}
