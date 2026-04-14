"use client";

/**
 * SpeakingMetrics.tsx
 *
 * Displays 30-day pronunciation score trend with summary stats.
 * SVG line chart — no charting library dependency.
 *
 * Shows:
 *  - Stat cards: Recent score / Average / Best / Total attempts
 *  - Line chart: daily average score over last 30 days
 *  - Empty state when no attempts yet
 */

import type { SpeakingMetricsData, MetricDay } from "@/lib/types";
import Mascot from "@/components/ui/Mascot";

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      className="flex flex-col items-center gap-1 flex-1 rounded-xl p-3"
      style={{
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border)",
      }}
    >
      <span
        className="text-xl font-bold font-sora"
        style={{ color: color || "var(--color-primary)" }}
      >
        {value}
      </span>
      <span
        className="text-xs text-center leading-tight"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SVG line chart
// ---------------------------------------------------------------------------

const CHART_W = 320;
const CHART_H = 100;
const PAD     = { top: 10, right: 8, bottom: 20, left: 28 };

function ScoreLineChart({ trend }: { trend: MetricDay[] }) {
  if (trend.length < 2) return null;

  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;

  const scores = trend.map((d) => d.avgScore);
  const minScore = Math.max(0,   Math.min(...scores) - 10);
  const maxScore = Math.min(100, Math.max(...scores) + 10);

  const xOf = (i: number) => PAD.left + (i / (trend.length - 1)) * innerW;
  const yOf = (s: number) =>
    PAD.top + innerH - ((s - minScore) / (maxScore - minScore)) * innerH;

  // Path
  const pathD = trend
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xOf(i).toFixed(1)},${yOf(d.avgScore).toFixed(1)}`)
    .join(" ");

  // Area fill
  const areaD =
    pathD +
    ` L ${xOf(trend.length - 1).toFixed(1)},${(PAD.top + innerH).toFixed(1)}` +
    ` L ${PAD.left},${(PAD.top + innerH).toFixed(1)} Z`;

  // Y-axis labels
  const yLabels = [minScore, Math.round((minScore + maxScore) / 2), maxScore];

  // X-axis: show first and last date labels
  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="w-full"
      style={{ height: CHART_H }}
      aria-label="Pronunciation score trend chart"
    >
      {/* Grid lines */}
      {yLabels.map((v) => (
        <line
          key={v}
          x1={PAD.left}
          x2={CHART_W - PAD.right}
          y1={yOf(v)}
          y2={yOf(v)}
          stroke="var(--color-border)"
          strokeWidth="0.5"
          strokeDasharray="3 3"
        />
      ))}

      {/* Y-axis labels */}
      {yLabels.map((v) => (
        <text
          key={v}
          x={PAD.left - 4}
          y={yOf(v) + 4}
          textAnchor="end"
          fontSize="8"
          fill="var(--color-text-secondary)"
        >
          {Math.round(v)}
        </text>
      ))}

      {/* X-axis labels (first + last) */}
      <text
        x={xOf(0)}
        y={CHART_H - 4}
        textAnchor="middle"
        fontSize="8"
        fill="var(--color-text-secondary)"
      >
        {fmtDate(trend[0].date)}
      </text>
      <text
        x={xOf(trend.length - 1)}
        y={CHART_H - 4}
        textAnchor="middle"
        fontSize="8"
        fill="var(--color-text-secondary)"
      >
        {fmtDate(trend[trend.length - 1].date)}
      </text>

      {/* Area fill */}
      <path
        d={areaD}
        fill="var(--color-primary)"
        fillOpacity="0.08"
      />

      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {trend.map((d, i) => (
        <circle
          key={d.date}
          cx={xOf(i)}
          cy={yOf(d.avgScore)}
          r="2.5"
          fill="var(--color-primary)"
        />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface SpeakingMetricsProps {
  data:    SpeakingMetricsData;
  loading: boolean;
}

export default function SpeakingMetrics({ data, loading }: SpeakingMetricsProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div
          className="w-6 h-6 border-2 rounded-full animate-spin"
          style={{
            borderColor: "var(--color-border)",
            borderTopColor: "var(--color-primary)",
          }}
        />
      </div>
    );
  }

  // No attempts yet
  if (data.totalAttempts === 0) {
    return (
      <div
        className="rounded-lg p-6 flex flex-col items-center gap-3 text-center"
        style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
        }}
      >
        <Mascot size={64} className="opacity-70" />
        <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
          Chưa có bài Speaking nào
        </p>
        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Hoàn thành bài luyện Speaking để xem xu hướng điểm tại đây 🐙
        </p>
      </div>
    );
  }

  const recentColor =
    data.recentScore !== null && data.recentScore >= 80
      ? "var(--color-success, #4ade80)"
      : data.recentScore !== null && data.recentScore >= 60
      ? "var(--color-primary)"
      : "var(--color-warning, #f59e0b)";

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h2
          className="text-base font-semibold font-sora"
          style={{ color: "var(--color-text)" }}
        >
          Speaking Progress
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
          Last 30 days
        </p>
      </div>

      {/* Stat cards */}
      <div className="flex gap-2">
        <StatCard
          label="Recent"
          value={data.recentScore !== null ? `${data.recentScore}` : "—"}
          color={recentColor}
        />
        <StatCard label="Average" value={`${data.averageScore}`} />
        <StatCard label="Best" value={`${data.bestScore}`} color="var(--color-success, #4ade80)" />
        <StatCard label="Sessions" value={`${data.totalAttempts}`} color="var(--color-text-secondary)" />
      </div>

      {/* Chart */}
      {data.trend.length >= 2 && (
        <div
          className="rounded-lg p-4"
          style={{
            background: "var(--color-bg-card)",
            border: "1px solid var(--color-border)",
          }}
        >
          <p
            className="text-xs font-medium mb-3 uppercase tracking-wider"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Score trend
          </p>
          <ScoreLineChart trend={data.trend} />
        </div>
      )}

      {/* Single day — no chart yet */}
      {data.trend.length === 1 && (
        <p
          className="text-xs text-center py-2"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Practice more sessions to see your score trend 📈
        </p>
      )}
    </div>
  );
}
