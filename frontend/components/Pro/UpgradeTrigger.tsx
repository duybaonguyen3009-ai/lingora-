"use client";

/**
 * UpgradeTrigger.tsx — Inline limit warning shown when daily free limit is hit.
 */

import { useState, useEffect } from "react";
import Mascot from "@/components/ui/Mascot";
import { analytics } from "@/lib/analytics";

interface UpgradeTriggerProps {
  type: "speaking" | "writing";
  used: number;
  limit: number;
  onUpgrade: () => void;
}

export default function UpgradeTrigger({ type, used, limit, onUpgrade }: UpgradeTriggerProps) {
  const [timeUntilReset, setTimeUntilReset] = useState("");

  useEffect(() => {
    function updateTimer() {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setTimeUntilReset(`${hours}h ${mins}m`);
    }
    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, []);

  // Track daily limit hit once when component mounts
  useEffect(() => {
    if (used >= limit) analytics.dailyLimitHit(type);
  }, [used, limit, type]);

  if (used < limit) return null;

  const emoji = type === "speaking" ? "🎤" : "✍️";
  const label = type === "speaking" ? "Speaking" : "Writing";

  return (
    <div className="rounded-xl p-4 flex gap-3" style={{
      background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.04))",
      border: "1px solid rgba(245,158,11,0.15)",
    }}>
      <Mascot size={44} className="shrink-0 mt-0.5" />
      <div className="flex-1">
      <div className="text-sm font-semibold mb-1" style={{ color: "#F59E0B" }}>
        Hết lượt {label} cho hôm nay rồi!
      </div>
      <div className="text-xs mb-3" style={{ color: "#94A3B8" }}>
        Nếu bạn thấy app thật sự giúp ích, cùng mình đi tới Pro nhé! Mách nhỏ: rẻ hơn trung tâm ngoài kia nhiều lắm 😉 • Reset sau {timeUntilReset}
      </div>
      <button onClick={() => { analytics.proUpgradeClick("limit_trigger"); onUpgrade(); }}
        className="px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95"
        style={{ background: "linear-gradient(135deg, #8B71EA, #2DD4BF)", color: "#fff" }}>
        Cùng mình đi Pro
      </button>
      </div>
    </div>
  );
}
