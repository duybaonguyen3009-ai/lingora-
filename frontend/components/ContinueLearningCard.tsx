"use client";

/**
 * ContinueLearningCard.tsx
 *
 * Hero card that always tells the user what to do next in the Practice tab.
 * Shows the current lesson (first non-completed lesson in the learning path),
 * with unit context, progress stats, and a prominent "Continue" CTA.
 *
 * States:
 *  - Loading: skeleton pulse
 *  - Has current lesson: unit + lesson info + Continue button
 *  - All complete: celebration + Quick Review CTA
 *  - No data: "Start your journey" prompt
 */

import type { UnitData, PathNode } from "@/hooks/useCourses";
import { IconPlay, IconCheck, IconArrowRight } from "./Icons";

interface ContinueLearningCardProps {
  units: UnitData[];
  loading: boolean;
  totalCompleted: number;
  totalLessons: number;
  onStartLesson: (lessonId: string) => void;
  onQuickReview: () => void;
}

/** Find the first "current" node across all units. */
function findCurrentLesson(units: UnitData[]): {
  unit: UnitData;
  node: PathNode;
  unitIndex: number;
  lessonIndex: number;
} | null {
  for (let ui = 0; ui < units.length; ui++) {
    const unit = units[ui];
    for (let li = 0; li < unit.nodes.length; li++) {
      if (unit.nodes[li].status === "current") {
        return { unit, node: unit.nodes[li], unitIndex: ui, lessonIndex: li };
      }
    }
  }
  return null;
}

export default function ContinueLearningCard({
  units,
  loading,
  totalCompleted,
  totalLessons,
  onStartLesson,
  onQuickReview,
}: ContinueLearningCardProps) {
  if (loading) {
    return (
      <div
        className="rounded-lg p-6 animate-pulse"
        style={{
          border: "1px solid var(--color-border)",
          background: "var(--color-bg-card)",
        }}
      >
        <div className="h-3 w-24 rounded mb-3" style={{ backgroundColor: "var(--color-border)" }} />
        <div className="h-5 w-48 rounded mb-2" style={{ backgroundColor: "var(--color-border)" }} />
        <div className="h-3 w-32 rounded mb-5" style={{ backgroundColor: "var(--color-border)", opacity: 0.6 }} />
        <div className="h-11 w-full rounded-xl" style={{ backgroundColor: "var(--color-border)", opacity: 0.4 }} />
      </div>
    );
  }

  const current = findCurrentLesson(units);
  const allDone = totalLessons > 0 && totalCompleted >= totalLessons;
  const progressPct = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;

  // ── All lessons completed ──
  if (allDone) {
    return (
      <div
        className="rounded-lg p-6 relative overflow-hidden"
        style={{
          border: "1px solid rgba(46,211,198,0.25)",
          background: "linear-gradient(135deg, rgba(46,211,198,0.08), rgba(45,168,255,0.05))",
        }}
      >
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl" style={{ backgroundColor: "rgba(46,211,198,0.1)" }} />
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--color-success), var(--color-accent))" }}
          >
            <IconCheck size={22} className="text-white" />
          </div>
          <div>
            <p className="text-base font-sora font-bold" style={{ color: "var(--color-text)" }}>
              All lessons complete!
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              {totalCompleted} lessons finished — amazing work
            </p>
          </div>
        </div>
        <button
          onClick={onQuickReview}
          className="w-full py-3 rounded-xl text-sm font-semibold transition duration-normal hover:opacity-90"
          style={{
            background: "var(--color-primary-soft)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text)",
          }}
        >
          Ôn từ vựng nhanh
        </button>
      </div>
    );
  }

  // ── No data (no units loaded) ──
  if (!current) {
    return (
      <div
        className="rounded-lg p-6 text-center"
        style={{
          border: "1px solid var(--color-border)",
          background: "var(--color-bg-card)",
        }}
      >
        <p className="text-base font-semibold mb-1" style={{ color: "var(--color-text)" }}>
          Bắt đầu hành trình học của bạn
        </p>
        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Bài học sẽ xuất hiện ở đây khi có nội dung 🐙
        </p>
      </div>
    );
  }

  // ── Current lesson available ──
  const { unit, node, unitIndex, lessonIndex } = current;
  const lessonNumber = lessonIndex + 1;
  const unitNumber = unitIndex + 1;

  return (
    <div
      className="rounded-lg relative overflow-hidden"
      style={{
        border: "1px solid rgba(46,211,198,0.2)",
        background: "linear-gradient(135deg, rgba(46,211,198,0.06), rgba(45,168,255,0.04))",
      }}
    >
      {/* Glow */}
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-3xl" style={{ backgroundColor: "rgba(46,211,198,0.08)" }} />

      <div className="p-6 relative">
        {/* Unit + progress context */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className="text-xs font-bold uppercase tracking-[1px] px-2.5 py-1 rounded-full"
            style={{ backgroundColor: "rgba(46,211,198,0.12)", color: "var(--color-success)" }}
          >
            Unit {unitNumber}
          </span>
          <span className="text-xs font-bold uppercase tracking-[1px] px-2.5 py-1 rounded-full"
            style={{ backgroundColor: "rgba(45,168,255,0.1)", color: "var(--color-accent)" }}
          >
            {unit.level}
          </span>
          <span className="ml-auto text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
            {totalCompleted}/{totalLessons} lessons
          </span>
        </div>

        {/* Lesson info */}
        <p className="text-xs font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>
          Lesson {lessonNumber} of {unit.nodes.length} · {unit.title}
        </p>
        <h3 className="text-lg font-sora font-bold mb-1" style={{ color: "var(--color-text)" }}>
          {node.title}
        </h3>
        {node.xp && (
          <p className="text-xs mb-4" style={{ color: "var(--color-success)" }}>
            +{node.xp} XP
          </p>
        )}

        {/* Overall progress bar */}
        <div className="mb-4">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-border)" }}>
            <div
              className="h-full rounded-full transition duration-700 ease-out"
              style={{
                width: `${progressPct}%`,
                background: "linear-gradient(90deg, var(--color-success), var(--color-accent))",
              }}
            />
          </div>
          <p className="text-xs mt-1 text-right" style={{ color: "var(--color-text-secondary)" }}>
            {progressPct}% complete
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={() => onStartLesson(node.id)}
          className="w-full py-3.5 rounded-xl text-sm font-semibold transition duration-normal hover:opacity-90 flex items-center justify-center gap-2"
          style={{
            background: "linear-gradient(135deg, var(--color-success), var(--color-accent))",
            color: "var(--color-bg)",
            boxShadow: "0 4px 16px rgba(46,211,198,0.25)",
          }}
        >
          <IconPlay size={14} />
          {totalCompleted === 0 ? "Bắt đầu học" : "Tiếp tục học"}
        </button>
      </div>
    </div>
  );
}
