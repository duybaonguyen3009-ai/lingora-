"use client";

/**
 * BattleLeaderboard.tsx — Full battle leaderboard.
 */

import { useState, useEffect } from "react";
import { getBattleLeaderboard } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/authStore";
import Skeleton from "@/components/ui/Skeleton";
import Mascot from "@/components/ui/Mascot";
import type { BattleLeaderboardEntry, BattleRankTier } from "@/lib/types";

interface BattleLeaderboardProps {
  onClose: () => void;
}

const RANK_CONFIG: Record<BattleRankTier, { label: string; emoji: string; color: string }> = {
  iron: { label: "Iron", emoji: "🪨", color: "#9CA3AF" },
  bronze: { label: "Bronze", emoji: "🥉", color: "#CD7F32" },
  silver: { label: "Silver", emoji: "🥈", color: "#C0C0C0" },
  gold: { label: "Gold", emoji: "🥇", color: "#FFD700" },
  platinum: { label: "Platinum", emoji: "💎", color: "#00CED1" },
  diamond: { label: "Diamond", emoji: "💠", color: "#B9F2FF" },
  challenger: { label: "Challenger", emoji: "👑", color: "#FF4500" },
};

export default function BattleLeaderboard({ onClose }: BattleLeaderboardProps) {
  const [entries, setEntries] = useState<BattleLeaderboardEntry[]>([]);
  const [myEntry, setMyEntry] = useState<BattleLeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    (async () => {
      try {
        const data = await getBattleLeaderboard();
        setEntries(data.entries);
        setMyEntry(data.myEntry);
      } catch { /* silent */ }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--color-bg)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ background: "var(--color-bg-card)", borderBottom: "1px solid var(--color-border)" }}>
        <button onClick={onClose} className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--color-bg-secondary)" }}>
          <span style={{ color: "var(--color-text)" }}>←</span>
        </button>
        <div className="flex-1">
          <div className="font-display font-bold text-base" style={{ color: "var(--color-text)" }}>
            Battle Leaderboard
          </div>
          <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            Ranked by battle points
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="max-w-2xl mx-auto"><Skeleton.Leaderboard /></div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center gap-3">
            <Mascot size={64} mood="thinking" />
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Chưa có trận đấu nào! Thử sức nhé 🐙</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto flex flex-col gap-2">
            {/* My rank (if outside top 50) */}
            {myEntry && !entries.some((e) => e.user_id === myEntry.user_id) && (
              <div className="mb-3 rounded-lg p-3 flex items-center gap-3"
                style={{ background: "rgba(0,168,150,0.06)", border: "1px solid rgba(0,168,150,0.2)" }}>
                <span className="w-8 text-right text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>#{myEntry.rank}</span>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "linear-gradient(135deg, #00A896, #00C4B0)", color: "#fff" }}>
                  {myEntry.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                    {myEntry.name} <span className="text-xs" style={{ color: "#00A896" }}>You</span>
                  </span>
                </div>
                <span className="text-sm font-bold" style={{ color: RANK_CONFIG[myEntry.current_rank_tier]?.color || "#9CA3AF" }}>
                  {myEntry.current_rank_points} pts
                </span>
              </div>
            )}

            {entries.map((e, i) => {
              const isMe = e.user_id === userId;
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
              const rc = RANK_CONFIG[e.current_rank_tier] || RANK_CONFIG.iron;

              return (
                <div
                  key={e.user_id}
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{
                    background: isMe ? "rgba(0,168,150,0.06)" : "var(--color-bg-card)",
                    border: `1px solid ${isMe ? "rgba(0,168,150,0.2)" : "var(--color-border)"}`,
                  }}
                >
                  <span className="w-8 text-right text-sm font-medium shrink-0" style={{ color: "var(--color-text-secondary)" }}>
                    {medal || `#${e.rank}`}
                  </span>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: isMe ? "linear-gradient(135deg, #00A896, #00C4B0)" : "var(--color-border)", color: isMe ? "#fff" : "var(--color-text)" }}>
                    {e.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>
                      {e.name}
                      {isMe && <span className="ml-1.5 text-xs font-semibold" style={{ color: "#00A896" }}>You</span>}
                    </div>
                    <div className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                      {rc.emoji} {rc.label} • {e.wins}W {e.losses}L
                    </div>
                  </div>
                  <span className="text-sm font-bold shrink-0" style={{ color: rc.color }}>
                    {e.current_rank_points}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
