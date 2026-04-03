"use client";

/**
 * IeltsDiagnosticReport.tsx
 *
 * Experimental V2 results screen for IELTS speaking practice.
 * Replaces ScenarioSummary in experimental mode.
 *
 * Design principles:
 * - Polished + animated, but analytical tone (not gamified)
 * - Band ranges, not point scores
 * - Evidence-based justifications per criterion
 * - Vietnamese L1 pronunciation pattern callouts
 * - Single "#1 Priority" action
 * - Post-session accuracy check
 * - Retry same topic with comparison view
 */

import React, { useState, useEffect, useCallback } from "react";
import type {
  IeltsDiagnosticData,
  CriterionDiagnostic,
  VietnameseL1Pattern,
  BandRange,
  FeedbackAccuracy,
} from "@/lib/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function bandColor(score100: number): string {
  if (score100 >= 75) return "#34D399"; // green
  if (score100 >= 55) return "#7C5CFC"; // purple-blue
  if (score100 >= 40) return "#fbbf24"; // amber
  return "#f87171"; // red
}

function formatBand(range: BandRange): string {
  if (range.low === range.high) return range.low.toFixed(1);
  return `${range.low.toFixed(1)} – ${range.high.toFixed(1)}`;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function deltaArrow(current: number, previous: number): { symbol: string; color: string; text: string } {
  const diff = current - previous;
  if (diff > 2) return { symbol: "\u2191", color: "#34D399", text: "improved" };
  if (diff < -2) return { symbol: "\u2193", color: "#f87171", text: "declined" };
  return { symbol: "\u2192", color: "var(--color-text-secondary)", text: "stable" };
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface IeltsDiagnosticReportProps {
  diagnostic: IeltsDiagnosticData;
  /** Called when user wants to retry the same IELTS topic */
  onRetrySameTopic: () => void;
  /** Called when user wants a new topic */
  onNewTopic: () => void;
  /** Called when user is done */
  onClose: () => void;
  /** Called when accuracy feedback is submitted */
  onAccuracyFeedback?: (accuracy: FeedbackAccuracy) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function IeltsDiagnosticReport({
  diagnostic,
  onRetrySameTopic,
  onNewTopic,
  onClose,
  onAccuracyFeedback,
}: IeltsDiagnosticReportProps) {
  const [animatedScores, setAnimatedScores] = useState<number[]>(
    diagnostic.criteria.map(() => 0)
  );
  const [animatedOverall, setAnimatedOverall] = useState(0);
  const [accuracySubmitted, setAccuracySubmitted] = useState(false);
  const [selectedAccuracy, setSelectedAccuracy] = useState<FeedbackAccuracy | null>(null);

  // Animate score bars on mount
  useEffect(() => {
    const duration = 900;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

      setAnimatedScores(
        diagnostic.criteria.map((c) => Math.round(c.score100 * eased))
      );
      setAnimatedOverall(Math.round(diagnostic.overallScore100 * eased));

      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [diagnostic]);

  const handleAccuracy = useCallback((accuracy: FeedbackAccuracy) => {
    setSelectedAccuracy(accuracy);
    setAccuracySubmitted(true);
    onAccuracyFeedback?.(accuracy);
  }, [onAccuracyFeedback]);

  const hasComparison = diagnostic.previousAttempt != null;
  const hasVietnameseL1 = diagnostic.vietnameseL1.length > 0;

  return (
    <div
      style={{ background: "var(--color-bg)" }}
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto"
    >
      <div className="max-w-xl mx-auto w-full px-5 py-8 flex flex-col gap-6">

        {/* ═══ Title ═══ */}
        <h2
          className="text-xl font-sora font-bold text-center"
          style={{ color: "var(--color-text)" }}
        >
          IELTS Speaking — Diagnostic Report
        </h2>

        {/* ═══ Overall Band Range Badge ═══ */}
        <div className="flex justify-center">
          <div
            className="px-7 py-4 rounded-2xl text-center"
            style={{
              background: `${bandColor(diagnostic.overallScore100)}10`,
              border: `2px solid ${bandColor(diagnostic.overallScore100)}35`,
            }}
          >
            <div
              className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Estimated Band Range
            </div>
            <div
              className="text-3xl font-bold font-sora"
              style={{ color: bandColor(diagnostic.overallScore100) }}
            >
              {formatBand(diagnostic.overallBandRange)}
            </div>
            <div className="text-[11px] mt-1" style={{ color: "var(--color-text-secondary)" }}>
              out of 9.0
            </div>
          </div>
        </div>

        {/* ═══ Session Stats ═══ */}
        <div
          className="flex justify-center gap-8 text-center"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <div>
            <div className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
              {diagnostic.turnCount}
            </div>
            <div className="text-[11px]">turns</div>
          </div>
          <div>
            <div className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
              {diagnostic.wordCount}
            </div>
            <div className="text-[11px]">words</div>
          </div>
          <div>
            <div className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
              {formatDuration(diagnostic.durationMs)}
            </div>
            <div className="text-[11px]">duration</div>
          </div>
        </div>

        {/* ═══ Per-Criterion Diagnostic Cards ═══ */}
        <div
          className="rounded-2xl p-5 flex flex-col gap-6"
          style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
        >
          <div
            className="text-[11px] font-bold uppercase tracking-[0.12em]"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Criterion Analysis
          </div>

          {diagnostic.criteria.map((criterion, i) => (
            <CriterionCard
              key={criterion.label}
              criterion={criterion}
              animatedScore={animatedScores[i] ?? 0}
              previousScore={
                hasComparison
                  ? diagnostic.previousAttempt!.criteria.find(
                      (c) => c.label === criterion.label
                    )?.score100 ?? null
                  : null
              }
            />
          ))}
        </div>

        {/* ═══ Vietnamese L1 Pronunciation Patterns ═══ */}
        {hasVietnameseL1 && (
          <div
            className="rounded-2xl p-5"
            style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className="text-[11px] font-bold uppercase tracking-[0.12em]"
                style={{ color: "#f59e0b" }}
              >
                Vietnamese Speaker Patterns Detected
              </div>
            </div>
            <p className="text-[12px] mb-4 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              These patterns are common for Vietnamese speakers and directly affect your IELTS scores.
              Targeted practice on these specific sounds produces the fastest improvement.
            </p>

            <div className="flex flex-col gap-4">
              {diagnostic.vietnameseL1.map((pattern, i) => (
                <VietnamesePatternCard key={i} pattern={pattern} />
              ))}
            </div>
          </div>
        )}

        {/* ═══ Speech Flow Insights ═══ */}
        {diagnostic.speechInsights && diagnostic.speechInsights.hesitationLevel !== "unknown" && (
          <div
            className="rounded-2xl p-5"
            style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
          >
            <div
              className="text-[11px] font-bold uppercase tracking-[0.12em] mb-3"
              style={{ color: "var(--color-primary)" }}
            >
              Speaking Flow Analysis
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FlowMetric
                label="Hesitation"
                value={
                  diagnostic.speechInsights.hesitationLevel === "low" ? "Low" :
                  diagnostic.speechInsights.hesitationLevel === "medium" ? "Moderate" : "High"
                }
                color={
                  diagnostic.speechInsights.hesitationLevel === "low" ? "#34D399" :
                  diagnostic.speechInsights.hesitationLevel === "medium" ? "#fbbf24" : "#f87171"
                }
              />
              {diagnostic.speechInsights.avgWordsPerMinute != null && (
                <FlowMetric label="Speaking Rate" value={`${diagnostic.speechInsights.avgWordsPerMinute} wpm`} />
              )}
              {diagnostic.speechInsights.totalFillerCount > 0 && (
                <FlowMetric
                  label="Filler Words"
                  value={`${diagnostic.speechInsights.totalFillerCount} detected`}
                  color="#fbbf24"
                />
              )}
              {diagnostic.speechInsights.totalSelfCorrections > 0 && (
                <FlowMetric
                  label="Self-corrections"
                  value={String(diagnostic.speechInsights.totalSelfCorrections)}
                />
              )}
            </div>
          </div>
        )}

        {/* ═══ #1 Priority Action ═══ */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: `${bandColor(diagnostic.overallScore100)}08`,
            border: `1px solid ${bandColor(diagnostic.overallScore100)}25`,
          }}
        >
          <div
            className="text-[11px] font-bold uppercase tracking-[0.12em] mb-2"
            style={{ color: bandColor(diagnostic.overallScore100) }}
          >
            #1 Priority for Next Session
          </div>
          <p
            className="text-[14px] leading-relaxed"
            style={{ color: "var(--color-text)" }}
          >
            {diagnostic.topPriority}
          </p>
        </div>

        {/* ═══ Vocabulary Analysis ═══ */}
        {(diagnostic.notableVocabulary.length > 0 || diagnostic.improvementVocabulary.length > 0) && (
          <div
            className="rounded-2xl p-5"
            style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
          >
            <div
              className="text-[11px] font-bold uppercase tracking-[0.12em] mb-3"
              style={{ color: "var(--color-primary)" }}
            >
              Vocabulary Analysis
            </div>

            {diagnostic.notableVocabulary.length > 0 && (
              <div className="mb-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#34D399" }}>
                  Strong Usage
                </div>
                <div className="flex flex-wrap gap-2">
                  {diagnostic.notableVocabulary.map((word, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-full text-[12px] font-medium"
                      style={{ background: "rgba(52, 211, 153, 0.1)", color: "#34D399", border: "1px solid rgba(52, 211, 153, 0.2)" }}
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {diagnostic.improvementVocabulary.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#fbbf24" }}>
                  Overused / Weak
                </div>
                <div className="flex flex-wrap gap-2">
                  {diagnostic.improvementVocabulary.map((word, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-full text-[12px] font-medium"
                      style={{ background: "rgba(251, 191, 36, 0.1)", color: "#fbbf24", border: "1px solid rgba(251, 191, 36, 0.2)" }}
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ Attempt Comparison (only on retry) ═══ */}
        {hasComparison && (
          <div
            className="rounded-2xl p-5"
            style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
          >
            <div
              className="text-[11px] font-bold uppercase tracking-[0.12em] mb-4"
              style={{ color: "#7C5CFC" }}
            >
              Attempt Comparison
            </div>

            <div className="flex flex-col gap-3">
              {/* Overall */}
              <ComparisonRow
                label="Overall"
                current={diagnostic.overallBandRange}
                previous={diagnostic.previousAttempt!.overallBandRange}
                currentScore={diagnostic.overallScore100}
                previousScore={
                  diagnostic.previousAttempt!.criteria.reduce((s, c) => s + c.score100, 0) /
                  Math.max(diagnostic.previousAttempt!.criteria.length, 1)
                }
              />

              {/* Per-criterion */}
              {diagnostic.criteria.map((c) => {
                const prev = diagnostic.previousAttempt!.criteria.find(
                  (p) => p.label === c.label
                );
                if (!prev) return null;
                return (
                  <ComparisonRow
                    key={c.label}
                    label={c.label.replace("& ", "& ")}
                    current={c.bandRange}
                    previous={prev.bandRange}
                    currentScore={c.score100}
                    previousScore={prev.score100}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ Turn Tips (only worst 3) ═══ */}
        {diagnostic.turnFeedback.length > 0 && (
          <div
            className="rounded-2xl p-5"
            style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
          >
            <div
              className="text-[11px] font-bold uppercase tracking-[0.12em] mb-3"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Turn-by-Turn Notes
            </div>
            <div className="flex flex-col gap-3">
              {diagnostic.turnFeedback.slice(0, 3).map((tf, i) => (
                <div key={i} className="flex gap-2.5 items-start">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                    style={{ background: "var(--color-primary-soft)", color: "var(--color-primary)" }}
                  >
                    {tf.turnIndex}
                  </div>
                  <p className="text-[12px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                    {tf.tip}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ Feedback Accuracy Check ═══ */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
        >
          <div
            className="text-[12px] font-medium text-center mb-3"
            style={{ color: "var(--color-text)" }}
          >
            How accurate does this feedback feel?
          </div>

          {!accuracySubmitted ? (
            <div className="flex gap-2 justify-center">
              {([
                { value: "too_generous" as FeedbackAccuracy, label: "Too generous" },
                { value: "about_right" as FeedbackAccuracy, label: "About right" },
                { value: "too_harsh" as FeedbackAccuracy, label: "Too harsh" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleAccuracy(opt.value)}
                  className="px-4 py-2 rounded-xl text-[12px] font-medium transition duration-200 hover:scale-[1.02]"
                  style={{
                    background: "var(--color-primary-soft)",
                    color: "var(--color-text)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center">
              <span className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>
                Recorded: {selectedAccuracy === "too_generous" ? "Too generous" : selectedAccuracy === "about_right" ? "About right" : "Too harsh"}
                {" "}&mdash; thank you
              </span>
            </div>
          )}
        </div>

        {/* ═══ Action Buttons ═══ */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onRetrySameTopic}
            style={{ background: "var(--color-primary)", color: "#fff" }}
            className="w-full py-3.5 rounded-xl font-semibold text-[14px] hover:opacity-90 transition-opacity"
          >
            Retry Same Topic &mdash; Compare Attempts
          </button>

          <div className="flex gap-3">
            <button
              onClick={onNewTopic}
              className="flex-1 py-3 rounded-xl font-medium text-[13px] transition duration-200 hover:scale-[1.01]"
              style={{
                background: "var(--color-bg-card)",
                color: "var(--color-text)",
                border: "1px solid var(--color-border)",
              }}
            >
              New Topic
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-medium text-[13px] transition duration-200 hover:scale-[1.01]"
              style={{
                background: "var(--color-bg-card)",
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border)",
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function CriterionCard({
  criterion,
  animatedScore,
  previousScore,
}: {
  criterion: CriterionDiagnostic;
  animatedScore: number;
  previousScore: number | null;
}) {
  const color = bandColor(criterion.score100);
  const delta = previousScore != null ? deltaArrow(criterion.score100, previousScore) : null;

  // Convert 0-100 to band-relative percentage (band 1-9 → 0%-100%)
  // This prevents users from seeing "30/100" and thinking they scored 30%
  const bandMidpoint = (criterion.bandRange.low + criterion.bandRange.high) / 2;
  const bandPercent = Math.round(((bandMidpoint - 1) / 8) * 100); // 1→0%, 5→50%, 9→100%
  // Animated version: scale the band percent by animation progress
  const animProgress = criterion.score100 > 0 ? animatedScore / criterion.score100 : 0;
  const animatedBandPercent = Math.round(bandPercent * animProgress);

  return (
    <div>
      {/* Header: label + band range */}
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[13px] font-semibold" style={{ color: "var(--color-text)" }}>
          {criterion.label}
        </span>
        <div className="flex items-center gap-2">
          {delta && (
            <span className="text-[11px] font-medium" style={{ color: delta.color }}>
              {delta.symbol}
            </span>
          )}
          <span className="text-[13px] font-bold" style={{ color }}>
            Band {formatBand(criterion.bandRange)}
          </span>
        </div>
      </div>

      {/* Band position bar — represents position on 1-9 IELTS scale, NOT a percentage */}
      <div className="relative mb-2">
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
          <div
            className="h-full rounded-full transition duration-700"
            style={{ width: `${animatedBandPercent}%`, background: color }}
          />
        </div>
        {/* Scale markers: bands 3, 5, 7 */}
        <div className="flex justify-between mt-0.5 px-0.5">
          <span className="text-[8px]" style={{ color: "var(--color-text-muted)" }}>1</span>
          <span className="text-[8px]" style={{ color: "var(--color-text-muted)" }}>5</span>
          <span className="text-[8px]" style={{ color: "var(--color-text-muted)" }}>9</span>
        </div>
      </div>

      {/* Justification */}
      <p className="text-[12px] leading-relaxed mb-1" style={{ color: "var(--color-text-secondary)" }}>
        {criterion.justification}
      </p>

      {/* Action */}
      <p className="text-[11px] leading-relaxed" style={{ color }}>
        {criterion.action}
      </p>

      {/* Vietnamese L1 tag */}
      {criterion.l1Tag && (
        <span
          className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-medium"
          style={{ background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.2)" }}
        >
          Vietnamese speaker pattern
        </span>
      )}
    </div>
  );
}

function VietnamesePatternCard({ pattern }: { pattern: VietnameseL1Pattern }) {
  return (
    <div
      className="rounded-xl p-3"
      style={{ background: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.15)" }}
    >
      <div className="text-[12px] font-semibold mb-1" style={{ color: "#f59e0b" }}>
        {pattern.label}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {pattern.words.map((w, i) => (
          <span
            key={i}
            className="px-2 py-0.5 rounded text-[11px] font-medium"
            style={{ background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b" }}
          >
            {w}
          </span>
        ))}
      </div>
      <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
        {pattern.suggestion}
      </p>
    </div>
  );
}

function FlowMetric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </span>
      <span className="text-[13px] font-semibold" style={{ color: color || "var(--color-text)" }}>
        {value}
      </span>
    </div>
  );
}

function ComparisonRow({
  label,
  current,
  previous,
  currentScore,
  previousScore,
}: {
  label: string;
  current: BandRange;
  previous: BandRange;
  currentScore: number;
  previousScore: number;
}) {
  const delta = deltaArrow(currentScore, previousScore);
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] w-28 truncate" style={{ color: "var(--color-text-secondary)" }}>
        {label}
      </span>
      <span className="text-[11px] w-16 text-right" style={{ color: "var(--color-text-muted)" }}>
        {formatBand(previous)}
      </span>
      <span className="text-[13px] font-bold" style={{ color: delta.color }}>
        {delta.symbol}
      </span>
      <span className="text-[11px] w-16 font-semibold" style={{ color: bandColor(currentScore) }}>
        {formatBand(current)}
      </span>
      <span className="text-[10px] flex-1" style={{ color: delta.color }}>
        {delta.text}
      </span>
    </div>
  );
}
