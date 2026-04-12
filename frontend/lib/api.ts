/**
 * lib/api.ts
 *
 * HTTP client for the Lingona backend.
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
import type {
  GamificationData,
  LeaderboardData,
  PronunciationResult,
  Scenario,
  StartSessionResult,
  SubmitTurnResult,
  EndSessionResult,
  SessionDetail,
  SpeakingMetricsData,
  TodayFocusData,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

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
    throw new Error((json as { message?: string }).message ?? `We couldn't load this right now. Give it another try?`);
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
    throw new Error((json as { message?: string }).message ?? `We couldn't complete that request. Give it another try?`);
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

  const initialToken = useAuthStore.getState().accessToken;
  let res = await makeReq(initialToken);

  if (res.status === 401) {
    const ok = await tryRefresh();
    if (!ok) {
      useAuthStore.getState().clearAuth();
      // Distinguish "never logged in" from "session expired"
      throw new Error(
        initialToken
          ? "Your session timed out — let's pick up where you left off"
          : "Please sign in to continue."
      );
    }
    res = await makeReq(useAuthStore.getState().accessToken);
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { message?: string }).message ?? `We couldn't complete that request. Give it another try?`);
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

  const initialToken = useAuthStore.getState().accessToken;
  let res = await makeReq(initialToken);

  if (res.status === 401) {
    const ok = await tryRefresh();
    if (!ok) {
      useAuthStore.getState().clearAuth();
      // Distinguish "never logged in" from "session expired"
      throw new Error(
        initialToken
          ? "Your session timed out — let's pick up where you left off"
          : "Please sign in to continue."
      );
    }
    res = await makeReq(useAuthStore.getState().accessToken);
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { message?: string }).message ?? `We couldn't complete that request. Give it another try?`);
  }
  return (json as { data: T }).data;
}

/**
 * Authenticated DELETE.
 * Attaches the current access token, retries once after a silent refresh on 401.
 */
async function apiDeleteAuth<T = unknown>(path: string): Promise<T> {
  const makeReq = (token: string | null) =>
    fetch(`${BASE_URL}${path}`, {
      method:      "DELETE",
      headers:     authHeaders(token),
      credentials: "include",
      cache:       "no-store",
    });

  const initialToken = useAuthStore.getState().accessToken;
  let res = await makeReq(initialToken);

  if (res.status === 401) {
    const ok = await tryRefresh();
    if (!ok) {
      useAuthStore.getState().clearAuth();
      throw new Error(
        initialToken
          ? "Your session timed out — let's pick up where you left off"
          : "Please sign in to continue."
      );
    }
    res = await makeReq(useAuthStore.getState().accessToken);
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { message?: string }).message ?? `We couldn't complete that request. Give it another try?`);
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

/**
 * GET /api/v1/users/:userId/pronunciation/metrics
 * Returns 30-day score trend and summary stats for the Speaking Metrics view.
 */
export async function getSpeakingMetrics(userId: string): Promise<SpeakingMetricsData> {
  return apiFetchAuth<SpeakingMetricsData>(`/users/${userId}/pronunciation/metrics`);
}

/**
 * GET /api/v1/users/:userId/band-progress
 * Returns band history, estimated band, weekly delta, per-skill averages.
 */
export async function getBandProgress(userId: string): Promise<import("./types").BandProgressData> {
  return apiFetchAuth<import("./types").BandProgressData>(`/users/${userId}/band-progress`);
}

// ---------------------------------------------------------------------------
// Pro / Subscription
// ---------------------------------------------------------------------------

import type { ProStatus } from "./types";

export async function getProStatus(): Promise<ProStatus> {
  return apiFetchAuth<ProStatus>("/users/pro-status");
}

export async function startProTrial(): Promise<{ trial_expires_at: string; is_pro: boolean; is_trial: boolean }> {
  return apiPostAuth<{ trial_expires_at: string; is_pro: boolean; is_trial: boolean }>("/users/start-trial", {});
}

export async function upgradeToPro(): Promise<{ is_pro: boolean }> {
  return apiPostAuth<{ is_pro: boolean }>("/users/upgrade", {});
}

/** GET /users/daily-limits — current usage vs limits */
export async function getDailyLimits(): Promise<import("./types").DailyLimitsStatus> {
  return apiFetchAuth<import("./types").DailyLimitsStatus>("/users/daily-limits");
}

/** GET /users/achievements — all badges, earned, progress */
export async function getAchievements(): Promise<import("./types").AchievementsData> {
  return apiFetchAuth<import("./types").AchievementsData>("/users/achievements");
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

import type { ChatMessage, Conversation } from "./types";

export async function getChatConversations(): Promise<{ conversations: Conversation[] }> {
  return apiFetchAuth<{ conversations: Conversation[] }>("/chat/conversations");
}

export async function getChatMessages(friendId: string, before?: string): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  const params = before ? `?before=${before}` : "";
  return apiFetchAuth<{ messages: ChatMessage[]; hasMore: boolean }>(`/chat/messages/${friendId}${params}`);
}

export async function sendChatMessage(friendId: string, content: string): Promise<ChatMessage> {
  return apiPostAuth<ChatMessage>(`/chat/messages/${friendId}`, { content });
}

export async function sendVoiceNote(friendId: string, audio: string, duration: number): Promise<ChatMessage> {
  return apiPostAuth<ChatMessage>(`/chat/voice/${friendId}`, { audio, duration });
}

export async function markChatSeen(friendId: string): Promise<unknown> {
  return apiPostAuth<unknown>(`/chat/messages/${friendId}/seen`, {});
}

export async function deleteChatMessage(messageId: string): Promise<unknown> {
  return apiDeleteAuth(`/chat/messages/${messageId}`);
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

import type { ProfileStats, PublicProfile, ProfileUpdateData } from "./types";

export async function getProfileStats(): Promise<ProfileStats> {
  return apiFetchAuth<ProfileStats>("/users/profile/stats");
}

export async function updateProfile(data: ProfileUpdateData): Promise<unknown> {
  return apiPostAuth<unknown>("/users/profile", data);
}

export async function uploadAvatar(imageBase64: string): Promise<{ avatar_url: string }> {
  return apiPostAuth<{ avatar_url: string }>("/users/avatar", { image: imageBase64 });
}

export async function getPublicProfile(username: string): Promise<PublicProfile> {
  return apiFetch<PublicProfile>(`/profile/${username}`);
}

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

import type { OnboardingStatus } from "./types";

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  return apiFetchAuth<OnboardingStatus>("/users/onboarding/status");
}

export async function completeOnboarding(targetBand: number | null): Promise<unknown> {
  return apiPostAuth<unknown>("/users/onboarding/complete", { target_band: targetBand });
}

export async function skipOnboarding(): Promise<unknown> {
  return apiPostAuth<unknown>("/users/onboarding/skip", {});
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

import type { ReadingPassageSummary, ReadingPassageFull, ReadingPracticeResult, ReadingFullTestData, ReadingFullTestResult } from "./types";

export async function getReadingPassages(filters?: { difficulty?: string; topic?: string; limit?: number }): Promise<{ passages: ReadingPassageSummary[] }> {
  const params = new URLSearchParams();
  if (filters?.difficulty) params.set("difficulty", filters.difficulty);
  if (filters?.topic) params.set("topic", filters.topic);
  if (filters?.limit) params.set("limit", String(filters.limit));
  return apiFetchAuth<{ passages: ReadingPassageSummary[] }>(`/reading/passages?${params}`);
}

export async function getReadingPassage(passageId: string): Promise<ReadingPassageFull> {
  return apiFetchAuth<ReadingPassageFull>(`/reading/passages/${passageId}`);
}

export async function submitReadingPractice(body: { passage_id: string; answers: Array<{ question_id?: string; order_index?: number; answer: string }>; time_seconds: number }): Promise<ReadingPracticeResult> {
  return apiPostAuth<ReadingPracticeResult>("/reading/submit", body);
}

export async function startReadingFullTest(): Promise<ReadingFullTestData> {
  return apiPostAuth<ReadingFullTestData>("/reading/full-test/start", {});
}

export async function submitReadingFullTest(body: { passage_results: Array<{ passage_id: string; answers: Array<{ question_id?: string; order_index?: number; answer: string }> }>; time_seconds: number }): Promise<ReadingFullTestResult> {
  return apiPostAuth<ReadingFullTestResult>("/reading/full-test/submit", body);
}

/**
 * GET /api/v1/users/:userId/coach/focus
 * Returns 0–2 prioritised focus recommendations for the homepage coach card.
 * Never throws — returns { recommendations: [] } on any error.
 */
export async function getTodayFocus(userId: string): Promise<TodayFocusData> {
  try {
    return await apiFetchAuth<TodayFocusData>(`/users/${userId}/coach/focus`);
  } catch (err) {
    console.warn("[getTodayFocus] Failed to fetch focus recommendations:", err);
    return { recommendations: [] };
  }
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
    throw new Error(`We couldn't upload your recording. Give it another try?`);
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
// API functions — Scenarios  (public list + protected sessions)
// ---------------------------------------------------------------------------

/** GET /api/v1/scenarios — list all scenarios, optionally filtered by category. */
export async function getScenarios(category?: string): Promise<Scenario[]> {
  const path = category ? `/scenarios?category=${encodeURIComponent(category)}` : "/scenarios";
  const data = await apiFetch<{ scenarios: Scenario[] }>(path);
  return data.scenarios;
}

/** POST /api/v1/scenarios/:scenarioId/start — start a new conversation session. */
export async function startScenarioSession(
  scenarioId: string,
  options?: { cueCardIndex?: number },
): Promise<StartSessionResult> {
  const body: Record<string, unknown> = {};
  if (options?.cueCardIndex != null) body.cueCardIndex = options.cueCardIndex;
  return apiPostAuth<StartSessionResult>(`/scenarios/${scenarioId}/start`, body);
}

/** POST /api/v1/scenarios/sessions/:sessionId/turns — submit a user message. */
export async function submitScenarioTurn(
  sessionId: string,
  content: string,
  speechMetrics?: {
    totalDurationMs: number;
    wordsPerMinute: number;
    pauseCount: number;
    longestPauseMs: number;
    segmentCount: number;
    speakingRatio: number;
  } | null,
): Promise<SubmitTurnResult> {
  const body: Record<string, unknown> = { content };
  if (speechMetrics) body.speechMetrics = speechMetrics;
  return apiPostAuth<SubmitTurnResult>(`/scenarios/sessions/${sessionId}/turns`, body);
}

/** POST /api/v1/scenarios/sessions/:sessionId/end — end session and get scores. */
export async function endScenarioSession(
  sessionId: string,
  durationMs: number,
): Promise<EndSessionResult> {
  return apiPostAuth<EndSessionResult>(`/scenarios/sessions/${sessionId}/end`, { durationMs });
}

// ---------------------------------------------------------------------------
// V2 Experimental API wrappers — append ?experimental=true to endpoints
// ---------------------------------------------------------------------------

/** V2: Submit turn with experimental examiner behavior. */
export async function submitScenarioTurnV2(
  sessionId: string,
  content: string,
  speechMetrics?: {
    totalDurationMs: number;
    wordsPerMinute: number;
    pauseCount: number;
    longestPauseMs: number;
    segmentCount: number;
    speakingRatio: number;
  } | null,
): Promise<SubmitTurnResult> {
  const body: Record<string, unknown> = { content };
  if (speechMetrics) body.speechMetrics = speechMetrics;
  return apiPostAuth<SubmitTurnResult>(
    `/scenarios/sessions/${sessionId}/turns?experimental=true`,
    body
  );
}

/** V2: End session with enhanced scoring (Vietnamese L1 detection). */
export async function endScenarioSessionV2(
  sessionId: string,
  durationMs: number,
): Promise<EndSessionResult> {
  return apiPostAuth<EndSessionResult>(
    `/scenarios/sessions/${sessionId}/end?experimental=true`,
    { durationMs }
  );
}

/** GET /api/v1/scenarios/sessions/:sessionId — get session detail with turns. */
export async function getScenarioSession(sessionId: string): Promise<SessionDetail> {
  return apiFetchAuth<SessionDetail>(`/scenarios/sessions/${sessionId}`);
}

/** GET /api/v1/scenarios/sessions — get user's session history. */
export async function getScenarioHistory(): Promise<SessionDetail[]> {
  return apiFetchAuth<SessionDetail[]>("/scenarios/sessions");
}

// ---------------------------------------------------------------------------
// API functions — TTS (Text-to-Speech for examiner voice)
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/scenarios/tts — synthesize speech from text.
 * Returns audio blob (mp3) or null if TTS is not available (204).
 *
 * Uses the same 401-retry pattern as apiPostAuth so the examiner's voice
 * keeps working even if the access token expires mid-IELTS exam (the exam
 * can run 14+ minutes against a 15-minute token).
 */
export async function synthesizeSpeech(text: string): Promise<Blob | null> {
  const makeReq = (token: string | null) =>
    fetch(`${BASE_URL}/scenarios/tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify({ text }),
    });

  try {
    const initialToken = useAuthStore.getState().accessToken;
    let res = await makeReq(initialToken);

    // Silent refresh on 401 — same pattern as apiPostAuth
    if (res.status === 401) {
      const ok = await tryRefresh();
      if (ok) {
        res = await makeReq(useAuthStore.getState().accessToken);
      }
    }

    if (res.status === 204) return null; // TTS not available (mock mode)
    if (!res.ok) return null; // Graceful fallback — never block the exam flow

    return res.blob();
  } catch {
    return null; // Network error — degrade to text-only
  }
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
    throw new Error((json as { message?: string }).message ?? `We couldn't sign you in right now. Please try again`);
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
    throw new Error((json as { message?: string }).message ?? `We couldn't create your account right now. Please try again`);
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
    throw new Error((json as { message?: string }).message ?? `We couldn't restore your session. Please sign in again`);
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

// ---------------------------------------------------------------------------
// IELTS Writing
// ---------------------------------------------------------------------------

import type { WritingSubmission, WritingSubmissionSummary, WritingTaskType, UserFeedback, FeedbackActivityType, FeedbackRating } from "./types";

/** POST /writing/submit — submit an essay for AI scoring */
export async function submitWritingEssay(body: {
  taskType: WritingTaskType;
  questionText: string;
  essayText: string;
}): Promise<{ submissionId: string; status: string }> {
  return apiPostAuth<{ submissionId: string; status: string }>("/writing/submit", body);
}

/** GET /writing/result/:submissionId — get submission with scores */
export async function getWritingResult(submissionId: string): Promise<WritingSubmission> {
  return apiFetchAuth<WritingSubmission>(`/writing/result/${submissionId}`);
}

/** GET /writing/history — paginated submission history */
export async function getWritingHistory(
  page = 1,
  limit = 10
): Promise<{ submissions: WritingSubmissionSummary[]; page: number; limit: number }> {
  return apiFetchAuth<{ submissions: WritingSubmissionSummary[]; page: number; limit: number }>(
    `/writing/history?page=${page}&limit=${limit}`
  );
}

// ---------------------------------------------------------------------------
// User Feedback
// ---------------------------------------------------------------------------

/** POST /feedback — submit feedback after an activity */
export async function submitFeedback(body: {
  activityType: FeedbackActivityType;
  activityId?: string;
  rating: FeedbackRating;
  comment?: string;
  tags?: string[];
}): Promise<UserFeedback> {
  return apiPostAuth<UserFeedback>("/feedback", body);
}

/** GET /feedback/me — get user's feedback history */
export async function getFeedbackHistory(limit = 20): Promise<{ feedback: UserFeedback[] }> {
  return apiFetchAuth<{ feedback: UserFeedback[] }>(`/feedback/me?limit=${limit}`);
}

// ---------------------------------------------------------------------------
// Social
// ---------------------------------------------------------------------------

import type { FriendRequest, Friend, SocialNotification, SocialProfile } from "./types";

/** POST /social/friends/request */
export async function sendFriendRequest(body: { targetUserId?: string; username?: string; qrToken?: string }): Promise<FriendRequest> {
  return apiPostAuth<FriendRequest>("/social/friends/request", body);
}

/** POST /social/friends/request/:id/accept */
export async function acceptFriendRequest(requestId: string): Promise<unknown> {
  return apiPostAuth<unknown>(`/social/friends/request/${requestId}/accept`, {});
}

/** POST /social/friends/request/:id/reject */
export async function rejectFriendRequest(requestId: string): Promise<unknown> {
  return apiPostAuth<unknown>(`/social/friends/request/${requestId}/reject`, {});
}

/** DELETE /social/friends/request/:id */
export async function cancelFriendRequest(requestId: string): Promise<unknown> {
  return apiDeleteAuth(`/social/friends/request/${requestId}`);
}

/** GET /social/friends */
export async function getFriends(): Promise<{ friends: Friend[] }> {
  return apiFetchAuth<{ friends: Friend[] }>("/social/friends");
}

/** DELETE /social/friends/:friendUserId */
export async function removeFriend(friendUserId: string): Promise<unknown> {
  return apiDeleteAuth(`/social/friends/${friendUserId}`);
}

/** GET /social/friends/requests/incoming */
export async function getIncomingRequests(): Promise<{ requests: FriendRequest[] }> {
  return apiFetchAuth<{ requests: FriendRequest[] }>("/social/friends/requests/incoming");
}

/** GET /social/friends/requests/outgoing */
export async function getOutgoingRequests(): Promise<{ requests: FriendRequest[] }> {
  return apiFetchAuth<{ requests: FriendRequest[] }>("/social/friends/requests/outgoing");
}

/** GET /social/profile/me */
export async function getSocialProfile(): Promise<SocialProfile> {
  return apiFetchAuth<SocialProfile>("/social/profile/me");
}

/** POST /social/profile/username */
export async function setSocialUsername(username: string): Promise<unknown> {
  return apiPostAuth<unknown>("/social/profile/username", { username });
}

/** GET /social/profile/qr */
export async function getQrToken(): Promise<{ qrToken: string }> {
  return apiFetchAuth<{ qrToken: string }>("/social/profile/qr");
}

/** POST /social/pings */
export async function sendPing(body: { receiverUserId: string; messageTemplateKey: string }): Promise<unknown> {
  return apiPostAuth<unknown>("/social/pings", body);
}

/** GET /social/pings/inbox */
export async function getPingsReceived(): Promise<{ pings: unknown[] }> {
  return apiFetchAuth<{ pings: unknown[] }>("/social/pings/inbox");
}

/** GET /social/notifications */
export async function getSocialNotifications(): Promise<{ notifications: SocialNotification[]; unreadCount: number }> {
  return apiFetchAuth<{ notifications: SocialNotification[]; unreadCount: number }>("/social/notifications");
}

/** POST /social/notifications/:id/read */
export async function markNotificationRead(id: string): Promise<unknown> {
  return apiPostAuth<unknown>(`/social/notifications/${id}/read`, {});
}

/** POST /social/notifications/read-all */
export async function markAllNotificationsRead(): Promise<unknown> {
  return apiPostAuth<unknown>("/social/notifications/read-all", {});
}

// ---------------------------------------------------------------------------
// Study Rooms
// ---------------------------------------------------------------------------

import type { StudyRoom, StudyRoomDashboard, StudyRoomNote, ShareCardStats } from "./types";

/** POST /study-rooms */
export async function createStudyRoom(body: { name: string; invitedUserIds?: string[]; goalType?: string; targetValue?: number }): Promise<unknown> {
  return apiPostAuth<unknown>("/study-rooms", body);
}

/** GET /study-rooms */
export async function getMyStudyRooms(): Promise<{ rooms: StudyRoom[] }> {
  return apiFetchAuth<{ rooms: StudyRoom[] }>("/study-rooms");
}

/** GET /study-rooms/:roomId/dashboard */
export async function getStudyRoomDashboard(roomId: string): Promise<StudyRoomDashboard> {
  return apiFetchAuth<StudyRoomDashboard>(`/study-rooms/${roomId}/dashboard`);
}

/** POST /study-rooms/:roomId/accept */
export async function acceptRoomInvite(roomId: string): Promise<unknown> {
  return apiPostAuth<unknown>(`/study-rooms/${roomId}/accept`, {});
}

/** DELETE /study-rooms/:roomId/leave */
export async function leaveStudyRoom(roomId: string): Promise<unknown> {
  return apiDeleteAuth(`/study-rooms/${roomId}/leave`);
}

/** POST /study-rooms/:roomId/goals */
export async function createRoomGoal(roomId: string, body: { goalType: string; targetValue: number; startDate: string; endDate: string }): Promise<unknown> {
  return apiPostAuth<unknown>(`/study-rooms/${roomId}/goals`, body);
}

/** GET /study-rooms/:roomId/notes */
export async function getRoomNotes(roomId: string): Promise<{ notes: StudyRoomNote[] }> {
  return apiFetchAuth<{ notes: StudyRoomNote[] }>(`/study-rooms/${roomId}/notes`);
}

/** POST /study-rooms/:roomId/notes */
export async function createRoomNote(roomId: string, body: { noteType: string; content: string }): Promise<unknown> {
  return apiPostAuth<unknown>(`/study-rooms/${roomId}/notes`, body);
}

/** DELETE /study-rooms/:roomId/notes/:noteId */
export async function deleteRoomNote(roomId: string, noteId: string): Promise<unknown> {
  return apiDeleteAuth(`/study-rooms/${roomId}/notes/${noteId}`);
}

/** POST /study-rooms/:roomId/notes/:noteId/pin */
export async function pinRoomNote(roomId: string, noteId: string): Promise<unknown> {
  return apiPostAuth<unknown>(`/study-rooms/${roomId}/notes/${noteId}/pin`, {});
}

/** GET /study-rooms/:roomId/feed */
export async function getRoomFeed(roomId: string): Promise<{ feed: unknown[] }> {
  return apiFetchAuth<{ feed: unknown[] }>(`/study-rooms/${roomId}/feed`);
}

/** POST /study-rooms/:roomId/nudge */
export async function sendRoomNudge(roomId: string, body: { targetUserId: string }): Promise<unknown> {
  return apiPostAuth<unknown>(`/study-rooms/${roomId}/nudge`, body);
}

// ---------------------------------------------------------------------------
// Share Cards
// ---------------------------------------------------------------------------

/** GET /share-cards/preview-data */
export async function getShareCardPreviewData(): Promise<ShareCardStats> {
  return apiFetchAuth<ShareCardStats>("/share-cards/preview-data");
}

/** POST /share-cards/generate */
export async function generateShareCard(body: { templateKey: string; triggerType?: string }): Promise<unknown> {
  return apiPostAuth<unknown>("/share-cards/generate", body);
}

/** GET /share-cards/history */
export async function getShareCardHistory(): Promise<{ history: unknown[] }> {
  return apiFetchAuth<{ history: unknown[] }>("/share-cards/history");
}

// ---------------------------------------------------------------------------
// Battle
// ---------------------------------------------------------------------------

import type {
  BattleHome, BattleMatchStatus, BattleResult,
  BattleLeaderboardEntry, BattleProfile,
} from "./types";

/** POST /battle/queue/join */
export async function joinBattleQueue(mode: "ranked" | "unranked" = "ranked"): Promise<{ status: string; match: { id: string } }> {
  return apiPostAuth<{ status: string; match: { id: string } }>("/battle/queue/join", { mode });
}

/** POST /battle/queue/leave */
export async function leaveBattleQueue(): Promise<unknown> {
  return apiPostAuth<unknown>("/battle/queue/leave", {});
}

/** GET /battle/matches/:matchId */
export async function getBattleMatch(matchId: string): Promise<BattleMatchStatus> {
  return apiFetchAuth<BattleMatchStatus>(`/battle/matches/${matchId}`);
}

/** POST /battle/matches/:matchId/submit */
export async function submitBattleAnswers(
  matchId: string,
  body: { answers: Array<{ questionId?: string; orderIndex?: number; answer: string }>; timeSeconds: number }
): Promise<{ status: string; score: number; matchId: string }> {
  return apiPostAuth<{ status: string; score: number; matchId: string }>(`/battle/matches/${matchId}/submit`, body);
}

/** GET /battle/matches/:matchId/result */
export async function getBattleResult(matchId: string): Promise<BattleResult> {
  return apiFetchAuth<BattleResult>(`/battle/matches/${matchId}/result`);
}

/** GET /battle/profile/me */
export async function getBattleProfile(): Promise<{ profile: BattleProfile; rank: number | null; recentMatches: unknown[] }> {
  return apiFetchAuth<{ profile: BattleProfile; rank: number | null; recentMatches: unknown[] }>("/battle/profile/me");
}

/** GET /battle/leaderboard */
export async function getBattleLeaderboard(): Promise<{ entries: BattleLeaderboardEntry[]; myEntry: BattleLeaderboardEntry | null }> {
  return apiFetchAuth<{ entries: BattleLeaderboardEntry[]; myEntry: BattleLeaderboardEntry | null }>("/battle/leaderboard");
}

/** POST /battle/challenges */
export async function createBattleChallenge(targetUserId: string): Promise<unknown> {
  return apiPostAuth<unknown>("/battle/challenges", { targetUserId });
}

/** POST /battle/challenges/:id/accept */
export async function acceptBattleChallenge(challengeId: string): Promise<unknown> {
  return apiPostAuth<unknown>(`/battle/challenges/${challengeId}/accept`, {});
}

/** GET /battle/home */
export async function getBattleHome(): Promise<BattleHome> {
  return apiFetchAuth<BattleHome>("/battle/home");
}
