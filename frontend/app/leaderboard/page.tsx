"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";

type Scope = "weekly" | "all-time";

const TABS: { id: Scope; label: string }[] = [
  { id: "weekly",   label: "This Week" },
  { id: "all-time", label: "All Time"  },
];

export default function LeaderboardPage() {
  const [scope, setScope] = useState<Scope>("weekly");
  const { data, loading, error } = useLeaderboard(scope);
  const userId = useCurrentUserId();

  return (
    <div className="min-h-screen px-4 sm:px-8 py-10 max-w-2xl mx-auto" style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/home"
          className="inline-flex items-center gap-1 text-sm mb-4 transition-colors"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <span aria-hidden>←</span> Back to home
        </Link>
        <h1 className="text-xl font-sora font-bold tracking-tight">Leaderboard</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Top learners ranked by XP earned
        </p>
      </div>

      {/* Scope tabs */}
      <div className="flex items-center border rounded-md p-1 gap-1 mb-6 w-fit" style={{ backgroundColor: "var(--color-primary-soft)", borderColor: "var(--color-border)" }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setScope(tab.id)}
            className={cn(
              "px-5 py-2 rounded-sm text-sm font-medium transition duration-normal",
              scope !== tab.id && "hover:opacity-80"
            )}
            style={scope === tab.id
              ? { backgroundColor: "var(--color-success)", color: "var(--color-bg)", fontWeight: 700 }
              : { color: "var(--color-text-secondary)" }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "color-mix(in srgb, var(--color-success) 30%, transparent)", borderTopColor: "var(--color-success)" }} />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="py-20 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>{error}</div>
      )}

      {/* List */}
      {data && !loading && (
        <>
          {/* My entry (if outside top 50) */}
          {data.myEntry && !data.entries.some((e) => e.userId === data.myEntry?.userId) && (
            <div className="mb-4 rounded-md border px-4 py-3 flex items-center gap-4" style={{ borderColor: "color-mix(in srgb, var(--color-success) 30%, transparent)", backgroundColor: "color-mix(in srgb, var(--color-success) 6%, transparent)" }}>
              <span className="w-8 text-right text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                #{data.myEntry.rank}
              </span>
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs"
                style={{ color: "var(--color-bg)", background: "linear-gradient(135deg, var(--color-success), var(--color-accent))" }}>
                {data.myEntry.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {data.myEntry.name} <span className="text-xs" style={{ color: "var(--color-success)" }}>You</span>
                </p>
              </div>
              <span className="font-bold text-sm" style={{ color: "var(--color-success)" }}>
                {data.myEntry.xp.toLocaleString()} XP
              </span>
            </div>
          )}

          {/* Top entries */}
          {data.entries.length === 0 ? (
            <div className="py-20 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
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
                      "flex items-center gap-4 px-4 py-3 rounded-md border transition duration-normal",
                    )}
                    style={isMe
                      ? { borderColor: "color-mix(in srgb, var(--color-success) 30%, transparent)", backgroundColor: "color-mix(in srgb, var(--color-success) 6%, transparent)" }
                      : { borderColor: "var(--color-border)", backgroundColor: "var(--color-primary-soft)" }
                    }
                  >
                    {/* Rank */}
                    <span className="w-8 text-right text-sm font-medium flex-shrink-0" style={{ color: "var(--color-text-secondary)" }}>
                      {medal ?? `#${entry.rank}`}
                    </span>

                    {/* Avatar */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
                      style={{
                        background: isMe
                          ? "linear-gradient(135deg, var(--color-success), var(--color-accent))"
                          : "var(--color-border)",
                        color: isMe ? "var(--color-bg)" : "var(--color-text)",
                      }}
                    >
                      {entry.name.slice(0, 2).toUpperCase()}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {entry.name}
                        {isMe && (
                          <span className="ml-1.5 text-xs font-semibold" style={{ color: "var(--color-success)" }}>You</span>
                        )}
                      </p>
                    </div>

                    {/* XP */}
                    <span
                      className="font-bold text-sm flex-shrink-0"
                      style={{ color: isMe ? "var(--color-success)" : "var(--color-text)" }}
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
