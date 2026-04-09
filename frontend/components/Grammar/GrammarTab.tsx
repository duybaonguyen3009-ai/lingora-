/**
 * GrammarTab.tsx
 *
 * Premium Grammar tab — structured learning journey.
 *
 * Layout:
 *   - Progress hero (XP, level, overall progress)
 *   - English Tense (collapsible accordion, collapsed by default)
 *     - Present / Past / Future units inside
 *   - Passive Voice (locked until all tense exams passed)
 *   - Modal Verbs (locked until Passive Voice exam passed)
 *   - Final Exam (locked until all 3 topics complete)
 *
 * Gamification:
 *   - XP + Level display
 *   - Floating XP gain animation
 *   - Level-up toast
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  GRAMMAR_UNITS,
  GRAMMAR_TOPICS,
  FINAL_EXAM_QUESTIONS,
  FINAL_EXAM_CONFIG,
  type GrammarUnit,
  type GrammarLesson as GrammarLessonType,
} from "./grammarData";
import { useGrammarProgress, computeLevel } from "./useGrammarProgress";
import GrammarLessonView from "./GrammarLesson";
import GrammarExam from "./GrammarExam";
import PassiveSentenceBuilder from "./PassiveSentenceBuilder";
import ModalVerbsLesson from "./ModalVerbsLesson";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";

/** Lesson IDs that use custom components instead of GrammarLessonView. */
const CUSTOM_LESSON_IDS = new Set([
  "passive-sentence-builder",
  "modal-fill-blank",
  "modal-mastery",
]);

// ---------------------------------------------------------------------------
// Color configs
// ---------------------------------------------------------------------------

const UNIT_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  emerald: {
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.2)",
    text: "var(--color-success)",
    glow: "rgba(16,185,129,0.3)",
  },
  blue: {
    bg: "rgba(59,130,246,0.08)",
    border: "rgba(59,130,246,0.2)",
    text: "#3B82F6",
    glow: "rgba(59,130,246,0.3)",
  },
  violet: {
    bg: "rgba(0,168,150,0.08)",
    border: "rgba(0,168,150,0.2)",
    text: "#00A896",
    glow: "rgba(0,168,150,0.3)",
  },
  amber: {
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.2)",
    text: "var(--color-warning)",
    glow: "rgba(245,158,11,0.3)",
  },
};

// ---------------------------------------------------------------------------
// XP Gain Animation
// ---------------------------------------------------------------------------

function XpGainPopup({ xp, onDone }: { xp: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] pointer-events-none"
      style={{ animation: "grammar-xp-float 1.8s ease-out forwards" }}
    >
      <style>{`
        @keyframes grammar-xp-float {
          0% { opacity: 0; transform: translate(-50%, 0) scale(0.8); }
          15% { opacity: 1; transform: translate(-50%, -10px) scale(1.1); }
          70% { opacity: 1; transform: translate(-50%, -40px) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -60px) scale(0.9); }
        }
      `}</style>
      <div
        className="px-5 py-2.5 rounded-full font-bold text-base"
        style={{
          background: "linear-gradient(135deg, var(--color-success), var(--color-accent))",
          color: "white",
          boxShadow: "0 4px 20px rgba(46,211,198,0.4)",
        }}
      >
        +{xp} XP
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Level-Up Toast
// ---------------------------------------------------------------------------

function LevelUpToast({ level, onDone }: { level: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none"
      style={{ animation: "grammar-levelup 3s ease-out forwards" }}
    >
      <style>{`
        @keyframes grammar-levelup {
          0% { opacity: 0; transform: scale(0.5); }
          15% { opacity: 1; transform: scale(1.1); }
          25% { transform: scale(1); }
          75% { opacity: 1; }
          100% { opacity: 0; transform: scale(0.9); }
        }
      `}</style>
      <div
        className="rounded-lg px-8 py-6 flex flex-col items-center gap-3"
        style={{
          background: "color-mix(in srgb, var(--color-bg) 95%, transparent)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(0,168,150,0.3)",
          boxShadow: "0 0 40px rgba(0,168,150,0.2), 0 20px 40px rgba(0,0,0,0.3)",
        }}
      >
        <div className="text-4xl">🎉</div>
        <p className="text-lg font-sora font-bold" style={{ color: "var(--color-text)" }}>
          Level {level}!
        </p>
        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Keep going — you&apos;re making great progress!
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress Hero (with level)
// ---------------------------------------------------------------------------

function ProgressHero({
  totalXp,
  level,
  levelProgress,
  completedAll,
  totalAll,
}: {
  totalXp: number;
  level: number;
  levelProgress: { currentXp: number; nextLevelXp: number };
  completedAll: number;
  totalAll: number;
}) {
  const pct = totalAll > 0 ? Math.round((completedAll / totalAll) * 100) : 0;
  const lvlPct = Math.round((levelProgress.currentXp / levelProgress.nextLevelXp) * 100);

  return (
    <div
      className="rounded-lg p-5 mb-5"
      style={{
        background: "linear-gradient(135deg, rgba(0,168,150,0.08), rgba(46,211,198,0.06))",
        border: "1px solid rgba(0,168,150,0.15)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Level badge */}
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold"
            style={{
              background: "linear-gradient(135deg, #00A896, #007A6E)",
              color: "white",
              boxShadow: "0 2px 10px rgba(0,168,150,0.3)",
            }}
          >
            {level}
          </div>
          <div>
            <p className="text-sm font-sora font-bold" style={{ color: "var(--color-text)" }}>
              Grammar Journey
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              Level {level} &middot; {totalXp} XP
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold" style={{ color: "var(--color-success)" }}>
            {pct}%
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            {completedAll}/{totalAll} lessons
          </p>
        </div>
      </div>

      {/* Level progress bar */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold" style={{ color: "rgba(0,168,150,0.6)" }}>
          LV{level}
        </span>
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
          <div
            className="h-full rounded-full transition duration-700 ease-out"
            style={{
              width: `${lvlPct}%`,
              background: "linear-gradient(90deg, #00A896, #007A6E)",
              boxShadow: lvlPct > 0 ? "0 0 8px rgba(0,168,150,0.4)" : "none",
            }}
          />
        </div>
        <span className="text-xs font-bold" style={{ color: "rgba(0,168,150,0.6)" }}>
          LV{level + 1}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lesson Node
// ---------------------------------------------------------------------------

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
        "w-full rounded-xl px-4 py-3 text-left transition duration-normal border",
        isLocked && "opacity-60 cursor-not-allowed",
        (isCurrent || isCompleted) && "cursor-pointer"
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
        boxShadow: isCurrent ? "0 0 12px rgba(46,211,198,0.08)" : "none",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
          style={{
            background: isCompleted
              ? "linear-gradient(135deg, var(--color-success), var(--color-accent))"
              : isCurrent
              ? "rgba(46,211,198,0.15)"
              : "var(--color-bg-secondary)",
            color: isCompleted ? "white" : isCurrent ? "var(--color-success)" : "var(--color-text-secondary)",
            border: isLocked ? "1.5px solid var(--color-border)" : "none",
          }}
        >
          {isCompleted ? "\u2713" : isLocked ? "\u{1F512}" : "\u25B6"}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-semibold truncate"
            style={{
              color: isLocked ? "var(--color-text-secondary)" : isCurrent ? "var(--color-success)" : "var(--color-text)",
            }}
          >
            {lesson.title}
          </p>
          <p className="text-xs mt-0.5 truncate" style={{ color: isLocked ? "color-mix(in srgb, var(--color-text-secondary) 60%, transparent)" : "var(--color-text-secondary)" }}>
            {lesson.subtitle} &middot; {lesson.exerciseCount ?? lesson.questions.length} {CUSTOM_LESSON_IDS.has(lesson.id) ? "exercises" : "questions"}
          </p>
        </div>
        {isCompleted && score !== null && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              background: score >= 80 ? "color-mix(in srgb, var(--color-success) 15%, transparent)" : "color-mix(in srgb, var(--color-warning) 15%, transparent)",
              color: score >= 80 ? "var(--color-success)" : "var(--color-warning)",
              border: score >= 80 ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(251,191,36,0.25)",
            }}
          >
            {score}%
          </span>
        )}
        {isCurrent && (
          <span className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ background: "var(--color-success)" }} />
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Exam Card
// ---------------------------------------------------------------------------

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
        "w-full rounded-xl px-4 py-3 text-left transition duration-normal border",
        !isUnlocked && "opacity-60 cursor-not-allowed",
        isUnlocked && !isPassed && "cursor-pointer"
      )}
      style={{
        borderColor: isPassed ? "rgba(16,185,129,0.3)" : `${accentColor}40`,
        background: isPassed ? "rgba(16,185,129,0.06)" : isUnlocked ? `${accentColor}10` : "var(--color-primary-soft)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
          style={{
            background: isPassed ? "linear-gradient(135deg, var(--color-success), var(--color-accent))" : isUnlocked ? `${accentColor}20` : "var(--color-bg-secondary)",
            color: isPassed ? "white" : isUnlocked ? accentColor : "var(--color-text-secondary)",
            border: !isUnlocked ? "1.5px solid var(--color-border)" : "none",
          }}
        >
          {isPassed ? "\u2713" : "\u{1F4DD}"}
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold" style={{ color: !isUnlocked ? "var(--color-text-secondary)" : "var(--color-text)" }}>
            {label}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
            {isPassed ? "Passed" : "Test your knowledge"}
          </p>
        </div>
        {isPassed && score !== null && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--color-success) 15%, transparent)", color: "var(--color-success)", border: "1px solid color-mix(in srgb, var(--color-success) 25%, transparent)" }}>
            {score}%
          </span>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Unit Card (inside accordion)
// ---------------------------------------------------------------------------

function UnitCard({
  unit,
  progress,
  onStartLesson,
  onStartExam,
  defaultExpanded,
}: {
  unit: GrammarUnit;
  progress: ReturnType<typeof useGrammarProgress>;
  onStartLesson: (lesson: GrammarLessonType) => void;
  onStartExam: (unit: GrammarUnit) => void;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);

  const colors = UNIT_COLORS[unit.color] ?? UNIT_COLORS.emerald;
  const unitUnlocked = progress.isUnitUnlocked(unit.id);
  const completedInUnit = unit.lessons.filter((l) => progress.isLessonCompleted(l.id)).length;
  const allLessonsDone = completedInUnit === unit.lessons.length;
  const examPassed = progress.isExamPassed(unit.id);
  const examResult = progress.getExamResult(unit.id);
  const pct = Math.round((completedInUnit / unit.lessons.length) * 100);

  return (
    <div
      className={cn("rounded-lg overflow-hidden transition duration-normal", !unitUnlocked && "opacity-50")}
      style={{ border: `1px solid ${colors.border}`, background: "var(--color-bg-card)" }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
        style={{ background: colors.bg }}
      >
        <span className="text-xl">{unit.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-sora font-bold" style={{ color: "var(--color-text)" }}>
            {unit.title}
          </p>
          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--color-text-secondary)" }}>
            {unit.description}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {examPassed && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              ✓
            </span>
          )}
          {!examPassed && (
            <span className="text-xs font-bold" style={{ color: colors.text }}>
              {completedInUnit}/{unit.lessons.length}
            </span>
          )}
          <span className="text-sm transition-transform duration-normal" style={{ color: "var(--color-text-secondary)", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>
            ▼
          </span>
        </div>
      </button>

      {/* Unit progress bar */}
      {unitUnlocked && (
        <div className="px-4 pb-1 pt-0" style={{ background: colors.bg }}>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
            <div className="h-full rounded-full transition duration-slow" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${colors.text}, ${colors.glow})` }} />
          </div>
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 py-3 flex flex-col gap-2">
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
          <div className="mt-1 pt-2" style={{ borderTop: "1px solid var(--color-border)" }}>
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

interface GrammarTabProps {
  onOverlayChange?: (open: boolean) => void;
}

export default function GrammarTab({ onOverlayChange }: GrammarTabProps) {
  const progress = useGrammarProgress();
  const [activeLesson, setActiveLesson] = useState<GrammarLessonType | null>(null);
  const [activeExamUnit, setActiveExamUnit] = useState<GrammarUnit | null>(null);
  const [showFinalExam, setShowFinalExam] = useState(false);

  // English Tense accordion — collapsed by default
  const [tensesExpanded, setTensesExpanded] = useState(false);

  // Notify parent when a full-screen overlay is active so it can hide Topbar/BottomNav
  const overlayOpen = !!(activeLesson || activeExamUnit || showFinalExam);
  useEffect(() => {
    onOverlayChange?.(overlayOpen);
  }, [overlayOpen, onOverlayChange]);

  // Gamification state
  const [xpGain, setXpGain] = useState<number | null>(null);
  const [levelUpTo, setLevelUpTo] = useState<number | null>(null);
  const prevLevelRef = useRef(progress.level);

  const handleLessonComplete = useCallback(
    (score: number) => {
      if (activeLesson) {
        const prevLevel = computeLevel(progress.totalXp).level;
        const xp = progress.completeLesson(activeLesson.id, score);
        setXpGain(xp);
        const newLevel = computeLevel(progress.totalXp + xp).level;
        if (newLevel > prevLevel) {
          setTimeout(() => setLevelUpTo(newLevel), 1000);
        }
      }
    },
    [activeLesson, progress]
  );

  const handleExamComplete = useCallback(
    (score: number, passed: boolean) => {
      if (activeExamUnit) {
        const prevLevel = computeLevel(progress.totalXp).level;
        const xp = progress.completeExam(activeExamUnit.id, score, passed);
        if (xp > 0) {
          setXpGain(xp);
          const newLevel = computeLevel(progress.totalXp + xp).level;
          if (newLevel > prevLevel) {
            setTimeout(() => setLevelUpTo(newLevel), 1000);
          }
        }
      }
    },
    [activeExamUnit, progress]
  );

  const handleFinalExamComplete = useCallback(
    (score: number, passed: boolean) => {
      const prevLevel = computeLevel(progress.totalXp).level;
      const xp = progress.completeExam("final", score, passed);
      if (xp > 0) {
        setXpGain(xp);
        const newLevel = computeLevel(progress.totalXp + xp).level;
        if (newLevel > prevLevel) {
          setTimeout(() => setLevelUpTo(newLevel), 1000);
        }
      }
    },
    [progress]
  );

  const finalExamResult = progress.getExamResult("final");

  // ── Active lesson overlay ──
  if (activeLesson) {
    if (activeLesson.id === "passive-sentence-builder") {
      return (
        <PassiveSentenceBuilder
          onComplete={handleLessonComplete}
          onClose={() => setActiveLesson(null)}
        />
      );
    }
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
        timeLimitSeconds={300}
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

  // Tenses completion summary
  const tensesCompletedLessons = GRAMMAR_UNITS.reduce(
    (sum, u) => sum + u.lessons.filter((l) => progress.isLessonCompleted(l.id)).length,
    0
  );
  const tensesTotalLessons = GRAMMAR_UNITS.reduce((sum, u) => sum + u.lessons.length, 0);
  const tensesExamsPassed = GRAMMAR_UNITS.filter((u) => progress.isExamPassed(u.id)).length;

  return (
    <div className="max-w-[540px] lg:max-w-[800px] xl:max-w-[960px] mx-auto">
      {/* XP Gain Popup */}
      {xpGain !== null && <XpGainPopup xp={xpGain} onDone={() => setXpGain(null)} />}
      {/* Level Up Toast */}
      {levelUpTo !== null && <LevelUpToast level={levelUpTo} onDone={() => setLevelUpTo(null)} />}

      {/* Progress hero */}
      <ProgressHero
        totalXp={progress.totalXp}
        level={progress.level}
        levelProgress={progress.levelProgress}
        completedAll={progress.completedAllLessonsCount}
        totalAll={progress.totalAllLessons}
      />

      {/* ── Section 1: English Tense (collapsible accordion) ── */}
      <div
        className="rounded-lg overflow-hidden mb-4"
        style={{
          border: progress.allTensesComplete
            ? "1px solid rgba(16,185,129,0.2)"
            : "1px solid rgba(0,168,150,0.15)",
          background: "var(--color-bg-card)",
        }}
      >
        {/* Accordion header */}
        <button
          onClick={() => setTensesExpanded((v) => !v)}
          className="w-full px-4 py-4 flex items-center gap-3 text-left"
          style={{
            background: progress.allTensesComplete
              ? "rgba(16,185,129,0.06)"
              : "rgba(0,168,150,0.04)",
          }}
        >
          <span className="text-xl">📖</span>
          <div className="flex-1">
            <p className="text-base font-sora font-bold" style={{ color: "var(--color-text)" }}>
              English Tense
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
              Present, Past &amp; Future &middot; {tensesCompletedLessons}/{tensesTotalLessons} lessons &middot; {tensesExamsPassed}/3 exams
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {progress.allTensesComplete && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                ✓ Complete
              </span>
            )}
            <span
              className="text-sm transition-transform duration-normal"
              style={{ color: "var(--color-text-secondary)", transform: tensesExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              ▼
            </span>
          </div>
        </button>

        {/* Tenses progress bar */}
        <div className="px-4 pb-2" style={{ background: progress.allTensesComplete ? "rgba(16,185,129,0.06)" : "rgba(0,168,150,0.04)" }}>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
            <div
              className="h-full rounded-full transition duration-700 ease-out"
              style={{
                width: `${tensesTotalLessons > 0 ? Math.round((tensesCompletedLessons / tensesTotalLessons) * 100) : 0}%`,
                background: progress.allTensesComplete
                  ? "linear-gradient(90deg, var(--color-success), var(--color-accent))"
                  : "linear-gradient(90deg, #00A896, #007A6E)",
              }}
            />
          </div>
        </div>

        {/* Expanded: show 3 unit cards */}
        {tensesExpanded && (
          <div className="px-3 py-3 flex flex-col gap-3">
            {GRAMMAR_UNITS.map((unit) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                progress={progress}
                onStartLesson={setActiveLesson}
                onStartExam={setActiveExamUnit}
                defaultExpanded={progress.isUnitUnlocked(unit.id) && !progress.isExamPassed(unit.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Section 2: Passive Voice ── */}
      {GRAMMAR_TOPICS.map((topic) => {
        const topicUnlocked = progress.isUnitUnlocked(topic.id);
        return (
          <div key={topic.id} className="mb-4">
            <UnitCard
              unit={topic}
              progress={progress}
              onStartLesson={setActiveLesson}
              onStartExam={setActiveExamUnit}
              defaultExpanded={topicUnlocked && !progress.isExamPassed(topic.id)}
            />
            {/* Unlock hint */}
            {!topicUnlocked && (
              <div
                className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg"
                style={{
                  background: "color-mix(in srgb, var(--color-text-secondary) 8%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--color-text-secondary) 12%, transparent)",
                }}
              >
                <span className="text-sm">🔒</span>
                <p className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
                  {topic.id === "topic-passive-voice"
                    ? "Complete all English Tense exams to unlock"
                    : topic.id === "topic-modal-verbs"
                    ? "Complete Passive Voice exam to unlock"
                    : "Complete previous topics to unlock"}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {/* ── Section 3: Final Exam ── */}
      <div
        className="rounded-lg p-5"
        style={{
          border: progress.isFinalExamUnlocked
            ? "1px solid rgba(251,191,36,0.3)"
            : "1px solid var(--color-border)",
          background: progress.isFinalExamUnlocked
            ? "rgba(251,191,36,0.06)"
            : "var(--color-primary-soft)",
          opacity: progress.isFinalExamUnlocked ? 1 : 0.6,
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">🏆</span>
          <div className="flex-1">
            <p className="text-base font-sora font-bold" style={{ color: "var(--color-text)" }}>
              Final Exam
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
              {progress.isFinalExamUnlocked
                ? `${FINAL_EXAM_QUESTIONS.length} questions \u00b7 ${Math.floor(FINAL_EXAM_CONFIG.timeLimitSeconds / 60)} minutes \u00b7 +${FINAL_EXAM_CONFIG.xpReward} XP`
                : "Complete English Tense, Passive Voice & Modal Verbs to unlock"}
            </p>
          </div>
          {finalExamResult?.passed && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
              ✓ {finalExamResult.score}%
            </span>
          )}
        </div>

        <Button
          disabled={!progress.isFinalExamUnlocked}
          onClick={() => setShowFinalExam(true)}
          variant="primary"
          size="lg"
          fullWidth
          className="rounded-xl"
          style={{
            background: progress.isFinalExamUnlocked
              ? "linear-gradient(135deg, var(--color-warning), #D97706)"
              : "var(--color-border)",
            color: progress.isFinalExamUnlocked ? "white" : "var(--color-text-secondary)",
          }}
        >
          {finalExamResult?.passed ? "Retake Final Exam" : progress.isFinalExamUnlocked ? "Start Final Exam" : "🔒 Locked"}
        </Button>
      </div>
    </div>
  );
}
