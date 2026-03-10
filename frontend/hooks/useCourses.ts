/**
 * hooks/useCourses.ts
 *
 * Fetches all courses with their units and lesson nodes, then maps the API
 * response to the `UnitData` / `PathNode` shape that LessonsPage renders.
 *
 * Strategy:
 *  1. GET /api/v1/courses  — get the list of courses.
 *  2. GET /api/v1/courses/:id  — fetch full unit+lesson tree for each course
 *     (in parallel). Typically only 1-2 courses exist in Phase 1.
 *  3. Flatten into a single `UnitData[]` ordered across courses.
 *
 * Mapping decisions (Phase 1 — no user progress yet):
 *
 *  unit.level  → derived from unit's position inside the course:
 *                 1st unit → "B1", 2nd → "B2", 3rd+ → "C1".
 *                 The backend schema has no level column on units yet.
 *
 *  node.status → first lesson of the very first unit = "current" (start here),
 *                everything else = "locked".
 *                Will reflect real completion state once Phase 3 is wired up.
 *
 *  node.difficulty → derived from node type:
 *                    "lesson" → "easy", "challenge" → "medium", "boss" → "hard".
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import {
  getCourses,
  getCourseById,
  type ApiCourseDetail,
  type ApiUnit,
  type ApiUnitLesson,
} from "@/lib/api";

// ---------------------------------------------------------------------------
// Shape types — exported so LessonsPage can import instead of duplicating.
// ---------------------------------------------------------------------------

export type NodeType = "lesson" | "challenge" | "boss";
export type NodeStatus = "completed" | "current" | "locked";
export type Difficulty = "easy" | "medium" | "hard";
export type Level = "B1" | "B2" | "C1";

export interface PathNode {
  id: string;
  title: string;
  subtitle?: string;
  type: NodeType;
  status: NodeStatus;
  xp?: number;
  duration?: number;
  difficulty?: Difficulty;
  level?: Level;
  progress?: number;
}

export interface UnitData {
  id: string;
  title: string;
  description: string;
  level: Level;
  nodes: PathNode[];
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

/** Derive CEFR level for a unit based on its 0-based index within the course. */
function unitLevel(unitIndex: number): Level {
  if (unitIndex === 0) return "B1";
  if (unitIndex === 1) return "B2";
  return "C1";
}

/** Map node type to a difficulty label for the DifficultyBadge. */
function nodeDifficulty(type: NodeType): Difficulty {
  if (type === "boss") return "hard";
  if (type === "challenge") return "medium";
  return "easy";
}

/**
 * Compute node status given the completed set and whether we've seen an
 * "unlocked but not completed" node yet in the traversal.
 */
function nodeStatus(
  lessonId: string,
  completedIds: Set<string>,
  foundCurrentRef: { value: boolean }
): NodeStatus {
  if (completedIds.has(lessonId)) return "completed";
  if (!foundCurrentRef.value) {
    foundCurrentRef.value = true;
    return "current";
  }
  return "locked";
}

/**
 * Build UnitData[] from raw API data + completed lesson IDs.
 * The first non-completed lesson across all units becomes "current"; the
 * rest are "locked".
 */
function buildUnits(
  rawCourses: ApiCourseDetail[],
  completedIds: Set<string>
): UnitData[] {
  const allUnits: UnitData[] = [];
  const foundCurrentRef = { value: false };
  let globalUnitIndex = 0;

  for (const course of rawCourses) {
    for (let i = 0; i < course.units.length; i++) {
      const unit = course.units[i];
      allUnits.push({
        id: String(unit.id),
        title: unit.title,
        description: "",
        level: unitLevel(globalUnitIndex),
        nodes: unit.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          type: lesson.type,
          status: nodeStatus(lesson.id, completedIds, foundCurrentRef),
          xp: lesson.xp_reward,
          difficulty: nodeDifficulty(lesson.type),
          progress: completedIds.has(lesson.id) ? 100 : 0,
        })),
      });
      globalUnitIndex++;
    }
  }

  return allUnits;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseCoursesResult {
  units: UnitData[];
  loading: boolean;
  error: string | null;
}

/**
 * useCourses
 *
 * Returns a flat list of UnitData (all units across all courses), a loading
 * flag, and an error message.
 *
 * @param completedLessonIds - Set of lesson IDs the user has completed.
 *   When this set changes (after finishing a lesson), node statuses are
 *   recomputed reactively via useMemo without re-fetching the API.
 */
export function useCourses(
  completedLessonIds: Set<string> = new Set()
): UseCoursesResult {
  const [rawCourses, setRawCourses] = useState<ApiCourseDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const courses = await getCourses();
        if (cancelled) return;

        if (courses.length === 0) {
          setRawCourses([]);
          setLoading(false);
          return;
        }

        const details = await Promise.all(
          courses.map((c) => getCourseById(c.id))
        );
        if (cancelled) return;

        setRawCourses(details);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Recompute node statuses when completedLessonIds changes — no extra fetch.
  const units = useMemo(
    () => buildUnits(rawCourses, completedLessonIds),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawCourses, completedLessonIds]
  );

  return { units, loading, error };
}
