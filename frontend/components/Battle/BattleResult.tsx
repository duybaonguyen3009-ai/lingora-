"use client";

/**
 * BattleResult.tsx — Victory/Defeat result screen.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getBattleResult } from "@/lib/api";
import Mascot from "@/components/ui/Mascot";
import type { BattleResult as BattleResultType, BattleRankTier } from "@/lib/types";

interface BattleResultProps {
  matchId: string;
  onClose: () => void;
  onPlayAgain: () => void;
}

const RANK_CONFIG: Record<BattleRankTier, { emoji: string; color: string }> = {
  iron: { emoji: "🪨", color: "#9CA3AF" }, bronze: { emoji: "🥉", color: "#CD7F32" },
  silver: { emoji: "🥈", color: "#C0C0C0" }, gold: { emoji: "🥇", color: "#FFD700" },
  platinum: { emoji: "💎", color: "#00CED1" }, diamond: { emoji: "💠", color: "#B9F2FF" },
  challenger: { emoji: "👑", color: "#FF4500" },
};

export default function BattleResultScreen({ matchId, onClose, onPlayAgain }: BattleResultProps) {
  const router = useRouter();
  const [result, setResult] = useState<BattleResultType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setResult(await getBattleResult(matchId)); } catch { /* silent */ }
      setLoading(false);
    })();
  }, [matchId]);

  if (loading || !result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const { myResult, opponentResult, isWinner, isDraw } = result;
  const heroColor = isDraw ? "#F59E0B" : isWinner ? "#22C55E" : "#EF4444";
  const heroText = isDraw ? "DRAW" : isWinner ? "VICTORY" : "DEFEAT";
  const heroEmoji = isDraw ? "🤝" : isWinner ? "🏆" : "💪";

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto" style={{ background: "var(--color-bg)" }}>
      <div className="max-w-xl mx-auto w-full px-5 py-8 flex flex-col items-center gap-6">
        {/* Lintopus presence — Soul §1: stand next to every result, win or loss. */}
        <Mascot size={100} mood={isWinner ? "happy" : "default"} alt="Lintopus" />

        {/* Hero */}
        <div className="text-center">
          <div className="text-5xl mb-3">{heroEmoji}</div>
          <h2
            className="text-3xl font-display font-bold"
            style={{ color: heroColor, textShadow: `0 0 30px ${heroColor}40` }}
          >
            {heroText}
          </h2>
        </div>

        {/* Score comparison */}
        <div
          className="w-full rounded-xl p-5"
          style={{ background: "linear-gradient(135deg, #0F1E33, #1B2B4B)", border: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-center flex-1">
              <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>You</div>
              <div className="text-2xl font-bold" style={{ color: isWinner ? "#22C55E" : "var(--color-text)" }}>
                {Number(myResult.individual_score).toLocaleString()}
              </div>
            </div>
            <div className="text-lg font-bold px-4" style={{ color: "var(--color-text-tertiary)" }}>VS</div>
            <div className="text-center flex-1">
              <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                {opponentResult?.name || "Opponent"}
              </div>
              <div className="text-2xl font-bold" style={{ color: !isWinner && !isDraw ? "#22C55E" : "var(--color-text)" }}>
                {opponentResult ? Number(opponentResult.score).toLocaleString() : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Rewards */}
        <div className="w-full flex gap-3">
          {/* Rank change */}
          {myResult.rank_delta != null && myResult.rank_delta !== 0 && (
            <div className="flex-1 rounded-xl p-4 text-center"
              style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
              <div className="text-2xl font-bold" style={{ color: myResult.rank_delta >= 0 ? "#22C55E" : "#EF4444" }}>
                {myResult.rank_delta >= 0 ? "+" : ""}{myResult.rank_delta}
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>Rank Points</div>
            </div>
          )}

          {/* XP earned */}
          <div className="flex-1 rounded-xl p-4 text-center"
            style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
            <div className="text-2xl font-bold" style={{ color: "#F59E0B" }}>
              +{myResult.xp_reward}
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>XP Earned</div>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col gap-3 mt-2">
          <button
            onClick={onPlayAgain}
            className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #00A896, #00C4B0)",
              color: "#fff",
              boxShadow: "0 4px 16px rgba(0,168,150,0.25)",
            }}
          >
            ⚔️ Play Again
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-medium"
            style={{ background: "var(--color-bg-card)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}
          >
            Back to Arena
          </button>
          {/* Wave 2.9: parity with Speaking's "Xem lịch sử" entry point. */}
          <button
            onClick={() => router.push("/battle/history")}
            className="w-full py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
            style={{ background: "transparent", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}
          >
            Xem lịch sử Battle
          </button>
        </div>
      </div>
    </div>
  );
}
