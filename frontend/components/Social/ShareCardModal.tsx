"use client";

/**
 * ShareCardModal.tsx — Progress share card generator.
 *
 * Shows template selector, HTML preview card, and download/share buttons.
 * Uses html2canvas for client-side image capture.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { getShareCardPreviewData, generateShareCard } from "@/lib/api";
import type { ShareCardStats } from "@/lib/types";

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TemplateKey = "streak_flex" | "weekly_grind" | "band_progress" | "squad_win";

const TEMPLATES: { key: TemplateKey; emoji: string; label: string }[] = [
  { key: "streak_flex", emoji: "🔥", label: "Streak" },
  { key: "weekly_grind", emoji: "💪", label: "Tuần này" },
  { key: "band_progress", emoji: "🎯", label: "Band" },
  { key: "squad_win", emoji: "🏆", label: "Thành tích" },
];

// ---------------------------------------------------------------------------
// Card Preview (HTML rendered)
// ---------------------------------------------------------------------------

function CardPreview({ template, stats }: { template: TemplateKey; stats: ShareCardStats }) {
  const base = "w-full rounded-xl p-6 text-center";
  const bg = "#1B2B4B";
  const brand = <div className="flex items-center justify-center gap-1.5 mt-4"><img src="/mascot.svg" alt="" width={20} height={20} /><span className="text-xs font-medium" style={{ color: "rgba(0,168,150,0.9)" }}>Lingona · lingona.app</span></div>;

  if (template === "streak_flex") {
    return (
      <div className={base} style={{ background: bg }}>
        <div className="text-5xl font-bold mb-1" style={{ color: "#F59E0B", textShadow: "0 0 20px rgba(245,158,11,0.3)" }}>{stats.streak}</div>
        <div className="text-base font-medium mb-3" style={{ color: "#F59E0B" }}>ngày liên tiếp 🔥</div>
        <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>{stats.weeklyXp} XP tuần này · Level {stats.level}</div>
        {brand}
      </div>
    );
  }

  if (template === "weekly_grind") {
    return (
      <div className={base} style={{ background: bg }}>
        <div className="flex justify-center gap-8 mb-3">
          <div><div className="text-3xl font-bold" style={{ color: "#00A896" }}>{stats.speakingSessionsThisWeek}</div><div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Speaking</div></div>
          <div><div className="text-3xl font-bold" style={{ color: "#F59E0B" }}>{stats.writingTasksThisWeek}</div><div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Writing</div></div>
        </div>
        <div className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.7)" }}>+{stats.weeklyXp} XP tuần này</div>
        {stats.weeklyRank && <div className="text-xs mb-1" style={{ color: "#00A896" }}>Hạng #{stats.weeklyRank}</div>}
        {brand}
      </div>
    );
  }

  if (template === "band_progress") {
    return (
      <div className={base} style={{ background: bg }}>
        <div className="text-4xl font-bold mb-1" style={{ color: "#00C4B0" }}>{stats.predictedBand?.toFixed(1) ?? "—"}</div>
        <div className="text-sm mb-3" style={{ color: "rgba(255,255,255,0.6)" }}>Band dự đoán</div>
        <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Level {stats.level} · {stats.totalXp.toLocaleString()} XP</div>
        <div className="text-xs mb-1" style={{ color: "#F59E0B" }}>Tiếp tục luyện nhé! 🐙</div>
        {brand}
      </div>
    );
  }

  // squad_win
  return (
    <div className={base} style={{ background: bg }}>
      <div className="text-3xl mb-2">🏆</div>
      <div className="text-lg font-bold mb-1" style={{ color: "#fff" }}>{stats.displayName}</div>
      <div className="flex justify-center gap-6 mb-3">
        <div><span className="text-xl font-bold" style={{ color: "#F59E0B" }}>{stats.streak}</span><span className="text-xs ml-1" style={{ color: "rgba(255,255,255,0.5)" }}>streak</span></div>
        <div><span className="text-xl font-bold" style={{ color: "#00A896" }}>{stats.weeklyXp}</span><span className="text-xs ml-1" style={{ color: "rgba(255,255,255,0.5)" }}>XP/tuần</span></div>
      </div>
      {brand}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export default function ShareCardModal({ isOpen, onClose }: ShareCardModalProps) {
  const [stats, setStats] = useState<ShareCardStats | null>(null);
  const [template, setTemplate] = useState<TemplateKey>("streak_flex");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setGenerated(false);
    getShareCardPreviewData().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, [isOpen]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      await generateShareCard({ templateKey: template });
      setGenerated(true);
    } catch { /* silent */ }
    setGenerating(false);
  }, [template]);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 2 });
      const link = document.createElement("a");
      link.download = `lingona-${template}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch { /* silent */ }
  }, [template]);

  const handleShare = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 2 });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `lingona-${template}.png`, { type: "image/png" });
        if (navigator.share) {
          await navigator.share({ files: [file], title: "My Lingona Progress" });
        }
      });
    } catch { /* silent */ }
  }, [template]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-sheet flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-t-2xl px-5 py-5 max-h-[85vh] overflow-y-auto" style={{ background: "var(--color-bg-card)", borderTop: "1px solid var(--color-border)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold" style={{ color: "var(--color-text)" }}>Share Progress</h3>
          <button onClick={onClose} className="text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>Close</button>
        </div>

        {/* Template selector */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-1 px-1">
          {TEMPLATES.map((t) => (
            <button key={t.key} onClick={() => { setTemplate(t.key); setGenerated(false); }}
              className="px-3 py-2 rounded-lg text-sm font-medium shrink-0 transition-all"
              style={{
                background: template === t.key ? "rgba(0,168,150,0.15)" : "var(--color-bg-secondary)",
                color: template === t.key ? "#00A896" : "var(--color-text-secondary)",
                border: `1px solid ${template === t.key ? "rgba(0,168,150,0.3)" : "var(--color-border)"}`,
              }}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {/* Preview */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }} />
          </div>
        ) : stats ? (
          <div ref={cardRef} className="mb-4">
            <CardPreview template={template} stats={stats} />
          </div>
        ) : (
          <p className="text-sm text-center py-8" style={{ color: "var(--color-text-secondary)" }}>Could not load stats</p>
        )}

        {/* Actions */}
        {stats && !generated && (
          <button onClick={handleGenerate} disabled={generating} className="w-full py-2.5 rounded-lg text-sm font-semibold mb-2 disabled:opacity-50" style={{ background: "#00A896", color: "#fff" }}>
            {generating ? "Generating..." : "Generate Card"}
          </button>
        )}

        {generated && (
          <div className="flex gap-2">
            <button onClick={handleDownload} className="flex-1 py-2.5 rounded-lg text-sm font-semibold" style={{ background: "var(--color-bg-secondary)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}>
              📥 Download
            </button>
            {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
              <button onClick={handleShare} className="flex-1 py-2.5 rounded-lg text-sm font-semibold" style={{ background: "#1877F2", color: "#fff" }}>
                📤 Share
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
