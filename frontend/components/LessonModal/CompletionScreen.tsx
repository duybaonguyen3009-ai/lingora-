"use client";

import { useEffect, useState } from "react";

interface CompletionScreenProps {
  lessonTitle:    string;
  xpEarned:       number;
  quizScore:      number;
  speakingScore?: number;
  streak?:        number;
  onClose:        () => void;
}

export default function CompletionScreen({
  lessonTitle,
  xpEarned,
  quizScore,
  speakingScore,
  streak,
  onClose,
}: CompletionScreenProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Determine highlight and focus area
  const bestScore = Math.max(quizScore, speakingScore ?? 0);
  const highlight =
    bestScore >= 80 ? "Great session!" : bestScore >= 60 ? "Nice effort!" : "Keep practicing!";
  const focusArea =
    speakingScore != null && speakingScore < quizScore
      ? "Focus on speaking practice next time"
      : quizScore < (speakingScore ?? 100)
      ? "Review vocabulary and grammar"
      : "You're well-rounded — keep it up!";

  return (
    <div
      className="flex flex-col items-center gap-5 py-4 transition-all duration-500"
      style={{ opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(12px)" }}
    >
      {/* Trophy */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
        style={{
          background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
          boxShadow: "0 0 32px var(--color-primary-glow)",
        }}
      >
        🏆
      </div>

      <div className="text-center">
        <p className="text-[20px] font-sora font-bold" style={{ color: "var(--color-text)" }}>
          {highlight}
        </p>
        <p className="text-[13px] mt-1" style={{ color: "var(--color-text-secondary)" }}>
          {lessonTitle}
        </p>
      </div>

      {/* Score cards — only shown here, after the full session */}
      <div className="flex gap-3 w-full max-w-[300px]">
        {quizScore > 0 && (
          <div
            className="flex-1 rounded-xl p-4 text-center"
            style={{
              backgroundColor: "var(--color-primary-soft)",
              border: "1px solid var(--color-primary-glow)",
            }}
          >
            <p className="text-[24px] font-bold" style={{ color: "var(--color-primary)" }}>{quizScore}%</p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>Quiz</p>
          </div>
        )}
        {speakingScore != null && speakingScore > 0 && (
          <div
            className="flex-1 rounded-xl p-4 text-center"
            style={{
              backgroundColor: "var(--color-primary-soft)",
              border: "1px solid var(--color-primary-glow)",
            }}
          >
            <p className="text-[24px] font-bold" style={{ color: "var(--color-accent)" }}>{speakingScore}%</p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>Speaking</p>
          </div>
        )}
        {streak != null && streak > 0 && (
          <div
            className="flex-1 rounded-xl p-4 text-center"
            style={{
              backgroundColor: "rgba(251,191,36,0.08)",
              border: "1px solid rgba(251,191,36,0.2)",
            }}
          >
            <p className="text-[24px] font-bold text-amber-400">{streak}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>Streak</p>
          </div>
        )}
      </div>

      {/* Focus area */}
      <p className="text-[13px] text-center px-4" style={{ color: "var(--color-text-secondary)" }}>
        {focusArea}
      </p>

      {/* Actions */}
      <div className="flex gap-3 w-full max-w-[300px]">
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-xl font-semibold text-[14px] text-white transition-all duration-200 hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
