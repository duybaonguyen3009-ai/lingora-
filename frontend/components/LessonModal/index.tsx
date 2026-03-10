"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useLessonDetail } from "@/hooks/useLessonDetail";
import { completeLesson } from "@/lib/api";
import VocabSection from "./VocabSection";
import QuizSection from "./QuizSection";
import SpeakingSection from "./SpeakingSection";
import CompletionScreen from "./CompletionScreen";

interface LessonModalProps {
  lessonId: string;
  userId: string;
  onClose: () => void;
  onComplete: () => void; // called after progress is saved so caller can refresh
}

type Step = "vocab" | "quiz" | "speaking" | "complete";

export default function LessonModal({
  lessonId,
  userId,
  onClose,
  onComplete,
}: LessonModalProps) {
  const { detail, loading, error } = useLessonDetail(lessonId);
  const [step, setStep] = useState<Step | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [saving, setSaving] = useState(false);

  // Determine the first non-empty step once data is loaded.
  useEffect(() => {
    if (!detail) return;
    if (detail.vocab.length > 0) { setStep("vocab"); return; }
    if (detail.quiz.length > 0)  { setStep("quiz");  return; }
    if (detail.speaking.length > 0) { setStep("speaking"); return; }
    setStep("complete");
  }, [detail]);

  function nextStep(from: Step, score?: number) {
    if (!detail) return;
    if (score !== undefined) setQuizScore(score);

    if (from === "vocab") {
      if (detail.quiz.length > 0)     { setStep("quiz");     return; }
      if (detail.speaking.length > 0) { setStep("speaking"); return; }
    }
    if (from === "quiz") {
      if (detail.speaking.length > 0) { setStep("speaking"); return; }
    }

    // Reached the end — save progress then show completion.
    const finalScore = score !== undefined ? score : quizScore;
    handleComplete(finalScore);
  }

  async function handleComplete(score: number) {
    setSaving(true);
    try {
      await completeLesson(lessonId, userId, score);
      onComplete(); // refresh progress in parent
    } catch {
      // Non-critical — still show completion screen
    } finally {
      setSaving(false);
      setStep("complete");
    }
  }

  const stepLabels: Record<Step, string> = {
    vocab: "Vocabulary",
    quiz: "Quiz",
    speaking: "Speaking",
    complete: "Done",
  };

  const steps: Step[] = (detail
    ? ([
        detail.vocab.length > 0 ? "vocab" : null,
        detail.quiz.length > 0 ? "quiz" : null,
        detail.speaking.length > 0 ? "speaking" : null,
        "complete",
      ] as (Step | null)[]).filter(Boolean) as Step[]
    : []);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(7,26,47,0.85)", backdropFilter: "blur(8px)" }}
    >
      {/* Panel */}
      <div
        className="relative w-full max-w-[480px] max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#071A2F] shadow-2xl"
        style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.6)" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.08] text-[#A6B3C2] hover:text-[#E6EDF3] hover:bg-white/[0.1] flex items-center justify-center transition-all duration-200 text-[16px]"
        >
          ×
        </button>

        <div className="p-6">
          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center gap-4 py-16">
              <div className="w-8 h-8 rounded-full border-2 border-[#2ED3C6]/30 border-t-[#2ED3C6] animate-spin" />
              <p className="text-[#A6B3C2] text-sm">Loading lesson…</p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="py-16 text-center space-y-2">
              <p className="text-[#A6B3C2]">Could not load lesson.</p>
              <p className="text-[#A6B3C2]/50 text-xs">{error}</p>
            </div>
          )}

          {/* Content */}
          {detail && step && !loading && (
            <>
              {/* Step tabs (not shown on complete screen) */}
              {step !== "complete" && steps.length > 1 && (
                <div className="flex items-center gap-1 mb-6">
                  {steps.filter((s) => s !== "complete").map((s) => (
                    <div
                      key={s}
                      className={cn(
                        "flex-1 h-1 rounded-full transition-all duration-300",
                        s === step
                          ? "bg-[#2ED3C6]"
                          : steps.indexOf(s) < steps.indexOf(step)
                          ? "bg-[#2ED3C6]/40"
                          : "bg-white/[0.08]"
                      )}
                    />
                  ))}
                </div>
              )}

              {/* Section label */}
              {step !== "complete" && (
                <div className="mb-5">
                  <h2 className="text-[17px] font-sora font-bold text-[#E6EDF3]">
                    {detail.lesson.title}
                  </h2>
                  <p className="text-[12px] text-[#2ED3C6] font-semibold mt-0.5">
                    {stepLabels[step]}
                  </p>
                </div>
              )}

              {step === "vocab" && (
                <VocabSection
                  items={detail.vocab}
                  onContinue={() => nextStep("vocab")}
                />
              )}
              {step === "quiz" && (
                <QuizSection
                  items={detail.quiz}
                  onContinue={(score) => nextStep("quiz", score)}
                />
              )}
              {step === "speaking" && (
                <SpeakingSection
                  items={detail.speaking}
                  onContinue={() => nextStep("speaking")}
                />
              )}
              {step === "complete" && !saving && (
                <CompletionScreen
                  lessonTitle={detail.lesson.title}
                  xpEarned={10}
                  quizScore={quizScore}
                  onClose={onClose}
                />
              )}
              {step === "complete" && saving && (
                <div className="flex flex-col items-center gap-4 py-16">
                  <div className="w-8 h-8 rounded-full border-2 border-[#2ED3C6]/30 border-t-[#2ED3C6] animate-spin" />
                  <p className="text-[#A6B3C2] text-sm">Saving progress…</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
