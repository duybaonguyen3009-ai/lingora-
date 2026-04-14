"use client";

/**
 * PublicProfileClient.tsx — Public-facing profile view.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { getPublicProfile } from "@/lib/api";
import Skeleton from "@/components/ui/Skeleton";
import type { PublicProfile } from "@/lib/types";

interface Props {
  username: string;
}

const RANK_EMOJI: Record<string, string> = {
  iron: "🪨", bronze: "🥉", silver: "🥈", gold: "🥇", platinum: "💎", diamond: "💠", challenger: "👑",
};

export default function PublicProfileClient({ username }: Props) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getPublicProfile(username)
      .then(setProfile)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
        <Skeleton.Profile />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6" style={{ background: "var(--color-bg)" }}>
        <div className="text-4xl">👤</div>
        <p className="text-base font-semibold" style={{ color: "var(--color-text)" }}>User not found</p>
        <Link href="/" className="text-sm font-medium" style={{ color: "#00A896" }}>Go to Lingona →</Link>
      </div>
    );
  }

  const initials = profile.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const joinDate = new Date(profile.joined_at).toLocaleDateString("vi-VN", { month: "short", year: "numeric" });
  const rankEmoji = RANK_EMOJI[profile.battle.rank_tier] || "🪨";

  return (
    <div className="min-h-dvh px-4 py-10 max-w-lg mx-auto" style={{ background: "var(--color-bg)", color: "var(--color-text)" }}>
      {/* Header */}
      <div className="flex flex-col items-center gap-3 mb-6">
        <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center font-display font-bold text-2xl text-white"
          style={{ background: "linear-gradient(135deg, #1B2B4B, #2D4A7A)", border: "3px solid #00A896" }}>
          {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" /> : initials}
        </div>
        <div className="text-center">
          <h1 className="text-xl font-display font-bold">{profile.name}</h1>
          <p className="text-sm font-medium" style={{ color: "#00A896" }}>@{profile.username}</p>
          {profile.bio && <p className="text-sm italic mt-1" style={{ color: "var(--color-text-secondary)" }}>{profile.bio}</p>}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-2 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
            {profile.estimated_band && <span>📊 Band {profile.estimated_band.toFixed(1)}</span>}
            {profile.target_band && <span>🎯 Target {profile.target_band.toFixed(1)}</span>}
            {profile.location && <span>📍 {profile.location}</span>}
            <span>Since {joinDate}</span>
          </div>
          {profile.is_pro && (
            <span className="inline-flex mt-2 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: "rgba(139,113,234,0.15)", color: "#A5B4FC" }}>PRO</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {[
          { icon: "🔥", value: profile.streak, label: "Streak" },
          { icon: "⚡", value: profile.totalXp.toLocaleString(), label: "XP" },
          { icon: rankEmoji, value: profile.battle.rank_tier.charAt(0).toUpperCase() + profile.battle.rank_tier.slice(1), label: "Rank" },
          { icon: "⚔", value: profile.battle.wins, label: "Wins" },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl p-3 flex flex-col items-center gap-1" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-base">{s.icon}</span>
            <span className="text-lg font-display font-bold">{s.value}</span>
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Badges */}
      {profile.badges.length > 0 && (
        <div className="rounded-lg p-4 mb-6" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
          <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-secondary)" }}>Achievements</div>
          <div className="flex flex-wrap gap-2">
            {profile.badges.map((b) => (
              <span key={b.slug} className="px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: "rgba(0,168,150,0.10)", color: "#00A896" }}>
                ✓ {b.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Band progression */}
      {profile.estimated_band && profile.target_band && (
        <div className="rounded-lg p-4 mb-6" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
          <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-secondary)" }}>Band Journey</div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold" style={{ color: "#8B71EA" }}>{profile.estimated_band.toFixed(1)}</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
              <div className="h-full rounded-full" style={{
                width: `${Math.min(((profile.estimated_band - 4) / (profile.target_band - 4)) * 100, 100)}%`,
                background: "linear-gradient(90deg, #8B71EA, #2DD4BF)",
              }} />
            </div>
            <span className="text-lg font-bold" style={{ color: "#2DD4BF" }}>{profile.target_band.toFixed(1)}</span>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="text-center mt-8">
        <p className="text-sm mb-3" style={{ color: "var(--color-text-secondary)" }}>Start your IELTS journey 🚀</p>
        <Link href="/register" className="inline-flex px-6 py-3 rounded-xl text-sm font-bold" style={{ background: "linear-gradient(135deg, #00A896, #00C4B0)", color: "#fff" }}>
          Join Lingona Free
        </Link>
      </div>
    </div>
  );
}
