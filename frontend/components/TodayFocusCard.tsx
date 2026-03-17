"use client";

/**
 * TodayFocusCard.tsx
 *
 * Homepage coach card — shows 1–2 personalised "Today's Focus" recommendations.
 * Shows a minimal positive empty state when the user has no weak spots.
 *
 * Design principles:
 *  - Scannable in under 3 seconds
 *  - Each row: label pill → headline → one-liner → action button
 *  - No score numbers visible at first glance — description has them subtly
 *  - Colour-coded labels so users pattern-match quickly across sessions
 */

import type { FocusRecommendation, FocusType } from "@/lib/types";

// ---------------------------------------------------------------------------
// Label pill — colour-coded by recommendation type
// ---------------------------------------------------------------------------

const LABEL_STYLES: Record<FocusType, { bg: string; color: string }> = {
  first_lesson:  { bg: "var(--color-success-bg, rgba(74,222,128,0.12))",  color: "var(--color-success, #4ade80)"  },
  pronunciation: { bg: "rgba(245,158,11,0.12)",                           color: "#f59e0b"                        },
  scenario:      { bg: "var(--color-primary-bg, rgba(99,102,241,0.12))",  color: "var(--color-primary)"           },
  ielts:         { bg: "rgba(167,139,250,0.12)",                          color: "#a78bfa"                        },
};

function LabelPill({ type, label }: { type: FocusType; label: string }) {
  const style = LABEL_STYLES[type] ?? LABEL_STYLES.scenario;
  return (
    <span
      className="inline-block text-[9px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5"
      style={{ background: style.bg, color: style.color }}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Individual recommendation row
// ---------------------------------------------------------------------------

function RecommendationRow({
  rec,
  onAction,
}: {
  rec:      FocusRecommendation;
  onAction: (rec: FocusRecommendation) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      {/* Text content */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <LabelPill type={rec.type} label={rec.label} />
        <p
          className="text-sm font-semibold leading-snug"
          style={{ color: "var(--color-text)" }}
        >
          {rec.title}
        </p>
        <p
          className="text-xs leading-snug"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {rec.description}
        </p>
      </div>

      {/* Action button */}
      <button
        onClick={() => onAction(rec)}
        className="shrink-0 flex items-center gap-1 text-xs font-semibold rounded-lg px-3 py-1.5 transition-all active:scale-95"
        style={{
          background: "var(--color-primary)",
          color:      "#fff",
        }}
      >
        {rec.actionLabel}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden="true"
        >
          <path d="M2 5h6M6 3l2 2-2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface TodayFocusCardProps {
  recommendations: FocusRecommendation[];
  loading:         boolean;
  /** Called when the user taps an action button — receives the full recommendation */
  onAction:        (rec: FocusRecommendation) => void;
}

export default function TodayFocusCard({
  recommendations,
  loading,
  onAction,
}: TodayFocusCardProps) {
  // Hide card entirely while the initial fetch is in-flight (no flash)
  if (loading) return null;

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{
        background: "var(--color-bg-card)",
        border:     "1px solid var(--color-border)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <span aria-hidden="true" className="text-base leading-none">🎯</span>
        <h2
          className="text-sm font-semibold font-sora"
          style={{ color: "var(--color-text)" }}
        >
          Today&apos;s Focus
        </h2>
      </div>

      {/* Positive empty state when the user has no weak spots */}
      {recommendations.length === 0 && (
        <p
          className="text-xs leading-relaxed"
          style={{ color: "var(--color-text-secondary)" }}
        >
          You&apos;re doing great today! Keep practicing to maintain your streak.
        </p>
      )}

      {/* Recommendation rows — separated by a subtle divider if there are 2 */}
      {recommendations.map((rec, i) => (
        <div key={rec.type}>
          {i > 0 && (
            <div
              className="h-px mb-3"
              style={{ background: "var(--color-border)" }}
            />
          )}
          <RecommendationRow rec={rec} onAction={onAction} />
        </div>
      ))}
    </div>
  );
}
