"use client";

/**
 * BandProgressCard.tsx — Premium band progress dashboard card.
 *
 * Shows estimated band → target, weekly delta, sparkline chart,
 * per-skill breakdown, and next milestone. Expands to full detail view.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { getBandProgress } from "@/lib/api";
import type { BandProgressData, BandHistoryEntry } from "@/lib/types";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceDot,
} from "recharts";

interface BandProgressCardProps {
  userId: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function SkillBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium w-16 shrink-0" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color }}>{value.toFixed(1)}</span>
    </div>
  );
}

// Custom tooltip for the chart
function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { band: number; skill: string; date: string } }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="px-3 py-2 rounded-lg text-xs" style={{ background: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", color: "#E2E8F0" }}>
      <span className="font-bold" style={{ color: "#8B71EA" }}>Band {d.band.toFixed(1)}</span>
      <span className="mx-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>•</span>
      <span className="capitalize">{d.skill}</span>
      <span className="mx-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>•</span>
      <span>{d.date}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function Skeleton() {
  return (
    <div className="rounded-2xl p-5 animate-pulse" style={{ background: "linear-gradient(135deg, #0F172A, #1E293B)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="h-4 w-28 rounded bg-white/5 mb-4" />
      <div className="h-8 w-40 rounded bg-white/5 mb-3" />
      <div className="h-3 w-32 rounded bg-white/5 mb-5" />
      <div className="h-24 w-full rounded bg-white/5 mb-4" />
      <div className="h-3 w-full rounded bg-white/5 mb-2" />
      <div className="h-3 w-full rounded bg-white/5" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function BandProgressCard({ userId }: BandProgressCardProps) {
  const [data, setData] = useState<BandProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<"all" | "speaking" | "writing">("all");
  const [animatedBand, setAnimatedBand] = useState(0);
  const animRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const result = await getBandProgress(userId);
      setData(result);
    } catch { /* silent */ }
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  // Count-up animation for band number
  useEffect(() => {
    if (!data?.estimated_band) return;
    const target = data.estimated_band;
    const duration = 800;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedBand(Math.round(target * eased * 10) / 10);
      if (progress < 1) animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [data?.estimated_band]);

  // ---------------------------------------------------------------------------
  // Loading & empty states
  // ---------------------------------------------------------------------------

  if (loading) return <Skeleton />;

  if (!data || !data.estimated_band || data.band_history.length === 0) {
    return (
      <div
        className="rounded-2xl p-5 text-center"
        style={{ background: "linear-gradient(135deg, #0F172A, #1E293B)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="text-3xl mb-3">📊</div>
        <p className="text-sm font-medium mb-1" style={{ color: "#E2E8F0" }}>
          No band data yet
        </p>
        <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
          Take a Speaking or Writing test to see your band progress
        </p>
        <div className="inline-flex px-4 py-2 rounded-full text-xs font-semibold" style={{ background: "rgba(139,113,234,0.15)", color: "#A5B4FC" }}>
          Start a test to begin tracking
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Data prep
  // ---------------------------------------------------------------------------

  const { estimated_band, target_band, band_history, week_delta, speaking_avg, writing_avg } = data;
  const filteredHistory = filter === "all"
    ? band_history
    : band_history.filter((h) => h.skill === filter);

  const chartData = filteredHistory.map((h) => ({
    band: h.band,
    skill: h.skill,
    date: formatDate(h.scored_at),
    scored_at: h.scored_at,
  }));

  const lastPoint = chartData.length > 0 ? chartData[chartData.length - 1] : null;
  const nextMilestone = Math.round((estimated_band + 0.5) * 2) / 2;
  const distToNext = Math.round((nextMilestone - estimated_band) * 10) / 10;
  const isClose = distToNext <= 0.3 && distToNext > 0;

  // ---------------------------------------------------------------------------
  // Expanded modal
  // ---------------------------------------------------------------------------

  if (expanded) {
    const insights: string[] = [];
    if (speaking_avg && writing_avg) {
      if (speaking_avg > writing_avg) insights.push("Speaking is your strongest skill");
      else if (writing_avg > speaking_avg) insights.push("Writing is your strongest skill");
      const weaker = speaking_avg < writing_avg ? "Speaking" : "Writing";
      insights.push(`${weaker} is limiting your overall band`);
    }
    if (week_delta > 0) insights.push(`You improved ${week_delta.toFixed(1)} bands recently`);
    if (week_delta < 0) insights.push(`Your band dropped ${Math.abs(week_delta).toFixed(1)} recently`);

    return (
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#0F172A" }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={() => setExpanded(false)} className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
            <span style={{ color: "#E2E8F0" }}>←</span>
          </button>
          <span className="font-display font-bold text-base" style={{ color: "#E2E8F0" }}>Band Progress</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="max-w-2xl mx-auto flex flex-col gap-5">
            {/* Filter tabs */}
            <div className="flex gap-2">
              {(["all", "speaking", "writing"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all"
                  style={{
                    background: filter === f ? "rgba(139,113,234,0.2)" : "rgba(255,255,255,0.04)",
                    color: filter === f ? "#A5B4FC" : "rgba(255,255,255,0.4)",
                    border: `1px solid ${filter === f ? "rgba(139,113,234,0.3)" : "rgba(255,255,255,0.06)"}`,
                  }}>
                  {f}
                </button>
              ))}
            </div>

            {/* Full chart */}
            <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[4, 8]} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <defs>
                    <linearGradient id="bandLineGradFull" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#8B71EA" />
                      <stop offset="100%" stopColor="#2DD4BF" />
                    </linearGradient>
                  </defs>
                  <Line type="monotone" dataKey="band" stroke="url(#bandLineGradFull)" strokeWidth={2.5} dot={{ r: 4, fill: "#8B71EA", stroke: "#1E293B", strokeWidth: 2 }} activeDot={{ r: 6, fill: "#2DD4BF" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Session history */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>Session History</div>
              <div className="flex flex-col gap-1.5">
                {filteredHistory.slice().reverse().map((h, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <span className="text-xs w-20" style={{ color: "rgba(255,255,255,0.4)" }}>{formatDate(h.scored_at)}</span>
                    <span className="text-xs capitalize px-2 py-0.5 rounded" style={{
                      background: h.skill === "speaking" ? "rgba(45,212,191,0.1)" : "rgba(139,113,234,0.1)",
                      color: h.skill === "speaking" ? "#2DD4BF" : "#8B71EA",
                    }}>{h.skill}</span>
                    <span className="flex-1" />
                    <span className="text-sm font-bold" style={{ color: "#E2E8F0" }}>Band {h.band.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Insights */}
            {insights.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: "rgba(139,113,234,0.06)", border: "1px solid rgba(139,113,234,0.1)" }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#A5B4FC" }}>Insights</div>
                {insights.map((ins, i) => (
                  <div key={i} className="flex items-center gap-2 py-1 text-sm" style={{ color: "#E2E8F0" }}>
                    <span style={{ color: "#8B71EA" }}>•</span> {ins}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Compact card
  // ---------------------------------------------------------------------------

  return (
    <button
      onClick={() => setExpanded(true)}
      className="w-full text-left rounded-2xl p-5 transition-all duration-300 group"
      style={{
        background: "linear-gradient(135deg, #0F172A, #1E293B)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 0 0 0 rgba(139,113,234,0)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 24px rgba(139,113,234,0.15)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 0 0 0 rgba(139,113,234,0)"; }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
          Band Progress
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="transition-transform duration-300 group-hover:rotate-45" style={{ color: "rgba(255,255,255,0.25)" }}>
          <line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" />
        </svg>
      </div>

      {/* Hero band */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl font-display font-bold" style={{ color: "#8B71EA" }}>
          {animatedBand.toFixed(1)}
        </span>
        <span style={{ color: "rgba(255,255,255,0.2)" }}>→</span>
        <span className="text-lg font-bold" style={{ color: "#A5B4FC" }}>
          {target_band.toFixed(1)}
        </span>
        <span className="text-base animate-pulse">🎯</span>
      </div>

      {/* Week delta */}
      <div className="mb-4 text-sm font-medium" style={{
        color: week_delta > 0 ? "#2DD4BF" : week_delta < 0 ? "#F87171" : "rgba(255,255,255,0.35)",
      }}>
        {week_delta > 0 && `+${week_delta.toFixed(1)} this week 🚀`}
        {week_delta === 0 && "No change this week"}
        {week_delta < 0 && `${week_delta.toFixed(1)} this week`}
        {week_delta >= 0.5 && <span className="ml-1">✨</span>}
      </div>

      {/* Mini sparkline */}
      {chartData.length >= 2 && (
        <div className="mb-4 -mx-1">
          <ResponsiveContainer width="100%" height={64}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <Tooltip content={<ChartTooltip />} />
              <defs>
                <linearGradient id="bandLineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8B71EA" />
                  <stop offset="100%" stopColor="#2DD4BF" />
                </linearGradient>
              </defs>
              <Line type="monotone" dataKey="band" stroke="url(#bandLineGrad)" strokeWidth={2} dot={{ r: 2, fill: "#8B71EA", stroke: "none" }} activeDot={{ r: 4, fill: "#2DD4BF" }} />
              {lastPoint && (
                <ReferenceDot x={lastPoint.date} y={lastPoint.band} r={5} fill="#2DD4BF" stroke="#0F172A" strokeWidth={2}>
                </ReferenceDot>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Skill breakdown */}
      <div className="flex flex-col gap-2 mb-4">
        {speaking_avg != null && <SkillBar label="Speaking" value={speaking_avg} max={9} color="#2DD4BF" />}
        {writing_avg != null && <SkillBar label="Writing" value={writing_avg} max={9} color="#8B71EA" />}
      </div>

      {/* Next milestone */}
      <div className="text-xs" style={{ color: "#94A3B8" }}>
        {isClose ? (
          <span style={{ color: "#A5B4FC", textShadow: "0 0 8px rgba(139,113,234,0.3)" }}>
            Almost there 👀 — +{distToNext.toFixed(1)} → Band {nextMilestone.toFixed(1)}
          </span>
        ) : (
          <span>Next: +{distToNext.toFixed(1)} → Band {nextMilestone.toFixed(1)}</span>
        )}
      </div>
    </button>
  );
}
