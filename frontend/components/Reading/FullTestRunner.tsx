"use client";

/**
 * FullTestRunner — orchestrates a 60-minute, 3-passage Full Test session.
 *
 *   - Loads all 3 passages up-front so mid-test network stalls don't
 *     interrupt the timer.
 *   - Owns the unified 60-min countdown (parent of the per-section
 *     view; ReadingScreen's own timer/pause UX is suppressed via
 *     mode='full_test' when used elsewhere).
 *   - Section tabs at the top let the learner jump between passages
 *     freely (matches IELTS computer-delivered behaviour).
 *   - Time warnings at 10 / 5 / 1 min remaining via toast.
 *   - At 0:00 → auto-submit with whatever answers are filled.
 *   - Manual "Nộp bài" opens a confirm modal showing answered + flagged
 *     counts; submitting collapses the runner into the result screen.
 *
 * Per-section answers + flags live in this component so they survive
 * tab switches.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { startReadingFullTest, submitReadingFullTest } from "@/lib/api";
import type { ReadingFullTestData, ReadingFullTestResult, ReadingPassageFull, ReadingQuestion } from "@/lib/types";
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
import PassageAnnotator from "./PassageAnnotator";
import NotePanel from "./NotePanel";

interface Props {
  testId: string;
  onComplete: (result: ReadingFullTestResult) => void;
  onClose: () => void;
}

const BUDGET_SECONDS = 60 * 60;

type Phase = "loading" | "running" | "submitting";

export default function FullTestRunner({ testId, onComplete, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [data, setData] = useState<ReadingFullTestData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Timer — derived from wall-clock diff so background-tab throttle of
  // setInterval (browsers clamp to ~1/min when hidden) cannot stretch
  // the exam. setInterval here only forces re-render; remaining time is
  // always recomputed from Date.now() − startTimeMs. visibilitychange
  // forces an immediate re-render when the tab comes back so the user
  // sees the correct time without waiting for the next tick.
  const startTimeMsRef = useRef<number | null>(null);
  const [, setTick] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warningsFiredRef = useRef<{ ten: boolean; five: boolean; one: boolean; zero: boolean }>({ ten: false, five: false, one: false, zero: false });
  const [toast, setToast] = useState<string | null>(null);

  const elapsed = startTimeMsRef.current === null
    ? 0
    : Math.min(BUDGET_SECONDS, Math.floor((Date.now() - startTimeMsRef.current) / 1000));

  // Per-section state
  const [activeSection, setActiveSection] = useState(0);
  const [answersBySection, setAnswersBySection] = useState<Record<number, Record<number, string>>>({});
  const [flagsBySection, setFlagsBySection] = useState<Record<number, Record<number, boolean>>>({});
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [notesByPassage, setNotesByPassage] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const d = await startReadingFullTest(testId);
        if (!d.passages || d.passages.length < 3) {
          setError("Bài thi không đủ 3 passages.");
          return;
        }
        setData(d);
        setPhase("running");
      } catch {
        setError("Không bắt đầu được Full Test.");
      }
    })();
  }, [testId]);

  useEffect(() => {
    if (phase !== "running") return;
    if (startTimeMsRef.current === null) startTimeMsRef.current = Date.now();
    timerRef.current = setInterval(() => setTick((n) => n + 1), 1000);
    const onVisibility = () => { if (!document.hidden) setTick((n) => n + 1); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [phase]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(id);
  }, [toast]);

  const remaining = Math.max(0, BUDGET_SECONDS - elapsed);

  const submit = useCallback(async () => {
    if (!data) return;
    setPhase("submitting");
    if (timerRef.current) clearInterval(timerRef.current);

    const passageResults = data.passages.map((p, i) => {
      const answers = answersBySection[i] ?? {};
      return {
        passage_id: p.passage.id,
        answers: p.questions.map((q) => ({
          question_id: q.id,
          order_index: q.order_index,
          answer: answers[q.order_index] ?? "",
        })),
      };
    });

    const timeSeconds = startTimeMsRef.current === null
      ? 0
      : Math.min(BUDGET_SECONDS, Math.floor((Date.now() - startTimeMsRef.current) / 1000));

    try {
      const result = await submitReadingFullTest({
        passage_results: passageResults,
        time_seconds: timeSeconds,
        started_at: data.started_at,
      });
      onComplete(result);
    } catch {
      setPhase("running");
      setError("Không nộp bài được. Thử lại.");
    }
  }, [data, answersBySection, onComplete]);

  useEffect(() => {
    if (phase !== "running") return;
    const w = warningsFiredRef.current;
    if (!w.ten && remaining <= 600) { w.ten = true; setToast("Còn 10 phút"); }
    if (!w.five && remaining <= 300) { w.five = true; setToast("Còn 5 phút"); }
    if (!w.one && remaining <= 60)   { w.one = true; setToast("Còn 1 phút — cố lên!"); }
    if (!w.zero && remaining <= 0) {
      w.zero = true;
      setToast("Hết giờ — nộp bài tự động");
      submit();
    }
  }, [remaining, phase, submit]);

  const totals = useMemo(() => {
    if (!data) return { answered: 0, flagged: 0, totalQs: 0 };
    let answered = 0, flagged = 0, totalQs = 0;
    data.passages.forEach((p, i) => {
      totalQs += p.questions.length;
      const a = answersBySection[i] ?? {};
      const f = flagsBySection[i] ?? {};
      answered += Object.values(a).filter(Boolean).length;
      flagged += Object.values(f).filter(Boolean).length;
    });
    return { answered, flagged, totalQs };
  }, [data, answersBySection, flagsBySection]);

  if (phase === "loading") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
        <div className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {error ?? "Đang tải Full Test…"}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const passage: ReadingPassageFull = data.passages[activeSection];
  const sectionAnswers = answersBySection[activeSection] ?? {};
  const sectionFlags = flagsBySection[activeSection] ?? {};

  const setSectionAnswer = (orderIndex: number, answer: string) => {
    setAnswersBySection((prev) => ({
      ...prev,
      [activeSection]: { ...(prev[activeSection] ?? {}), [orderIndex]: answer },
    }));
  };
  const toggleSectionFlag = (orderIndex: number) => {
    setFlagsBySection((prev) => {
      const cur = prev[activeSection] ?? {};
      return { ...prev, [activeSection]: { ...cur, [orderIndex]: !cur[orderIndex] } };
    });
  };

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const lowTime = remaining <= 300;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--color-bg)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ background: "var(--color-bg-card)", borderBottom: "1px solid var(--color-border)" }}>
        <button onClick={onClose} className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--color-bg-secondary)" }} aria-label="Thoát">
          <span style={{ color: "var(--color-text)" }}>←</span>
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate" style={{ color: "var(--color-text)" }}>{data.test_title ?? "Full Test"}</div>
          <div className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
            {totals.answered}/{totals.totalQs} đã trả lời • {totals.flagged} đánh dấu
          </div>
        </div>
        <button
          type="button"
          onClick={() => setNoteOpen((v) => !v)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-base"
          style={{
            background: noteOpen ? "rgba(0,168,150,0.12)" : "var(--color-bg-secondary)",
            color: noteOpen ? "#00A896" : "var(--color-text-secondary)",
            border: `1px solid ${noteOpen ? "rgba(0,168,150,0.3)" : "var(--color-border)"}`,
          }}
          aria-label={noteOpen ? "Đóng ghi chú" : "Mở ghi chú"}
          aria-pressed={noteOpen}
        >
          📝
        </button>
        <div
          className="font-mono text-base px-3 py-1.5 rounded-lg"
          style={{
            background: lowTime ? "rgba(239,68,68,0.12)" : "var(--color-bg-secondary)",
            color: lowTime ? "#EF4444" : "var(--color-text)",
            border: `1px solid ${lowTime ? "rgba(239,68,68,0.4)" : "var(--color-border)"}`,
          }}
          aria-label="Thời gian còn lại"
        >
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex shrink-0" style={{ background: "var(--color-bg-card)", borderBottom: "1px solid var(--color-border)" }}>
        {data.passages.map((p, i) => {
          const a = answersBySection[i] ?? {};
          const filled = Object.values(a).filter(Boolean).length;
          const active = i === activeSection;
          return (
            <button
              key={p.passage.id}
              onClick={() => setActiveSection(i)}
              className="flex-1 py-2.5 px-2 text-xs font-medium transition-all"
              style={{
                background: active ? "var(--color-accent)" : "transparent",
                color: active ? "#fff" : "var(--color-text-secondary)",
                borderRight: i < data.passages.length - 1 ? "1px solid var(--color-border)" : "none",
              }}
            >
              <div>Passage {i + 1}</div>
              <div className="text-[10px] mt-0.5 opacity-80">{filled}/{p.questions.length}</div>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-hidden">
        <FullTestSplitView
          key={activeSection}
          passage={passage}
          answers={sectionAnswers}
          flagged={sectionFlags}
          onAnswer={setSectionAnswer}
          onToggleFlag={toggleSectionFlag}
        />
      </div>

      <div className="px-4 py-3 shrink-0" style={{ background: "var(--color-bg-card)", borderTop: "1px solid var(--color-border)" }}>
        <button
          onClick={() => setShowSubmitModal(true)}
          disabled={phase !== "running"}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          style={{ background: "#00A896", color: "#fff" }}
        >
          {phase === "submitting" ? "Đang nộp..." : "Nộp bài"}
        </button>
      </div>

      {showSubmitModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-sm rounded-xl p-5 text-center" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
            <div className="text-base font-semibold mb-2" style={{ color: "var(--color-text)" }}>Nộp bài và xem kết quả?</div>
            <div className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
              Đã trả lời: <strong>{totals.answered}/{totals.totalQs}</strong> câu
              {totals.flagged > 0 && <> • Đã đánh dấu: <strong>{totals.flagged}</strong></>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowSubmitModal(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-secondary)" }}>
                Xem lại
              </button>
              <button
                onClick={() => { setShowSubmitModal(false); submit(); }}
                disabled={phase !== "running"}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: "#00A896", color: "#fff" }}
              >
                Nộp bài
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-lg text-sm font-medium shadow-lg"
          style={{ background: "rgba(245,158,11,0.95)", color: "#fff" }}
          role="status"
        >
          {toast}
        </div>
      )}

      <NotePanel
        open={noteOpen}
        value={notesByPassage[passage.passage.id] ?? ""}
        onChange={(next) => setNotesByPassage((prev) => ({ ...prev, [passage.passage.id]: next }))}
        onClose={() => setNoteOpen(false)}
        passageTitle={`Passage ${activeSection + 1} — ${passage.passage.passage_title}`}
      />
    </div>
  );
}

// ─── Section split view ──────────────────────────────────────────
// Standalone passage + questions panel that mirrors ReadingScreen's
// split layout but operates on parent-owned state so per-section
// answers persist across tab switches.

function FullTestSplitView({
  passage,
  answers,
  flagged,
  onAnswer,
  onToggleFlag,
}: {
  passage: ReadingPassageFull;
  answers: Record<number, string>;
  flagged: Record<number, boolean>;
  onAnswer: (orderIndex: number, a: string) => void;
  onToggleFlag: (orderIndex: number) => void;
}) {
  const [mobileTab, setMobileTab] = useState<"passage" | "questions">("passage");
  const questions = passage.questions;

  return (
    <div className="h-full flex flex-col">
      <div className="md:hidden flex shrink-0" style={{ background: "var(--color-bg-card)", borderBottom: "1px solid var(--color-border)" }}>
        {(["passage", "questions"] as const).map((tab) => (
          <button key={tab} onClick={() => setMobileTab(tab)}
            className="flex-1 py-2 text-xs font-medium capitalize transition-all"
            style={{
              background: mobileTab === tab ? "var(--color-bg-secondary)" : "transparent",
              color: mobileTab === tab ? "var(--color-text)" : "var(--color-text-secondary)",
            }}>
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className={`${mobileTab === "passage" ? "block" : "hidden"} md:block md:w-[55%] overflow-y-auto p-5`}>
          <h3 className="text-lg font-display font-bold mb-4" style={{ color: "var(--color-text)" }}>
            {passage.passage.passage_title}
          </h3>
          <PassageAnnotator passageKey={passage.passage.id}>
            <div
              className="text-[15px] leading-[1.8] whitespace-pre-wrap"
              style={{ color: "var(--color-text)", fontFamily: 'Georgia, "Times New Roman", Times, serif' }}
            >
              {passage.passage.passage_text}
            </div>
          </PassageAnnotator>
        </div>

        <div className="hidden md:block w-px shrink-0" style={{ background: "var(--color-border)" }} />

        <div className={`${mobileTab === "questions" ? "block" : "hidden"} md:block md:w-[45%] overflow-y-auto p-5`}>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {questions.map((q) => {
              const ans = !!answers[q.order_index];
              const flag = !!flagged[q.order_index];
              return (
                <button
                  key={q.order_index}
                  onClick={() => document.getElementById(`ftq-${q.order_index}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold"
                  style={{
                    background: ans ? "rgba(0,168,150,0.15)" : "var(--color-bg-secondary)",
                    color: ans ? "#00A896" : "var(--color-text-tertiary)",
                    border: `1px solid ${flag ? "#F59E0B" : ans ? "rgba(0,168,150,0.3)" : "var(--color-border)"}`,
                  }}
                >
                  {q.order_index}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-5">
            {questions.map((q) => (
              <div key={q.order_index} id={`ftq-${q.order_index}`} className="rounded-lg p-4" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
                <div className="flex items-start gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0" style={{ background: "rgba(0,168,150,0.12)", color: "#00A896" }}>
                    {q.order_index}
                  </span>
                  <span className="text-xs font-medium uppercase px-1.5 py-0.5 rounded" style={{ background: "rgba(0,168,150,0.08)", color: "#00A896" }}>
                    {q.type.toUpperCase()}
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggleFlag(q.order_index)}
                    aria-label={flagged[q.order_index] ? "Bỏ đánh dấu" : "Đánh dấu xem lại"}
                    className="ml-auto w-6 h-6 rounded-md flex items-center justify-center"
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
                {renderQuestion(q, answers[q.order_index] || "", (a) => onAnswer(q.order_index, a))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function renderQuestion(
  q: ReadingQuestion,
  answer: string,
  onAnswer: (a: string) => void,
) {
  switch (q.type) {
    case "mcq":
    case "matching":
      return <MatchingQuestion q={q} answer={answer} onAnswer={onAnswer} renderAs={q.type === "mcq" ? "dropdown" : "dragdrop"} />;
    case "tfng":
      return (
        <div className="flex gap-2">
          {["TRUE", "FALSE", "NOT GIVEN"].map((opt) => (
            <button key={opt} onClick={() => onAnswer(opt)}
              className="flex-1 py-3 rounded-lg text-xs font-semibold"
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
    case "ynng":
      return <YnngQuestion answer={answer} onAnswer={onAnswer} />;
    case "matching_headings":
      return <MatchingHeadingsQuestion options={q.options} answer={answer} onAnswer={onAnswer} />;
    case "sentence_completion":
      return <SentenceCompletionQuestion options={q.options} answer={answer} onAnswer={onAnswer} />;
    case "summary_completion":
      return <SummaryCompletionQuestion options={q.options} answer={answer} onAnswer={onAnswer} />;
    case "matching_information":
      return <MatchingInformationQuestion options={q.options} answer={answer} onAnswer={onAnswer} />;
    case "matching_features":
      return <MatchingFeaturesQuestion options={q.options} answer={answer} onAnswer={onAnswer} />;
    case "matching_sentence_endings":
      return <MatchingSentenceEndingsQuestion options={q.options} answer={answer} onAnswer={onAnswer} />;
    case "note_table_diagram_completion":
      return <NoteTableDiagramCompletion options={q.options} answer={answer} onAnswer={onAnswer} />;
    case "short_answer":
      return <ShortAnswerQuestion options={q.options} answer={answer} onAnswer={onAnswer} />;
    default:
      return (
        <div className="text-xs italic" style={{ color: "var(--color-text-tertiary)" }}>
          Dạng câu hỏi này đang được cập nhật.
        </div>
      );
  }
}
