"use client";

/**
 * BattleMatch.tsx — Active battle screen.
 *
 * Shows passage text + questions. Timer counts up. Submit answers when done.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { getBattleMatch, submitBattleAnswers } from "@/lib/api";
import type { BattleMatchStatus, BattleQuestion } from "@/lib/types";

interface BattleMatchProps {
  matchId: string;
  onComplete: () => void;
  onClose: () => void;
}

export default function BattleMatch({ matchId, onComplete, onClose }: BattleMatchProps) {
  const [data, setData] = useState<BattleMatchStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Wall-clock elapsed (Wave 4.11 pattern). Score = correct*1000 - elapsed,
  // so any undercount under background-tab setInterval throttle would
  // inflate the score — this is the anti-cheat path. setInterval here
  // only forces a re-render via setTick; the actual elapsed value is
  // always derived from Date.now() − startTimeMs.
  const startTimeMsRef = useRef<number | null>(null);
  const [, setTick] = useState(0);
  const elapsed = startTimeMsRef.current === null
    ? 0
    : Math.floor((Date.now() - startTimeMsRef.current) / 1000);

  // Load match data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const match = await getBattleMatch(matchId);
        if (!cancelled) setData(match);
      } catch { /* silent */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [matchId]);

  // Start timer
  useEffect(() => {
    if (!data || loading) return;
    if (startTimeMsRef.current === null) startTimeMsRef.current = Date.now();
    timerRef.current = setInterval(() => setTick((n) => n + 1), 1000);
    const onVisibility = () => { if (!document.hidden) setTick((n) => n + 1); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [data, loading]);

  const handleAnswer = useCallback((orderIndex: number, answer: string) => {
    setAnswers((prev) => ({ ...prev, [orderIndex]: answer }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!data?.content?.questions || submitting) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const answerArray = data.content.questions.map((q) => ({
      questionId: q.id,
      orderIndex: q.order_index,
      answer: answers[q.order_index] || "",
    }));

    const timeSeconds = startTimeMsRef.current === null
      ? 0
      : Math.floor((Date.now() - startTimeMsRef.current) / 1000);

    try {
      const result = await submitBattleAnswers(matchId, { answers: answerArray, timeSeconds });
      setSubmitted(true);

      if (result.status === "completed") {
        setTimeout(onComplete, 1500);
      } else {
        // Awaiting opponent — poll until completed
        const poll = setInterval(async () => {
          try {
            const m = await getBattleMatch(matchId);
            if (m.match.status === "completed") {
              clearInterval(poll);
              onComplete();
            }
          } catch { /* keep polling */ }
        }, 3000);
        // Auto-stop after 5 min
        setTimeout(() => { clearInterval(poll); onComplete(); }, 300000);
      }
    } catch {
      setSubmitting(false);
    }
  }, [data, answers, matchId, submitting, onComplete]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4" style={{ background: "var(--color-bg)" }}>
        <div className="w-12 h-12 border-3 rounded-full animate-spin" style={{ borderColor: "#F59E0B", borderTopColor: "transparent", borderWidth: "3px" }} />
        <p className="text-base font-semibold" style={{ color: "var(--color-text)" }}>Waiting for opponent...</p>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Your score: {Object.values(answers).filter(Boolean).length * 1000 - elapsed}</p>
      </div>
    );
  }

  const passage = data.content?.passage;
  const questions = data.content?.questions || [];
  const answeredCount = Object.values(answers).filter(Boolean).length;
  const allAnswered = answeredCount === questions.length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--color-bg)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: "var(--color-bg-card)", borderBottom: "1px solid var(--color-border)" }}>
        <button onClick={onClose} className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
          ✕ Quit
        </button>
        <div className="text-center">
          <div className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
            {answeredCount}/{questions.length} answered
          </div>
        </div>
        <div className="text-sm font-mono font-semibold" style={{ color: elapsed > 300 ? "#F59E0B" : "var(--color-accent)" }}>
          {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Passage */}
        {passage && (
          <div className="px-4 py-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <h3 className="text-base font-display font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              {passage.passage_title}
            </h3>
            <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-text-secondary)" }}>
              {passage.passage_text}
            </div>
          </div>
        )}

        {/* Questions */}
        <div className="px-4 py-4 flex flex-col gap-5">
          {questions.map((q: BattleQuestion) => (
            <QuestionCard
              key={q.order_index}
              question={q}
              answer={answers[q.order_index] || ""}
              onAnswer={(ans) => handleAnswer(q.order_index, ans)}
            />
          ))}
        </div>
      </div>

      {/* Submit bar */}
      <div className="px-4 py-3 shrink-0" style={{ background: "var(--color-bg-card)", borderTop: "1px solid var(--color-border)" }}>
        <button
          onClick={handleSubmit}
          disabled={!allAnswered || submitting}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          style={{ background: allAnswered ? "#00A896" : "var(--color-bg-secondary)", color: allAnswered ? "#fff" : "var(--color-text-tertiary)" }}
        >
          {submitting ? "Đang nộp..." : allAnswered ? "Nộp bài ⚔️" : `Trả lời tất cả câu hỏi (${answeredCount}/${questions.length})`}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Question card
// ---------------------------------------------------------------------------

function QuestionCard({
  question,
  answer,
  onAnswer,
}: {
  question: BattleQuestion;
  answer: string;
  onAnswer: (ans: string) => void;
}) {
  const { type, question_text, options, order_index } = question;

  return (
    <div className="rounded-lg p-4" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
      <div className="flex items-start gap-2 mb-3">
        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
          style={{ background: "rgba(0,168,150,0.12)", color: "#00A896" }}>
          {order_index}
        </span>
        <div>
          <span className="text-xs font-medium uppercase px-1.5 py-0.5 rounded"
            style={{ background: "rgba(0,168,150,0.08)", color: "#00A896" }}>
            {type.toUpperCase()}
          </span>
        </div>
      </div>

      <p className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>
        {question_text}
      </p>

      {/* MCQ / Matching options */}
      {(type === "mcq" || type === "matching") && options && (
        <div className="flex flex-col gap-2">
          {Object.entries(options).map(([key, text]) => (
            <button
              key={key}
              onClick={() => onAnswer(key)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all"
              style={{
                background: answer === key ? "rgba(0,168,150,0.12)" : "var(--color-bg-secondary)",
                border: `1px solid ${answer === key ? "rgba(0,168,150,0.4)" : "var(--color-border)"}`,
                color: "var(--color-text)",
              }}
            >
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                style={{
                  background: answer === key ? "#00A896" : "var(--color-border)",
                  color: answer === key ? "#fff" : "var(--color-text-secondary)",
                }}>
                {key}
              </span>
              {text}
            </button>
          ))}
        </div>
      )}

      {/* TFNG options */}
      {type === "tfng" && (
        <div className="flex gap-2">
          {["TRUE", "FALSE", "NOT GIVEN"].map((opt) => (
            <button
              key={opt}
              onClick={() => onAnswer(opt)}
              className="flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: answer === opt ? "rgba(0,168,150,0.12)" : "var(--color-bg-secondary)",
                border: `1px solid ${answer === opt ? "rgba(0,168,150,0.4)" : "var(--color-border)"}`,
                color: answer === opt ? "#00A896" : "var(--color-text-secondary)",
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
