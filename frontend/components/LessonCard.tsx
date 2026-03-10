"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getLessonTypeConfig, getLessonProgressColor } from "@/lib/utils";
import { IconCheck, IconLock, IconPlay, IconClock } from "./Icons";
import type { Lesson } from "@/lib/types";

interface LessonCardProps {
  lesson: Lesson;
  delay?: number;
  onClick?: () => void;
}

export default function LessonCard({ lesson, delay = 0, onClick }: LessonCardProps) {
  const [barLoaded, setBarLoaded] = useState(false);
  const typeConfig = getLessonTypeConfig(lesson.type);
  const progressColor = getLessonProgressColor(lesson.type);

  useEffect(() => {
    const timer = setTimeout(() => setBarLoaded(true), delay + 400);
    return () => clearTimeout(timer);
  }, [delay]);

  const isCompleted   = lesson.status === "completed";
  const isLocked      = lesson.status === "locked";
  const isRecommended = lesson.status === "recommended";

  return (
    <div
      className={cn(
        "rounded-[16px] p-[18px] relative overflow-hidden",
        "border border-white/[0.07] bg-[#0B2239]",
        "transition-all duration-200 animate-fadeSlideUp",
        isLocked ? "opacity-55 cursor-not-allowed" : "cursor-pointer hover:-translate-y-[2px] hover:border-[#2ED3C6]/20",
        isCompleted   && "border-[#2ED3C6]/15",
        isRecommended && "border-[#2DA8FF]/25",
      )}
      style={{ animationDelay: `${delay}ms` }}
      onClick={!isLocked ? onClick : undefined}
      onMouseEnter={(e) => {
        if (!isLocked) (e.currentTarget as HTMLDivElement).style.boxShadow = "0 10px 30px rgba(0,0,0,0.3)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {/* Recommended pill */}
      {isRecommended && (
        <span className="absolute top-3 right-3.5 text-[9px] font-bold uppercase tracking-[0.8px] text-[#2DA8FF] bg-[#2DA8FF]/12 px-[7px] py-[2px] rounded-[5px]">
          Recommended
        </span>
      )}

      {/* Header row */}
      <div className="flex items-start justify-between mb-2.5">
        <span className={cn("inline-flex items-center gap-[5px] text-[10.5px] font-semibold uppercase tracking-[0.5px] px-2 py-[3px] rounded-[6px]", typeConfig.className)}>
          {lesson.type === "vocabulary" && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          )}
          {lesson.type === "grammar" && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
          )}
          {lesson.type === "listening" && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
          )}
          {lesson.type === "speaking" && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
          )}
          {lesson.type === "reading" && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          )}
          {typeConfig.label}
        </span>

        {/* Status icon */}
        <div className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center text-[11px] flex-shrink-0",
          isCompleted && "bg-[#2ED3C6]/15 text-[#2ED3C6]",
          isLocked    && "bg-white/[0.06] text-[#A6B3C2]",
          !isCompleted && !isLocked && "bg-[#2DA8FF]/15 text-[#2DA8FF]",
        )}>
          {isCompleted  && <IconCheck />}
          {isLocked     && <IconLock />}
          {!isCompleted && !isLocked && <IconPlay size={11} />}
        </div>
      </div>

      {/* Title */}
      <div className="font-sora font-semibold text-[14px] mb-[5px] leading-[1.3] pr-8">
        {lesson.title}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-[11.5px] text-[#A6B3C2] mb-3">
        <span className="flex items-center gap-1">
          <IconClock size={11} />
          {lesson.duration} min
        </span>
        <span>{lesson.detail}</span>
        <span
          className={cn(
            "font-medium",
            lesson.level === "C1" ? "text-purple-400" : lesson.level === "B2" ? "text-amber-400" : "text-green-400"
          )}
        >
          {lesson.level} Level
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-[3px] bg-white/[0.05] rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full", progressColor)}
          style={{
            width: barLoaded ? `${lesson.progress}%` : "0%",
            transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>
    </div>
  );
}
