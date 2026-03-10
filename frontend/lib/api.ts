/**
 * lib/api.ts
 *
 * Thin HTTP client for the Lingora backend.
 * Base URL falls back to http://localhost:4000/api/v1 for local development.
 * All functions throw a plain Error on non-2xx responses.
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

// ---------------------------------------------------------------------------
// Core fetch helpers
// ---------------------------------------------------------------------------

/** GET — unwraps { success, data, message } envelope. */
async function apiFetch<T>(path: string): Promise<T> {
  const res  = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    cache:   "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { message?: string }).message ?? `API error ${res.status}`);
  }
  return (json as { data: T }).data;
}

/** POST — unwraps { success, data, message } envelope. */
async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res  = await fetch(`${BASE_URL}${path}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
    cache:   "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { message?: string }).message ?? `API error ${res.status}`);
  }
  return (json as { data: T }).data;
}

// ---------------------------------------------------------------------------
// Response shape types
// ---------------------------------------------------------------------------

/** Shape returned by GET /api/v1/lessons (list item, from lesson_summary view) */
export interface ApiLesson {
  id:             string;
  title:          string;
  description:    string | null;
  level:          "beginner" | "intermediate" | "advanced";
  order_index:    number;
  vocab_count:    number;
  quiz_count:     number;
  speaking_count: number;
}

// --- Lesson detail ---

export interface ApiVocabItem {
  id:               string;
  word:             string;
  meaning:          string;
  example_sentence: string | null;
  pronunciation:    string | null;
}

export interface ApiQuizItem {
  id:             string;
  question:       string;
  options:        { a: string; b: string; c: string; d: string };
  correct_option: "a" | "b" | "c" | "d";
}

export interface ApiSpeakingPrompt {
  id:            string;
  prompt_text:   string;
  sample_answer: string | null;
  hint:          string | null;
}

export interface ApiLessonDetail {
  lesson: {
    id:          string;
    title:       string;
    description: string | null;
    level:       string;
    order_index: number;
  };
  vocab:    ApiVocabItem[];
  quiz:     ApiQuizItem[];
  speaking: ApiSpeakingPrompt[];
}

// --- Courses ---

export interface ApiCourse {
  id:            number;
  title:         string;
  description:   string | null;
  level:         "beginner" | "intermediate" | "advanced";
  language:      string;
  thumbnail_url: string | null;
  created_at:    string;
}

export interface ApiUnitLesson {
  id:          string;
  unit_id:     number;
  title:       string;
  type:        "lesson" | "challenge" | "boss";
  order_index: number;
  xp_reward:   number;
}

export interface ApiUnit {
  id:          number;
  course_id:   number;
  title:       string;
  order_index: number;
  lessons:     ApiUnitLesson[];
}

export interface ApiCourseDetail extends ApiCourse {
  units: ApiUnit[];
}

// --- Progress ---

export interface ApiProgressItem {
  lessonId:    string;
  score:       number;
  completed:   boolean;
  completedAt: string | null;
}

export interface ApiCompleteResult {
  userId:      string;
  lessonId:    string;
  score:       number;
  completed:   boolean;
  completedAt: string;
}

// ---------------------------------------------------------------------------
// API functions — Lessons
// ---------------------------------------------------------------------------

/** GET /api/v1/lessons — flat lesson list with content counts. */
export async function getLessons(): Promise<ApiLesson[]> {
  const data = await apiFetch<{ lessons: ApiLesson[] }>("/lessons");
  return data.lessons;
}

/** GET /api/v1/lessons/:id — full lesson detail with vocab, quiz, speaking. */
export async function getLessonDetail(lessonId: string): Promise<ApiLessonDetail> {
  return apiFetch<ApiLessonDetail>(`/lessons/${lessonId}`);
}

// ---------------------------------------------------------------------------
// API functions — Courses
// ---------------------------------------------------------------------------

/** GET /api/v1/courses — course summaries (no units). */
export async function getCourses(): Promise<ApiCourse[]> {
  return apiFetch<ApiCourse[]>("/courses");
}

/** GET /api/v1/courses/:id — course with nested units → lessons. */
export async function getCourseById(id: number): Promise<ApiCourseDetail> {
  return apiFetch<ApiCourseDetail>(`/courses/${id}`);
}

// ---------------------------------------------------------------------------
// API functions — Progress
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/lessons/:lessonId/complete
 * Upserts a user_progress row.  Score is 0–100.
 * Non-critical: caller should handle failure gracefully.
 */
export async function completeLesson(
  lessonId: string,
  userId:   string,
  score:    number
): Promise<ApiCompleteResult> {
  return apiPost<ApiCompleteResult>(`/lessons/${lessonId}/complete`, { userId, score });
}

/**
 * GET /api/v1/users/:userId/progress
 * Returns all completed lessons for a user.  Empty array when no progress exists.
 */
export async function getUserProgress(userId: string): Promise<ApiProgressItem[]> {
  const data = await apiFetch<{ progress: ApiProgressItem[] }>(`/users/${userId}/progress`);
  return data.progress;
}
