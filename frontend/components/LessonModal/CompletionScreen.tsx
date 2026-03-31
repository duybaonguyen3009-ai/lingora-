"use client";

/**
 * CompletionScreen.tsx
 *
 * Celebration moment after completing a lesson.
 * Shows: confetti, mascot, XP counting animation, score cards, streak,
 * daily goal progress, positive feedback, and forward-momentum actions.
 *
 * All new props are optional — backward compatible with callers that
 * don't pass daily goal or next lesson info.
 */

import { useEffect, useState, useRef } from "react";
import Button from "@/components/ui/Button";
import Mascot from "@/components/ui/Mascot";
import useSound from "@/hooks/useSound";

/* ── CSS-only confetti ── */
function Confetti() {
  const pieces = Array.from({ length: 16 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 1.5,
    size: 6 + Math.random() * 6,
    color: [
      "var(--color-primary)",
      "var(--color-accent)",
      "var(--color-success)",
      "var(--color-warning)",
    ][i % 4],
    duration: 2 + Math.random() * 2,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <style>{`
        @keyframes confettiFall {
          0% { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(400px) rotate(720deg); }
        }
        @keyframes mascotBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            top: -20,
            backgroundColor: p.color,
            animation: `confettiFall ${p.duration}s ease-out ${p.delay}s forwards`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}

/* ── XP counting hook ── */
function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || target <= 0) return;
    started.current = true;

    const startTime = performance.now();
    let rafId: number;

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  return value;
}

interface CompletionScreenProps {
  lessonTitle:    string;
  xpEarned:       number;
  quizScore:      number;
  speakingScore?: number;
  streak?:        number;
  onClose:        () => void;
  /** Optional: show "Next Lesson" button when there's a next lesson available. */
  nextLessonTitle?: string;
  onNextLesson?:   () => void;
  /** Optional: daily goal progress after this completion. */
  dailyXp?:        number;
  dailyGoal?:      number;
}

export default function CompletionScreen({
  lessonTitle,
  xpEarned,
  quizScore,
  speakingScore,
  streak,
  onClose,
  nextLessonTitle,
  onNextLesson,
  dailyXp,
  dailyGoal,
}: CompletionScreenProps) {
  const { play } = useSound();
  const [show, setShow] = useState(false);
  const [xpAnimated, setXpAnimated] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShow(true), 50);
    const t2 = setTimeout(() => setXpAnimated(true), 400);
    const t3 = setTimeout(() => play("correct", 0.5), 150);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // XP counting animation — starts when the XP pill animates in
  const xpDisplay = useCountUp(xpAnimated ? xpEarned : 0, 800);

  // Determine highlight message
  const bestScore = Math.max(quizScore, speakingScore ?? 0);
  const highlight =
    bestScore >= 90 ? "Perfect!" :
    bestScore >= 80 ? "Great job!" :
    bestScore >= 60 ? "Nice work!" :
    "Keep going!";

  const focusArea =
    speakingScore != null && speakingScore < quizScore
      ? "Focus on speaking practice next time"
      : quizScore < (speakingScore ?? 100)
      ? "Review vocabulary and grammar"
      : "You're well-rounded — keep it up!";

  // Daily goal
  const hasDailyGoal = dailyXp != null && dailyGoal != null && dailyGoal > 0;
  const dailyPct = hasDailyGoal ? Math.min(100, Math.round((dailyXp! / dailyGoal!) * 100)) : 0;
  const dailyGoalMet = hasDailyGoal && dailyXp! >= dailyGoal!;

  return (
    <div
      className="relative flex flex-col items-center gap-4 py-4 transition-all duration-slow"
      style={{ opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(12px)" }}
    >
      {/* Confetti */}
      <Confetti />

      {/* Mascot with bounce */}
      <div
        style={{
          animation: "mascotBounce 2s ease-in-out infinite",
        }}
      >
        <Mascot size={80} mood="happy" />
      </div>

      {/* Headline — gradient text */}
      <div className="text-center">
        <p
          className="text-xl font-sora font-bold"
          style={{
            background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {highlight}
        </p>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          {lessonTitle}
        </p>
      </div>

      {/* ── XP Earned — hero stat with counting animation ── */}
      {xpEarned > 0 && (
        <div
          className="flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-slow"
          style={{
            background: xpAnimated
              ? "linear-gradient(135deg, rgba(46,211,198,0.15), rgba(45,168,255,0.1))"
              : "transparent",
            border: "1px solid rgba(46,211,198,0.25)",
            transform: xpAnimated ? "scale(1)" : "scale(0.9)",
            opacity: xpAnimated ? 1 : 0,
          }}
        >
          <span className="text-lg font-sora font-bold" style={{ color: "var(--color-success)" }}>
            +{xpDisplay} XP
          </span>
          {bestScore >= 100 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
              Perfect bonus!
            </span>
          )}
        </div>
      )}

      {/* ── Score cards row ── */}
      <div className="flex gap-2.5 w-full max-w-[300px]">
        {quizScore > 0 && (
          <div
            className="flex-1 rounded-xl p-3.5 text-center"
            style={{
              backgroundColor: "var(--color-primary-soft)",
              border: "1px solid var(--color-primary-glow)",
            }}
          >
            <p className="text-xl font-bold" style={{ color: "var(--color-primary)" }}>{quizScore}%</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>Quiz</p>
          </div>
        )}
        {speakingScore != null && speakingScore > 0 && (
          <div
            className="flex-1 rounded-xl p-3.5 text-center"
            style={{
              backgroundColor: "var(--color-primary-soft)",
              border: "1px solid var(--color-primary-glow)",
            }}
          >
            <p className="text-xl font-bold" style={{ color: "var(--color-accent)" }}>{speakingScore}%</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>Speaking</p>
          </div>
        )}
        {streak != null && streak > 0 && (
          <div
            className="flex-1 rounded-xl p-3.5 text-center"
            style={{
              backgroundColor: "var(--color-warning-soft)",
              border: "1px solid color-mix(in srgb, var(--color-warning) 20%, transparent)",
            }}
          >
            <p className="text-xl font-bold text-amber-400">
              {"\u{1F525}"} {streak}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
              Day streak
            </p>
          </div>
        )}
      </div>

      {/* ── Daily Goal progress ── */}
      {hasDailyGoal && (
        <div className="w-full max-w-[300px]">
          <div
            className="rounded-xl px-4 py-3"
            style={{
              border: dailyGoalMet
                ? "1px solid color-mix(in srgb, var(--color-warning) 25%, transparent)"
                : "1px solid var(--color-border)",
              background: dailyGoalMet
                ? "color-mix(in srgb, var(--color-warning) 6%, transparent)"
                : "var(--color-primary-soft)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                Daily Goal
              </span>
              <span
                className="text-xs font-bold"
                style={{ color: dailyGoalMet ? "var(--color-warning)" : "var(--color-text-secondary)" }}
              >
                {dailyXp} / {dailyGoal} XP
                {dailyGoalMet && " \u2713"}
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-border)" }}>
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${dailyPct}%`,
                  background: dailyGoalMet
                    ? "linear-gradient(90deg, var(--color-warning), color-mix(in srgb, var(--color-warning) 80%, black))"
                    : "linear-gradient(90deg, var(--color-success), var(--color-accent))",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Focus area */}
      <p className="text-xs text-center px-4" style={{ color: "var(--color-text-secondary)" }}>
        {focusArea}
      </p>

      {/* ── Actions ── */}
      <div className="flex flex-col gap-2.5 w-full max-w-[300px]">
        {onNextLesson && nextLessonTitle && (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={onNextLesson}
            iconRight={<span style={{ fontSize: 16 }}>&rarr;</span>}
          >
            Next: {nextLessonTitle.length > 24 ? nextLessonTitle.slice(0, 24) + "..." : nextLessonTitle}
          </Button>
        )}
        <Button
          variant={onNextLesson ? "soft" : "primary"}
          size="lg"
          fullWidth
          onClick={onClose}
        >
          {onNextLesson ? "Back to Practice" : "Done"}
        </Button>
      </div>
    </div>
  );
}
