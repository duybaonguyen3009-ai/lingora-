"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useLessonDetail } from "@/hooks/useLessonDetail";
import { completeLesson } from "@/lib/api";
import type { ApiCompleteResult } from "@/lib/api";
import VocabSection from "./VocabSection";
import QuizSection from "./QuizSection";
import SpeakingSection from "./SpeakingSection";
import CompletionScreen from "./CompletionScreen";
import LevelUpModal from "@/components/LevelUpModal";
import BadgeToast from "@/components/BadgeToast";

interface LessonModalProps {
  lessonId:   string;
  userId:     string;
  onClose:    () => void;
  onComplete: () => void; // called after progress is saved so caller can refresh
  /** Title of the next lesson in the sequence (if any). Shows "Next Lesson" button. */
  nextLessonTitle?: string;
  /** Called when user clicks "Next Lesson" on completion screen. */
  onNextLesson?: () => void;
  /** Daily XP earned today (for completion screen daily goal display). */
  dailyXp?: number;
  /** Daily XP goal target (for completion screen daily goal display). */
  dailyGoalTarget?: number;
}

type Step = "vocab" | "quiz" | "speaking" | "complete";

export default function LessonModal({
  lessonId,
  userId,
  onClose,
  onComplete,
  nextLessonTitle,
  onNextLesson,
  dailyXp,
  dailyGoalTarget,
}: LessonModalProps) {
  const { detail, loading, error } = useLessonDetail(lessonId);
  const [step,             setStep]             = useState<Step | null>(null);
  const [quizScore,        setQuizScore]        = useState(0);
  const [speakingScore,    setSpeakingScore]    = useState<number | null>(null);
  const [saving,           setSaving]           = useState(false);
  const [completionResult, setCompletionResult] = useState<ApiCompleteResult | null>(null);
  const [showLevelUp,      setShowLevelUp]      = useState(false);

  // Track when lesson content was first shown so we can compute timeTakenMs.
  const lessonStartRef = useRef<number | null>(null);

  // Determine the first non-empty step once data is loaded.
  useEffect(() => {
    if (!detail) return;
    if (detail.vocab.length > 0)    { setStep("vocab");    return; }
    if (detail.quiz.length > 0)     { setStep("quiz");     return; }
    if (detail.speaking.length > 0) { setStep("speaking"); return; }
    setStep("complete");
  }, [detail]);

  // Record start time when user first sees lesson content.
  useEffect(() => {
    if (step && step !== "complete" && !lessonStartRef.current) {
      lessonStartRef.current = Date.now();
    }
  }, [step]);

  function nextStep(from: Step, score?: number) {
    if (!detail) return;

    if (from === "vocab") {
      if (detail.quiz.length > 0)     { setStep("quiz");     return; }
      if (detail.speaking.length > 0) { setStep("speaking"); return; }
    }
    if (from === "quiz") {
      if (score !== undefined) setQuizScore(score);
      if (detail.speaking.length > 0) { setStep("speaking"); return; }
    }
    if (from === "speaking" && score !== undefined) {
      setSpeakingScore(score);
    }

    // Reached the end — combine quiz and speaking scores then save.
    const hasQuiz = detail.quiz.length > 0;
    const hasSpeaking = detail.speaking.length > 0;
    const qScore = from === "quiz" && score !== undefined ? score : quizScore;
    const sScore = from === "speaking" && score !== undefined ? score : (speakingScore ?? 0);

    let finalScore: number;
    if (hasQuiz && hasSpeaking) {
      finalScore = Math.round((qScore + sScore) / 2);
    } else if (hasQuiz) {
      finalScore = qScore;
    } else if (hasSpeaking) {
      finalScore = sScore;
    } else {
      finalScore = 100;
    }

    handleComplete(finalScore);
  }

  async function handleComplete(score: number) {
    setSaving(true);
    const timeTakenMs = lessonStartRef.current
      ? Date.now() - lessonStartRef.current
      : undefined;
    try {
      const result = await completeLesson(lessonId, userId, score, timeTakenMs);
      setCompletionResult(result);
      onComplete(); // refresh progress + gamification in parent
      if (result.leveledUp) setShowLevelUp(true);
    } catch {
      // Non-critical — still show completion screen with fallback values.
    } finally {
      setSaving(false);
      setStep("complete");
    }
  }

  const stepLabels: Record<Step, string> = {
    vocab:    "Vocabulary",
    quiz:     "Quiz",
    speaking: "Speaking",
    complete: "Done",
  };

  const steps: Step[] = (detail
    ? ([
        detail.vocab.length > 0    ? "vocab"    : null,
        detail.quiz.length > 0     ? "quiz"     : null,
        detail.speaking.length > 0 ? "speaking" : null,
        "complete",
      ] as (Step | null)[]).filter(Boolean) as Step[]
    : []);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "color-mix(in srgb, var(--color-bg) 85%, transparent)", backdropFilter: "blur(8px)" }}
      >
        {/* Panel */}
        <div
          className="relative w-full max-w-[480px] sm:max-w-[560px] max-h-[90vh] overflow-y-auto rounded-lg shadow-xl"
          style={{ border: "1px solid var(--color-border)", background: "var(--color-bg)", boxShadow: "0 25px 60px rgba(0,0,0,0.6)" }}
        >
          {/* Close button */}
          <button
            onClick={() => {
              if (confirm("Quit this lesson? Your progress won't be saved.")) {
                onClose();
              }
            }}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-normal text-base"
            style={{ background: "var(--color-primary-soft)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
          >
            ×
          </button>

          <div className="p-6">
            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center gap-4 py-16">
                <div className="w-8 h-8 rounded-full animate-spin" style={{ border: "2px solid color-mix(in srgb, var(--color-success) 30%, transparent)", borderTopColor: "var(--color-success)" }} />
                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Loading lesson…</p>
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div className="py-16 text-center space-y-2">
                <p style={{ color: "var(--color-text-secondary)" }}>Could not load lesson.</p>
                <p className="text-xs" style={{ color: "color-mix(in srgb, var(--color-text-secondary) 50%, transparent)" }}>{error}</p>
              </div>
            )}

            {/* Content */}
            {detail && step && !loading && (
              <>
                {/* Step progress tabs (hidden on complete screen) */}
                {step !== "complete" && steps.length > 1 && (
                  <div className="flex items-center gap-1 mb-6">
                    {steps.filter((s) => s !== "complete").map((s) => (
                      <div
                        key={s}
                        className="flex-1 h-1 rounded-full transition-all duration-normal"
                        style={{
                          background:
                            s === step
                              ? "var(--color-success)"
                              : steps.indexOf(s) < steps.indexOf(step)
                              ? "color-mix(in srgb, var(--color-success) 40%, transparent)"
                              : "var(--color-border)",
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Section label */}
                {step !== "complete" && (
                  <div className="mb-5">
                    <h2 className="text-lg font-sora font-bold" style={{ color: "var(--color-text)" }}>
                      {detail.lesson.title}
                    </h2>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: "var(--color-success)" }}>
                      {stepLabels[step]}
                    </p>
                  </div>
                )}

                {step === "vocab" && (
                  <VocabSection items={detail.vocab} onContinue={() => nextStep("vocab")} />
                )}
                {step === "quiz" && (
                  <QuizSection items={detail.quiz} onContinue={(score) => nextStep("quiz", score)} />
                )}
                {step === "speaking" && (
                  <SpeakingSection
                    items={detail.speaking}
                    lessonId={lessonId}
                    userId={userId}
                    onContinue={(score) => nextStep("speaking", score)}
                  />
                )}
                {step === "complete" && saving && (
                  <div className="flex flex-col items-center gap-4 py-16">
                    <div className="w-8 h-8 rounded-full animate-spin" style={{ border: "2px solid color-mix(in srgb, var(--color-success) 30%, transparent)", borderTopColor: "var(--color-success)" }} />
                    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Saving progress…</p>
                  </div>
                )}
                {step === "complete" && !saving && (
                  <CompletionScreen
                    lessonTitle={detail.lesson.title}
                    xpEarned={completionResult?.xpEarned ?? 0}
                    quizScore={quizScore}
                    speakingScore={speakingScore ?? undefined}
                    streak={completionResult?.streak}
                    onClose={onClose}
                    nextLessonTitle={nextLessonTitle}
                    onNextLesson={onNextLesson}
                    dailyXp={dailyXp != null && completionResult
                      ? dailyXp + (completionResult.xpEarned ?? 0)
                      : dailyXp}
                    dailyGoal={dailyGoalTarget}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Level-up modal — rendered above the lesson panel */}
      {showLevelUp && completionResult && (
        <LevelUpModal
          level={completionResult.level}
          onClose={() => setShowLevelUp(false)}
        />
      )}

      {/* Badge toasts — bottom-right corner */}
      {completionResult && completionResult.newBadges.length > 0 && (
        <BadgeToast badges={completionResult.newBadges} />
      )}
    </>
  );
}
