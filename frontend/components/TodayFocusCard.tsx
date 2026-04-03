"use client";

import Card from "@/components/ui/Card";
import type { FocusRecommendation, FocusType } from "@/lib/types";

const LABEL_STYLES: Record<FocusType, { bg: string; color: string }> = {
  first_lesson:  { bg: "rgba(74,222,128,0.12)",    color: "var(--color-success)"   },
  pronunciation: { bg: "rgba(245,158,11,0.12)",     color: "var(--color-warning)"   },
  scenario:      { bg: "rgba(124,92,252,0.12)",     color: "var(--color-primary)" },
  ielts:         { bg: "rgba(167,139,250,0.12)",    color: "var(--color-examiner)"   },
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
        className="shrink-0 flex items-center gap-1 text-sm font-semibold rounded-xl px-4 py-2 transition active:scale-95"
        style={{
          background: "var(--color-primary)",
          color:      "#fff",
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
    <Card padding="lg" className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="text-lg leading-none">🎯</span>
        <h2
          className="text-base font-semibold font-sora"
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
