"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";

type Scope = "weekly" | "all-time";

const TABS: { id: Scope; label: string }[] = [
  { id: "weekly",   label: "This Week" },
  { id: "all-time", label: "All Time"  },
];

export default function LeaderboardPage() {
  const [scope, setScope] = useState<Scope>("all-time");
  const { data, loading, error } = useLeaderboard(scope);
  const userId = useCurrentUserId();

  return (
    <div className="min-h-screen bg-[#04111E] text-[#E6EDF3] px-4 sm:px-8 py-10 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-sora font-bold tracking-tight">Leaderboard</h1>
        <p className="text-[#A6B3C2] text-[14px] mt-1">
          Top learners ranked by XP earned
        </p>
      </div>

      {/* Scope tabs */}
      <div className="flex items-center bg-white/[0.04] border border-white/[0.07] rounded-[12px] p-[4px] gap-1 mb-6 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setScope(tab.id)}
            className={cn(
              "px-5 py-2 rounded-[9px] text-[13px] font-medium transition-all duration-200",
              scope === tab.id
                ? "bg-[#2ED3C6] text-[#071A2F] font-bold"
                : "text-[#A6B3C2] hover:text-[#E6EDF3] hover:bg-white/[0.05]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-[#2ED3C6]/30 border-t-[#2ED3C6] animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="py-20 text-center text-[#A6B3C2] text-sm">{error}</div>
      )}

      {/* List */}
      {data && !loading && (
        <>
          {/* My entry (if outside top 50) */}
          {data.myEntry && !data.entries.some((e) => e.userId === data.myEntry?.userId) && (
            <div className="mb-4 rounded-[14px] border border-[#2ED3C6]/30 bg-[#2ED3C6]/[0.06] px-4 py-3 flex items-center gap-4">
              <span className="w-8 text-right text-[13px] text-[#A6B3C2] font-medium">
                #{data.myEntry.rank}
              </span>
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-[#071A2F]"
                style={{ background: "linear-gradient(135deg, #2ED3C6, #2DA8FF)" }}>
                {data.myEntry.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold truncate">
                  {data.myEntry.name} <span className="text-[#2ED3C6] text-[11px]">You</span>
                </p>
              </div>
              <span className="text-[#2ED3C6] font-bold text-[14px]">
                {data.myEntry.xp.toLocaleString()} XP
              </span>
            </div>
          )}

          {/* Top entries */}
          {data.entries.length === 0 ? (
            <div className="py-20 text-center text-[#A6B3C2] text-sm">
              No rankings yet for this period — be the first!
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {data.entries.map((entry, i) => {
                const isMe = entry.userId === userId;
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;

                return (
                  <div
                    key={entry.userId}
                    className={cn(
                      "flex items-center gap-4 px-4 py-3 rounded-[14px] border transition-all duration-200",
                      isMe
                        ? "border-[#2ED3C6]/30 bg-[#2ED3C6]/[0.06]"
                        : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                    )}
                  >
                    {/* Rank */}
                    <span className="w-8 text-right text-[13px] text-[#A6B3C2] font-medium flex-shrink-0">
                      {medal ?? `#${entry.rank}`}
                    </span>

                    {/* Avatar */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
                      style={{
                        background: isMe
                          ? "linear-gradient(135deg, #2ED3C6, #2DA8FF)"
                          : "rgba(255,255,255,0.08)",
                        color: isMe ? "#071A2F" : "#E6EDF3",
                      }}
                    >
                      {entry.name.slice(0, 2).toUpperCase()}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium truncate">
                        {entry.name}
                        {isMe && (
                          <span className="ml-1.5 text-[11px] text-[#2ED3C6] font-semibold">You</span>
                        )}
                      </p>
                    </div>

                    {/* XP */}
                    <span
                      className={cn(
                        "font-bold text-[14px] flex-shrink-0",
                        isMe ? "text-[#2ED3C6]" : "text-[#E6EDF3]"
                      )}
                    >
                      {entry.xp.toLocaleString()} XP
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
