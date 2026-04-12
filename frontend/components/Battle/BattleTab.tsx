"use client";

/**
 * BattleTab.tsx — Main Battle hub.
 *
 * Shows rank, season info, action buttons, recent matches, mini leaderboard.
 * Opens full-screen overlays for queue, match, result, and leaderboard.
 */

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { getBattleHome } from "@/lib/api";
import Skeleton from "@/components/ui/Skeleton";
import type { BattleHome, BattleRankTier } from "@/lib/types";

const BattleQueue = dynamic(() => import("./BattleQueue"), { ssr: false });
const BattleMatch = dynamic(() => import("./BattleMatch"), { ssr: false });
const BattleResult = dynamic(() => import("./BattleResult"), { ssr: false });
const BattleLeaderboard = dynamic(() => import("./BattleLeaderboard"), { ssr: false });

// ---------------------------------------------------------------------------
// Rank config
// ---------------------------------------------------------------------------

const RANK_CONFIG: Record<BattleRankTier, { label: string; emoji: string; color: string }> = {
  iron:       { label: "Iron",       emoji: "🪨", color: "#9CA3AF" },
  bronze:     { label: "Bronze",     emoji: "🥉", color: "#CD7F32" },
  silver:     { label: "Silver",     emoji: "🥈", color: "#C0C0C0" },
  gold:       { label: "Gold",       emoji: "🥇", color: "#FFD700" },
  platinum:   { label: "Platinum",   emoji: "💎", color: "#00CED1" },
  diamond:    { label: "Diamond",    emoji: "💠", color: "#B9F2FF" },
  challenger: { label: "Challenger", emoji: "👑", color: "#FF4500" },
};

type Screen = "home" | "queue" | "match" | "result" | "leaderboard";

export default function BattleTab() {
  const [screen, setScreen] = useState<Screen>("home");
  const [data, setData] = useState<BattleHome | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);

  const loadHome = useCallback(async () => {
    setLoading(true);
    try {
      const home = await getBattleHome();
      setData(home);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadHome(); }, [loadHome]);

  // ---------------------------------------------------------------------------
  // Overlay screens
  // ---------------------------------------------------------------------------

  if (screen === "queue") {
    return (
      <BattleQueue
        onMatched={(matchId) => { setActiveMatchId(matchId); setScreen("match"); }}
        onCancel={() => setScreen("home")}
      />
    );
  }

  if (screen === "match" && activeMatchId) {
    return (
      <BattleMatch
        matchId={activeMatchId}
        onComplete={() => setScreen("result")}
        onClose={() => { setScreen("home"); loadHome(); }}
      />
    );
  }

  if (screen === "result" && activeMatchId) {
    return (
      <BattleResult
        matchId={activeMatchId}
        onClose={() => { setScreen("home"); setActiveMatchId(null); loadHome(); }}
        onPlayAgain={() => setScreen("queue")}
      />
    );
  }

  if (screen === "leaderboard") {
    return <BattleLeaderboard onClose={() => setScreen("home")} />;
  }

  // ---------------------------------------------------------------------------
  // Home screen — 3-column arena layout (desktop), stacked (mobile)
  // ---------------------------------------------------------------------------

  const profile = data?.profile;
  const tier = profile?.current_rank_tier || "iron";
  const rankCfg = RANK_CONFIG[tier];
  const winRate = profile
    ? Math.round(profile.wins / Math.max(1, profile.wins + profile.losses) * 100)
    : 0;

  // Rank progress toward next tier (approximate — visual only)
  const TIER_ORDER: BattleRankTier[] = ["iron", "bronze", "silver", "gold", "platinum", "diamond", "challenger"];
  const tierIdx = TIER_ORDER.indexOf(tier);
  const tierProgress = Math.min(100, ((profile?.current_rank_points ?? 0) % 500) / 5);

  // Recent match result for sidebar
  const lastMatch = data?.recentMatches?.[0];
  const lastMatchWin = lastMatch?.winner_user_id === profile?.user_id;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-display font-bold" style={{ color: "var(--color-text)" }}>
          Battle Arena
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          1v1 Reading Battles — prove your skills
        </p>
      </div>

      {/* 3-column grid (desktop) / stacked (mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_260px] gap-5 items-start">

        {/* ── LEFT COLUMN: Rank + Stats ── */}
        <div className="flex flex-col gap-4 order-2 lg:order-1">
          {/* Rank card */}
          {loading ? (
            <Skeleton.RankCard />
          ) : profile ? (
            <div
              className="rounded-2xl p-5 relative overflow-hidden"
              style={{
                background: "linear-gradient(145deg, rgba(15,30,51,0.9), rgba(27,43,75,0.8))",
                border: `1px solid ${rankCfg.color}25`,
                backdropFilter: "blur(12px)",
              }}
            >
              {/* Rank glow */}
              <div
                className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20 pointer-events-none"
                style={{ background: `radial-gradient(circle, ${rankCfg.color}, transparent 70%)` }}
              />

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{
                      backgroundColor: `${rankCfg.color}15`,
                      boxShadow: `0 0 20px ${rankCfg.color}20`,
                    }}
                  >
                    {rankCfg.emoji}
                  </div>
                  <div>
                    <div className="text-lg font-display font-bold" style={{ color: rankCfg.color }}>
                      {rankCfg.label}
                    </div>
                    <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                      {profile.current_rank_points} pts {data?.rank ? `| #${data.rank}` : ""}
                    </div>
                  </div>
                </div>

                {/* Rank progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                    <span>{rankCfg.label}</span>
                    <span>{tierIdx < TIER_ORDER.length - 1 ? RANK_CONFIG[TIER_ORDER[tierIdx + 1]].label : "Max"}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                    <div
                      className="h-full rounded-full animate-xp-fill"
                      style={{
                        width: `${tierProgress}%`,
                        background: `linear-gradient(90deg, ${rankCfg.color}, ${rankCfg.color}CC)`,
                      }}
                    />
                  </div>
                </div>

                {/* W/L stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 rounded-lg" style={{ backgroundColor: "rgba(34,197,94,0.08)" }}>
                    <div className="text-sm font-bold text-green-400">{profile.wins}</div>
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>Wins</div>
                  </div>
                  <div className="text-center p-2 rounded-lg" style={{ backgroundColor: "rgba(239,68,68,0.08)" }}>
                    <div className="text-sm font-bold text-red-400">{profile.losses}</div>
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>Losses</div>
                  </div>
                  <div className="text-center p-2 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
                    <div className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.8)" }}>{winRate}%</div>
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>WR</div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Win streak + last match (desktop only) */}
          <div className="hidden lg:flex flex-col gap-3">
            {lastMatch && (
              <div
                className="rounded-xl p-4 flex items-center gap-3"
                style={{
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                  style={{
                    background: lastMatchWin ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                    color: lastMatchWin ? "#22C55E" : "#EF4444",
                  }}
                >
                  {lastMatchWin ? "W" : "L"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate" style={{ color: "var(--color-text)" }}>
                    {lastMatch.passage_title || "Last Battle"}
                  </div>
                  <div className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                    {lastMatch.rank_delta != null && (
                      <span style={{ color: lastMatch.rank_delta >= 0 ? "#22C55E" : "#EF4444" }}>
                        {lastMatch.rank_delta >= 0 ? "+" : ""}{lastMatch.rank_delta} RP
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── CENTER COLUMN: Find Match Hero ── */}
        <div className="flex flex-col items-center gap-6 py-4 lg:py-8 order-1 lg:order-2">
          {/* Glowing FIND MATCH button */}
          <div className="relative">
            {/* Glow rings */}
            <div
              className="absolute inset-0 rounded-full animate-glow-ring"
              style={{
                background: "radial-gradient(circle, rgba(0,168,150,0.15), transparent 70%)",
                transform: "scale(1.4)",
              }}
            />
            <div
              className="absolute inset-0 rounded-full animate-glow-ring"
              style={{
                background: "radial-gradient(circle, rgba(99,102,241,0.1), transparent 70%)",
                transform: "scale(1.6)",
                animationDelay: "0.8s",
              }}
            />

            <button
              onClick={() => setScreen("queue")}
              className="relative z-10 w-44 h-44 lg:w-52 lg:h-52 rounded-full flex flex-col items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
              style={{
                background: "linear-gradient(135deg, #6366F1 0%, #00A896 50%, #00C4B0 100%)",
                boxShadow: "0 0 30px rgba(0,168,150,0.4), 0 0 60px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
            >
              <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
                <line x1="13" y1="19" x2="19" y2="13" /><line x1="16" y1="16" x2="20" y2="20" />
                <line x1="19" y1="21" x2="21" y2="19" />
                <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
                <line x1="5" y1="14" x2="9" y2="18" /><line x1="7" y1="17" x2="4" y2="20" />
                <line x1="3" y1="19" x2="5" y2="21" />
              </svg>
              <span className="text-white font-bold text-lg tracking-wide">FIND MATCH</span>
            </button>
          </div>

          {/* Queue info */}
          <div className="flex items-center gap-6 text-center">
            <div>
              <div className="text-sm font-bold" style={{ color: "var(--color-text)" }}>1,234</div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>Online</div>
            </div>
            <div className="w-px h-6" style={{ backgroundColor: "var(--color-border)" }} />
            <div>
              <div className="text-sm font-bold" style={{ color: "var(--color-text)" }}>~12s</div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>Avg Queue</div>
            </div>
          </div>

          {/* OR divider */}
          <div className="flex items-center gap-3 w-full max-w-xs">
            <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>OR</span>
            <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
          </div>

          {/* Challenge friend */}
          <button
            onClick={() => setScreen("queue")}
            className="px-8 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] cursor-pointer"
            style={{
              backgroundColor: "rgba(255,255,255,0.04)",
              color: "var(--color-text)",
              border: "1px solid var(--color-border)",
            }}
          >
            Challenge a Friend
          </button>

          {/* Recent matches (mobile) */}
          <div className="lg:hidden w-full">
            {data && data.recentMatches.length > 0 && (
              <div>
                <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-tertiary)" }}>
                  Recent Battles
                </div>
                <div className="flex flex-col gap-2">
                  {data.recentMatches.slice(0, 3).map((m) => {
                    const isWin = m.winner_user_id === profile?.user_id;
                    const isExpired = m.status === "expired";
                    return (
                      <button
                        key={m.id}
                        onClick={() => { setActiveMatchId(m.id); setScreen("result"); }}
                        className="flex items-center gap-3 p-3 rounded-lg text-left transition-all cursor-pointer"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                          style={{
                            background: isWin ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                            color: isWin ? "#22C55E" : "#EF4444",
                          }}
                        >
                          {isWin ? "W" : isExpired ? "X" : "L"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>
                            {m.passage_title || "Reading Battle"}
                          </div>
                          <div className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                            {m.rank_delta != null && (
                              <span style={{ color: m.rank_delta >= 0 ? "#22C55E" : "#EF4444" }}>
                                {m.rank_delta >= 0 ? "+" : ""}{m.rank_delta} RP
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: Leaderboard + Season ── */}
        <div className="flex flex-col gap-4 order-3">
          {/* Live leaderboard */}
          {data && data.leaderboardPreview.length > 0 && (
            <div
              className="rounded-2xl p-4 relative overflow-hidden"
              style={{
                backgroundColor: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>
                  Top Players
                </span>
                <button
                  onClick={() => setScreen("leaderboard")}
                  className="text-xs font-medium cursor-pointer"
                  style={{ color: "#00A896" }}
                >
                  View All
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {data.leaderboardPreview.slice(0, 5).map((e, i) => {
                  const entryRank = RANK_CONFIG[e.current_rank_tier] || RANK_CONFIG.iron;
                  return (
                    <div
                      key={e.user_id}
                      className="flex items-center gap-3 p-2.5 rounded-lg"
                      style={{
                        backgroundColor: i === 0 ? "rgba(255,215,0,0.04)" : "rgba(255,255,255,0.02)",
                        borderLeft: i < 3 ? `2px solid ${entryRank.color}40` : "2px solid transparent",
                      }}
                    >
                      <span
                        className="w-6 text-center text-xs font-bold"
                        style={{ color: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "var(--color-text-tertiary)" }}
                      >
                        #{e.rank}
                      </span>
                      <span className="text-sm font-medium flex-1 truncate" style={{ color: "var(--color-text)" }}>
                        {e.name}
                      </span>
                      <span className="text-xs font-bold" style={{ color: entryRank.color }}>
                        {e.current_rank_points}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Season countdown */}
          <div
            className="rounded-2xl p-4 text-center"
            style={{
              backgroundColor: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
              Season 1
            </div>
            <div className="text-lg font-display font-bold" style={{ color: "var(--color-text)" }}>
              28 days left
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--color-text-tertiary)" }}>
              Climb the ranks before reset
            </div>
          </div>

          {/* Recent matches (desktop) */}
          <div className="hidden lg:block">
            {data && data.recentMatches.length > 1 && (
              <div>
                <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-tertiary)" }}>
                  Recent Battles
                </div>
                <div className="flex flex-col gap-2">
                  {data.recentMatches.slice(0, 5).map((m) => {
                    const isWin = m.winner_user_id === profile?.user_id;
                    const isExpired = m.status === "expired";
                    return (
                      <button
                        key={m.id}
                        onClick={() => { setActiveMatchId(m.id); setScreen("result"); }}
                        className="flex items-center gap-3 p-2.5 rounded-lg text-left transition-all cursor-pointer"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        <div
                          className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
                          style={{
                            background: isWin ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                            color: isWin ? "#22C55E" : "#EF4444",
                          }}
                        >
                          {isWin ? "W" : isExpired ? "X" : "L"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate" style={{ color: "var(--color-text)" }}>
                            {m.passage_title || "Battle"}
                          </div>
                        </div>
                        <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
                          +{m.xp_reward} XP
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
