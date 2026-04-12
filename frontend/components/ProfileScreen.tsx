"use client";

/**
 * ProfileScreen.tsx — Full profile redesign with stats grid, band progression,
 * achievements, edit modal, and share card.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import { useAuthStore } from "@/lib/stores/authStore";
import { logoutUser, getProfileStats, updateProfile, uploadAvatar } from "@/lib/api";
import type { SpeakingMetricsData, GamificationData, ProfileStats } from "@/lib/types";

const ShareCardModal = dynamic(() => import("./Social/ShareCardModal"), { ssr: false });
const AchievementsSection = dynamic(() => import("./AchievementsSection"), { ssr: false });

interface ProfileScreenProps {
  userId: string | null;
  metrics: SpeakingMetricsData | null;
  metricsLoading: boolean;
  gamification: GamificationData | null;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return (
    <div className="rounded-2xl p-3.5 flex flex-col items-center gap-1 min-w-[90px] transition-all hover:scale-[1.03]"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <span className="text-base">{icon}</span>
      <span className="text-xl font-display font-bold" style={{ color: "var(--color-text)" }}>{value}</span>
      <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>{label}</span>
    </div>
  );
}

function EditProfileModal({ stats, onClose, onSaved }: { stats: ProfileStats; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(stats.user.name || "");
  const [bio, setBio] = useState(stats.user.bio || "");
  const [location, setLocation] = useState(stats.user.location || "");
  const [targetBand, setTargetBand] = useState(stats.user.target_band?.toString() || "6.5");
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (avatarPreview) await uploadAvatar(avatarPreview);
      await updateProfile({ name: name.trim(), bio: bio.trim(), location: location.trim(), target_band: Number(targetBand) });
      onSaved();
      onClose();
    } catch { /* silent */ }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
        style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold" style={{ color: "var(--color-text)" }}>Edit Profile</h3>
          <button onClick={onClose} className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>✕</button>
        </div>

        {/* Avatar */}
        <div className="flex justify-center">
          <button onClick={() => fileRef.current?.click()} className="relative group">
            <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center font-bold text-xl"
              style={{ background: "linear-gradient(135deg, #1B2B4B, #2D4A7A)", border: "3px solid #00A896", color: "#fff" }}>
              {avatarPreview || stats.user.avatar_url
                ? <img src={avatarPreview || stats.user.avatar_url!} alt="" className="w-full h-full object-cover" />
                : stats.user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-white font-medium">Edit</div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" maxLength={50}
          className="rounded-lg px-3 py-2.5 text-sm" style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text)" }} />

        <div className="relative">
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio (optional)" maxLength={100} rows={2}
            className="w-full rounded-lg px-3 py-2.5 text-sm resize-none" style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text)" }} />
          <span className="absolute bottom-2 right-3 text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>{bio.length}/100</span>
        </div>

        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (optional)"
          className="rounded-lg px-3 py-2.5 text-sm" style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text)" }} />

        <select value={targetBand} onChange={(e) => setTargetBand(e.target.value)}
          className="rounded-lg px-3 py-2.5 text-sm" style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
          {[5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0].map(b => <option key={b} value={b}>Target: Band {b.toFixed(1)}</option>)}
        </select>

        <div className="flex gap-2 mt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-secondary)" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-bold disabled:opacity-50" style={{ background: "#00A896", color: "#fff" }}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main ProfileScreen
// ---------------------------------------------------------------------------

export default function ProfileScreen({ userId, metrics, metricsLoading, gamification }: ProfileScreenProps) {
  const user = useAuthStore((s) => s.user);
  const isGuest = !user;
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const loadStats = useCallback(async () => {
    if (!user) return;
    setStatsLoading(true);
    try { setStats(await getProfileStats()); } catch { /* silent */ }
    setStatsLoading(false);
  }, [user]);

  useEffect(() => { loadStats(); }, [loadStats]);

  async function handleLogout() {
    setLoggingOut(true);
    await logoutUser();
    router.push("/login");
  }

  const handleCopyLink = () => {
    const username = stats?.user.username;
    if (!username) return;
    navigator.clipboard.writeText(`https://lingona.app/u/${username}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  // ---------------------------------------------------------------------------
  // Loading / Guest states
  // ---------------------------------------------------------------------------

  if (isGuest) {
    return (
      <div className="flex flex-col items-center gap-5 py-8">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold" style={{ background: "linear-gradient(135deg, #1B2B4B, #2D4A7A)", color: "#fff", border: "3px solid #00A896" }}>G</div>
        <h2 className="text-lg font-display font-bold" style={{ color: "var(--color-text)" }}>Guest Learner</h2>
        <Card padding="lg" className="text-center w-full" style={{ background: "rgba(0,168,150,0.06)", border: "1px solid rgba(0,168,150,0.15)" }}>
          <p className="text-base font-medium mb-1" style={{ color: "var(--color-text)" }}>Create an account to save your progress</p>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Your scores, streaks, and badges will persist across devices</p>
        </Card>
      </div>
    );
  }

  if (statsLoading || !stats) {
    return <Skeleton.Profile />;
  }

  const { user: u, gamification: g, battle, speaking, writing, social, leaderboard: lb } = stats;
  const initials = u.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const joinDate = new Date(u.joined_at).toLocaleDateString("en-US", { month: "short", year: "numeric" });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-5">
      {/* SECTION 1: Profile Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
        <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center font-display font-bold text-2xl text-white shrink-0"
          style={{ background: "linear-gradient(135deg, #1B2B4B, #2D4A7A)", border: "3px solid #00A896", boxShadow: "0 4px 16px rgba(27,43,75,0.3)" }}>
          {u.avatar_url
            ? <img src={u.avatar_url} alt={u.name} className="w-full h-full object-cover" />
            : initials}
        </div>
        <div className="flex-1 text-center sm:text-left min-w-0">
          <h2 className="text-xl font-display font-bold" style={{ color: "var(--color-text)" }}>{u.name}</h2>
          {u.username && <p className="text-sm font-medium" style={{ color: "#00A896" }}>@{u.username}</p>}
          {u.bio && <p className="text-sm italic mt-1" style={{ color: "var(--color-text-secondary)" }}>{u.bio}</p>}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 mt-2 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
            {u.estimated_band && <span>📊 Band {u.estimated_band.toFixed(1)}</span>}
            {u.target_band && <span>🎯 Target {u.target_band.toFixed(1)}</span>}
            {u.location && <span>📍 {u.location}</span>}
            <span>Since {joinDate}</span>
          </div>
          {lb.percentile <= 25 && (
            <div className="inline-flex mt-2 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(0,168,150,0.12)", color: "#00A896" }}>
              🏅 Top {lb.percentile}% in Vietnam
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button onClick={() => setShowEdit(true)} className="flex-1 py-2.5 rounded-lg text-xs font-medium"
          style={{ background: "var(--color-bg-card)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}>
          Edit Profile
        </button>
        {u.username && (
          <button onClick={handleCopyLink} className="flex-1 py-2.5 rounded-lg text-xs font-medium"
            style={{ background: "var(--color-bg-card)", color: copied ? "#00A896" : "var(--color-text-secondary)", border: `1px solid ${copied ? "rgba(0,168,150,0.3)" : "var(--color-border)"}` }}>
            {copied ? "Copied! 🔥" : "🔗 Copy Link"}
          </button>
        )}
        <button onClick={() => setShowShareCard(true)} className="flex-1 py-2.5 rounded-lg text-xs font-bold"
          style={{ background: "linear-gradient(135deg, #00A896, #00C4B0)", color: "#fff" }}>
          Share 🎯
        </button>
      </div>

      {/* SECTION 2: Stats Grid */}
      <div className="grid grid-cols-4 gap-2 overflow-x-auto">
        <StatCard icon="🔥" value={g.currentStreak} label="Streak" />
        <StatCard icon="⚡" value={g.totalXp.toLocaleString()} label="XP" />
        <StatCard icon="🏆" value={battle.rank_tier.charAt(0).toUpperCase() + battle.rank_tier.slice(1)} label="Rank" />
        <StatCard icon="⚔" value={battle.wins} label="Wins" />
        <StatCard icon="📚" value={g.level} label="Level" />
        <StatCard icon="🎤" value={speaking.totalSessions} label="Speaking" />
        <StatCard icon="✍" value={writing.totalSubmissions} label="Writing" />
        <StatCard icon="👥" value={social.friendCount} label="Friends" />
      </div>

      {/* SECTION 3: Band Progression */}
      {u.estimated_band && u.target_band && (
        <Card padding="md">
          <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-secondary)" }}>Band Journey</div>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-lg font-bold" style={{ color: "#8B71EA" }}>{u.estimated_band.toFixed(1)}</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
              <div className="h-full rounded-full" style={{
                width: `${Math.min(((u.estimated_band - 4) / (u.target_band - 4)) * 100, 100)}%`,
                background: "linear-gradient(90deg, #8B71EA, #2DD4BF)", transition: "width 600ms ease-out",
              }} />
            </div>
            <span className="text-lg font-bold" style={{ color: "#2DD4BF" }}>{u.target_band.toFixed(1)}</span>
          </div>
          <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
            +{(u.target_band - u.estimated_band).toFixed(1)} bands to reach your goal
          </p>
        </Card>
      )}

      {/* SECTION 4: Achievements (full system) */}
      <AchievementsSection />

      {/* SECTION 5: Leaderboard + Pro */}
      <button onClick={() => router.push("/leaderboard")} className="w-full text-left rounded-lg p-4 transition-all active:scale-[0.98]"
        style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl" style={{ background: "rgba(245,158,11,0.10)" }}>🏆</div>
          <div className="flex-1">
            <div className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Leaderboard</div>
            <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Top {lb.percentile}% · Level {g.level}</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-text-tertiary)" }}><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </button>

      {/* Logout */}
      <button onClick={handleLogout} disabled={loggingOut}
        className="w-full py-3 rounded-full text-sm font-semibold transition-colors duration-150"
        style={{ background: "transparent", color: "var(--color-text-tertiary)", border: "1px solid var(--color-border)", opacity: loggingOut ? 0.6 : 1 }}>
        {loggingOut ? "Logging out..." : "Log out"}
      </button>

      {/* Modals */}
      {showEdit && stats && <EditProfileModal stats={stats} onClose={() => setShowEdit(false)} onSaved={loadStats} />}
      <ShareCardModal isOpen={showShareCard} onClose={() => setShowShareCard(false)} />
    </div>
  );
}
