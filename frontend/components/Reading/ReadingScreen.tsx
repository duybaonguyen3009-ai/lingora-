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
import MatchingQuestion from "./questions/MatchingQuestion";
import YnngQuestion from "./questions/YnngQuestion";
import MatchingHeadingsQuestion from "./questions/MatchingHeadingsQuestion";
import SentenceCompletionQuestion from "./questions/SentenceCompletionQuestion";
import SummaryCompletionQuestion from "./questions/SummaryCompletionQuestion";
import MatchingInformationQuestion from "./questions/MatchingInformationQuestion";
import MatchingFeaturesQuestion from "./questions/MatchingFeaturesQuestion";
import MatchingSentenceEndingsQuestion from "./questions/MatchingSentenceEndingsQuestion";
import NoteTableDiagramCompletion from "./questions/NoteTableDiagramCompletion";
import ShortAnswerQuestion from "./questions/ShortAnswerQuestion";

const KNOWN_QUESTION_TYPES = [
  "mcq",
  "tfng",
  "ynng",
  "matching",
  "matching_headings",
  "sentence_completion",
  "summary_completion",
  "matching_information",
  "matching_features",
  "matching_sentence_endings",
  "note_table_diagram_completion",
  "short_answer",
] as const;

interface ReadingScreenProps {
  passageId: string;
  onComplete: (result: ReadingPracticeResult) => void;
  onClose: () => void;
  /**
   * 'practice' (default): pause + per-passage 20-min warnings on, free flow.
   * 'full_test': no pause, no per-passage warnings — the parent (Full Test
   * runner) owns the unified 60-min countdown and auto-submit.
   */
  mode?: "practice" | "full_test";
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
          {String(text)}
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

// MatchingQuestion is now imported from ./questions/MatchingQuestion
// (drag-drop default; pass renderAs="dropdown" for the legacy pill UX).

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

export default function ReadingScreen({ passageId, onComplete, onClose, mode = "practice" }: ReadingScreenProps) {
  const isPractice = mode === "practice";
  const [data, setData] = useState<ReadingPassageFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [mobileTab, setMobileTab] = useState<"passage" | "questions">("passage");
  const [showConfirm, setShowConfirm] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const warningsFiredRef = useRef<{ five: boolean; one: boolean; zero: boolean }>({ five: false, one: false, zero: false });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      try { setData(await getReadingPassage(passageId)); } catch { /* silent */ }
      setLoading(false);
    })();
  }, [passageId]);

  useEffect(() => {
    if (!data || loading || paused) return;
    timerRef.current = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [data, loading, paused]);

  // Time-warning toasts — Practice Mode uses a fixed 20-minute budget per
  // passage, matching IELTS Academic Reading (60 min / 3 passages). No hard
  // cutoff: at 0:00 we fire one "Hết giờ" toast and leave the user in control.
  // Full Test Mode skips this — the parent runner owns the unified 60-min
  // countdown and its own warnings (10/5/1 min) + auto-submit.
  useEffect(() => {
    if (!data || !isPractice) return;
    const BUDGET_SECONDS = 20 * 60;
    const fiveLeft = BUDGET_SECONDS - 300;
    const oneLeft = BUDGET_SECONDS - 60;
    if (!warningsFiredRef.current.five && elapsed >= fiveLeft) {
      warningsFiredRef.current.five = true;
      setToast("Còn 5 phút");
    }
    if (!warningsFiredRef.current.one && elapsed >= oneLeft) {
      warningsFiredRef.current.one = true;
      setToast("Còn 1 phút — cố lên!");
    }
    if (!warningsFiredRef.current.zero && elapsed >= BUDGET_SECONDS) {
      warningsFiredRef.current.zero = true;
      setToast("Hết giờ — tùy bạn quyết tiếp");
    }
  }, [elapsed, data, isPractice]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(id);
  }, [toast]);

  const handleAnswer = useCallback((orderIndex: number, answer: string) => {
    setAnswers((prev) => ({ ...prev, [orderIndex]: answer }));
    setCurrentIndex(orderIndex);
  }, []);

  const handleToggleFlag = useCallback((orderIndex: number) => {
    setFlagged((prev) => ({ ...prev, [orderIndex]: !prev[orderIndex] }));
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
    <div className="flex md:flex-wrap gap-1.5 mb-4 overflow-x-auto md:overflow-x-visible pb-1 md:pb-0 -mx-1 px-1">
      {questions.map((q) => {
        const answered = !!answers[q.order_index];
        const isFlagged = !!flagged[q.order_index];
        const isCurrent = currentIndex === q.order_index;
        const borderColor = isFlagged
          ? "#F59E0B"
          : answered
            ? "rgba(0,168,150,0.3)"
            : "var(--color-border)";
        return (
          <button
            key={q.order_index}
            onClick={() => {
              setCurrentIndex(q.order_index);
              document.getElementById(`q-${q.order_index}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            aria-label={`Câu ${q.order_index}${answered ? " — đã trả lời" : ""}${isFlagged ? " — đã đánh dấu" : ""}`}
            aria-current={isCurrent ? "true" : undefined}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-all shrink-0 relative"
            style={{
              background: answered ? "rgba(0,168,150,0.15)" : "var(--color-bg-secondary)",
              color: answered ? "#00A896" : "var(--color-text-tertiary)",
              border: `${isFlagged ? "2px" : "1px"} solid ${borderColor}`,
              boxShadow: isCurrent ? "0 0 0 2px rgba(0,168,150,0.5)" : "none",
            }}
          >
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
      {/* Timer + Pause — Practice only. Full Test parent owns the unified
          60-min countdown and disables pause. */}
      {isPractice && (
        <div className="flex items-center justify-center gap-3">
          <div className="text-sm font-mono" style={{ color: elapsed > 300 ? "#F59E0B" : "var(--color-text-secondary)" }}>
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
          </div>
          <button
            onClick={() => (paused ? setPaused(false) : setShowPauseModal(true))}
            className="text-xs px-2.5 py-1 rounded-md font-medium transition-all"
            style={{
              background: paused ? "rgba(0,168,150,0.12)" : "var(--color-bg-secondary)",
              color: paused ? "#00A896" : "var(--color-text-secondary)",
              border: `1px solid ${paused ? "rgba(0,168,150,0.3)" : "var(--color-border)"}`,
            }}
          >
            {paused ? "Tiếp tục" : "Tạm dừng"}
          </button>
        </div>
      )}
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
            <button
              type="button"
              onClick={() => handleToggleFlag(q.order_index)}
              aria-label={flagged[q.order_index] ? "Bỏ đánh dấu" : "Đánh dấu xem lại"}
              aria-pressed={!!flagged[q.order_index]}
              className="ml-auto w-6 h-6 rounded-md flex items-center justify-center transition-colors"
              style={{
                background: flagged[q.order_index] ? "rgba(245,158,11,0.15)" : "transparent",
                color: flagged[q.order_index] ? "#F59E0B" : "var(--color-text-tertiary)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={flagged[q.order_index] ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
            </button>
          </div>
          <p className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>{q.question_text}</p>
          {q.type === "mcq" && <McqQuestion q={q} answer={answers[q.order_index] || ""} onAnswer={(a) => handleAnswer(q.order_index, a)} />}
          {q.type === "tfng" && <TfngQuestion answer={answers[q.order_index] || ""} onAnswer={(a) => handleAnswer(q.order_index, a)} />}
          {q.type === "ynng" && <YnngQuestion answer={answers[q.order_index] || ""} onAnswer={(a) => handleAnswer(q.order_index, a)} />}
          {q.type === "matching" && <MatchingQuestion q={q} answer={answers[q.order_index] || ""} onAnswer={(a) => handleAnswer(q.order_index, a)} />}
          {q.type === "matching_headings" && <MatchingHeadingsQuestion options={q.options} answer={answers[q.order_index] || ""} onAnswer={(a) => handleAnswer(q.order_index, a)} />}
          {q.type === "sentence_completion" && <SentenceCompletionQuestion options={q.options} answer={answers[q.order_index] || ""} onAnswer={(a) => handleAnswer(q.order_index, a)} />}
          {q.type === "summary_completion" && <SummaryCompletionQuestion options={q.options} answer={answers[q.order_index] || ""} onAnswer={(a) => handleAnswer(q.order_index, a)} />}
          {q.type === "matching_information" && <MatchingInformationQuestion options={q.options} answer={answers[q.order_index] || ""} onAnswer={(a) => handleAnswer(q.order_index, a)} />}
          {q.type === "matching_features" && <MatchingFeaturesQuestion options={q.options} answer={answers[q.order_index] || ""} onAnswer={(a) => handleAnswer(q.order_index, a)} />}
          {q.type === "matching_sentence_endings" && <MatchingSentenceEndingsQuestion options={q.options} answer={answers[q.order_index] || ""} onAnswer={(a) => handleAnswer(q.order_index, a)} />}
          {q.type === "note_table_diagram_completion" && <NoteTableDiagramCompletion options={q.options} answer={answers[q.order_index] || ""} onAnswer={(a) => handleAnswer(q.order_index, a)} />}
          {q.type === "short_answer" && <ShortAnswerQuestion options={q.options} answer={answers[q.order_index] || ""} onAnswer={(a) => handleAnswer(q.order_index, a)} />}
          {!KNOWN_QUESTION_TYPES.includes(q.type) && (
            <div className="rounded-lg p-3 text-sm" style={{ background: "var(--color-bg-secondary)", border: "1px dashed var(--color-border)", color: "var(--color-text-secondary)" }}>
              Dạng câu hỏi này đang được cập nhật, vui lòng thử dạng khác.
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // ---------------------------------------------------------------------------
  // Passage panel content
  // ---------------------------------------------------------------------------

  const PassagePanel = () => {
    const PARAGRAPH_LABEL_RE = /^([A-Z])\.\s/;
    const LINE_WIDTH_CHARS = 85;
    const PASSAGE_FONT = 'Georgia, "Times New Roman", Times, serif';

    const splitToLines = (text: string, maxChars: number): string[] => {
      const words = text.split(/\s+/).filter(Boolean);
      const lines: string[] = [];
      let curr = "";
      for (const w of words) {
        const candidate = curr ? curr + " " + w : w;
        if (candidate.length > maxChars && curr) {
          lines.push(curr);
          curr = w;
        } else {
          curr = candidate;
        }
      }
      if (curr) lines.push(curr);
      return lines;
    };

    const paragraphs = data.passage.passage_text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
    let lineCounter = 0;

    return (
      <div>
        <h3 className="text-lg font-display font-bold mb-4" style={{ color: "var(--color-text)" }}>
          {data.passage.passage_title}
        </h3>
        <div className="text-[15px] leading-[1.8]" style={{ color: "var(--color-text)", fontFamily: PASSAGE_FONT }}>
          {paragraphs.map((para, paraIdx) => {
            const match = para.match(PARAGRAPH_LABEL_RE);
            const displayLabel = match ? match[1] : String.fromCharCode(65 + paraIdx);
            const body = match ? para.slice(match[0].length) : para;
            const lines = splitToLines(body, LINE_WIDTH_CHARS);
            return (
              <div key={paraIdx} className="mb-5">
                {lines.map((line, i) => {
                  lineCounter += 1;
                  const showNumber = lineCounter % 5 === 0;
                  return (
                    <div key={i} className="flex items-baseline gap-3">
                      <span
                        aria-hidden="true"
                        className="inline-block text-right text-xs tabular-nums shrink-0"
                        style={{
                          width: "2ch",
                          color: "var(--color-text-tertiary)",
                          userSelect: "none",
                          opacity: showNumber ? 0.7 : 0,
                        }}
                      >
                        {showNumber ? lineCounter : ""}
                      </span>
                      <span>
                        {i === 0 && <strong>{displayLabel}. </strong>}
                        {line}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Confirm modal
  // ---------------------------------------------------------------------------

  const PauseModal = () => (
    <div className="fixed inset-0 z-sheet flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full max-w-sm rounded-xl p-5 text-center" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
        <div className="text-base font-semibold mb-2" style={{ color: "var(--color-text)" }}>Tạm dừng luyện tập?</div>
        <div className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
          Đây chỉ là luyện tập. Nếu bận thì dừng lại, xong quay lại tiếp tục nhé.
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowPauseModal(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-secondary)" }}>
            Tiếp tục làm
          </button>
          <button onClick={() => { setShowPauseModal(false); setPaused(true); }} className="flex-1 py-2.5 rounded-lg text-sm font-semibold" style={{ background: "#00A896", color: "#fff" }}>
            Tạm dừng
          </button>
        </div>
      </div>
    </div>
  );

  const PauseOverlay = () => (
    <div className="absolute inset-0 z-overlay flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }}>
      <div className="text-center rounded-xl px-6 py-5" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
        <div className="text-base font-semibold mb-1" style={{ color: "var(--color-text)" }}>Đã tạm dừng</div>
        <div className="text-xs mb-4" style={{ color: "var(--color-text-secondary)" }}>Sẵn sàng thì bấm tiếp tục nhé.</div>
        <button onClick={() => setPaused(false)} className="px-5 py-2 rounded-lg text-sm font-semibold" style={{ background: "#00A896", color: "#fff" }}>
          Tiếp tục
        </button>
      </div>
    </div>
  );

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
      <div className="flex-1 flex overflow-hidden relative">
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

        {paused && <PauseOverlay />}
      </div>

      {/* Submit bar */}
      <div className="px-4 py-3 shrink-0" style={{ background: "var(--color-bg-card)", borderTop: "1px solid var(--color-border)" }}>
        <button onClick={() => setShowConfirm(true)} disabled={submitting || paused}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          style={{ background: allAnswered ? "#00A896" : "var(--color-bg-secondary)", color: allAnswered ? "#fff" : "var(--color-text-tertiary)" }}>
          {submitting ? "Đang nộp..." : allAnswered ? "Nộp bài" : `Trả lời tất cả (${answeredCount}/${questions.length})`}
        </button>
      </div>

      {showConfirm && <ConfirmModal />}
      {showPauseModal && <PauseModal />}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] px-4 py-2 rounded-lg text-sm font-semibold shadow-lg"
          style={{
            background: "rgba(245,158,11,0.95)",
            color: "#1B2B4B",
            border: "1px solid rgba(245,158,11,0.6)",
          }}
        >
          ⏱ {toast}
        </div>
      )}
    </div>
  );
}
