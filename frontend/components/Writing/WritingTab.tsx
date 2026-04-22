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
import { useDailyLimits } from "@/hooks/useDailyLimits";
import UpgradeTrigger from "@/components/Pro/UpgradeTrigger";
import RemainingBadge from "@/components/Pro/RemainingBadge";
import ProUpgradeModal from "@/components/Pro/ProUpgradeModal";
import WritingResult from "./WritingResult";
import WritingHistory from "./WritingHistory";
import WritingTimerBar from "./WritingTimerBar";
import WritingNotesModal from "./WritingNotesModal";
import type { WritingTaskType } from "@/lib/types";

interface WritingTabProps {
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_WORDS: Record<WritingTaskType, number> = { task1: 150, task2: 250 };
// Combined 60-min pool shared across Task 1 + Task 2 (real IELTS behavior).
const TOTAL_TIMER_SECONDS = 3600;
const EMPTY_TASK_BUFFERS: Record<WritingTaskType, string> = { task1: "", task2: "" };

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Phase = "intro" | "editor" | "pending" | "result" | "history";

export default function WritingTab({ onClose }: WritingTabProps) {
  // Phase management — starts with intro
  const [phase, setPhase] = useState<Phase>("intro");
  const limits = useDailyLimits();
  const [proModalOpen, setProModalOpen] = useState(false);

  // Editor state — per-task buffers so the user can freely switch without losing work.
  const [taskType, setTaskType] = useState<WritingTaskType>("task2");
  const [questionTexts, setQuestionTexts] = useState<Record<WritingTaskType, string>>(EMPTY_TASK_BUFFERS);
  const [essayTexts, setEssayTexts] = useState<Record<WritingTaskType, string>>(EMPTY_TASK_BUFFERS);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const questionText = questionTexts[taskType];
  const essayText = essayTexts[taskType];

  // Timer state
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerStarted, setTimerStarted] = useState(false);

  // Exam-input toast (shown when paste is blocked on essay textarea)
  const [pasteToast, setPasteToast] = useState(false);

  // Scratch notes — kept in local state, reset on task switch / submit, NOT persisted to DB
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState<Record<WritingTaskType, string>>({ task1: "", task2: "" });

  useEffect(() => {
    if (!pasteToast) return;
    const t = setTimeout(() => setPasteToast(false), 2000);
    return () => clearTimeout(t);
  }, [pasteToast]);

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

  // Task switch keeps all state — combined-timer mode preserves both buffers + timer.
  const handleTaskSwitch = useCallback((type: WritingTaskType) => {
    setTaskType(type);
    setNotesOpen(false);
  }, []);

  const handleQuestionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const next = e.target.value;
      setQuestionTexts((prev) => ({ ...prev, [taskType]: next }));
    },
    [taskType]
  );

  // Essay change — starts the combined 60-min pool on first keystroke in either task.
  const handleEssayChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value;
      if (!timerStarted && newText.length > 0) {
        setTimeLeft(TOTAL_TIMER_SECONDS);
        setTimerStarted(true);
      }
      setEssayTexts((prev) => ({ ...prev, [taskType]: newText }));
    },
    [timerStarted, taskType]
  );

  // Submit essay
  const handleSubmit = useCallback(async () => {
    if (!isValid || submitting) return;
    // Proactive gate: if the free user has already hit the daily writing limit,
    // open the Pro modal instead of calling the API.
    if (!limits.isPro && !limits.writing.allowed) {
      setProModalOpen(true);
      return;
    }
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
      setNotes(EMPTY_TASK_BUFFERS);
      // Refetch limits so the RemainingBadge updates after a successful submit.
      limits.refetch();
    } catch (err) {
      // Backend returns 403 "Daily writing limit reached" when the gate is hit
      // between the hook's fetch and the user's submit — catch and surface the modal.
      const message = err instanceof Error ? err.message : "Submission failed";
      if (/limit reached/i.test(message) || /403/.test(message)) {
        setProModalOpen(true);
        limits.refetch();
      } else {
        setSubmitError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }, [isValid, submitting, taskType, questionText, essayText, limits]);

  // View a submission from history
  const handleHistorySelect = useCallback((submissionId: string) => {
    setActiveSubmissionId(submissionId);
    setPhase("result");
  }, []);

  // Reset to editor — wipes both task buffers and the combined timer.
  const handleNewEssay = useCallback(() => {
    setPhase("editor");
    setEssayTexts(EMPTY_TASK_BUFFERS);
    setQuestionTexts(EMPTY_TASK_BUFFERS);
    setNotes(EMPTY_TASK_BUFFERS);
    setActiveSubmissionId(null);
    setSubmitError(null);
    setTimeLeft(null);
    setTimerStarted(false);
  }, []);

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
          <div className="font-semibold text-base" style={{ color: "var(--color-text)" }}>
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

        {/* History button */}
        {phase === "editor" && (
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

      {/* Global Timer Bar — combined 60-min pool shared across both tasks */}
      {phase === "editor" && timerStarted && (
        <WritingTimerBar
          timerSeconds={timeLeft}
          totalSeconds={TOTAL_TIMER_SECONDS}
        />
      )}

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
          <div className="flex flex-col gap-4 max-w-[1400px] mx-auto">
            {/* Remaining-count badge (free users only, hides for Pro) */}
            {!limits.loading && !limits.isPro && limits.writing.allowed && (
              <div className="flex justify-start">
                <RemainingBadge type="writing" bucket={limits.writing} />
              </div>
            )}

            {/* Limit-hit banner — shown above the editor when the free user has used all writing submissions */}
            {!limits.loading && !limits.isPro && !limits.writing.allowed && (
              <UpgradeTrigger
                type="writing"
                used={limits.writing.used}
                limit={limits.writing.limit ?? 0}
                onUpgrade={() => setProModalOpen(true)}
              />
            )}

            {/* Task Type Toggle */}
            <div
              className="flex rounded-xl overflow-hidden"
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
                  {t === "task1" ? "Task 1 (~20 min)" : "Task 2 (~40 min)"}
                </button>
              ))}
            </div>

            {/* Split view: prompt panel (left) + answer panel (right) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ── PROMPT PANEL (left) ── */}
              <div
                className="rounded-xl p-5 flex flex-col gap-3"
                style={{ background: "var(--surface-primary)", border: "1px solid var(--surface-border)", boxShadow: "var(--surface-shadow)" }}
              >
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-tertiary)" }}>
                    Question / Prompt
                  </label>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider"
                    style={{ background: "rgba(0,168,150,0.08)", color: "#00A896" }}
                  >
                    {taskType === "task1" ? "Task 1" : "Task 2"}
                  </span>
                </div>

                {/* Task 1 chart placeholder — real chart wired in Item 4 of rework plan */}
                {taskType === "task1" && (
                  <div
                    className="rounded-lg flex flex-col items-center justify-center gap-2 py-8"
                    style={{
                      background: "var(--color-bg-secondary)",
                      border: "1px dashed var(--color-border)",
                      minHeight: "160px",
                    }}
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-text-tertiary)" }}>
                      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                    <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                      Chart / visual data will appear here
                    </p>
                  </div>
                )}

                <textarea
                  value={questionText}
                  onChange={handleQuestionChange}
                  placeholder={
                    taskType === "task1"
                      ? "Paste or type the Task 1 question here (e.g., describe the chart)..."
                      : "Paste or type the Task 2 essay question here..."
                  }
                  rows={taskType === "task1" ? 4 : 8}
                  className="w-full rounded-lg px-4 py-3 text-sm resize-none transition-colors focus:outline-none flex-1"
                  style={{
                    background: "var(--color-bg-secondary)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                    minHeight: "120px",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#00A896"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,168,150,0.1)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>

              {/* ── ANSWER PANEL (right) ── */}
              <div
                className="rounded-xl p-5 flex flex-col gap-3"
                style={{ background: "var(--surface-primary)", border: "1px solid var(--surface-border)", boxShadow: "var(--surface-shadow)" }}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-tertiary)" }}>
                    Your Essay
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNotesOpen(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer"
                      style={{
                        background: notes[taskType].length > 0 ? "rgba(0,168,150,0.10)" : "var(--color-bg-secondary)",
                        color: notes[taskType].length > 0 ? "#00A896" : "var(--color-text-secondary)",
                        border: "1px solid var(--color-border)",
                      }}
                      aria-label="Mở ghi chú"
                    >
                      <span>📝</span>
                      <span>Ghi chú{notes[taskType].length > 0 ? ` (${notes[taskType].length})` : ""}</span>
                    </button>
                    {/* Live word count badge */}
                    <span
                    className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
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
                </div>
                <textarea
                  value={essayText}
                  onChange={handleEssayChange}
                  onPaste={(e) => { e.preventDefault(); setPasteToast(true); }}
                  onContextMenu={(e) => e.preventDefault()}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  placeholder={`Start writing your ${taskType === "task1" ? "Task 1" : "Task 2"} response...\n\nMinimum ${minRequired} words required. Timer starts on first keystroke.`}
                  rows={16}
                  maxLength={5000}
                  className="w-full rounded-lg px-4 py-3 text-sm leading-[1.8] resize-none transition-colors focus:outline-none flex-1"
                  style={{
                    background: "var(--color-bg-secondary)",
                    border: `1px solid ${wordCount > 0 && wordCount < minRequired ? "rgba(239,68,68,0.3)" : "var(--color-border)"}`,
                    color: "var(--color-text)",
                    minHeight: "360px",
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
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--surface-skeleton)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min((wordCount / minRequired) * 100, 100)}%`,
                      background: wordCount >= minRequired ? "#16A34A" : wordCount > minRequired * 0.5 ? "#F59E0B" : "#EF4444",
                    }}
                  />
                </div>
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
              className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer"
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

      {/* Scratch-notes modal */}
      <WritingNotesModal
        open={notesOpen}
        value={notes[taskType]}
        onChange={(next) => setNotes((prev) => ({ ...prev, [taskType]: next }))}
        onClose={() => setNotesOpen(false)}
      />

      {/* Paste-blocked toast */}
      {pasteToast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg"
          style={{
            background: "rgba(27,43,75,0.95)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
          role="status"
        >
          Thi thật không cho phép paste
        </div>
      )}

      <ProUpgradeModal
        isOpen={proModalOpen}
        onClose={() => setProModalOpen(false)}
        onUpgraded={() => {
          setProModalOpen(false);
          limits.refetch();
        }}
      />
    </div>
  );
}
