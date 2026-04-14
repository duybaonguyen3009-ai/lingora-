"use client";

/**
 * WritingTab.tsx — Main IELTS Writing container.
 *
 * Phase state machine: intro → editor → pending → result → history
 * Includes: task type toggle, question input, textarea with live word count,
 * submit button, usage indicator, countdown timer, and navigation between phases.
 */

import { useState, useCallback, useEffect } from "react";
import { submitWritingEssay } from "@/lib/api";
import { useWritingResult } from "@/hooks/useWritingResult";
import WritingResult from "./WritingResult";
import WritingHistory from "./WritingHistory";
import type { WritingTaskType } from "@/lib/types";

interface WritingTabProps {
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_WORDS: Record<WritingTaskType, number> = { task1: 150, task2: 250 };
const TIMER_SECONDS: Record<WritingTaskType, number> = { task1: 1200, task2: 2400 };

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Phase = "intro" | "editor" | "pending" | "result" | "history";

export default function WritingTab({ onClose }: WritingTabProps) {
  // Phase management — starts with intro
  const [phase, setPhase] = useState<Phase>("intro");

  // Editor state
  const [taskType, setTaskType] = useState<WritingTaskType>("task2");
  const [questionText, setQuestionText] = useState("");
  const [essayText, setEssayText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Timer state
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerStarted, setTimerStarted] = useState(false);

  // Result state
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const { submission, loading: resultLoading, polling } = useWritingResult(
    phase === "pending" || phase === "result" ? activeSubmissionId : null
  );

  // ---------------------------------------------------------------------------
  // Intro phase — auto-advance after 1.5s
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (phase === "intro") {
      const t = setTimeout(() => setPhase("editor"), 1500);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // ---------------------------------------------------------------------------
  // Countdown timer
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!timerStarted || timeLeft === null || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => (t !== null ? t - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerStarted, timeLeft]);

  // When polling completes, move to result phase
  if (phase === "pending" && submission && submission.status !== "pending") {
    setPhase("result");
  }

  const wordCount = countWords(essayText);
  const minRequired = MIN_WORDS[taskType];
  const isValid = wordCount >= minRequired && questionText.trim().length > 0;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  // Handle task type switch — resets essay and timer
  const handleTaskSwitch = useCallback((type: WritingTaskType) => {
    setTaskType(type);
    setQuestionText("");
    setEssayText("");
    setTimeLeft(null);
    setTimerStarted(false);
  }, []);

  // Handle essay text change — starts timer on first keystroke
  const handleEssayChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value;
      // Start timer on first keystroke
      if (essayText === "" && newText.length > 0 && !timerStarted) {
        setTimeLeft(TIMER_SECONDS[taskType]);
        setTimerStarted(true);
      }
      setEssayText(newText);
    },
    [essayText, timerStarted, taskType]
  );

  // Submit essay
  const handleSubmit = useCallback(async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const result = await submitWritingEssay({
        taskType,
        questionText: questionText.trim(),
        essayText: essayText.trim(),
      });
      setActiveSubmissionId(result.submissionId);
      setPhase("pending");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }, [isValid, submitting, taskType, questionText, essayText]);

  // View a submission from history
  const handleHistorySelect = useCallback((submissionId: string) => {
    setActiveSubmissionId(submissionId);
    setPhase("result");
  }, []);

  // Reset to editor
  const handleNewEssay = useCallback(() => {
    setPhase("editor");
    setEssayText("");
    setQuestionText("");
    setActiveSubmissionId(null);
    setSubmitError(null);
    setTimeLeft(null);
    setTimerStarted(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Timer display helpers
  // ---------------------------------------------------------------------------

  const timerColor =
    timeLeft !== null && timeLeft < 60
      ? "#EF4444"
      : timeLeft !== null && timeLeft < 300
        ? "#F59E0B"
        : "var(--color-text-secondary)";

  const timerBold = timeLeft !== null && timeLeft < 60;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "var(--color-bg)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{
          background: "var(--color-bg-card)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: "var(--color-bg-secondary)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-text)" }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="font-display font-bold text-base" style={{ color: "var(--color-text)" }}>
            IELTS Writing
          </div>
          <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            {phase === "intro" && "Preparing..."}
            {phase === "editor" && "Write your essay"}
            {phase === "pending" && "Analyzing your essay..."}
            {phase === "result" && "Your results"}
            {phase === "history" && "Past submissions"}
          </div>
        </div>

        {/* Timer + History button */}
        {phase === "editor" && (
          <div className="flex items-center gap-2">
            {timerStarted && timeLeft !== null && (
              <span
                className={`text-sm font-mono ${timerBold ? "font-bold" : ""}`}
                style={{ color: timerColor }}
              >
                {formatTime(timeLeft)}
              </span>
            )}
            <button
              onClick={() => setPhase("history")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: "var(--color-bg-secondary)",
                color: "var(--color-text-secondary)",
              }}
            >
              History
            </button>
          </div>
        )}
        {(phase === "history" || phase === "result") && (
          <button
            onClick={handleNewEssay}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{
              background: "rgba(0,168,150,0.10)",
              color: "#00A896",
            }}
          >
            New Essay
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* ── INTRO PHASE ── */}
        {phase === "intro" && (
          <div className="flex flex-col items-center justify-center py-20 gap-6">
            <div className="text-4xl">📋</div>
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
                Examiner is preparing your test...
              </p>
              <p className="text-sm mt-2" style={{ color: "var(--color-text-secondary)" }}>
                Please wait a moment
              </p>
            </div>
          </div>
        )}

        {/* ── EDITOR PHASE ── */}
        {phase === "editor" && (
          <div className="flex flex-col gap-5 max-w-2xl mx-auto">
            {/* Task Type Toggle + Timer */}
            <div className="flex items-center gap-3">
              <div
                className="flex rounded-xl overflow-hidden flex-1"
                style={{ background: "var(--surface-primary)", border: "1px solid var(--surface-border)", boxShadow: "var(--surface-shadow)" }}
              >
                {(["task1", "task2"] as WritingTaskType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => handleTaskSwitch(t)}
                    className="flex-1 py-2.5 text-sm font-medium transition-all cursor-pointer"
                    style={{
                      background: taskType === t ? "var(--color-accent)" : "transparent",
                      color: taskType === t ? "#fff" : "var(--color-text-secondary)",
                    }}
                  >
                    {t === "task1" ? "Task 1 (20 min)" : "Task 2 (40 min)"}
                  </button>
                ))}
              </div>

              {/* Prominent timer */}
              {timerStarted && timeLeft !== null && (
                <div
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl shrink-0"
                  style={{
                    background: timeLeft < 60 ? "rgba(239,68,68,0.08)" : timeLeft < 300 ? "rgba(245,158,11,0.08)" : "var(--surface-primary)",
                    border: `1px solid ${timeLeft < 60 ? "rgba(239,68,68,0.2)" : timeLeft < 300 ? "rgba(245,158,11,0.2)" : "var(--surface-border)"}`,
                    boxShadow: "var(--surface-shadow)",
                  }}
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: timerColor }}>
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span className={`text-sm font-mono ${timerBold ? "font-bold" : "font-medium"}`} style={{ color: timerColor }}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              )}
            </div>

            {/* Question */}
            <div
              className="rounded-xl p-5"
              style={{ background: "var(--surface-primary)", border: "1px solid var(--surface-border)", boxShadow: "var(--surface-shadow)" }}
            >
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                Question / Prompt
              </label>
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder={
                  taskType === "task1"
                    ? "Paste or type the Task 1 question here (e.g., describe the chart)..."
                    : "Paste or type the Task 2 essay question here..."
                }
                rows={3}
                className="w-full rounded-lg px-4 py-3 text-sm resize-none transition-colors focus:outline-none"
                style={{
                  background: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#00A896"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,168,150,0.1)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>

            {/* Essay Textarea */}
            <div
              className="rounded-xl p-5"
              style={{ background: "var(--surface-primary)", border: "1px solid var(--surface-border)", boxShadow: "var(--surface-shadow)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-text-tertiary)" }}>
                  Your Essay
                </label>
                {/* Live word count badge */}
                <span
                  className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                  style={{
                    background: wordCount >= minRequired
                      ? "rgba(22,163,74,0.08)"
                      : wordCount > 0
                        ? "rgba(239,68,68,0.08)"
                        : "var(--surface-subtle)",
                    color: wordCount >= minRequired
                      ? "#16A34A"
                      : wordCount > 0
                        ? "#EF4444"
                        : "var(--color-text-tertiary)",
                  }}
                >
                  {wordCount} / {minRequired} words
                </span>
              </div>
              <textarea
                value={essayText}
                onChange={handleEssayChange}
                placeholder={`Start writing your ${taskType === "task1" ? "Task 1" : "Task 2"} response...\n\nMinimum ${minRequired} words required. Timer starts on first keystroke.`}
                rows={16}
                maxLength={5000}
                className="w-full rounded-lg px-4 py-3 text-sm leading-[1.8] resize-none transition-colors focus:outline-none"
                style={{
                  background: "var(--color-bg-secondary)",
                  border: `1px solid ${wordCount > 0 && wordCount < minRequired ? "rgba(239,68,68,0.3)" : "var(--color-border)"}`,
                  color: "var(--color-text)",
                  minHeight: "320px",
                }}
                onFocus={(e) => {
                  if (!(wordCount > 0 && wordCount < minRequired)) {
                    e.currentTarget.style.borderColor = "#00A896";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,168,150,0.1)";
                  }
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = wordCount > 0 && wordCount < minRequired ? "rgba(239,68,68,0.3)" : "var(--color-border)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              {/* Word count progress bar */}
              <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "var(--surface-skeleton)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min((wordCount / minRequired) * 100, 100)}%`,
                    background: wordCount >= minRequired ? "#16A34A" : wordCount > minRequired * 0.5 ? "#F59E0B" : "#EF4444",
                  }}
                />
              </div>
            </div>

            {/* Submit Error */}
            {submitError && (
              <div
                className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
                style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {submitError}
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!isValid || submitting}
              className="w-full py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer"
              style={{
                background: isValid ? "linear-gradient(135deg, #00A896, #00C4B0)" : "var(--surface-primary)",
                color: isValid ? "#fff" : "var(--color-text-tertiary)",
                border: isValid ? "none" : "1px solid var(--surface-border)",
                boxShadow: isValid ? "0 4px 16px rgba(0,168,150,0.25)" : "var(--surface-shadow)",
              }}
            >
              {submitting ? "Đang nộp..." : `Nộp bài chấm điểm (${wordCount} từ)`}
            </button>
          </div>
        )}

        {/* ── PENDING PHASE ── */}
        {phase === "pending" && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div
              className="w-12 h-12 border-3 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "#F59E0B", borderTopColor: "transparent", borderWidth: "3px" }}
            />
            <div className="text-center">
              <p className="text-base font-semibold" style={{ color: "var(--color-text)" }}>
                Analyzing your essay
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
                Our AI examiner is scoring your writing...
              </p>
              {polling && (
                <p className="text-xs mt-2" style={{ color: "var(--color-text-tertiary)" }}>
                  This usually takes 10-30 seconds
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── RESULT PHASE ── */}
        {phase === "result" && submission && (
          <div className="max-w-2xl mx-auto">
            <WritingResult
              submission={submission}
              onBack={handleNewEssay}
            />
          </div>
        )}

        {phase === "result" && resultLoading && !submission && (
          <div className="flex items-center justify-center py-16">
            <div
              className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
            />
          </div>
        )}

        {/* ── HISTORY PHASE ── */}
        {phase === "history" && (
          <div className="max-w-2xl mx-auto">
            <WritingHistory onSelect={handleHistorySelect} />
          </div>
        )}
      </div>
    </div>
  );
}
