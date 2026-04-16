"use client";

/**
 * ReadingScreen.tsx — Core reading test UI.
 *
 * Desktop: split view (55% passage / 45% questions).
 * Mobile: tab toggle between passage and questions.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { getReadingPassage, submitReadingPractice } from "@/lib/api";
import type { ReadingPassageFull, ReadingPracticeResult } from "@/lib/types";

interface ReadingScreenProps {
  passageId: string;
  onComplete: (result: ReadingPracticeResult) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Question renderers
// ---------------------------------------------------------------------------

function McqQuestion({ q, answer, onAnswer }: { q: ReadingPassageFull["questions"][0]; answer: string; onAnswer: (a: string) => void }) {
  if (!q.options) return null;
  return (
    <div className="flex flex-col gap-2">
      {Object.entries(q.options).map(([key, text]) => (
        <button key={key} onClick={() => onAnswer(key)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all"
          style={{
            background: answer === key ? "rgba(0,168,150,0.12)" : "var(--color-bg-secondary)",
            border: `1px solid ${answer === key ? "rgba(0,168,150,0.4)" : "var(--color-border)"}`,
            color: "var(--color-text)",
          }}>
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
            style={{ background: answer === key ? "#00A896" : "var(--color-border)", color: answer === key ? "#fff" : "var(--color-text-secondary)" }}>
            {key}
          </span>
          {text}
        </button>
      ))}
    </div>
  );
}

function TfngQuestion({ answer, onAnswer }: { answer: string; onAnswer: (a: string) => void }) {
  return (
    <div className="flex gap-2">
      {["TRUE", "FALSE", "NOT GIVEN"].map((opt) => (
        <button key={opt} onClick={() => onAnswer(opt)}
          className="flex-1 py-3 rounded-lg text-xs font-semibold transition-all"
          style={{
            background: answer === opt ? "rgba(0,168,150,0.12)" : "var(--color-bg-secondary)",
            border: `1px solid ${answer === opt ? "rgba(0,168,150,0.4)" : "var(--color-border)"}`,
            color: answer === opt ? "#00A896" : "var(--color-text-secondary)",
          }}>
          {opt}
        </button>
      ))}
    </div>
  );
}

function MatchingQuestion({ q, answer, onAnswer }: { q: ReadingPassageFull["questions"][0]; answer: string; onAnswer: (a: string) => void }) {
  if (!q.options) return null;
  const entries = Object.entries(q.options);

  return (
    <div className="flex flex-col gap-1.5">
      {/* Prompt: show which option is selected (or nudge to pick one) */}
      <div className="text-xs mb-1" style={{ color: answer ? "#00A896" : "var(--color-text-tertiary)" }}>
        {answer ? `Đã chọn: ${answer}` : "Chọn đáp án phù hợp"}
      </div>

      {/* Option pills — compact grid */}
      <div className="grid gap-2" style={{ gridTemplateColumns: entries.length <= 5 ? "repeat(auto-fill, minmax(100%, 1fr))" : "repeat(auto-fill, minmax(48%, 1fr))" }}>
        {entries.map(([key, text]) => {
          const isSelected = answer === key;
          return (
            <button
              key={key}
              onClick={() => onAnswer(isSelected ? "" : key)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm transition-all active:scale-[0.97]"
              style={{
                background: isSelected ? "rgba(0,168,150,0.12)" : "var(--color-bg-secondary)",
                border: `1px solid ${isSelected ? "rgba(0,168,150,0.4)" : "var(--color-border)"}`,
                color: "var(--color-text)",
              }}
            >
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                style={{
                  background: isSelected ? "#00A896" : "var(--color-border)",
                  color: isSelected ? "#fff" : "var(--color-text-secondary)",
                }}
              >
                {key}
              </span>
              <span className="flex-1 line-clamp-2">{text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function ReadingSkeleton() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--color-bg)" }}>
      <div className="h-14 animate-pulse" style={{ background: "var(--color-bg-card)", borderBottom: "1px solid var(--color-border)" }} />
      <div className="flex-1 flex">
        <div className="flex-1 p-6 animate-pulse"><div className="h-6 w-48 bg-white/5 rounded mb-4" /><div className="h-4 w-full bg-white/5 rounded mb-2" /><div className="h-4 w-full bg-white/5 rounded mb-2" /><div className="h-4 w-3/4 bg-white/5 rounded" /></div>
        <div className="hidden md:block w-[45%] p-6 animate-pulse" style={{ borderLeft: "1px solid var(--color-border)" }}><div className="h-6 w-32 bg-white/5 rounded mb-4" /><div className="h-12 w-full bg-white/5 rounded mb-3" /><div className="h-12 w-full bg-white/5 rounded" /></div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ReadingScreen({ passageId, onComplete, onClose }: ReadingScreenProps) {
  const [data, setData] = useState<ReadingPassageFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [mobileTab, setMobileTab] = useState<"passage" | "questions">("passage");
  const [showConfirm, setShowConfirm] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      try { setData(await getReadingPassage(passageId)); } catch { /* silent */ }
      setLoading(false);
    })();
  }, [passageId]);

  useEffect(() => {
    if (!data || loading) return;
    timerRef.current = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [data, loading]);

  const handleAnswer = useCallback((orderIndex: number, answer: string) => {
    setAnswers((prev) => ({ ...prev, [orderIndex]: answer }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!data || submitting) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const answerArray = data.questions.map((q) => ({
      question_id: q.id,
      order_index: q.order_index,
      answer: answers[q.order_index] || "",
    }));

    try {
      const result = await submitReadingPractice({ passage_id: passageId, answers: answerArray, time_seconds: elapsed });
      onComplete(result);
    } catch {
      setSubmitting(false);
    }
  }, [data, answers, elapsed, passageId, submitting, onComplete]);

  if (loading || !data) return <ReadingSkeleton />;

  const questions = data.questions;
  const answeredCount = Object.values(answers).filter(Boolean).length;
  const allAnswered = answeredCount === questions.length;

  // ---------------------------------------------------------------------------
  // Question navigation grid
  // ---------------------------------------------------------------------------

  const QuestionNav = () => (
    <div className="flex flex-wrap gap-1.5 mb-4">
      {questions.map((q) => {
        const answered = !!answers[q.order_index];
        return (
          <button key={q.order_index}
            onClick={() => document.getElementById(`q-${q.order_index}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-all"
            style={{
              background: answered ? "rgba(0,168,150,0.15)" : "var(--color-bg-secondary)",
              color: answered ? "#00A896" : "var(--color-text-tertiary)",
              border: `1px solid ${answered ? "rgba(0,168,150,0.3)" : "var(--color-border)"}`,
            }}>
            {q.order_index}
          </button>
        );
      })}
    </div>
  );

  // ---------------------------------------------------------------------------
  // Questions panel content
  // ---------------------------------------------------------------------------

  const QuestionsPanel = () => (
    <div className="flex flex-col gap-5">
      <QuestionNav />
      {/* Timer */}
      <div className="text-center text-sm font-mono" style={{ color: elapsed > 300 ? "#F59E0B" : "var(--color-text-secondary)" }}>
        {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
      </div>
      {/* Questions */}
      {questions.map((q) => (
        <div key={q.order_index} id={`q-${q.order_index}`} className="rounded-lg p-4" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
          <div className="flex items-start gap-2 mb-3">
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0" style={{ background: "rgba(0,168,150,0.12)", color: "#00A896" }}>
              {q.order_index}
            </span>
            <span className="text-xs font-medium uppercase px-1.5 py-0.5 rounded" style={{ background: "rgba(0,168,150,0.08)", color: "#00A896" }}>
              {q.type.toUpperCase()}
            </span>
          </div>
          <p className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>{q.question_text}</p>
          {q.type === "mcq" && <McqQuestion q={q} answer={answers[q.order_index] || ""} onAnswer={(a) => handleAnswer(q.order_index, a)} />}
          {q.type === "tfng" && <TfngQuestion answer={answers[q.order_index] || ""} onAnswer={(a) => handleAnswer(q.order_index, a)} />}
          {q.type === "matching" && <MatchingQuestion q={q} answer={answers[q.order_index] || ""} onAnswer={(a) => handleAnswer(q.order_index, a)} />}
        </div>
      ))}
    </div>
  );

  // ---------------------------------------------------------------------------
  // Passage panel content
  // ---------------------------------------------------------------------------

  const PassagePanel = () => (
    <div>
      <h3 className="text-lg font-display font-bold mb-4" style={{ color: "var(--color-text)" }}>
        {data.passage.passage_title}
      </h3>
      <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-text-secondary)" }}>
        {data.passage.passage_text}
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Confirm modal
  // ---------------------------------------------------------------------------

  const ConfirmModal = () => (
    <div className="fixed inset-0 z-sheet flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full max-w-sm rounded-xl p-5 text-center" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
        <div className="text-base font-semibold mb-2" style={{ color: "var(--color-text)" }}>Nộp bài?</div>
        <div className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
          Bạn đã trả lời {answeredCount}/{questions.length} câu hỏi.
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-secondary)" }}>
            Xem lại
          </button>
          <button onClick={() => { setShowConfirm(false); handleSubmit(); }} disabled={submitting} className="flex-1 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50" style={{ background: "#00A896", color: "#fff" }}>
            {submitting ? "Đang nộp..." : "Nộp bài"}
          </button>
        </div>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--color-bg)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ background: "var(--color-bg-card)", borderBottom: "1px solid var(--color-border)" }}>
        <button onClick={onClose} className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--color-bg-secondary)" }}>
          <span style={{ color: "var(--color-text)" }}>←</span>
        </button>
        <div className="flex-1 text-sm font-semibold truncate" style={{ color: "var(--color-text)" }}>
          {data.passage.passage_title}
        </div>
        <div className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
          {answeredCount}/{questions.length}
        </div>
      </div>

      {/* Mobile tab toggle */}
      <div className="md:hidden flex shrink-0" style={{ background: "var(--color-bg-card)", borderBottom: "1px solid var(--color-border)" }}>
        {(["passage", "questions"] as const).map((tab) => (
          <button key={tab} onClick={() => setMobileTab(tab)}
            className="flex-1 py-2.5 text-sm font-medium capitalize transition-all"
            style={{ background: mobileTab === tab ? "var(--color-accent)" : "transparent", color: mobileTab === tab ? "#fff" : "var(--color-text-secondary)" }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Content — desktop split / mobile tabs */}
      <div className="flex-1 flex overflow-hidden">
        {/* Passage — always visible on desktop, conditional on mobile */}
        <div className={`${mobileTab === "passage" ? "block" : "hidden"} md:block md:w-[55%] overflow-y-auto p-5`}>
          <PassagePanel />
        </div>

        {/* Divider (desktop only) */}
        <div className="hidden md:block w-px shrink-0" style={{ background: "var(--color-border)" }} />

        {/* Questions */}
        <div className={`${mobileTab === "questions" ? "block" : "hidden"} md:block md:w-[45%] overflow-y-auto p-5`}>
          <QuestionsPanel />
        </div>
      </div>

      {/* Submit bar */}
      <div className="px-4 py-3 shrink-0" style={{ background: "var(--color-bg-card)", borderTop: "1px solid var(--color-border)" }}>
        <button onClick={() => setShowConfirm(true)} disabled={submitting}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          style={{ background: allAnswered ? "#00A896" : "var(--color-bg-secondary)", color: allAnswered ? "#fff" : "var(--color-text-tertiary)" }}>
          {submitting ? "Đang nộp..." : allAnswered ? "Nộp bài" : `Trả lời tất cả (${answeredCount}/${questions.length})`}
        </button>
      </div>

      {showConfirm && <ConfirmModal />}
    </div>
  );
}
