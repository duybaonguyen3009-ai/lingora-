/**
 * useGrammarProgress.ts
 *
 * LocalStorage-backed grammar progression hook.
 * Tracks completed lessons, scores, exam results, and XP.
 *
 * No backend changes — grammar progress is frontend-only.
 * When backend grammar support is added, migrate this to useProgress.
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import { GRAMMAR_UNITS, GRAMMAR_TOPICS, TOTAL_GRAMMAR_LESSONS } from "./grammarData";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LessonResult {
  lessonId: string;
  score: number; // 0-100
  completedAt: string; // ISO date
}

export interface ExamResult {
  unitId: string; // or "final"
  score: number;
  passed: boolean;
  completedAt: string;
}

interface GrammarProgressData {
  lessonResults: Record<string, LessonResult>; // lessonId → result
  examResults: Record<string, ExamResult>; // unitId or "final" → result
  totalXp: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "lingona-grammar-progress";
const XP_PER_LESSON = 10;
const XP_PERFECT_BONUS = 5;
const XP_PER_EXAM = 20;
const XP_FINAL_EXAM = 50;

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

function loadProgress(): GrammarProgressData {
  if (typeof window === "undefined") {
    return { lessonResults: {}, examResults: {}, totalXp: 0 };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { lessonResults: {}, examResults: {}, totalXp: 0 };
    return JSON.parse(raw) as GrammarProgressData;
  } catch {
    return { lessonResults: {}, examResults: {}, totalXp: 0 };
  }
}

function saveProgress(data: GrammarProgressData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — silent fail
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseGrammarProgressResult {
  /** Whether a lesson has been completed. */
  isLessonCompleted: (lessonId: string) => boolean;
  /** Get the score for a completed lesson. */
  getLessonScore: (lessonId: string) => number | null;
  /** Record completion of a grammar lesson. Returns XP earned. */
  completeLesson: (lessonId: string, score: number) => number;
  /** Record completion of a unit exam or final exam. Returns XP earned. */
  completeExam: (unitId: string, score: number, passed: boolean) => number;
  /** Whether a unit exam was passed. */
  isExamPassed: (unitId: string) => boolean;
  /** Get exam result for a unit or final. */
  getExamResult: (unitId: string) => ExamResult | null;
  /** Whether a lesson is unlocked (all previous lessons in the unit completed). */
  isLessonUnlocked: (lessonId: string) => boolean;
  /** Whether a unit is unlocked (all previous units' exams passed). */
  isUnitUnlocked: (unitId: string) => boolean;
  /** Whether the final exam is unlocked (all unit exams passed). */
  isFinalExamUnlocked: boolean;
  /** Total grammar XP earned. */
  totalXp: number;
  /** Count of completed lessons. */
  completedLessonsCount: number;
  /** Total lessons available. */
  totalLessons: number;
  /** Reset all grammar progress. */
  reset: () => void;
}

export function useGrammarProgress(): UseGrammarProgressResult {
  const [data, setData] = useState<GrammarProgressData>(loadProgress);

  // Only count tenses lessons for the tenses progress display
  const tensesLessonIds = useMemo(
    () => new Set(GRAMMAR_UNITS.flatMap((u) => u.lessons.map((l) => l.id))),
    []
  );

  const completedLessonsCount = useMemo(
    () =>
      Object.keys(data.lessonResults).filter((id) => tensesLessonIds.has(id))
        .length,
    [data.lessonResults, tensesLessonIds]
  );

  const isLessonCompleted = useCallback(
    (lessonId: string) => lessonId in data.lessonResults,
    [data.lessonResults]
  );

  const getLessonScore = useCallback(
    (lessonId: string) => data.lessonResults[lessonId]?.score ?? null,
    [data.lessonResults]
  );

  const completeLesson = useCallback(
    (lessonId: string, score: number): number => {
      const xp = XP_PER_LESSON + (score >= 100 ? XP_PERFECT_BONUS : 0);
      const updated: GrammarProgressData = {
        ...data,
        lessonResults: {
          ...data.lessonResults,
          [lessonId]: {
            lessonId,
            score,
            completedAt: new Date().toISOString(),
          },
        },
        totalXp: data.totalXp + xp,
      };
      saveProgress(updated);
      setData(updated);
      return xp;
    },
    [data]
  );

  const completeExam = useCallback(
    (unitId: string, score: number, passed: boolean): number => {
      const xp = unitId === "final" ? XP_FINAL_EXAM : XP_PER_EXAM;
      const earnedXp = passed ? xp : 0;
      const updated: GrammarProgressData = {
        ...data,
        examResults: {
          ...data.examResults,
          [unitId]: {
            unitId,
            score,
            passed,
            completedAt: new Date().toISOString(),
          },
        },
        totalXp: data.totalXp + earnedXp,
      };
      saveProgress(updated);
      setData(updated);
      return earnedXp;
    },
    [data]
  );

  const isExamPassed = useCallback(
    (unitId: string) => data.examResults[unitId]?.passed === true,
    [data.examResults]
  );

  const getExamResult = useCallback(
    (unitId: string) => data.examResults[unitId] ?? null,
    [data.examResults]
  );

  const isLessonUnlocked = useCallback(
    (lessonId: string): boolean => {
      // Check tenses curriculum (sequential cross-unit gating)
      for (const unit of GRAMMAR_UNITS) {
        for (let i = 0; i < unit.lessons.length; i++) {
          if (unit.lessons[i].id === lessonId) {
            if (i === 0) {
              const unitIndex = GRAMMAR_UNITS.indexOf(unit);
              if (unitIndex === 0) return true;
              return data.examResults[GRAMMAR_UNITS[unitIndex - 1].id]?.passed === true;
            }
            return unit.lessons[i - 1].id in data.lessonResults;
          }
        }
      }
      // Check standalone grammar topics (each topic is independently unlocked)
      for (const topic of GRAMMAR_TOPICS) {
        for (let i = 0; i < topic.lessons.length; i++) {
          if (topic.lessons[i].id === lessonId) {
            if (i === 0) return true; // first lesson in any topic is always open
            return topic.lessons[i - 1].id in data.lessonResults;
          }
        }
      }
      return false;
    },
    [data.lessonResults, data.examResults]
  );

  const isUnitUnlocked = useCallback(
    (unitId: string): boolean => {
      // Tenses curriculum: sequential gating
      const unitIndex = GRAMMAR_UNITS.findIndex((u) => u.id === unitId);
      if (unitIndex === 0) return true;
      if (unitIndex > 0) {
        return data.examResults[GRAMMAR_UNITS[unitIndex - 1].id]?.passed === true;
      }
      // Standalone grammar topics: always unlocked (no cross-topic dependency)
      if (GRAMMAR_TOPICS.some((t) => t.id === unitId)) return true;
      return false;
    },
    [data.examResults]
  );

  const isFinalExamUnlocked = useMemo(
    () => GRAMMAR_UNITS.every((u) => data.examResults[u.id]?.passed === true),
    [data.examResults]
  );

  const reset = useCallback(() => {
    const empty: GrammarProgressData = {
      lessonResults: {},
      examResults: {},
      totalXp: 0,
    };
    saveProgress(empty);
    setData(empty);
  }, []);

  return {
    isLessonCompleted,
    getLessonScore,
    completeLesson,
    completeExam,
    isExamPassed,
    getExamResult,
    isLessonUnlocked,
    isUnitUnlocked,
    isFinalExamUnlocked,
    totalXp: data.totalXp,
    completedLessonsCount,
    totalLessons: TOTAL_GRAMMAR_LESSONS,
    reset,
  };
}
