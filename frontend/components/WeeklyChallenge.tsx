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
      className="relative rounded-[16px] p-5 overflow-hidden cursor-pointer"
      style={{
        background: "#0B2239",
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
      <div className="inline-flex items-center gap-[5px] bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-[0.8px] px-[9px] py-[3px] rounded-[20px] mb-3">
        <IconTrophy />
        Weekly Challenge
      </div>

      <h4 className="font-sora font-bold text-[15px] mb-1.5">7-Day Speaking Sprint</h4>

      <p className="text-[12.5px] text-[#A6B3C2] leading-[1.5] mb-3.5">
        Complete one speaking exercise each day this week and earn 500 bonus XP + a certificate.
      </p>

      <div className="flex justify-between text-[11.5px] text-[#A6B3C2] mb-1.5">
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
