"use client";

/**
 * WritingResult.tsx — Displays IELTS Writing scoring results.
 *
 * Shows: overall band, 4 criteria cards, strengths/weaknesses,
 * sentence corrections, and collapsible sample essay.
 */

import { useMemo, useState, useEffect, useRef } from "react";
import FeedbackSheet from "@/components/FeedbackSheet";
import WritingEssayHighlighted from "./WritingEssayHighlighted";
import WritingCorrectionDrawer, { type WritingDrawerDetail } from "./WritingCorrectionDrawer";
import WritingParagraphIcons from "./WritingParagraphIcons";
import { bandColor } from "@/lib/bandColors";
import type { WritingSubmission, WritingFeedback, WritingFeedbackCard, ParagraphAnalysis } from "@/lib/types";

type ResultTab = "summary" | "highlight";

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

interface WritingResultProps {
  submission: WritingSubmission;
  onBack: () => void;
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
  const [activeTab, setActiveTab] = useState<ResultTab>("summary");
  const [drawerDetail, setDrawerDetail] = useState<WritingDrawerDetail | null>(null);
  const feedbackShown = useRef(false);
  const feedback = submission.feedback_json as WritingFeedback | null;

  // Index corrections by normalized sentence so a click on the highlighted
  // essay can look up every correction attached to that sentence.
  const correctionsBySentence = useMemo(() => {
    const map = new Map<string, typeof feedback extends null ? never : NonNullable<typeof feedback>["sentence_corrections"]>();
    for (const c of feedback?.sentence_corrections ?? []) {
      if (!c?.original) continue;
      const key = normalize(c.original);
      const existing = map.get(key) ?? [];
      existing.push(c);
      map.set(key, existing);
    }
    return map;
  }, [feedback]);

  const handleSentenceClick = (normalizedKey: string) => {
    const hits = correctionsBySentence.get(normalizedKey);
    if (hits && hits.length > 0) {
      setDrawerDetail({ kind: "sentence", corrections: hits });
    }
  };

  const handleParagraphClick = (paraNum: number) => {
    const para = (feedback?.paragraph_analysis ?? []).find((p) => p?.paragraph_number === paraNum);
    if (para) setDrawerDetail({ kind: "paragraph", paragraph: para });
  };

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

      {/* Word Count Analysis */}
      {feedback.word_count_feedback && (
        <div className="rounded-lg px-4 py-3 flex items-center gap-3" style={{
          background: feedback.word_count_feedback.status === "good" ? "rgba(34,197,94,0.06)" : "rgba(245,158,11,0.06)",
          border: `1px solid ${feedback.word_count_feedback.status === "good" ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)"}`,
        }}>
          <span className="text-base">{feedback.word_count_feedback.status === "good" ? "✅" : "⚠️"}</span>
          <div>
            <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
              {feedback.word_count_feedback.actual} words
            </div>
            <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              {feedback.word_count_feedback.comment}
            </div>
          </div>
        </div>
      )}

      {/* Tab toggle: Summary (default) / Highlight detail */}
      <div
        className="flex rounded-xl overflow-hidden"
        style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
        }}
      >
        {([
          { key: "summary",   label: "Tóm tắt" },
          { key: "highlight", label: "Highlight chi tiết" },
        ] as { key: ResultTab; label: string }[]).map((t) => {
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className="flex-1 py-2.5 text-sm font-medium transition-all cursor-pointer"
              style={{
                background: active ? "var(--color-accent)" : "transparent",
                color: active ? "#fff" : "var(--color-text-secondary)",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Highlight tab — essay + inline underlines + paragraph icons */}
      {activeTab === "highlight" && (
        <div className="flex flex-col gap-4">
          <WritingEssayHighlighted
            essayText={submission.essay_text}
            corrections={feedback.sentence_corrections ?? []}
            onCorrectionClick={handleSentenceClick}
          />
          {feedback.paragraph_analysis && feedback.paragraph_analysis.length > 0 && (
            <WritingParagraphIcons
              essayText={submission.essay_text}
              paragraphs={feedback.paragraph_analysis}
              onParagraphClick={handleParagraphClick}
            />
          )}
          <div
            className="rounded-lg px-3 py-2 text-xs flex items-center gap-3"
            style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-tertiary)" }}
          >
            <span>Màu gạch chân:</span>
            <span style={{ color: "#1B2B4B" }}>● ngữ pháp</span>
            <span style={{ color: "#00A896" }}>● từ vựng</span>
            <span style={{ color: "#F07167" }}>● liên kết</span>
          </div>
        </div>
      )}

      {/* Summary tab — original result layout */}
      {activeTab === "summary" && (
      <>
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

      {/* Feedback Cards */}
      {feedback.feedback_cards && feedback.feedback_cards.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Key Feedback</div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 md:grid md:grid-cols-2 md:overflow-visible">
            {feedback.feedback_cards.map((card: WritingFeedbackCard, i: number) => {
              const cfg: Record<string, { border: string; bg: string; icon: string }> = {
                grammar_error:    { border: "#EF4444", bg: "rgba(239,68,68,0.06)", icon: "G" },
                vocab_repetition: { border: "#F59E0B", bg: "rgba(245,158,11,0.06)", icon: "V" },
                coherence:        { border: "#F97316", bg: "rgba(249,115,22,0.06)", icon: "C" },
                task_achievement: { border: "#3B82F6", bg: "rgba(59,130,246,0.06)", icon: "T" },
                strength:         { border: "#22C55E", bg: "rgba(34,197,94,0.06)", icon: "+" },
              };
              const c = cfg[card.type] || cfg.grammar_error;
              return (
                <div key={i} className="rounded-lg p-4 min-w-[280px] md:min-w-0 shrink-0"
                  style={{ background: c.bg, borderLeft: `4px solid ${c.border}`, animationDelay: `${i * 100}ms` }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold"
                      style={{ background: `${c.border}20`, color: c.border }}>{c.icon}</span>
                    <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{card.title}</span>
                  </div>
                  <p className="text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>{card.impact}</p>
                  {card.fix.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {card.fix.map((f, j) => (
                        <span key={j} className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: `${c.border}12`, color: c.border }}>{f}</span>
                      ))}
                    </div>
                  )}
                  {card.example && (
                    <p className="text-xs italic" style={{ color: "var(--color-text-secondary)" }}>{card.example}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Paragraph Analysis */}
      {feedback.paragraph_analysis && feedback.paragraph_analysis.length > 0 && (
        <div className="rounded-lg p-4 flex flex-col gap-2.5"
          style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
          <div className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Paragraph Breakdown</div>
          {feedback.paragraph_analysis.map((p: ParagraphAnalysis) => {
            const scoreCfg = { strong: { icon: "✅", color: "#22C55E" }, adequate: { icon: "⚠️", color: "#F59E0B" }, weak: { icon: "❌", color: "#EF4444" } };
            const sc = scoreCfg[p.score] || scoreCfg.adequate;
            return (
              <div key={p.paragraph_number} className="flex items-start gap-3 py-2"
                style={{ borderTop: p.paragraph_number > 1 ? "1px solid var(--color-border)" : "none" }}>
                <span className="text-sm shrink-0 pt-0.5">{sc.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium capitalize" style={{ color: "var(--color-text)" }}>{p.type}</span>
                    <span className="text-xs font-medium capitalize" style={{ color: sc.color }}>{p.score}</span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{p.feedback}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sample Essay (collapsible) */}
      {feedback.sample_essay && (
        <details className="rounded-lg overflow-hidden" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
          <summary className="px-4 py-4 cursor-pointer text-sm font-semibold flex items-center justify-between" style={{ color: "var(--color-text)" }}>
            <span>Band 7.5+ Model Answer</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ color: "var(--color-text-tertiary)" }}><polyline points="6 9 12 15 18 9" /></svg>
          </summary>
          <div className="px-4 pb-4" style={{ borderTop: "1px solid var(--color-border)" }}>
            <p className="text-xs mb-2 pt-3" style={{ color: "#00A896" }}>
              Notice: specific examples, varied vocabulary, clear structure
            </p>
            <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-text-secondary)" }}>
              {feedback.sample_essay}
            </div>
          </div>
        </details>
      )}

      {/* Top 3 Priorities */}
      {feedback.top_3_priorities && feedback.top_3_priorities.length > 0 && (
        <div className="rounded-lg p-4 flex flex-col gap-2.5"
          style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
          <div className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            Your Focus for Next Essay
          </div>
          {feedback.top_3_priorities.map((p, i) => (
            <div key={i} className="flex gap-2.5 items-start">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                style={{ background: "rgba(0,168,150,0.12)", color: "#00A896" }}>{i + 1}</span>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>{p}</p>
            </div>
          ))}
        </div>
      )}

      </>
      )}

      <WritingCorrectionDrawer
        open={drawerDetail !== null}
        detail={drawerDetail}
        onClose={() => setDrawerDetail(null)}
      />

      <FeedbackSheet
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        activityType="writing"
        activityId={submission.id}
      />
    </div>
  );
}
