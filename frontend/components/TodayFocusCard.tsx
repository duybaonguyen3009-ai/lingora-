"use client";

import Card from "@/components/ui/Card";
import type { FocusRecommendation, FocusType } from "@/lib/types";

const LABEL_STYLES: Record<FocusType, { bg: string; color: string }> = {
  first_lesson:  { bg: "rgba(34,197,94,0.10)",      color: "#22C55E"   },
  pronunciation: { bg: "rgba(245,158,11,0.10)",      color: "#F59E0B"   },
  scenario:      { bg: "rgba(0,168,150,0.10)",       color: "#00A896"   },
  ielts:         { bg: "rgba(27,43,75,0.08)",        color: "#1B2B4B"   },
};

function LabelPill({ type, label }: { type: FocusType; label: string }) {
  const style = LABEL_STYLES[type] ?? LABEL_STYLES.scenario;
  return (
    <span
      className="inline-block text-xs font-bold uppercase tracking-widest rounded-full px-2.5 py-0.5"
      style={{ background: style.bg, color: style.color }}
    >
      {label}
    </span>
  );
}

function RecommendationRow({
  rec,
  onAction,
}: {
  rec:      FocusRecommendation;
  onAction: (rec: FocusRecommendation) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <LabelPill type={rec.type} label={rec.label} />
        <p
          className="text-base font-semibold leading-snug"
          style={{ color: "var(--color-text)" }}
        >
          {rec.title}
        </p>
        <p
          className="text-sm leading-snug"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {rec.description}
        </p>
      </div>

      <button
        onClick={() => onAction(rec)}
        className="shrink-0 flex items-center gap-1 text-sm font-semibold rounded-full px-4 py-2 transition-all active:scale-95"
        style={{
          background: "linear-gradient(135deg, #00A896, #00C4B0)",
          color:      "#fff",
          boxShadow:  "0 2px 8px rgba(0,168,150,0.25)",
        }}
      >
        {rec.actionLabel}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M2 5h6M6 3l2 2-2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

interface TodayFocusCardProps {
  recommendations: FocusRecommendation[];
  loading:         boolean;
  onAction:        (rec: FocusRecommendation) => void;
}

export default function TodayFocusCard({
  recommendations,
  loading,
  onAction,
}: TodayFocusCardProps) {
  if (loading) return null;

  return (
    <Card
      padding="lg"
      className="flex flex-col gap-4"
      style={{
        borderLeft: "4px solid #00A896",
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(0,168,150,0.10)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00A896" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
          </svg>
        </div>
        <h2
          className="text-base font-semibold font-display"
          style={{ color: "var(--color-text)" }}
        >
          Today&apos;s Focus
        </h2>
      </div>

      {recommendations.length === 0 && (
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--color-text-secondary)" }}
        >
          You&apos;re doing great today! Keep practicing to maintain your streak.
        </p>
      )}

      {recommendations.map((rec, i) => (
        <div key={rec.type}>
          {i > 0 && (
            <div
              className="h-px mb-4"
              style={{ background: "var(--color-border)" }}
            />
          )}
          <RecommendationRow rec={rec} onAction={onAction} />
        </div>
      ))}
    </Card>
  );
}
