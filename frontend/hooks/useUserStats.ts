import { useMemo } from "react";
import type { ApiProgressItem } from "@/lib/api";

export interface UserStats {
  totalXp: number;
  level: number;
  xp: number;       // XP within current level
  xpToNext: number; // XP needed to reach next level
  streak: number;   // consecutive days with at least one completed lesson
  completedLessons: number;
}

const XP_PER_LESSON = 10;
const XP_PER_LEVEL = 100;

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function computeUserStats(progress: ApiProgressItem[]): UserStats {
  const completed = progress.filter((p) => p.completed);
  const totalXp = completed.length * XP_PER_LESSON;
  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
  const xp = totalXp % XP_PER_LEVEL;
  const xpToNext = XP_PER_LEVEL - xp;

  // Build a set of unique days that had at least one completed lesson
  const activeDays = new Set(
    completed
      .filter((p) => p.completedAt !== null)
      .map((p) => dateKey(new Date(p.completedAt!)))
  );

  // Streak: consecutive days counting back from today.
  // If today has no activity yet, the streak is still alive from yesterday.
  const today = new Date();
  const todayKey = dateKey(today);
  const startOffset = activeDays.has(todayKey) ? 0 : 1;

  let streak = 0;
  for (let i = startOffset; i <= 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (activeDays.has(dateKey(d))) {
      streak++;
    } else {
      break;
    }
  }

  return { totalXp, level, xp, xpToNext, streak, completedLessons: completed.length };
}

export function useUserStats(progress: ApiProgressItem[]): UserStats {
  return useMemo(() => computeUserStats(progress), [progress]);
}
