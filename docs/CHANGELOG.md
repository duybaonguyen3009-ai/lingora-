# Lingona — Changelog

Detailed phase history and architecture fixes. Kept for audit and context. For current state, see `CLAUDE.md`.

---

## Post-Review Fixes (applied after Phase 1 architecture evaluation)

Two production bugs identified in the system design review and corrected before Phase 2:

### Fix 1 — Rate limiting behind Railway proxy (`app.js`)
**Problem:** `express-rate-limit` uses `req.ip` to count requests per client. Without
`app.set("trust proxy", 1)`, Express reports every request as coming from Railway's internal
proxy IP — making all users appear to share one IP address. In practice this means
10 requests from *anyone* exhaust the limit globally, then everyone is blocked.

**Fix:** Added `app.set("trust proxy", 1)` as the very first setting inside `createApp()`,
before any middleware registration. Express now reads the real client IP from the
`X-Forwarded-For` header set by Railway's reverse proxy.

```js
// backend/src/app.js
app.set("trust proxy", 1);   // ← added; must come before route registration
```

### Fix 2 — Guest migration atomicity (`progressRepository.js`)
**Problem:** `migrateGuestProgress` ran three independent `query()` calls sequentially
(merge, delete, soft-delete). A crash or DB error between any two steps would leave the
database in a partially-migrated state — progress rows potentially owned by both accounts.

**Fix:** Replaced the three bare `query()` calls with a dedicated `pool.connect()` client
executing `BEGIN` / `COMMIT` / `ROLLBACK`. All three mutations are now atomic — either all
succeed or the whole operation is rolled back.

```js
// backend/src/repositories/progressRepository.js
const client = await pool.connect();
try {
  await client.query("BEGIN");
  // ... merge, delete, soft-delete
  await client.query("COMMIT");
} catch (err) {
  await client.query("ROLLBACK");
  throw err;
} finally {
  client.release();
}
```

**External API behaviour:** Unchanged. Both fixes are internal implementation details with
no effect on request/response shapes, route paths, or calling code.

---

## Architecture Fixes (applied after Phase 4b architecture review)

Five issues identified in a full codebase architecture review and corrected:

### Fix 1 — Security: `completeLesson` userId derived from JWT, not body (`progressController.js`)
**Problem:** The endpoint accepted `userId` from `req.body`, allowing any authenticated user to record lesson completions (and earn XP/badges) on behalf of any other user's UUID.
**Fix:** `userId` is now always derived from `req.user.id` (the verified JWT token). The body field is ignored.

### Fix 2 — Error instances in all services (`scenarioService.js`, `pronunciationService.js`)
**Problem:** Services threw plain objects (`throw { status, message }`) which have no `.stack`. Sentry captures them as `[object Object]` with no usable trace.
**Fix:** All service throws now use proper Error instances with `.status` attached:
```js
const err = new Error("Scenario not found");
err.status = 404;
throw err;
```

### Fix 3 — `gamificationController` bypassed the service layer (`gamificationController.js`, `badgeService.js`)
**Problem:** Controller imported `badgeRepository` directly, skipping the service layer. Any future caching or validation on badge retrieval would be missed.
**Fix:** Added `listUserBadges(userId)` to `badgeService.js`. Controller now calls `badgeService.listUserBadges` instead of importing the repository directly.

### Fix 4 — Response envelope consistency (`gamificationController.js`, `leaderboardController.js`)
**Problem:** Both controllers called `res.json()` directly instead of `sendSuccess()`, producing a slightly different error shape (`data: null` field) than the rest of the API.
**Fix:** Both controllers now use `sendSuccess(res, {...})` and pass errors to `next(err)` for consistent handling by `errorMiddleware`.

### Fix 5 — Cross-domain repository access in `progressService.js`
**Problem:** `progressService` imported `xpRepository.getTotalXp` directly, crossing domain boundaries at the storage layer instead of calling the service layer.
**Fix:** Replaced `getTotalXp` import from the repository with `getXpSummary` from `xpService`. Also removed the now-redundant `computeLevel` call since `getXpSummary` already returns the computed level.

---

## Completed: Phase 4 — Scenario Speaking (Core Conversations)

**Goal:** User selects a scenario, has multi-turn AI conversation, gets session score.

**Approach:** Mock-first (same pattern as Phase 3). AI provider returns deterministic scripted responses; real OpenAI integration follows in Phase 4b.

Changes applied:
1. ✅ Migration 0006: `scenarios`, `scenario_sessions`, `conversation_turns` tables with CHECK constraints
2. ✅ AI provider factory — `providers/ai/aiProvider.js` + `mockAi.js` (category-specific response pools, deterministic scoring)
3. ✅ Scenario domain module — `scenarioRepository`, `scenarioService`, `scenarioController`, `scenarioRoutes`
4. ✅ Session lifecycle: start → submit turns (with mock AI response) → end with scoring (fluency, vocabulary, grammar, coach feedback, per-turn tips)
5. ✅ 12 scenario templates seeded across 6 categories (daily, food, travel, work, social, academic)
6. ✅ `ScenarioList` — category filter pills, difficulty badges, turn count, scenario cards
7. ✅ `ScenarioConversation` — full-screen chat overlay, optimistic UI, typing indicator, "End Chat" after 2+ user turns
8. ✅ `ScenarioSummary` — animated score circle (0→target ease-out), sub-score bars, coach feedback, turn-by-turn tips
9. ✅ Speak tab wired to real API data; homepage PracticeScenarios switches to Speak tab

**Completed in Phase 4b:**
- ✅ Real OpenAI provider (`openaiProvider.js`) using Responses API with 5s timeout + mock fallback
- ✅ IELTS Speaking mode — full 3-part simulation (Part 1 interview → Part 2 cue card + timers → Part 3 discussion)
- ✅ `IeltsConversation.tsx` — phase state machine, keyword + turn-cap detection, localStorage persistence, safe score defaults
- ✅ `IeltsTimer.tsx` — countdown timer (60s prep, 120s speaking), no memory leaks, onExpire once-only guard
- ✅ Migration 0007 — `exam_type` column on scenarios, IELTS scenario seeded

**Also completed in Phase 4b (after architecture review):**
- ✅ Real Azure Speech provider (`azureSpeech.js`) — pure REST API, no SDK, set `SPEECH_PROVIDER=azure` + `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION`
- ✅ Voice input for IELTS — `useVoiceInput` hook (Web Speech API, Chrome/Edge), mic button in `IeltsConversation`, live transcript, auto-send on silence, text input fallback
- ✅ Speaking metrics — 30-day score trend via `GET /api/v1/users/:userId/pronunciation/metrics`, `useSpeakingMetrics` hook, `SpeakingMetrics` SVG chart component, wired into Profile tab

**Remaining in Phase 4b:**
- ⬜ Real Cloudflare R2 storage (`r2Storage.js`) — do when user has R2 credentials
- ⬜ Ensure audio stored as WAV for best Azure Speech accuracy (MediaRecorder records WebM by default)

**Also completed (product refinement pass):**
- ✅ Auth gate on exam/scenario features — guest users see "Sign in to start" prompt instead of cryptic "Session expired" error
- ✅ Improved error messages in `api.ts` — distinguishes "Please log in" (never had session) from "Session expired" (had session, lost it)
- ✅ ExamScreen login prompt banner for unauthenticated users
- ✅ IeltsConversation + ScenarioConversation error states show "Sign In" button when not authenticated
- ✅ Natural examiner delays (1.2–2.4s random pause before AI response appears) — feels human
- ✅ TTS auto-play for examiner questions (via `synthesizeSpeech` API) + auto-start mic after playback ends
- ✅ Exam room intro sequence ("Entering exam room...") instead of instant question
- ✅ Ending phase shows animated score bar analysis UI with 2.5s minimum display
- ✅ AnimatedBackground component — CSS-only gradient blobs (8-15s loops), 3 variants (expressive/subtle/minimal), center glow option
- ✅ Per-tab blob variants: home=expressive, speak/practice=subtle, exam=minimal
- ✅ ProfileScreen BadgeGrid type fix (`earnedAt` → `awarded_at` to match `Badge` type)
- ✅ Hero.tsx unescaped entities fix (build error)

---

## Completed: Phase 5 — AI Study Coach / "Today's Focus"

**Goal:** Help the user immediately know what to do next when they open the app. 1–2 high-impact recommendations, scannable in 3 seconds, coach feel.

**Architecture (strict separation of concerns):**
- `coachRepository.js` — data access only: counts, weakest prompt (with lessonId), recent sessions (with scenarioId) — 4 SQL queries
- `coachService.js` — rules engine: pure logic, no HTTP. Thresholds in named constants for easy tuning
- `coachController.js` — HTTP layer: UUID validation, ownership check, delegates to service
- `coachRoutes.js` — mounted at `/api/v1/users` alongside gamificationRoutes
- `useTodayFocus.ts` — React hook: fetch + cancel on unmount, errors logged via `console.warn`
- `TodayFocusCard.tsx` — positive empty state ("You're doing great today!"), colour-coded label pills per type

**Rules engine (priority order):**
1. **New user** (0 pronunciation + 0 scenarios) → "Start your first lesson" → Practice tab
2. **Weak pronunciation** (avg score on worst prompt < 75) → specific prompt with score + `lessonId` → Practice tab
3. **No recent scenarios** (last 7 days) → "No conversations this week" → Speak tab
4. **Low recent scenario avg** (< 60) → names the worst scenario + `scenarioId` for deep-link → Speak tab (or opens scenario directly)
5. Returns empty array if user is performing well → card shows positive empty state

**Deep linking:**
- `FocusRecommendation` carries optional `scenarioId` and `lessonId` fields
- Scenario deep-link: when `scenarioId` is present + actionTarget is `"speak"`, `handleFocusAction` fetches the scenario list, finds the match, and opens the conversation directly (bypasses ScenarioList browser)
- Pronunciation/lesson deep-link: `lessonId` is included for future auto-open (requires deeper component plumbing — TODO)
- All deep-links fall through to tab navigation on any error

**Error handling:**
- `api.ts` `getTodayFocus()` catches and logs errors via `console.warn`, returns `{ recommendations: [] }`
- `useTodayFocus` hook `.catch()` logs errors via `console.warn`
- `coachService.getFocusRecommendations()` catches DB errors, logs via `console.error`, returns `[]`
- UI always degrades gracefully — never crashes the homepage

**Extension points (built in, not used yet):**
- Thresholds (`WEAK_PRON_THRESHOLD`, `WEAK_SCENARIO_THRESHOLD`, `RECENT_SCENARIO_DAYS`) are named constants
- Each recommendation type has its own builder function — add new types without touching control flow
- `getFocusRecommendations()` never throws — LLM integration can replace or augment it later

**UX decisions:**
- Card appears between `StartSpeakingCard` and `PracticeScenarios` — after hero, before generic content
- Hidden while loading (no flash); shows positive empty state when no weak spots found
- Each row: label pill + title + description + action button (right-aligned)
- Action button deep-links to specific scenario when possible; falls back to tab navigation

---

## Completed: UI/UX Overhaul (between Phase 3 and Phase 4)

**Goal:** Transform Lingona from dashboard-style app to action-first AI speaking coach. Speaking-first, not content-browsing-first.

Changes applied:
1. ✅ CSS variables theme system — dark/light mode with `next-themes`, ~294 hardcoded color references migrated to CSS variables across 30+ files
2. ✅ Homepage redesign — `StartSpeakingCard` hero, `PracticeScenarios` (3 scenario cards), `CoachTipCard` (dismissible, non-blocking)
3. ✅ Navigation — replaced 8-item Sidebar with 4-item `BottomNav` (Home / Speak / Practice / Profile)
4. ✅ Topbar simplified — streak badge + "Lingona" brand + ThemeToggle + avatar (removed XP badge, search, notification bell, hamburger)
5. ✅ `SpeakingSection` redesign — conversation-thread layout with chat bubbles, scores hidden during live speaking (shown only on CompletionScreen)
6. ✅ Splash screen — logo + "LINGONA" text + loading bar (needs animated logo asset later)
7. ✅ Branding — text references updated from "Lingora" to "Lingona"

**Design principles locked:**
- Homepage guides to speaking in <10 seconds
- No XP-heavy UI on homepage
- Coaching tips are non-blocking (dismissible cards, not modals)
- Scoring stays out of live speaking flow
- Homepage stays minimal (~3-4 sections max, not a dashboard)

---

## Completed Phase: Phase 3 — Pronunciation Practice (Mock-First)

**Goal:** Audio upload, speech-to-text, and AI pronunciation scoring with phoneme-level feedback. Mock-first approach: mock providers ship first, real Cloudflare R2 + Azure Speech integration follows.

All tasks completed:
1. ✅ Migration `0005_pronunciation` — `pronunciation_attempts` table with JSONB phoneme/word details
2. ✅ Backend: Provider abstraction pattern — `providers/storage/` and `providers/speech/` with factory + interface docs
3. ✅ Backend: Mock storage provider — in-memory Map, localhost upload/download URLs, Express mock routes
4. ✅ Backend: Mock speech provider — deterministic scoring from reference text, phoneme decomposition
5. ✅ Backend: `mediaService.js` — pre-signed upload URL generation via storage provider
6. ✅ Backend: `pronunciationService.js` — orchestrates assessment: download URL → speech provider → persist attempt
7. ✅ Backend: `pronunciationRepository.js` — insert attempt, find best by lesson, find by prompt
8. ✅ Backend: `POST /api/v1/pronunciation/upload-url` — JWT protected, returns `{ uploadUrl, storageKey }`
9. ✅ Backend: `POST /api/v1/pronunciation/assess` — JWT protected, looks up reference text, returns phoneme feedback
10. ✅ Backend: `GET /api/v1/pronunciation/history/:promptId` — JWT protected, attempt history
11. ✅ Frontend: `AudioRecorder` component — browser MediaRecorder API, mic permission, pulsing recording UI
12. ✅ Frontend: `PronunciationResults` component — animated score circle, subscores, word pills, expandable phoneme detail
13. ✅ Frontend: `SpeakingSection` rewrite — per-prompt state machine (idle → recording → uploading → assessing → results)
14. ✅ Frontend: `LessonModal` — combined quiz + speaking scoring, passes lessonId/userId to SpeakingSection
15. ✅ Frontend: `CompletionScreen` — optional speaking score stat card alongside XP and quiz

**Exit criteria met:** User can record speech, upload audio (mock), receive pronunciation score + phoneme breakdown, retry per prompt, and see combined score on completion.

**Post-Phase 3 fix — Cross-domain query removal:**
- `pronunciationService.js` no longer imports `db.query()` or queries `speaking_prompts` directly
- Speaking prompt lookup now goes through `lessonService.getSpeakingPromptById()` → `lessonRepository.findSpeakingPromptById()`
- This enforces the "no cross-domain repository access" design rule

**Pending real provider integration (Phase 3b):**
- `providers/storage/r2Storage.js` — Cloudflare R2 with `@aws-sdk/client-s3`
- `providers/speech/azureSpeech.js` — Azure Speech SDK (`microsoft-cognitiveservices-speech-sdk`)
- Env vars: `STORAGE_PROVIDER=r2`, `SPEECH_PROVIDER=azure` + R2/Azure credentials

---

## Completed Phase: Phase 2 — Gamification

**Goal:** Daily engagement loop with XP, streaks, badges, and leaderboard.

All tasks completed:
1. ✅ Migration `0003_gamification` — `xp_ledger`, `user_streaks`, `badges`, `user_badges`, `learning_events`
2. ✅ Migration `0004_fill_in_blank` — `question_type`, `correct_answer` columns on `quiz_items`
3. ✅ Backend: XP service — append-only `xp_ledger`, level computation from `LEVEL_THRESHOLDS`
4. ✅ Backend: Streak service — UTC calendar-day logic, longest streak tracking
5. ✅ Backend: Badge service — `first_lesson`, `streak_3`, `streak_7`, `streak_30`, `perfect_score`, `speed_demon`
6. ✅ Backend: Learning events — append-only log per lesson completion
7. ✅ Backend: `GET /api/v1/leaderboard?scope=weekly|all-time` — RANK() window function, optional auth
8. ✅ Backend: `GET /api/v1/users/:userId/gamification` — XP summary + streak + badges (JWT protected)
9. ✅ Backend: Wired gamification into `progressService.completeLesson` — XP, streak, badges, level-up detection
10. ✅ Frontend: `useGamification` + `useLeaderboard` hooks
11. ✅ Frontend: `XpProgressBar` — animated level fill bar
12. ✅ Frontend: `BadgeToast` — auto-dismiss notification on badge award
13. ✅ Frontend: `LevelUpModal` — full-screen celebration, auto-closes after 3s
14. ✅ Frontend: `LessonModal` — real XP, level-up modal, badge toast, streak stat on CompletionScreen
15. ✅ Frontend: `QuizSection` — fill-in-blank question type support
16. ✅ Frontend: Leaderboard page `/leaderboard` — scope tabs, medal emojis, "You" badge, myEntry
17. ✅ Frontend: Home page — real gamification data from `useGamification`, refetches after lesson

**Exit criteria met:** XP and streaks persist across devices. Leaderboard shows real rankings.

---

## Completed Phase: Phase 1 — Auth & Infrastructure

**Goal:** Secure, deployable foundation. Guest system migrates to real accounts.

Tasks in order:
1. ✅ Set up `node-pg-migrate` + migrations `0001_auth` + `0002_content_meta`
2. ✅ Backend: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
3. ✅ Backend: `verifyToken` + `requireRole` middleware, progress routes protected
4. ✅ Frontend: Zustand `authStore`, `AuthProvider`, token refresh on 401, `useCurrentUserId`
5. ✅ Frontend: `/login` + `/register` pages, `ProtectedRoute` component
6. ✅ Frontend: guest UUID → real account migration on login/register
7. ✅ Deploy config: `railway.toml` + `next.config.mjs` API proxy rewrites + Sentry (`@sentry/node` backend, `@sentry/nextjs` frontend)

**Exit criteria:** A real user can create an account, log in, complete a lesson, and see their progress on page refresh.

---

## Phase Roadmap Summary (Revised)

> Phases reordered after strategy review. Speaking-first direction: ship the core speaking coach, monetize, then expand to writing/grammar.

| Phase | Goal | Status |
|---|---|---|
| 0 – Foundation | Monorepo + docs | ✅ Done |
| 1 – Auth + Infra | JWT auth, migrations, CI/CD, deploy | ✅ Done |
| 2 – Gamification | XP ledger, streaks, badges, leaderboard | ✅ Done |
| 3 – Pronunciation Practice | Audio upload, speech-to-text, AI pronunciation scoring, phoneme feedback | ✅ Done (mock providers) |
| — UI/UX Overhaul | Speaking-first homepage, dark/light theme, new navigation, branding | ✅ Done |
| 4 – Scenario Speaking | AI role-play conversations (mock-first): scenario domain, AI provider, 12 templates, conversation UI | ✅ Done (mock providers) |
| **4b – Real Providers + Exam Speaking** | **Wire real Azure Speech + R2 + OpenAI; add IELTS speaking as scenario variant; speaking metrics** | **✅ Done (R2 storage pending credentials)** |
| **5 – AI Study Coach (Rules-Based)** | **Homepage "Today's Focus" based on weakest scores; quick practice actions; no LLM needed** | **✅ Done** |
| 6 – Admin CMS | Browser-based lesson/vocab/scenario content editor | ⬜ |
| 7 – Monetization | Stripe subscriptions, free tier limits, pro tier unlocks | ⬜ |
| 8 – Grammar & Writing | Grammar correction, sentence rewriting, exam writing (IELTS Task 1 & 2) | ⬜ Delayed |
| 9 – Classrooms & Teachers | Schools, classrooms, assignments, teacher progress view | ⬜ Delayed |
| 10 – Hardening | Load testing, Redis, read replicas, WCAG, observability | ⬜ |
| 11+ – Advanced AI | Personalized recommendations, AI-generated scenarios, model routing | ⬜ Future |

### What changed from original roadmap and why
- **Exam Speaking** (was Phase 5) → merged into Phase 4b. It's a scenario template variant, not a separate backend phase.
- **AI Dialogue** (was Phase 9) → absorbed into Phase 4. Multi-turn AI conversation IS scenario speaking — not a separate feature.
- **Grammar & Writing** (were Phases 6–8) → pushed to Phase 8. Different skill domain; build after speaking is validated and monetized.
- **Classrooms** (was Phase 4 in technical-roadmap.md) → pushed to Phase 9. Needs proven product before B2B adoption.
- **AI Study Coach** (new Phase 5) → rules-based "what to practice next", addresses UX report without adding AI service complexity.
- **No ClawDBot orchestration layer** — premature at current stage. Revisit at 10K+ DAU.

---

## Key File Locations

| Path | Purpose |
|---|---|
| `frontend/app/` | Next.js App Router pages |
| `frontend/components/` | All UI components |
| `frontend/hooks/` | Data-fetching hooks |
| `frontend/lib/api.ts` | HTTP client |
| `frontend/lib/types.ts` | Shared TypeScript types |
| `backend/src/routes/` | URL registration |
| `backend/src/controllers/` | HTTP parsing |
| `backend/src/services/` | Business logic |
| `backend/src/repositories/` | SQL queries |
| `backend/src/middleware/` | Auth, error, logging |
| `backend/sql/` | Schema + seed SQL |
| `backend/migrations/` | node-pg-migrate files (`0001_auth`, `0002_content_meta`, `0003_gamification`, `0004_fill_in_blank`, `0005_pronunciation`) |
| `backend/src/routes/authRoutes.js` | Auth route declarations + rate limiter |
| `backend/src/controllers/authController.js` | Auth HTTP layer (cookies, validation) |
| `backend/src/services/authService.js` | Auth business logic (bcrypt, JWT, token rotation) |
| `backend/src/repositories/authRepository.js` | Auth SQL queries |
| `backend/src/middleware/auth.js` | `verifyToken` + `requireRole` middleware |
| `frontend/lib/stores/authStore.ts` | Zustand store: user, accessToken, isLoading |
| `frontend/lib/api.ts` | HTTP client — public + auth-aware helpers, 401 mutex, all auth functions |
| `frontend/providers/AuthProvider.tsx` | Session restore on mount via POST /auth/refresh |
| `frontend/hooks/useCurrentUserId.ts` | Unified auth-user-id / guest-id hook |
| `frontend/app/(auth)/layout.tsx` | Shared background for /login and /register |
| `frontend/app/(auth)/login/page.tsx` | Login form — email + password |
| `frontend/app/(auth)/register/page.tsx` | Register form — name, email, password, role, dob |
| `frontend/components/ProtectedRoute.tsx` | Auth guard — redirects to /login, shows spinner while loading |
| `backend/src/config/sentry.js` | Conditional Sentry init (`initSentry`) + Express error handler (`getSentryErrorHandler`) |
| `backend/railway.toml` | Railway deploy config — `releaseCommand` runs migrations before traffic swap |
| `backend/.env.example` | Backend env template — includes `SENTRY_DSN` |
| `frontend/next.config.mjs` | Next.js config — API proxy rewrites (`/api/v1/*` → `BACKEND_URL`) + `withSentryConfig` |
| `frontend/instrumentation.ts` | Next.js 14 App Router hook — loads Sentry for Node/Edge runtimes |
| `frontend/sentry.client.config.ts` | Sentry browser config |
| `frontend/sentry.server.config.ts` | Sentry Node.js SSR config |
| `frontend/sentry.edge.config.ts` | Sentry Edge runtime config |
| `frontend/.env.example` | Frontend env template — `NEXT_PUBLIC_API_URL`, `BACKEND_URL`, `SENTRY_*` |
| `docs/technical-roadmap.md` | Full architecture + phase plan |
| `backend/src/repositories/xpRepository.js` | Append-only `xp_ledger` inserts + `getTotalXp` aggregate |
| `backend/src/services/xpService.js` | `awardXp`, `getXpSummary`, `computeLevel` with `LEVEL_THRESHOLDS` |
| `backend/src/repositories/streakRepository.js` | `getStreak` + `upsertStreak` for `user_streaks` |
| `backend/src/services/streakService.js` | `updateStreak` — UTC calendar-day logic, longest streak |
| `backend/src/repositories/badgeRepository.js` | Badge lookup, idempotent `awardBadge`, `getUserBadges` |
| `backend/src/services/badgeService.js` | `checkAndAwardBadges` — all badge slug checks + XP reward |
| `backend/src/repositories/learningEventRepository.js` | Append-only event log per lesson completion |
| `backend/src/repositories/leaderboardRepository.js` | RANK() window function queries — weekly + all-time |
| `backend/src/services/leaderboardService.js` | `getLeaderboard(scope, userId)` — top 50 + myEntry |
| `backend/src/controllers/leaderboardController.js` | `GET /api/v1/leaderboard?scope=` handler |
| `backend/src/routes/leaderboardRoutes.js` | `optionalAuth` middleware — guests can view rankings |
| `backend/src/controllers/gamificationController.js` | `GET /api/v1/users/:userId/gamification` — JWT protected |
| `backend/src/routes/gamificationRoutes.js` | Gamification routes — mounted at `/api/v1/users` |
| `frontend/hooks/useGamification.ts` | Fetches XP + streak + badges for current user |
| `frontend/hooks/useLeaderboard.ts` | Fetches leaderboard by scope, refetches on scope change |
| `frontend/components/XpProgressBar.tsx` | Animated level fill bar + level badge |
| `frontend/components/BadgeToast.tsx` | Auto-dismiss badge award notification (4s) |
| `frontend/components/LevelUpModal.tsx` | Full-screen level-up celebration, auto-closes 3s |
| `frontend/app/leaderboard/page.tsx` | Leaderboard page — scope tabs, medals, "You" badge |
| `backend/src/providers/storage/storageProvider.js` | Storage provider factory — returns mock or R2 based on env |
| `backend/src/providers/storage/mockStorage.js` | In-memory mock storage — dev-only, stores audio blobs in Map |
| `backend/src/providers/speech/speechProvider.js` | Speech provider factory — returns mock or Azure based on env |
| `backend/src/providers/speech/mockSpeech.js` | Deterministic mock pronunciation scorer — phoneme decomposition |
| `backend/src/repositories/pronunciationRepository.js` | SQL for pronunciation_attempts — insert, best-by-lesson, history |
| `backend/src/services/mediaService.js` | Pre-signed upload/download URL generation via storage provider |
| `backend/src/services/pronunciationService.js` | Orchestrates assessment: audio URL → speech provider → persist |
| `backend/src/controllers/pronunciationController.js` | HTTP layer for /pronunciation/* endpoints (upload-url, assess, history) |
| `backend/src/routes/pronunciationRoutes.js` | Pronunciation routes — all JWT protected |
| `frontend/components/LessonModal/AudioRecorder.tsx` | Browser MediaRecorder — mic permission, pulsing recording UI |
| `frontend/components/LessonModal/PronunciationResults.tsx` | Animated score circle, subscore bars, word pills, phoneme expansion |
| `frontend/components/StartSpeakingCard.tsx` | Homepage hero — "Ready to speak?" CTA with mic icon |
| `frontend/components/PracticeScenarios.tsx` | Homepage scenario recommendation cards (3 scenarios) |
| `frontend/components/CoachTipCard.tsx` | Dismissible coaching tip card (non-blocking) |
| `frontend/components/BottomNav.tsx` | Mobile-first bottom navigation — Home / Speak / Practice / Profile |
| `frontend/components/ThemeToggle.tsx` | Dark/light mode toggle button using next-themes |
| `frontend/components/SplashScreen.tsx` | Logo animation splash — shown once per session via sessionStorage |
| `backend/src/repositories/coachRepository.js` | Coach data queries — pronunciation counts, weakest prompt, recent scenario sessions |
| `backend/src/services/coachService.js` | Rules-based recommendation engine — returns 0–2 `FocusRecommendation` objects |
| `backend/src/controllers/coachController.js` | `GET /api/v1/users/:userId/coach/focus` — JWT protected, ownership enforced |
| `backend/src/routes/coachRoutes.js` | Coach routes — mounted at `/api/v1/users` |
| `frontend/hooks/useTodayFocus.ts` | Fetches focus recommendations; returns empty array on error (graceful) |
| `frontend/components/TodayFocusCard.tsx` | Homepage coach card — colour-coded label pills, action buttons, renders nothing when empty |
| `frontend/components/AnimatedBackground.tsx` | CSS-only animated gradient blobs — 3 variants (expressive/subtle/minimal), center glow |
| `frontend/components/ProfileScreen.tsx` | Profile tab — LevelBadge, StreakCard, BadgeGrid, speaking metrics chart |
| `frontend/components/ExamScreen.tsx` | Exam hub — IELTS featured card, coming soon modules, auth gate |
| `backend/src/providers/tts/ttsProvider.js` | TTS factory — returns mock or OpenAI provider based on TTS_PROVIDER env |
| `backend/src/providers/tts/openaiTts.js` | OpenAI TTS — Audio API, 6 voice options, mp3 output |
