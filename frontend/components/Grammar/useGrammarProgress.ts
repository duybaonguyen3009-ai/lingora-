/**
 * useGrammarProgress.ts
 *
 * LocalStorage-backed grammar progression hook.
 * Tracks completed lessons, scores, exam results, XP, and level.
 *
 * Progression chain:
 *   English Tense (Present → Past → Future) → Passive Voice → Modal Verbs → Final Exam
 *
 * No backend changes — grammar progress is frontend-only.
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
const XP_PER_LEVEL = 100;

// Topic dependency chain: topic ID → required predecessor ID(s)
// Passive Voice requires all 3 tense unit exams passed
// Modal Verbs requires Passive Voice exam passed
const TOPIC_DEPENDENCIES: Record<string, string[]> = {
  "topic-passive-voice": GRAMMAR_UNITS.map((u) => u.id), // all tense unit exams
  "topic-modal-verbs": ["topic-passive-voice"],
};

// ---------------------------------------------------------------------------
// Level computation
// ---------------------------------------------------------------------------

export function computeLevel(xp: number): { level: number; currentXp: number; nextLevelXp: number } {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const currentXp = xp % XP_PER_LEVEL;
  return { level, currentXp, nextLevelXp: XP_PER_LEVEL };
}

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
  isLessonCompleted: (lessonId: string) => boolean;
  getLessonScore: (lessonId: string) => number | null;
  /** Record completion. Returns XP earned. */
  completeLesson: (lessonId: string, score: number) => number;
  /** Record exam completion. Returns XP earned. */
  completeExam: (unitId: string, score: number, passed: boolean) => number;
  isExamPassed: (unitId: string) => boolean;
  getExamResult: (unitId: string) => ExamResult | null;
  isLessonUnlocked: (lessonId: string) => boolean;
  isUnitUnlocked: (unitId: string) => boolean;
  /** Whether all tense unit exams are passed. */
  allTensesComplete: boolean;
  /** Whether the final exam is unlocked (all units + topics complete). */
  isFinalExamUnlocked: boolean;
  totalXp: number;
  /** Current level (1-based). */
  level: number;
  /** XP progress within current level. */
  levelProgress: { currentXp: number; nextLevelXp: number };
  completedLessonsCount: number;
  totalLessons: number;
  /** Total lessons across ALL content (tenses + topics). */
  totalAllLessons: number;
  /** Count of all completed lessons (tenses + topics). */
  completedAllLessonsCount: number;
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

  // All lessons count (tenses + topics)
  const totalAllLessons = useMemo(
    () =>
      GRAMMAR_UNITS.reduce((sum, u) => sum + u.lessons.length, 0) +
      GRAMMAR_TOPICS.reduce((sum, t) => sum + t.lessons.length, 0),
    []
  );

  const completedAllLessonsCount = useMemo(
    () => Object.keys(data.lessonResults).length,
    [data.lessonResults]
  );

  // Level
  const { level, currentXp: levelCurrentXp, nextLevelXp } = useMemo(
    () => computeLevel(data.totalXp),
    [data.totalXp]
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
      // Check standalone grammar topics — respect dependency chain
      for (const topic of GRAMMAR_TOPICS) {
        for (let i = 0; i < topic.lessons.length; i++) {
          if (topic.lessons[i].id === lessonId) {
            // First, check if the topic itself is unlocked
            const deps = TOPIC_DEPENDENCIES[topic.id];
            if (deps) {
              const topicUnlocked = deps.every(
                (depId) => data.examResults[depId]?.passed === true
              );
              if (!topicUnlocked) return false;
            }
            if (i === 0) return true; // first lesson in unlocked topic
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
      // Grammar topics: check dependency chain
      const deps = TOPIC_DEPENDENCIES[unitId];
      if (deps) {
        return deps.every((depId) => data.examResults[depId]?.passed === true);
      }
      // Unknown topic with no dependencies: unlocked
      return true;
    },
    [data.examResults]
  );

  // All 3 tense unit exams passed
  const allTensesComplete = useMemo(
    () => GRAMMAR_UNITS.every((u) => data.examResults[u.id]?.passed === true),
    [data.examResults]
  );

  // Final exam: requires ALL unit exams AND ALL topic exams passed
  const isFinalExamUnlocked = useMemo(
    () => {
      const tensesOk = GRAMMAR_UNITS.every((u) => data.examResults[u.id]?.passed === true);
      const topicsOk = GRAMMAR_TOPICS.every((t) => data.examResults[t.id]?.passed === true);
      return tensesOk && topicsOk;
    },
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
    allTensesComplete,
    isFinalExamUnlocked,
    totalXp: data.totalXp,
    level,
    levelProgress: { currentXp: levelCurrentXp, nextLevelXp },
    completedLessonsCount,
    totalLessons: TOTAL_GRAMMAR_LESSONS,
    totalAllLessons,
    completedAllLessonsCount,
    reset,
  };
}
