"use client";

/**
 * ReadingResult.tsx — Score display with per-question review accordion.
 *
 * Per-question rendering branches on whether the result is a simple
 * (single-pick) type or a complex (per-key / per-blank) type:
 *
 *   - Simple (mcq, tfng, ynng, matching): one Your/Correct row.
 *   - Complex (matching_*, *_completion, short_answer): a sub-results
 *     table showing each blank/key with the user's answer, the accepted
 *     answer(s), a ✓/✗, and any rejection reason ("exceeds_max_words",
 *     "not_in_word_bank"). Header shows points X/Y for the question.
 */

import { useState } from "react";
import { bandColor } from "@/lib/bandColors";
import type { ReadingPracticeResult, ReadingQuestionResult, ReadingSubResult } from "@/lib/types";

/**
 * Optional per-section breakdown for Full Test results — when present a
 * row of "Passage 1 — X/Y • Band Z.Z" cards renders above the per-question
 * accordion. ReadingTab passes this when phase === 'full_test_result'.
 */
export interface ReadingResultSection {
  label: string;
  score: number;
  total: number;
  band: number | null;
}

interface ReadingResultProps {
  result: ReadingPracticeResult;
  onPracticeAgain: () => void;
  onClose: () => void;
  sections?: ReadingResultSection[];
  /** True when Full Test exceeded the 60-min budget (server-trusted). */
  late?: boolean;
}

const SIMPLE_TYPES = new Set(["mcq", "tfng", "ynng", "matching"]);

const REASON_COPY: Record<string, string> = {
  exceeds_max_words: "Quá số từ cho phép",
  not_in_word_bank: "Không có trong word bank",
};

function stringifyAnswer(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string") return v || "—";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  // Mapping objects → "A→i, B→iii"
  if (typeof v === "object" && !Array.isArray(v)) {
    const entries = Object.entries(v as Record<string, unknown>);
    if (entries.length === 0) return "—";
    return entries.map(([k, val]) => `${k}→${val ?? "?"}`).join(", ");
  }
  if (Array.isArray(v)) return v.join(" / ");
  return JSON.stringify(v);
}

function describeAccepted(sub: ReadingSubResult): string {
  if (Array.isArray(sub.accepted)) return sub.accepted.map(String).join(" / ");
  if (sub.correct != null) return stringifyAnswer(sub.correct);
  return "—";
}

function subKeyLabel(sub: ReadingSubResult): string {
  return sub.key ?? sub.blank ?? "?";
}

export default function ReadingResult({ result, onPracticeAgain, onClose, sections, late }: ReadingResultProps) {
  const [expandedQ, setExpandedQ] = useState<number | null>(null);
  const { score, total, band_estimate, per_question_results } = result;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const color = bandColor(band_estimate);

  // Type breakdown — group every type that appeared, not just the legacy 3.
  const breakdown = new Map<string, { correct: number; total: number; points: number; max: number }>();
  for (const r of per_question_results) {
    const slot = breakdown.get(r.type) ?? { correct: 0, total: 0, points: 0, max: 0 };
    slot.total += 1;
    if (r.is_correct) slot.correct += 1;
    slot.points += r.points ?? (r.is_correct ? 1 : 0);
    slot.max += r.max ?? 1;
    breakdown.set(r.type, slot);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto" style={{ background: "var(--color-bg)" }}>
      <div className="max-w-2xl mx-auto w-full px-5 py-8 flex flex-col gap-6">
        {/* Score hero */}
        <div className="text-center">
          <div className="text-5xl font-display font-bold mb-2" style={{ color }}>{score}/{total}</div>
          <div className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
            Band {band_estimate.toFixed(1)} performance
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--color-text-tertiary)" }}>
            {pct}% accuracy · {Math.floor(result.time_seconds / 60)}m {result.time_seconds % 60}s
          </div>
          {late && (
            <div
              className="inline-block mt-3 px-3 py-1 rounded-md text-xs font-medium"
              style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.4)" }}
            >
              Quá giờ — bài thi vượt 60 phút (vẫn được chấm điểm)
            </div>
          )}
        </div>

        {/* Per-section breakdown — Full Test only */}
        {sections && sections.length > 0 && (
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` }}>
            {sections.map((s, i) => {
              const sPct = s.total > 0 ? Math.round((s.score / s.total) * 100) : 0;
              return (
                <div
                  key={i}
                  className="rounded-lg p-3 text-center"
                  style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
                >
                  <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--color-text-tertiary)" }}>
                    {s.label}
                  </div>
                  <div className="text-base font-semibold" style={{ color: "var(--color-text)" }}>
                    {s.score}/{s.total}
                  </div>
                  <div
                    className="text-xs font-medium"
                    style={{ color: s.band != null ? bandColor(s.band) : "var(--color-text-secondary)" }}
                  >
                    {s.band != null ? `Band ${s.band.toFixed(1)}` : `${sPct}%`}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Type breakdown — covers all 12 types */}
        <div className="flex flex-wrap gap-2 justify-center">
          {Array.from(breakdown.entries()).map(([type, b]) => (
            <div
              key={type}
              className="px-3 py-1.5 rounded-lg text-center"
              style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
            >
              <div className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                {b.points}/{b.max}
              </div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>
                {type}
              </div>
            </div>
          ))}
        </div>

        {/* Per-question review */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-tertiary)" }}>
            Question Review
          </div>
          <div className="flex flex-col gap-2">
            {per_question_results.map((q) => (
              <QuestionRow
                key={q.order_index}
                q={q}
                expanded={expandedQ === q.order_index}
                onToggle={() => setExpandedQ(expandedQ === q.order_index ? null : q.order_index)}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button onClick={onPracticeAgain} className="w-full py-3 rounded-xl text-sm font-semibold" style={{ background: "#00A896", color: "#fff" }}>
            Practice Again
          </button>
          <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-medium" style={{ background: "var(--color-bg-card)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}>
            Back to Reading
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionRow({ q, expanded, onToggle }: { q: ReadingQuestionResult; expanded: boolean; onToggle: () => void }) {
  const isSimple = SIMPLE_TYPES.has(q.type);
  const points = q.points ?? (q.is_correct ? 1 : 0);
  const max = q.max ?? 1;

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-3 text-left">
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
          style={{
            background: q.is_correct ? "rgba(34,197,94,0.12)" : points > 0 ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)",
            color: q.is_correct ? "#22C55E" : points > 0 ? "#F59E0B" : "#EF4444",
          }}
        >
          {q.is_correct ? "✓" : points > 0 ? `${points}` : "✗"}
        </span>
        <span className="text-sm flex-1" style={{ color: "var(--color-text)" }}>
          Q{q.order_index}
          <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-tertiary)" }}>
            {q.type.toUpperCase()}
          </span>
          {!isSimple && (
            <span className="ml-2 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              {points}/{max} pts
            </span>
          )}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ color: "var(--color-text-tertiary)", transform: expanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 200ms" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="px-3 pb-3 flex flex-col gap-2 text-sm" style={{ borderTop: "1px solid var(--color-border)" }}>
          {isSimple ? (
            <>
              <div className="pt-2">
                <span style={{ color: q.is_correct ? "#22C55E" : "#EF4444" }}>
                  Your answer: {stringifyAnswer(q.user_answer)}
                </span>
              </div>
              {!q.is_correct && (
                <div style={{ color: "#22C55E" }}>Correct: {stringifyAnswer(q.correct_answer)}</div>
              )}
            </>
          ) : (
            <SubResultsTable subs={q.sub_results ?? []} />
          )}
          {q.unsupported_type && (
            <div className="text-xs italic" style={{ color: "var(--color-text-tertiary)" }}>
              Dạng câu hỏi này chưa được chấm điểm trong phiên bản hiện tại.
            </div>
          )}
          {q.explanation && (
            <div className="text-xs pt-1" style={{ color: "var(--color-text-secondary)" }}>{q.explanation}</div>
          )}
        </div>
      )}
    </div>
  );
}

function SubResultsTable({ subs }: { subs: ReadingSubResult[] }) {
  if (subs.length === 0) {
    return (
      <div className="pt-2 text-xs italic" style={{ color: "var(--color-text-tertiary)" }}>
        Không có chi tiết.
      </div>
    );
  }
  return (
    <div className="pt-2 overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr style={{ color: "var(--color-text-tertiary)" }}>
            <th className="text-left py-1 pr-2 font-medium uppercase tracking-wider">Key</th>
            <th className="text-left py-1 pr-2 font-medium uppercase tracking-wider">Bạn trả lời</th>
            <th className="text-left py-1 pr-2 font-medium uppercase tracking-wider">Đáp án</th>
            <th className="text-left py-1 font-medium uppercase tracking-wider w-6">·</th>
          </tr>
        </thead>
        <tbody>
          {subs.map((s, i) => (
            <tr key={`${subKeyLabel(s)}-${i}`} style={{ borderTop: "1px solid var(--color-border)" }}>
              <td className="py-1.5 pr-2 font-mono" style={{ color: "var(--color-text)" }}>{subKeyLabel(s)}</td>
              <td className="py-1.5 pr-2" style={{ color: s.is_correct ? "#22C55E" : "#EF4444" }}>
                {stringifyAnswer(s.user)}
                {!s.is_correct && s.reason && (
                  <span className="ml-1.5 text-[10px] px-1 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444" }}>
                    {REASON_COPY[s.reason] ?? s.reason}
                  </span>
                )}
              </td>
              <td className="py-1.5 pr-2" style={{ color: "var(--color-text-secondary)" }}>{describeAccepted(s)}</td>
              <td className="py-1.5" style={{ color: s.is_correct ? "#22C55E" : "#EF4444" }}>
                {s.is_correct ? "✓" : "✗"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
