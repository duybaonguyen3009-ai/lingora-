"use client";

import React, { useState, useEffect } from "react";
import type { EndSessionResult, CriteriaFeedback } from "@/lib/types";

interface ScenarioSummaryProps {
  result: EndSessionResult;
  onClose: () => void;
}

function scoreColor(score: number): string {
  if (score >= 80) return "#34D399";
  if (score >= 60) return "#fbbf24";
  return "#f87171";
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export default function ScenarioSummary({ result, onClose }: ScenarioSummaryProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const target = result.overallScore;
    const duration = 800;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [result.overallScore]);

  const subScores = [
    { label: "Fluency & Coherence", value: result.fluency },
    { label: "Lexical Resource", value: result.vocabulary },
    { label: "Grammar Range & Accuracy", value: result.grammar },
    { label: "Pronunciation", value: result.pronunciation ?? result.fluency },
  ];

  const hasBandScore = result.bandScore != null && result.bandScore > 0;
  const hasVocabulary = result.notableVocabulary && result.notableVocabulary.length > 0;
  const hasImprovementVocab = result.improvementVocabulary && result.improvementVocabulary.length > 0;
  const hasCriteriaFeedback = result.criteriaFeedback != null;

  // Map sub-score keys to criteria feedback keys
  const criteriaKeys: Record<string, keyof NonNullable<typeof result.criteriaFeedback>> = {
    "Fluency & Coherence": "fluency",
    "Lexical Resource": "vocabulary",
    "Grammar Range & Accuracy": "grammar",
    "Pronunciation": "pronunciation",
  };

  return (
    <div
      style={{ background: "var(--color-bg)" }}
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto"
    >
      <div className="max-w-xl mx-auto w-full px-5 py-8 flex flex-col gap-7">
        {/* Title */}
        <h2
          className="text-xl font-sora font-bold text-center"
          style={{ color: "var(--color-text)" }}
        >
          {hasBandScore ? "IELTS Speaking — Results" : "Session Complete!"}
        </h2>

        {/* IELTS Band Score Badge */}
        {hasBandScore && (
          <div className="flex justify-center">
            <div
              className="px-6 py-3 rounded-2xl text-center"
              style={{
                background: `${scoreColor(result.overallScore)}15`,
                border: `2px solid ${scoreColor(result.overallScore)}40`,
              }}
            >
              <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-secondary)" }}>
                Estimated Band Score
              </div>
              <div className="text-3xl font-bold" style={{ color: scoreColor(result.overallScore) }}>
                {result.bandScore!.toFixed(1)}
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                out of 9.0
              </div>
            </div>
          </div>
        )}

        {/* Animated score circle */}
        <div className="flex justify-center">
          <div
            className="w-36 h-36 rounded-full flex items-center justify-center"
            style={{
              border: `4px solid ${scoreColor(result.overallScore)}`,
              background: "var(--color-bg-card)",
              boxShadow: `0 0 24px ${scoreColor(result.overallScore)}25`,
            }}
          >
            <div className="text-center">
              <div
                className="text-4xl font-bold"
                style={{ color: scoreColor(result.overallScore) }}
              >
                {animatedScore}
              </div>
              <div className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
                / 100
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div
          className="flex justify-center gap-8 text-center"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <div>
            <div className="text-lg font-bold" style={{ color: "var(--color-text)" }}>{result.turnCount}</div>
            <div className="text-[12px]">turns</div>
          </div>
          <div>
            <div className="text-lg font-bold" style={{ color: "var(--color-text)" }}>{result.wordCount}</div>
            <div className="text-[12px]">words</div>
          </div>
          <div>
            <div className="text-lg font-bold" style={{ color: "var(--color-text)" }}>{formatDuration(result.durationMs)}</div>
            <div className="text-[12px]">duration</div>
          </div>
        </div>

        {/* Sub-score bars with per-criterion feedback */}
        <div
          className="rounded-2xl p-5 flex flex-col gap-5"
          style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
        >
          {subScores.map((s) => {
            const criteriaKey = criteriaKeys[s.label];
            const feedback = hasCriteriaFeedback && criteriaKey
              ? (result.criteriaFeedback as CriteriaFeedback)[criteriaKey]
              : null;

            return (
              <div key={s.label}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-[13px] font-medium" style={{ color: "var(--color-text)" }}>{s.label}</span>
                  <span className="text-[13px] font-bold" style={{ color: scoreColor(s.value) }}>{s.value}</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${s.value}%`, background: scoreColor(s.value) }}
                  />
                </div>
                {feedback && (
                  <p className="text-[12px] mt-1.5 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                    {feedback}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Speech Flow Insights */}
        {result.speechInsights && result.speechInsights.hesitationLevel !== "unknown" && (
          <div
            className="rounded-2xl p-5"
            style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
          >
            <div className="text-[12px] font-bold mb-3" style={{ color: "var(--color-primary)" }}>
              Speaking Flow
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* Hesitation */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Hesitation</span>
                <span className={`text-[14px] font-semibold ${
                  result.speechInsights.hesitationLevel === "low" ? "text-emerald-400" :
                  result.speechInsights.hesitationLevel === "medium" ? "text-amber-400" :
                  "text-red-400"
                }`}>
                  {result.speechInsights.hesitationLevel === "low" ? "Low" :
                   result.speechInsights.hesitationLevel === "medium" ? "Moderate" : "High"}
                </span>
              </div>
              {/* WPM */}
              {result.speechInsights.avgWordsPerMinute && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Speaking Rate</span>
                  <span className="text-[14px] font-semibold" style={{ color: "var(--color-text)" }}>
                    {result.speechInsights.avgWordsPerMinute} wpm
                  </span>
                </div>
              )}
              {/* Fillers */}
              {result.speechInsights.totalFillerCount > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Filler Words</span>
                  <span className="text-[14px] font-semibold text-amber-400">
                    {result.speechInsights.totalFillerCount} detected
                  </span>
                </div>
              )}
              {/* Self-corrections */}
              {result.speechInsights.totalSelfCorrections > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Self-corrections</span>
                  <span className="text-[14px] font-semibold" style={{ color: "var(--color-text)" }}>
                    {result.speechInsights.totalSelfCorrections}
                  </span>
                </div>
              )}
            </div>
            {/* Filler breakdown */}
            {result.speechInsights.fillerSummary.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {result.speechInsights.fillerSummary.map((f, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                    style={{ background: "rgba(251, 191, 36, 0.08)", color: "#fbbf24", border: "1px solid rgba(251, 191, 36, 0.15)" }}
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Coach feedback */}
        {result.coachFeedback && (
          <div
            className="rounded-2xl p-5"
            style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
          >
            <div className="text-[12px] font-bold mb-2.5" style={{ color: "var(--color-primary)" }}>
              Coach Feedback
            </div>
            <p className="text-[15px] leading-relaxed" style={{ color: "var(--color-text)" }}>
              {result.coachFeedback}
            </p>
          </div>
        )}

        {/* Vocabulary Intelligence — Two tiers */}
        {(hasVocabulary || hasImprovementVocab) && (
          <div
            className="rounded-2xl p-5"
            style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
          >
            <div className="text-[12px] font-bold mb-3" style={{ color: "var(--color-primary)" }}>
              Vocabulary Analysis
            </div>

            {/* Strengths */}
            {hasVocabulary && (
              <div className="mb-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#34D399" }}>
                  Strong Usage
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.notableVocabulary!.map((word, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-full text-[13px] font-medium"
                      style={{ background: "rgba(52, 211, 153, 0.1)", color: "#34D399", border: "1px solid rgba(52, 211, 153, 0.2)" }}
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Areas for improvement */}
            {hasImprovementVocab && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#fbbf24" }}>
                  Needs Improvement
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.improvementVocabulary!.map((word, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-full text-[13px] font-medium"
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

        {/* Turn-by-turn tips */}
        {result.turnFeedback && result.turnFeedback.length > 0 && (
          <div
            className="rounded-2xl p-5"
            style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
          >
            <div className="text-[12px] font-bold mb-3" style={{ color: "var(--color-primary)" }}>
              Turn Tips
            </div>
            <div className="flex flex-col gap-3">
              {result.turnFeedback.map((tf, i) => (
                <div key={i} className="flex gap-2.5 items-start">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5"
                    style={{ background: "var(--color-primary-soft)", color: "var(--color-primary)" }}
                  >
                    {tf.turnIndex}
                  </div>
                  <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                    {tf.tip}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Done button */}
        <button
          onClick={onClose}
          style={{ background: "var(--color-primary)", color: "#fff" }}
          className="w-full py-3.5 rounded-xl font-semibold text-[15px] hover:opacity-90 transition-opacity"
        >
          Done
        </button>
      </div>
    </div>
  );
}
