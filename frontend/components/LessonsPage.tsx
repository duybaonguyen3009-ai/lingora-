"use client";

import { useState, useMemo } from "react";
import { useCourses } from "@/hooks/useCourses";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useProgress } from "@/hooks/useProgress";
import { useUserStats } from "@/hooks/useUserStats";
import LessonModal from "./LessonModal";
import type { ApiProgressItem, ApiLesson } from "@/lib/api";
import {
  LevelFilter,
  StreakMilestones,
  ProgressBar,
  UnitSection,
  PathLoadingSkeleton,
} from "./LearningPath";

/* ════════════════════════════════════════════════════════════
   MAIN
   ════════════════════════════════════════════════════════════ */
interface LessonsPageProps {
  apiLessons?: ApiLesson[];
  /** When provided, LessonsPage uses this instead of fetching progress internally. */
  externalProgress?: ApiProgressItem[];
  /** When provided, path node clicks call this instead of opening internal modal. */
  onOpenLesson?: (lessonId: string) => void;
  /** Called after internal modal completes (only when onOpenLesson is not provided). */
  onLessonComplete?: () => void;
}

export default function LessonsPage({
  apiLessons = [],
  externalProgress,
  onOpenLesson,
  onLessonComplete,
}: LessonsPageProps) {
  const [levelFilter, setLevelFilter] = useState("All");
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);

  // Only fetch progress internally when parent doesn't provide it
  const userId = useCurrentUserId();
  const { progress: internalProgress, refresh } = useProgress(externalProgress ? null : userId);
  const progress = externalProgress ?? internalProgress;
  const stats = useUserStats(progress, apiLessons);

  const completedIds = useMemo(
    () => new Set(progress.filter((p) => p.completed).map((p) => p.lessonId)),
    [progress]
  );

  const { units, loading, error } = useCourses(completedIds);

  const filteredUnits = levelFilter === "All"
    ? units
    : units.filter((u) => u.level === levelFilter);

  return (
    <div className="max-w-[600px] mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-sora font-bold" style={{ color: "var(--color-text)" }}>Learning Path</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>Your personalized English journey</p>
        </div>
        <LevelFilter active={levelFilter} onChange={setLevelFilter} />
      </div>

      {/* Streak Milestones */}
      <StreakMilestones streak={stats.streak} />

      {/* Path divider */}
      <div className="flex items-center gap-3 mt-8 mb-6">
        <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
        <span className="text-xs font-bold uppercase tracking-[1.5px] flex items-center gap-2" style={{ color: "rgba(166,179,194,0.5)" }}>
          <span>{"\u{1F9ED}"}</span> Learning Path
        </span>
        <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
      </div>

      {/* Units — loading / error / real data */}
      {loading ? (
        <PathLoadingSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Could not load learning path.</p>
          <p className="text-xs" style={{ color: "rgba(166,179,194,0.5)" }}>{error}</p>
        </div>
      ) : filteredUnits.length > 0 ? (
        <div className="flex flex-col gap-14">
          {filteredUnits.map((unit) => (
            <UnitSection key={unit.id} unit={unit} onOpen={onOpenLesson ?? setOpenLessonId} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>No units available for {levelFilter}</p>
        </div>
      )}

      {/* Bottom progress */}
      <div className="mt-10 mb-4">
        <ProgressBar level={stats.level} xp={stats.xp} xpToNext={stats.xpToNext} />
      </div>

      {/* Internal lesson modal — only when parent is NOT managing the modal */}
      {!onOpenLesson && openLessonId && userId && (
        <LessonModal
          lessonId={openLessonId}
          userId={userId}
          onClose={() => setOpenLessonId(null)}
          onComplete={() => {
            refresh();
            onLessonComplete?.();
          }}
        />
      )}
    </div>
  );
}
