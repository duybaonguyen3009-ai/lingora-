"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useLessons } from "@/hooks/useLessons";
import { useGuestUser } from "@/lib/guestUser";
import { useProgress } from "@/hooks/useProgress";
import LessonCard from "./LessonCard";
import LessonModal from "./LessonModal";

type TabFilter = "all" | "recommended" | "completed";

const TABS: { id: TabFilter; label: string }[] = [
  { id: "all",         label: "All"         },
  { id: "recommended", label: "Recommended" },
  { id: "completed",   label: "Completed"   },
];

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-[16px] p-[18px] border border-white/[0.07] bg-[#0B2239] animate-pulse"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="h-3 w-20 rounded bg-white/[0.07] mb-3" />
          <div className="h-4 w-3/4 rounded bg-white/[0.07] mb-2" />
          <div className="h-3 w-1/2 rounded bg-white/[0.05] mb-4" />
          <div className="h-[3px] rounded-full bg-white/[0.05]" />
        </div>
      ))}
    </div>
  );
}

interface LessonsSectionProps {
  /** Called after a lesson is saved — parent can use this to refetch gamification data. */
  onLessonComplete?: () => void;
}

export default function LessonsSection({ onLessonComplete }: LessonsSectionProps = {}) {
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);

  const userId = useGuestUser();
  const { progress, refresh } = useProgress(userId);

  const completedIds = useMemo(
    () => new Set(progress.filter((p) => p.completed).map((p) => p.lessonId)),
    [progress]
  );

  // useLessons returns lessons with status derived from API order; we override
  // status here based on real completion data.
  const { lessons: rawLessons, loading, error } = useLessons();

  const lessons = useMemo(
    () =>
      rawLessons.map((l) => ({
        ...l,
        status: completedIds.has(l.id)
          ? ("completed" as const)
          : l.status,
        progress: completedIds.has(l.id) ? 100 : l.progress,
      })),
    [rawLessons, completedIds]
  );

  const filtered = lessons.filter((l) => {
    if (activeTab === "all") return true;
    if (activeTab === "completed") return l.status === "completed";
    if (activeTab === "recommended") return l.status === "recommended";
    return true;
  });

  return (
    <section>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="font-sora font-bold text-[15.5px] tracking-[-0.2px]">Today&apos;s Lessons</h3>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/[0.04] border border-white/[0.07] rounded-[10px] p-[3px] gap-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-3.5 py-[5px] rounded-[7px] text-[12px] font-medium",
                  "transition-all duration-200 whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-[#2ED3C6] text-[#071A2F] font-bold"
                    : "text-[#A6B3C2] hover:text-[#E6EDF3] hover:bg-white/[0.05]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button className="text-[12.5px] font-medium text-[#2ED3C6] hover:opacity-75 transition-opacity whitespace-nowrap">
            View all →
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="col-span-2 py-10 text-center space-y-1">
            <p className="text-[#A6B3C2] text-sm">Could not load lessons.</p>
            <p className="text-[#A6B3C2]/50 text-xs">{error}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.length > 0
            ? filtered.map((lesson, i) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  delay={i * 60}
                  onClick={() => setOpenLessonId(lesson.id)}
                />
              ))
            : (
              <div className="col-span-2 py-10 text-center text-[#A6B3C2] text-sm">
                No lessons in this category yet.
              </div>
            )
          }
        </div>
      )}

      {/* Lesson modal */}
      {openLessonId && userId && (
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
    </section>
  );
}
