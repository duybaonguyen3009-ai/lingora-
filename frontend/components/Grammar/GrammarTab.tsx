/**
 * GrammarTab.tsx
 *
 * Main Grammar tab view — replaces Practice tab content.
 *
 * Structure:
 *  - Grammar progress hero card
 *  - 3 collapsible units (Present / Past / Future)
 *    - Each unit has lessons (locked/unlocked/completed)
 *    - Each unit has a mini exam (unlocked after all lessons)
 *  - Final exam card (unlocked after all mini exams passed)
 *
 * Progression: first lesson → complete → unlock next → ...
 *              → all unit lessons done → mini exam → next unit
 *              → all units done → final exam
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import {
  GRAMMAR_UNITS,
  GRAMMAR_TOPICS,
  FINAL_EXAM_QUESTIONS,
  FINAL_EXAM_CONFIG,
  type GrammarUnit,
  type GrammarLesson as GrammarLessonType,
} from "./grammarData";
import { useGrammarProgress } from "./useGrammarProgress";
import GrammarLessonView from "./GrammarLesson";
import GrammarExam from "./GrammarExam";
import PassiveSentenceBuilder from "./PassiveSentenceBuilder";
import ModalVerbsLesson from "./ModalVerbsLesson";
import { cn } from "@/lib/utils";

/** Lesson IDs that use custom components instead of GrammarLessonView. */
const CUSTOM_LESSON_IDS = new Set([
  "passive-sentence-builder",
  "modal-fill-blank",
  "modal-mastery",
]);

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProgressHero({
  completedCount,
  totalCount,
  totalXp,
}: {
  completedCount: number;
  totalCount: number;
  totalXp: number;
}) {
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div
      className="rounded-2xl p-5 mb-6"
      style={{
        background: "linear-gradient(135deg, rgba(46,211,198,0.08), rgba(45,168,255,0.06))",
        border: "1px solid rgba(46,211,198,0.15)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-[18px] font-sora font-bold" style={{ color: "var(--color-text)" }}>
            English Tenses
          </h2>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
            Master present, past &amp; future
          </p>
        </div>
        <div className="text-right">
          <p className="text-[16px] font-bold" style={{ color: "var(--color-success)" }}>
            {totalXp} XP
          </p>
          <p className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
            {completedCount}/{totalCount} lessons
          </p>
        </div>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, var(--color-success), var(--color-accent))",
            boxShadow: pct > 0 ? "0 0 12px rgba(46,211,198,0.4)" : "none",
          }}
        />
      </div>
    </div>
  );
}

// Color config per unit
const UNIT_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  emerald: {
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.2)",
    text: "#10B981",
    glow: "rgba(16,185,129,0.3)",
  },
  blue: {
    bg: "rgba(59,130,246,0.08)",
    border: "rgba(59,130,246,0.2)",
    text: "#3B82F6",
    glow: "rgba(59,130,246,0.3)",
  },
  violet: {
    bg: "rgba(139,92,246,0.08)",
    border: "rgba(139,92,246,0.2)",
    text: "#8B5CF6",
    glow: "rgba(139,92,246,0.3)",
  },
  amber: {
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.2)",
    text: "#F59E0B",
    glow: "rgba(245,158,11,0.3)",
  },
};

function LessonNode({
  lesson,
  isCompleted,
  isUnlocked,
  score,
  onStart,
}: {
  lesson: GrammarLessonType;
  isCompleted: boolean;
  isUnlocked: boolean;
  score: number | null;
  onStart: () => void;
}) {
  const isLocked = !isUnlocked;
  const isCurrent = isUnlocked && !isCompleted;

  return (
    <button
      disabled={isLocked}
      onClick={isLocked ? undefined : onStart}
      className={cn(
        "w-full rounded-xl px-4 py-3.5 text-left transition-all duration-200 border",
        isLocked && "opacity-40 cursor-not-allowed",
        isCurrent && "cursor-pointer",
        isCompleted && "cursor-pointer"
      )}
      style={{
        borderColor: isCurrent
          ? "rgba(46,211,198,0.3)"
          : isCompleted
          ? "rgba(16,185,129,0.2)"
          : "var(--color-border)",
        background: isCurrent
          ? "rgba(46,211,198,0.06)"
          : "var(--color-primary-soft)",
        boxShadow: isCurrent ? "0 0 16px rgba(46,211,198,0.1)" : "none",
      }}
    >
      <div className="flex items-center gap-3">
        {/* Status icon */}
        <div
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-bold",
          )}
          style={{
            background: isCompleted
              ? "linear-gradient(135deg, var(--color-success), var(--color-accent))"
              : isCurrent
              ? "rgba(46,211,198,0.15)"
              : "#0F2D46",
            color: isCompleted
              ? "var(--color-bg)"
              : isCurrent
              ? "var(--color-success)"
              : "rgba(166,179,194,0.4)",
            border: isLocked ? "1.5px solid var(--color-border)" : "none",
            boxShadow: isCurrent ? "0 0 12px rgba(46,211,198,0.3)" : "none",
          }}
        >
          {isCompleted ? "\u2713" : isLocked ? "\u{1F512}" : "\u25B6"}
        </div>

        <div className="flex-1 min-w-0">
          <p
            className="text-[13px] font-semibold truncate"
            style={{
              color: isLocked
                ? "rgba(166,179,194,0.4)"
                : isCurrent
                ? "var(--color-success)"
                : "var(--color-text)",
            }}
          >
            {lesson.title}
          </p>
          <p
            className="text-[11px] mt-0.5 truncate"
            style={{ color: isLocked ? "rgba(166,179,194,0.25)" : "var(--color-text-secondary)" }}
          >
            {lesson.subtitle} &middot; {lesson.exerciseCount ?? lesson.questions.length} {CUSTOM_LESSON_IDS.has(lesson.id) ? "exercises" : "questions"}
          </p>
        </div>

        {/* Score badge */}
        {isCompleted && score !== null && (
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: score >= 80 ? "rgba(16,185,129,0.15)" : "rgba(251,191,36,0.15)",
              color: score >= 80 ? "#10B981" : "#F59E0B",
              border: score >= 80
                ? "1px solid rgba(16,185,129,0.25)"
                : "1px solid rgba(251,191,36,0.25)",
            }}
          >
            {score}%
          </span>
        )}

        {/* Current indicator */}
        {isCurrent && (
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse"
            style={{ background: "var(--color-success)" }}
          />
        )}
      </div>
    </button>
  );
}

function ExamCard({
  label,
  isUnlocked,
  isPassed,
  score,
  onStart,
  accentColor,
}: {
  label: string;
  isUnlocked: boolean;
  isPassed: boolean;
  score: number | null;
  onStart: () => void;
  accentColor: string;
}) {
  return (
    <button
      disabled={!isUnlocked}
      onClick={isUnlocked ? onStart : undefined}
      className={cn(
        "w-full rounded-xl px-4 py-3.5 text-left transition-all duration-200 border",
        !isUnlocked && "opacity-40 cursor-not-allowed",
        isUnlocked && !isPassed && "cursor-pointer"
      )}
      style={{
        borderColor: isPassed ? "rgba(16,185,129,0.3)" : `${accentColor}40`,
        background: isPassed
          ? "rgba(16,185,129,0.06)"
          : isUnlocked
          ? `${accentColor}10`
          : "var(--color-primary-soft)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[14px]"
          style={{
            background: isPassed
              ? "linear-gradient(135deg, var(--color-success), var(--color-accent))"
              : isUnlocked
              ? `${accentColor}20`
              : "#0F2D46",
            color: isPassed ? "var(--color-bg)" : isUnlocked ? accentColor : "rgba(166,179,194,0.4)",
            border: !isUnlocked ? "1.5px solid var(--color-border)" : "none",
          }}
        >
          {isPassed ? "\u2713" : "\u{1F4DD}"}
        </div>
        <div className="flex-1">
          <p
            className="text-[13px] font-semibold"
            style={{ color: !isUnlocked ? "rgba(166,179,194,0.4)" : "var(--color-text)" }}
          >
            {label}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
            {isPassed ? "Passed" : "Test your knowledge"}
          </p>
        </div>
        {isPassed && score !== null && (
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(16,185,129,0.15)",
              color: "#10B981",
              border: "1px solid rgba(16,185,129,0.25)",
            }}
          >
            {score}%
          </span>
        )}
      </div>
    </button>
  );
}

function UnitCard({
  unit,
  progress,
  onStartLesson,
  onStartExam,
}: {
  unit: GrammarUnit;
  progress: ReturnType<typeof useGrammarProgress>;
  onStartLesson: (lesson: GrammarLessonType) => void;
  onStartExam: (unit: GrammarUnit) => void;
}) {
  const [expanded, setExpanded] = useState(() => {
    // Auto-expand the unit that has the current lesson
    return progress.isUnitUnlocked(unit.id) && !progress.isExamPassed(unit.id);
  });

  const colors = UNIT_COLORS[unit.color] ?? UNIT_COLORS.emerald;
  const unitUnlocked = progress.isUnitUnlocked(unit.id);
  const completedInUnit = unit.lessons.filter((l) => progress.isLessonCompleted(l.id)).length;
  const allLessonsDone = completedInUnit === unit.lessons.length;
  const examPassed = progress.isExamPassed(unit.id);
  const examResult = progress.getExamResult(unit.id);
  const pct = Math.round((completedInUnit / unit.lessons.length) * 100);

  return (
    <div
      className={cn("rounded-2xl overflow-hidden transition-all duration-300", !unitUnlocked && "opacity-50")}
      style={{
        border: `1px solid ${colors.border}`,
        background: "var(--color-bg-card)",
      }}
    >
      {/* Header — clickable to expand/collapse */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-5 py-4 flex items-center gap-3 text-left"
        style={{ background: colors.bg }}
      >
        <span className="text-2xl">{unit.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-sora font-bold" style={{ color: "var(--color-text)" }}>
            {unit.title}
          </p>
          <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--color-text-secondary)" }}>
            {unit.description}
          </p>
        </div>

        {/* Progress pill */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {examPassed && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              {"\u2713"} Complete
            </span>
          )}
          {!examPassed && (
            <span className="text-[11px] font-bold" style={{ color: colors.text }}>
              {completedInUnit}/{unit.lessons.length}
            </span>
          )}
          <span
            className="text-[14px] transition-transform duration-200"
            style={{
              color: "var(--color-text-secondary)",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            {"\u25BC"}
          </span>
        </div>
      </button>

      {/* Unit progress bar */}
      {unitUnlocked && (
        <div className="px-5 pb-1 pt-0" style={{ background: colors.bg }}>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${colors.text}, ${colors.glow})`,
              }}
            />
          </div>
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 py-4 flex flex-col gap-2.5">
          {unit.lessons.map((lesson) => (
            <LessonNode
              key={lesson.id}
              lesson={lesson}
              isCompleted={progress.isLessonCompleted(lesson.id)}
              isUnlocked={progress.isLessonUnlocked(lesson.id)}
              score={progress.getLessonScore(lesson.id)}
              onStart={() => onStartLesson(lesson)}
            />
          ))}

          {/* Mini exam */}
          <div className="mt-2 pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
            <ExamCard
              label={`${unit.title} Exam`}
              isUnlocked={allLessonsDone}
              isPassed={examPassed}
              score={examResult?.score ?? null}
              onStart={() => onStartExam(unit)}
              accentColor={colors.text}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function GrammarTab() {
  const progress = useGrammarProgress();
  const [activeLesson, setActiveLesson] = useState<GrammarLessonType | null>(null);
  const [activeExamUnit, setActiveExamUnit] = useState<GrammarUnit | null>(null);
  const [showFinalExam, setShowFinalExam] = useState(false);

  const handleLessonComplete = useCallback(
    (score: number) => {
      if (activeLesson) {
        progress.completeLesson(activeLesson.id, score);
      }
    },
    [activeLesson, progress]
  );

  const handleExamComplete = useCallback(
    (score: number, passed: boolean) => {
      if (activeExamUnit) {
        progress.completeExam(activeExamUnit.id, score, passed);
      }
    },
    [activeExamUnit, progress]
  );

  const handleFinalExamComplete = useCallback(
    (score: number, passed: boolean) => {
      progress.completeExam("final", score, passed);
    },
    [progress]
  );

  const finalExamResult = progress.getExamResult("final");

  // ── Active lesson overlay ──
  if (activeLesson) {
    // Custom component for drag-drop lessons
    if (activeLesson.id === "passive-sentence-builder") {
      return (
        <PassiveSentenceBuilder
          onComplete={handleLessonComplete}
          onClose={() => setActiveLesson(null)}
        />
      );
    }
    // Modal Verbs interactive lessons
    if (activeLesson.id === "modal-fill-blank" || activeLesson.id === "modal-mastery") {
      return (
        <ModalVerbsLesson
          lessonId={activeLesson.id}
          onComplete={handleLessonComplete}
          onClose={() => setActiveLesson(null)}
        />
      );
    }
    return (
      <GrammarLessonView
        lesson={activeLesson}
        onComplete={handleLessonComplete}
        onClose={() => setActiveLesson(null)}
      />
    );
  }

  // ── Active unit exam overlay ──
  if (activeExamUnit) {
    return (
      <GrammarExam
        title={`${activeExamUnit.title} Exam`}
        questions={activeExamUnit.examQuestions}
        timeLimitSeconds={300} // 5 minutes for mini exam
        passingScore={70}
        onComplete={handleExamComplete}
        onClose={() => setActiveExamUnit(null)}
      />
    );
  }

  // ── Final exam overlay ──
  if (showFinalExam) {
    return (
      <GrammarExam
        title={FINAL_EXAM_CONFIG.title}
        questions={FINAL_EXAM_QUESTIONS}
        timeLimitSeconds={FINAL_EXAM_CONFIG.timeLimitSeconds}
        passingScore={FINAL_EXAM_CONFIG.passingScore}
        onComplete={handleFinalExamComplete}
        onClose={() => setShowFinalExam(false)}
      />
    );
  }

  return (
    <div className="max-w-[600px] lg:max-w-[800px] xl:max-w-[960px] mx-auto">
      {/* Progress hero */}
      <ProgressHero
        completedCount={progress.completedLessonsCount}
        totalCount={progress.totalLessons}
        totalXp={progress.totalXp}
      />

      {/* Tenses Units */}
      <div className="flex flex-col gap-4 mb-6">
        {GRAMMAR_UNITS.map((unit) => (
          <UnitCard
            key={unit.id}
            unit={unit}
            progress={progress}
            onStartLesson={setActiveLesson}
            onStartExam={setActiveExamUnit}
          />
        ))}
      </div>

      {/* Grammar Topics — standalone topics outside tenses */}
      {GRAMMAR_TOPICS.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-3 mt-2">
            <div className="h-px flex-1" style={{ background: "var(--color-border)" }} />
            <span
              className="text-[11px] font-semibold uppercase tracking-wider px-2"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Grammar Topics
            </span>
            <div className="h-px flex-1" style={{ background: "var(--color-border)" }} />
          </div>
          <div className="flex flex-col gap-4 mb-6">
            {GRAMMAR_TOPICS.map((topic) => (
              <UnitCard
                key={topic.id}
                unit={topic}
                progress={progress}
                onStartLesson={setActiveLesson}
                onStartExam={setActiveExamUnit}
              />
            ))}
          </div>
        </>
      )}

      {/* Final Exam */}
      <div
        className="rounded-2xl p-5"
        style={{
          border: progress.isFinalExamUnlocked
            ? "1px solid rgba(251,191,36,0.3)"
            : "1px solid var(--color-border)",
          background: progress.isFinalExamUnlocked
            ? "rgba(251,191,36,0.06)"
            : "var(--color-primary-soft)",
          opacity: progress.isFinalExamUnlocked ? 1 : 0.4,
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{"\u{1F3C6}"}</span>
          <div className="flex-1">
            <p className="text-[16px] font-sora font-bold" style={{ color: "var(--color-text)" }}>
              Final Exam
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
              {progress.isFinalExamUnlocked
                ? `${FINAL_EXAM_QUESTIONS.length} questions \u00b7 ${Math.floor(FINAL_EXAM_CONFIG.timeLimitSeconds / 60)} minutes \u00b7 +${FINAL_EXAM_CONFIG.xpReward} XP`
                : "Complete all unit exams to unlock"}
            </p>
          </div>
          {finalExamResult?.passed && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
              {"\u2713"} {finalExamResult.score}%
            </span>
          )}
        </div>

        <button
          disabled={!progress.isFinalExamUnlocked}
          onClick={() => setShowFinalExam(true)}
          className={cn(
            "w-full py-3 rounded-xl font-semibold text-[14px] transition-all",
            progress.isFinalExamUnlocked
              ? "text-white cursor-pointer hover:opacity-90"
              : "cursor-not-allowed"
          )}
          style={{
            background: progress.isFinalExamUnlocked
              ? "linear-gradient(135deg, #F59E0B, #D97706)"
              : "var(--color-border)",
            color: progress.isFinalExamUnlocked ? "white" : "rgba(166,179,194,0.4)",
          }}
        >
          {finalExamResult?.passed ? "Retake Final Exam" : progress.isFinalExamUnlocked ? "Start Final Exam" : "\u{1F512} Locked"}
        </button>
      </div>
    </div>
  );
}
