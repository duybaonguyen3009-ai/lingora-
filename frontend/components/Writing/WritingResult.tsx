"use client";

/**
 * WritingResult.tsx — Displays IELTS Writing scoring results.
 *
 * Shows: overall band, 4 criteria cards, strengths/weaknesses,
 * sentence corrections, and collapsible sample essay.
 */

import { useState, useEffect, useRef } from "react";
import FeedbackSheet from "@/components/FeedbackSheet";
import type { WritingSubmission, WritingFeedback } from "@/lib/types";

interface WritingResultProps {
  submission: WritingSubmission;
  onBack: () => void;
}

// Band score color
function bandColor(band: number): string {
  if (band >= 7) return "#22C55E";
  if (band >= 6) return "#00A896";
  if (band >= 5) return "#F59E0B";
  return "#EF4444";
}

function CriteriaCard({
  label,
  score,
  feedback,
  color,
}: {
  label: string;
  score: number;
  feedback: string;
  color: string;
}) {
  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderLeft: `4px solid ${color}`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--color-text)" }}
        >
          {label}
        </span>
        <span
          className="text-lg font-bold"
          style={{ color }}
        >
          {score.toFixed(1)}
        </span>
      </div>
      <p
        className="text-sm leading-relaxed"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {feedback}
      </p>
    </div>
  );
}

export default function WritingResult({ submission, onBack }: WritingResultProps) {
  const [showSample, setShowSample] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const feedbackShown = useRef(false);
  const feedback = submission.feedback_json as WritingFeedback | null;

  // Show feedback sheet once when completed result first renders
  useEffect(() => {
    if (submission.status === "completed" && feedback && !feedbackShown.current) {
      feedbackShown.current = true;
      const t = setTimeout(() => setShowFeedback(true), 1000);
      return () => clearTimeout(t);
    }
  }, [submission.status, feedback]);

  if (!feedback) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <p style={{ color: "var(--color-text-secondary)" }}>
          Scoring data is not available for this submission.
        </p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: "var(--color-accent)", color: "#fff" }}
        >
          Go Back
        </button>
      </div>
    );
  }

  const overall = feedback.overall_band;
  const color = bandColor(overall);

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium self-start"
        style={{ color: "var(--color-accent)" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>

      {/* Overall Band Score */}
      <div
        className="rounded-xl p-6 text-center"
        style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <div className="text-sm font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>
          Overall Band Score
        </div>
        <div className="text-5xl font-bold mb-2" style={{ color }}>
          {overall.toFixed(1)}
        </div>
        <div className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
          {submission.task_type === "task1" ? "Task 1" : "Task 2"} &middot; {submission.word_count} words
          {feedback.language_detected && feedback.language_detected !== "en" && (
            <span className="ml-2 px-1.5 py-0.5 rounded text-xs" style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>
              Language: {feedback.language_detected.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* 4 Criteria Cards */}
      <div className="flex flex-col gap-3">
        <CriteriaCard
          label="Task Achievement"
          score={feedback.criteria.task.score}
          feedback={feedback.criteria.task.feedback}
          color={bandColor(feedback.criteria.task.score)}
        />
        <CriteriaCard
          label="Coherence & Cohesion"
          score={feedback.criteria.coherence.score}
          feedback={feedback.criteria.coherence.feedback}
          color={bandColor(feedback.criteria.coherence.score)}
        />
        <CriteriaCard
          label="Lexical Resource"
          score={feedback.criteria.lexical.score}
          feedback={feedback.criteria.lexical.feedback}
          color={bandColor(feedback.criteria.lexical.score)}
        />
        <CriteriaCard
          label="Grammatical Range & Accuracy"
          score={feedback.criteria.grammar.score}
          feedback={feedback.criteria.grammar.feedback}
          color={bandColor(feedback.criteria.grammar.score)}
        />
      </div>

      {/* Strengths */}
      {feedback.strengths.length > 0 && (
        <div
          className="rounded-lg p-4"
          style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}
        >
          <div className="text-sm font-semibold mb-2" style={{ color: "#22C55E" }}>
            Strengths
          </div>
          <ul className="flex flex-col gap-1.5">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="text-sm flex gap-2" style={{ color: "var(--color-text)" }}>
                <span style={{ color: "#22C55E" }}>+</span> {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Weaknesses */}
      {feedback.weaknesses.length > 0 && (
        <div
          className="rounded-lg p-4"
          style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}
        >
          <div className="text-sm font-semibold mb-2" style={{ color: "#EF4444" }}>
            Areas to Improve
          </div>
          <ul className="flex flex-col gap-1.5">
            {feedback.weaknesses.map((w, i) => (
              <li key={i} className="text-sm flex gap-2" style={{ color: "var(--color-text)" }}>
                <span style={{ color: "#EF4444" }}>-</span> {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvements */}
      {feedback.improvements.length > 0 && (
        <div
          className="rounded-lg p-4"
          style={{ background: "rgba(0,168,150,0.06)", border: "1px solid rgba(0,168,150,0.15)" }}
        >
          <div className="text-sm font-semibold mb-2" style={{ color: "#00A896" }}>
            Suggestions
          </div>
          <ul className="flex flex-col gap-1.5">
            {feedback.improvements.map((imp, i) => (
              <li key={i} className="text-sm flex gap-2" style={{ color: "var(--color-text)" }}>
                <span style={{ color: "#00A896" }}>*</span> {imp}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sentence Corrections */}
      {feedback.sentence_corrections.length > 0 && (
        <div
          className="rounded-lg p-4 flex flex-col gap-3"
          style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
        >
          <div className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            Sentence Corrections
          </div>
          {feedback.sentence_corrections.map((sc, i) => (
            <div key={i} className="flex flex-col gap-1 text-sm">
              <div className="flex gap-2">
                <span style={{ color: "#EF4444" }}>-</span>
                <span style={{ color: "var(--color-text-secondary)", textDecoration: "line-through" }}>
                  {sc.original}
                </span>
              </div>
              <div className="flex gap-2">
                <span style={{ color: "#22C55E" }}>+</span>
                <span style={{ color: "var(--color-text)" }}>
                  {sc.corrected}
                </span>
              </div>
              <div className="text-xs pl-5" style={{ color: "var(--color-text-tertiary)" }}>
                {sc.explanation}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sample Essay (collapsible) */}
      {feedback.sample_essay && (
        <div
          className="rounded-lg overflow-hidden"
          style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
        >
          <button
            onClick={() => setShowSample(!showSample)}
            className="w-full flex items-center justify-between p-4 text-sm font-semibold"
            style={{ color: "var(--color-text)" }}
          >
            <span>Sample Essay (Band 7.5+)</span>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: showSample ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {showSample && (
            <div
              className="px-4 pb-4 text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {feedback.sample_essay}
            </div>
          )}
        </div>
      )}

      <FeedbackSheet
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        activityType="writing"
        activityId={submission.id}
      />
    </div>
  );
}
