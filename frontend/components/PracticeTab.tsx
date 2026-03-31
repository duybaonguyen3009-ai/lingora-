"use client";

/**
 * PracticeTab.tsx
 *
 * Unified Practice experience with retention system.
 *
 * Structure:
 *   1. ContinueLearningCard — hero, always shows "what's next"
 *   2. DailyGoalBar — XP goal progress + streak
 *   3. Learning Path (from LessonsPage) — unit-based progression
 *   4. VocabPracticeCard — secondary "Quick Review" option
 *
 * Single LessonModal instance lives here. All lesson opens route through it.
 * Daily goal state and streak are passed through to CompletionScreen for
 * the reward moment.
 */

import { useState, useMemo, useCallback, useRef } from "react";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useProgress } from "@/hooks/useProgress";
import { useCourses } from "@/hooks/useCourses";
import { useLessons } from "@/hooks/useLessons";
import { useDailyGoal } from "@/hooks/useDailyGoal";
import ContinueLearningCard from "./ContinueLearningCard";
import DailyGoalBar from "./DailyGoalBar";
import LessonsPage from "./LessonsPage";
import VocabPracticeCard from "./VocabPracticeCard";
import LessonModal from "./LessonModal";

interface PracticeTabProps {
  onLessonComplete?: () => void;
  /** Streak from gamification data — optional, used for DailyGoalBar display. */
  streak?: number;
}

export default function PracticeTab({ onLessonComplete, streak = 0 }: PracticeTabProps) {
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);
  const vocabRef = useRef<HTMLDivElement>(null);

  const userId = useCurrentUserId();
  const { progress, refresh } = useProgress(userId);
  const { apiLessons } = useLessons();
  const dailyGoal = useDailyGoal(progress);

  const completedIds = useMemo(
    () => new Set(progress.filter((p) => p.completed).map((p) => p.lessonId)),
    [progress]
  );

  const { units, loading: unitsLoading } = useCourses(completedIds);

  // Total lesson count across all units
  const totalLessons = useMemo(
    () => units.reduce((sum, u) => sum + u.nodes.length, 0),
    [units]
  );

  const totalCompleted = completedIds.size;

  // Flatten all nodes in order to find current + next lesson
  const allNodes = useMemo(
    () => units.flatMap((u) => u.nodes),
    [units]
  );

  // Find the lesson AFTER the currently open lesson (for "Next Lesson" button)
  const nextLessonInfo = useMemo(() => {
    if (!openLessonId) return null;
    const idx = allNodes.findIndex((n) => n.id === openLessonId);
    if (idx < 0 || idx >= allNodes.length - 1) return null;
    const next = allNodes[idx + 1];
    // Only offer "next" if it's not locked (it will become "current" after completion)
    if (next.status === "locked" || next.status === "current") {
      return { id: next.id, title: next.title };
    }
    return null;
  }, [openLessonId, allNodes]);

  const handleStartLesson = useCallback((lessonId: string) => {
    setOpenLessonId(lessonId);
  }, []);

  const handleLessonComplete = useCallback(() => {
    refresh();
    onLessonComplete?.();
  }, [refresh, onLessonComplete]);

  const handleScrollToVocab = useCallback(() => {
    vocabRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Continue Learning hero */}
      <ContinueLearningCard
        units={units}
        loading={unitsLoading}
        totalCompleted={totalCompleted}
        totalLessons={totalLessons}
        onStartLesson={handleStartLesson}
        onQuickReview={handleScrollToVocab}
      />

      {/* 2. Daily Goal + Streak */}
      <DailyGoalBar goal={dailyGoal} streak={streak} />

      {/* 3. Learning Path — full unit progression
           Pass shared progress so path nodes update in sync with hero card.
           Delegate lesson opens to this component's single modal. */}
      <LessonsPage
        apiLessons={apiLessons}
        externalProgress={progress}
        onOpenLesson={handleStartLesson}
      />

      {/* 4. Quick Vocab Review — secondary */}
      <div ref={vocabRef}>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
          <span
            className="text-xs font-bold uppercase tracking-[1.5px]"
            style={{ color: "var(--color-text-secondary)", opacity: 0.5 }}
          >
            Quick Review
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
        </div>
        <VocabPracticeCard />
      </div>

      {/* Centralized LessonModal — triggered by ContinueLearningCard or path nodes */}
      {openLessonId && userId && (
        <LessonModal
          key={openLessonId}
          lessonId={openLessonId}
          userId={userId}
          onClose={() => setOpenLessonId(null)}
          onComplete={handleLessonComplete}
          nextLessonTitle={nextLessonInfo?.title}
          onNextLesson={nextLessonInfo ? () => {
            setOpenLessonId(nextLessonInfo.id);
          } : undefined}
          dailyXp={dailyGoal.todayXp}
          dailyGoalTarget={dailyGoal.dailyGoal}
        />
      )}
    </div>
  );
}
