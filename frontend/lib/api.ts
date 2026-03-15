/**
 * lib/api.ts
 *
 * HTTP client for the Lingora backend.
 * Base URL falls back to http://localhost:4000/api/v1 for local development.
 *
 * Three tiers of fetch helpers:
 *
 *   apiFetch / apiPost         – public endpoints (no auth).  Lessons, courses.
 *
 *   apiFetchAuth / apiPostAuth – protected endpoints.  Reads the access token
 *                                from the Zustand store, attaches it as a
 *                                Bearer header, and on a 401 response triggers
 *                                a silent token refresh (via the httpOnly
 *                                cookie) before retrying once.  A module-level
 *                                mutex prevents concurrent refresh races.
 *
 *   Auth functions (loginUser, registerUser, refreshSession, logoutUser) call
 *   fetch directly with credentials:"include" so the browser can send/receive
 *   the httpOnly refresh cookie, and they update the store themselves.
 *
 * All functions throw a plain Error on non-2xx responses.
 */

import { useAuthStore, type AuthUser } from "@/lib/stores/authStore";
import type { GamificationData, LeaderboardData, PronunciationResult } from "@/lib/types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

// ---------------------------------------------------------------------------
// 401 Refresh Mutex
// ---------------------------------------------------------------------------

/**
 * At most one /auth/refresh call is in flight at a time.
 * Any subsequent 401s while a refresh is pending share the same promise.
 */
let pendingRefresh: Promise<boolean> | null = null;

/**
 * Exchange the httpOnly refresh cookie for a fresh access token.
 * Updates the store on success.  Returns true on success, false on failure.
 */
async function tryRefresh(): Promise<boolean> {
  if (!pendingRefresh) {
    pendingRefresh = (async (): Promise<boolean> => {
      try {
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
          method:      "POST",
          credentials: "include",
          headers:     { "Content-Type": "application/json" },
        });
        if (!res.ok) return false;
        const json = (await res.json()) as {
          data: { user: AuthUser; accessToken: string };
        };
        useAuthStore.getState().setAuth(json.data.user, json.data.accessToken);
        return true;
      } catch {
        return false;
      } finally {
        pendingRefresh = null;
      }
    })();
  }
  return pendingRefresh;
}

// ---------------------------------------------------------------------------
// Core fetch helpers — public (no auth required)
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
// Core fetch helpers — protected (Bearer token + silent 401 retry)
// ---------------------------------------------------------------------------

function authHeaders(token: string | null): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Authenticated GET.
 * Attaches the current access token, retries once after a silent refresh on 401.
 */
async function apiFetchAuth<T>(path: string): Promise<T> {
  const makeReq = (token: string | null) =>
    fetch(`${BASE_URL}${path}`, {
      headers:     authHeaders(token),
      credentials: "include",
      cache:       "no-store",
    });

  let res = await makeReq(useAuthStore.getState().accessToken);

  if (res.status === 401) {
    const ok = await tryRefresh();
    if (!ok) {
      useAuthStore.getState().clearAuth();
      throw new Error("Session expired. Please log in again.");
    }
    res = await makeReq(useAuthStore.getState().accessToken);
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { message?: string }).message ?? `API error ${res.status}`);
  }
  return (json as { data: T }).data;
}

/**
 * Authenticated POST.
 * Attaches the current access token, retries once after a silent refresh on 401.
 */
async function apiPostAuth<T>(path: string, body: unknown): Promise<T> {
  const makeReq = (token: string | null) =>
    fetch(`${BASE_URL}${path}`, {
      method:      "POST",
      headers:     authHeaders(token),
      body:        JSON.stringify(body),
      credentials: "include",
      cache:       "no-store",
    });

  let res = await makeReq(useAuthStore.getState().accessToken);

  if (res.status === 401) {
    const ok = await tryRefresh();
    if (!ok) {
      useAuthStore.getState().clearAuth();
      throw new Error("Session expired. Please log in again.");
    }
    res = await makeReq(useAuthStore.getState().accessToken);
  }

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
  question_type:  "multiple_choice" | "fill_in_blank";
  options:        { a: string; b: string; c: string; d: string } | null;
  correct_option: "a" | "b" | "c" | "d" | null;
  correct_answer: string | null; // populated on fill_in_blank, null on multiple_choice
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

export interface ApiCompleteBadge {
  id:          string;
  slug:        string;
  name:        string;
  description: string | null;
  icon_url:    string | null;
  xp_reward:   number;
}

export interface ApiCompleteResult {
  // Core progress
  userId:       string;
  lessonId:     string;
  score:        number;
  completed:    boolean;
  completedAt:  string;
  // Gamification enrichment
  xpEarned:     number;
  totalXp:      number;
  level:        number;
  xpInLevel:    number;
  xpToNextLevel: number;
  leveledUp:    boolean;
  streak:       number;
  longestStreak: number;
  newBadges:    ApiCompleteBadge[];
}

// --- Auth ---

export interface ApiAuthData {
  user:        AuthUser;
  accessToken: string;
}

export interface ApiRegisterData extends ApiAuthData {
  needsParentalConsent: boolean;
}

export interface ApiLoginPayload {
  email:    string;
  password: string;
}

export interface ApiRegisterPayload {
  email:    string;
  name:     string;
  password: string;
  role:     "kid" | "teacher" | "parent";
  dob?:     string; // ISO date YYYY-MM-DD — optional but required for COPPA under-13 detection
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
// API functions — Progress  (protected — requires valid JWT)
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/lessons/:lessonId/complete
 * Upserts a user_progress row and runs gamification side-effects.
 * Returns enriched result with XP, level, streak, and any new badges.
 * Non-critical: caller should handle failure gracefully.
 */
export async function completeLesson(
  lessonId:    string,
  userId:      string,
  score:       number,
  timeTakenMs?: number,
): Promise<ApiCompleteResult> {
  return apiPostAuth<ApiCompleteResult>(
    `/lessons/${lessonId}/complete`,
    { userId, score, ...(timeTakenMs != null ? { timeTakenMs } : {}) },
  );
}

/**
 * GET /api/v1/users/:userId/progress
 * Returns all completed lessons for a user.  Empty array when no progress exists.
 */
export async function getUserProgress(userId: string): Promise<ApiProgressItem[]> {
  const data = await apiFetchAuth<{ progress: ApiProgressItem[] }>(`/users/${userId}/progress`);
  return data.progress;
}

// ---------------------------------------------------------------------------
// API functions — Guest migration
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/users/migrate-guest
 *
 * Transfers all progress rows owned by the guest UUID to the currently
 * authenticated user, using best-score-wins merge.  Called once right after
 * a successful login or registration when localStorage contains a guest UUID.
 *
 * Non-critical: callers should swallow errors and always proceed to redirect.
 */
export async function migrateGuestProgress(
  guestId: string,
): Promise<{ migratedCount: number }> {
  return apiPostAuth<{ migratedCount: number }>("/users/migrate-guest", { guestId });
}

// ---------------------------------------------------------------------------
// API functions — Gamification  (protected — requires valid JWT)
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/users/:userId/gamification
 * Returns XP summary, streak, and badge collection for the authenticated user.
 */
export async function getUserGamification(userId: string): Promise<GamificationData> {
  return apiFetchAuth<GamificationData>(`/users/${userId}/gamification`);
}

// ---------------------------------------------------------------------------
// API functions — Leaderboard  (public, optional auth for myEntry)
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/leaderboard?scope=weekly|all-time
 * Returns top-50 rankings plus the current user's own entry (if authenticated).
 */
export async function getLeaderboard(
  scope: "weekly" | "all-time" = "all-time",
): Promise<LeaderboardData> {
  // Use auth-aware fetch so the backend can include the user's own rank.
  // Falls back to anonymous gracefully if no session exists.
  try {
    return await apiFetchAuth<LeaderboardData>(`/leaderboard?scope=${scope}`);
  } catch {
    // If auth fails (guest), fall back to public fetch.
    return apiFetch<LeaderboardData>(`/leaderboard?scope=${scope}`);
  }
}

// ---------------------------------------------------------------------------
// API functions — Pronunciation  (protected — requires valid JWT)
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/pronunciation/upload-url
 * Returns a pre-signed upload URL and the storage key for an audio recording.
 */
export async function getAudioUploadUrl(
  promptId: string,
  contentType = "audio/webm",
): Promise<{ uploadUrl: string; storageKey: string }> {
  return apiPostAuth<{ uploadUrl: string; storageKey: string }>(
    "/pronunciation/upload-url",
    { promptId, contentType },
  );
}

/**
 * Upload an audio blob directly to the storage URL (bypasses the backend).
 * Uses raw fetch — not the API envelope helpers.
 */
export async function uploadAudioBlob(
  uploadUrl: string,
  blob: Blob,
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: blob,
    headers: { "Content-Type": blob.type || "audio/webm" },
  });
  if (!res.ok) {
    throw new Error(`Audio upload failed (${res.status})`);
  }
}

/**
 * POST /api/v1/pronunciation/assess
 * Submits audio metadata for AI pronunciation scoring.
 * Returns detailed phoneme-level feedback.
 */
export async function assessPronunciation(
  lessonId: string,
  promptId: string,
  storageKey: string,
  audioDurationMs?: number,
): Promise<PronunciationResult> {
  return apiPostAuth<PronunciationResult>(
    "/pronunciation/assess",
    {
      lessonId,
      promptId,
      storageKey,
      ...(audioDurationMs != null ? { audioDurationMs } : {}),
    },
  );
}

// ---------------------------------------------------------------------------
// API functions — Auth
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/auth/login
 * On success, updates the auth store and returns the session data.
 */
export async function loginUser(payload: ApiLoginPayload): Promise<ApiAuthData> {
  const res  = await fetch(`${BASE_URL}/auth/login`, {
    method:      "POST",
    credentials: "include",   // browser must accept the Set-Cookie refresh token
    headers:     { "Content-Type": "application/json" },
    body:        JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { message?: string }).message ?? `Login failed (${res.status})`);
  }
  const data = (json as { data: ApiAuthData }).data;
  useAuthStore.getState().setAuth(data.user, data.accessToken);
  return data;
}

/**
 * POST /api/v1/auth/register
 * On success, updates the auth store and returns the session data.
 */
export async function registerUser(payload: ApiRegisterPayload): Promise<ApiRegisterData> {
  const res  = await fetch(`${BASE_URL}/auth/register`, {
    method:      "POST",
    credentials: "include",   // browser must accept the Set-Cookie refresh token
    headers:     { "Content-Type": "application/json" },
    body:        JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { message?: string }).message ?? `Registration failed (${res.status})`);
  }
  const data = (json as { data: ApiRegisterData }).data;
  useAuthStore.getState().setAuth(data.user, data.accessToken);
  return data;
}

/**
 * POST /api/v1/auth/refresh
 * Called by AuthProvider on mount to restore a session from the httpOnly cookie.
 * On success, updates the store.  Throws on failure (expected for guests).
 */
export async function refreshSession(): Promise<ApiAuthData> {
  const res  = await fetch(`${BASE_URL}/auth/refresh`, {
    method:      "POST",
    credentials: "include",
    headers:     { "Content-Type": "application/json" },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { message?: string }).message ?? `Refresh failed (${res.status})`);
  }
  const data = (json as { data: ApiAuthData }).data;
  useAuthStore.getState().setAuth(data.user, data.accessToken);
  return data;
}

/**
 * POST /api/v1/auth/logout
 * Revokes the refresh token on the server and clears local auth state.
 * Network errors are swallowed — local state is always cleared.
 */
export async function logoutUser(): Promise<void> {
  try {
    await fetch(`${BASE_URL}/auth/logout`, {
      method:      "POST",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
    });
  } catch {
    // Network failure: still clear local state so the user is signed out locally
  }
  useAuthStore.getState().clearAuth();
}
