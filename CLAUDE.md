# Lingona – Claude Code Instructions

## Project Overview
Lingona is an AI-powered speaking coach for Vietnamese learners of English. The product focuses on speaking practice first — pronunciation, scenario conversations, and exam speaking — with writing and grammar as future expansions. The core philosophy is "Open → Speak → Improve → See it" — users should be speaking within 10 seconds of opening the app.

Monorepo: `frontend/` (Next.js 14 + TS) and `backend/` (Node.js + Express + PostgreSQL).

**Full technical roadmap:** `docs/technical-roadmap.md`
**Brand name:** Lingona (not "Lingora" — fix any remaining references)

---

## Module Architecture

```
speaking/                    ← CORE PRODUCT — build this first
  pronunciation_practice   — Audio upload, speech-to-text, phoneme-level AI feedback
  scenario_speaking        — AI role-play (interviews, travel, meetings, daily conversations)
  exam_speaking            — IELTS speaking format with timers and rubric scoring (scenario variant)

writing/                     ← FUTURE EXPANSION — after speaking is fully shipped + monetized
  grammar_training         — AI grammar correction, sentence rewriting, advanced explanations
  exam_writing             — IELTS Writing Task 1 & 2 with rubric-based AI evaluation
  practical_writing        — Real-world writing (emails, letters, short essays)

core/
  users                    — Accounts, profiles, guest UUID → real account migration
  auth                     — JWT authentication, refresh token rotation
  progress                 — Lesson completion, scores, learning history
  gamification             — XP ledger, streaks, badges, leaderboard

providers/                   ← External service abstractions
  storage/                 — Mock / Cloudflare R2 (audio files)
  speech/                  — Mock / Azure Speech (pronunciation scoring)
  ai/                      — Mock / OpenAI (conversation AI) ← NEW in Phase 4

platform/
  cms                      — Browser-based lesson/vocab/scenario content editor
  payments                 — Stripe subscriptions (free / pro / exam prep packages)
  analytics                — Learning event log, heatmaps, observability
```

### Key Architecture Decision: No Separate AI Orchestration Layer
Conversation role-play is **core product logic**, not an AI add-on. The scenario engine (turn management, session state, scoring rubrics) lives inside `speaking/scenarios/` as a domain module. AI models are accessed through `providers/ai/` — same pattern as storage and speech providers. No separate "ClawDBot" or orchestration service until 10K+ DAU with real usage data.

---

## Architecture Philosophy — Modular Monolith

Lingona follows a **modular monolith** architecture. The system runs as a single deployable unit today, but code is structured with strict domain boundaries to enable future extraction into independent microservices when scale demands it.

### Principles

1. **Monolith now, microservices later** — All modules live in one codebase and share one PostgreSQL database. No premature service extraction until operational complexity justifies it (target: 50K+ DAU).
2. **Loose coupling between domains** — Each domain module (auth, speaking, writing, gamification, etc.) owns its own repositories, services, and controllers. Modules communicate through well-defined service interfaces, never by reaching into another module's repository directly.
3. **Provider abstraction** — All external infrastructure (object storage, speech APIs, AI scoring, payment providers) is accessed through service abstractions, never called directly from controllers or repositories. Swapping providers (e.g., AWS S3 → Cloudflare R2, Azure Speech → Google Speech) should require changing only the provider implementation, not the calling code.
4. **Clear DTOs** — Request and response shapes are defined as explicit types/interfaces. Controllers validate and transform HTTP input into domain DTOs before passing to services. Services never receive raw `req`/`res` objects.

### Domain Boundaries

| Domain | Owns | Boundary Rule |
|---|---|---|
| `auth` | Users, sessions, JWT tokens, roles | Other domains receive only `userId` from auth middleware — never query `users` table directly |
| `courses` | Course definitions, curriculum structure | Read-only reference data for other domains |
| `lessons` | Lesson content, vocab items, quiz items | Provides lesson metadata to progress and speaking domains via service calls |
| `progress` | User progress, scores, completion state | Consumes events from lesson completion; publishes to gamification |
| `gamification` | XP ledger, streaks, badges, leaderboard | Receives completion events from progress; fully self-contained scoring |
| `media` | Audio/image uploads, pre-signed URLs, storage | Provides upload/download URLs to speaking and writing domains; never stores domain-specific metadata |
| `speaking` | Pronunciation scoring, scenario sessions, exam sessions | Consumes media URLs for audio; calls external speech APIs through provider abstraction |
| `writing` | Grammar analysis, essay scoring, writing sessions | Calls external AI APIs through provider abstraction; stores evaluation results |

### Future Microservice Candidates

When scale or team structure justifies extraction, these are the likely first candidates:

| Service | Rationale | Extraction Trigger |
|---|---|---|
| **Media Service** | Audio/image uploads are I/O-heavy and benefit from independent scaling. Already designed to never proxy through the API server (pre-signed URLs). | High upload volume, CDN integration complexity |
| **Pronunciation Service** | Speech scoring involves long-running external API calls (Azure/Google Speech). Isolating prevents slow scoring from blocking the main API event loop. | Latency isolation, independent scaling of speech workload |
| **Learning Analytics Service** | XP ledger, learning events, and heatmap queries are append-heavy and read-heavy. Separating prevents analytics queries from impacting core lesson flow. | Write volume on `xp_ledger`/`learning_events`, complex reporting queries |
| **AI Evaluation Service** | Writing scoring and AI conversation share common LLM infrastructure. Bundling into one service allows shared prompt management and model routing. | Cost optimization, model version management |

### Design Rules

- **No cross-domain repository access** — A service in domain A must never `require()` a repository from domain B. Use the other domain's service layer instead.
- **Provider integrations are isolated** — Each external provider gets its own file (e.g., `providers/azureSpeech.js`, `providers/s3Storage.js`). The domain service imports a provider interface, not the SDK directly.
- **Service interfaces as contracts** — When domain A calls domain B's service, the function signature and return type serve as the contract. Document these in JSDoc.
- **No shared mutable state** — Domains do not share in-memory caches or singletons. Each domain manages its own state.
- **Database schema ownership** — Each domain owns its tables. Cross-domain queries (e.g., JOINs across `users` and `xp_ledger`) are only allowed in read-only analytics/reporting contexts, never in write paths.

---

## Current Status

| Area | Status |
|---|---|
| Monorepo scaffold | ✅ Done |
| PostgreSQL schema + seed data | ✅ Done |
| Backend API (lessons, courses, progress) | ✅ Done |
| Lesson modal flow (vocab → quiz → speaking → completion) | ✅ Done |
| Guest-UUID progress tracking | ✅ Done |
| Dashboard stats + Daily Missions (real data) | ✅ Done |
| DB migrations (node-pg-migrate) | ✅ Done — `backend/migrations/` |
| JWT Authentication (backend) | ✅ Done — register, login, refresh, logout + verifyToken middleware |
| JWT Authentication (frontend) | ✅ Done — authStore, AuthProvider, api.ts auth-aware fetch + 401 retry |
| Login + Register pages | ✅ Done — /login, /register pages + ProtectedRoute component |
| Guest migration | ✅ Done — POST /users/migrate-guest, wired into login + register |
| Deploy config + Sentry | ✅ Done — railway.toml, Next.js proxy rewrites, @sentry/node + @sentry/nextjs |
| XP ledger + gamification | ✅ Done — xp_ledger, streaks, badges, leaderboard, fill-in-blank quiz |
| Pronunciation practice | ✅ Done — provider abstraction, mock storage/speech, audio recorder, phoneme feedback UI |
| UI/UX overhaul | ✅ Done — speaking-first homepage, dark/light theme (CSS variables + next-themes), BottomNav, simplified Topbar, ~294 color migrations |
| Scenario speaking | ❌ Not started — **NEXT** |
| Real providers (Azure Speech, R2, OpenAI) | ❌ Not started |
| AI study coach (rules-based) | ❌ Not started |
| Admin CMS | ❌ Not started |
| Monetization | ❌ Not started |
| Grammar & writing | ❌ Not started (delayed — speaking-first) |
| Classrooms & teacher dashboard | ❌ Not started (delayed — needs proven product) |

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

## Active Phase: Phase 4 — Scenario Speaking (Core Conversations)

**Goal:** User selects a scenario, has multi-turn AI conversation, gets session score. This is the core product — conversation role-play is Lingona's primary value proposition, not an add-on.

**Approach:** Mock-first (same pattern as Phase 3). AI provider returns scripted responses initially; real OpenAI integration follows in Phase 4b.

Tasks in order:
1. ⬅️ **NEXT** Design scenario data model — migration for `scenarios`, `scenario_sessions`, `conversation_turns` tables
2. Backend: AI provider abstraction — `providers/ai/aiProvider.js` factory, `mockAi.js`, future `openaiProvider.js`
3. Backend: Scenario domain module — `scenarioRepository`, `scenarioService`, `scenarioController`
4. Backend: Scenario session management — start session, submit turn, get AI response, end session
5. Backend: Seed 10–15 scenario templates (ordering food, job interview, hotel check-in, doctor visit, etc.)
6. Frontend: Scenario selection page — category cards, difficulty indicators
7. Frontend: Conversation UI — chat bubbles + audio recording per turn
8. Frontend: Session summary with speaking metrics and score

**Exit criteria:** User can select a scenario, engage in multi-turn speaking practice with AI (mock), and receive a session-level score.

**What this phase does NOT include:**
- No real OpenAI API calls (mock-first)
- No ClawDBot / AI orchestration layer
- No multi-model routing
- No personalized recommendations (rules-based comes in Phase 5)

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

## Architecture Decisions (locked — do not change without discussion)

| Decision | Choice | Reason |
|---|---|---|
| JWT storage | `httpOnly` SameSite=Strict cookie for refresh token; access token in Zustand memory | Safest against XSS, no localStorage |
| XP system | Append-only `xp_ledger` table (never mutate `users.xp`) | Audit trail, retroactive awards, time-window leaderboards |
| DB migrations | `node-pg-migrate` | Needed from Phase 1 onward — no raw SQL files |
| Audio upload | Pre-signed S3/R2 URL — browser uploads directly, API only receives metadata | Never proxy large files through API server |
| Pronunciation scoring | Azure Speech API (pronunciation assessment) | Best phoneme-level feedback; abstracted behind `pronunciationService.js` |
| Writing evaluation | AI rubric scoring (e.g., IELTS band descriptors) | Consistent, explainable scores aligned to exam standards |
| State management | Zustand (add in Phase 1 for auth) | Lightweight, works with Next.js App Router |
| Monolith vs services | Stay monolith until 50K+ DAU. Exception: media never goes through API server | Premature extraction adds ops overhead |
| AI conversation provider | OpenAI GPT-4o-mini via `providers/ai/` abstraction (mock-first) | Cost-effective; single model until data proves multi-model value |
| No AI orchestration layer | Scenario engine is core product logic in `speaking/scenarios/`, not a separate service | ClawDBot-style orchestration is premature; adds latency + failure modes |
| Theme system | CSS custom properties + `next-themes` for dark/light mode | SSR-safe, zero JS bundle cost, no heavy dependency |
| Frontend navigation | BottomNav (Home/Speak/Practice/Profile) — mobile-first | Action-first; replaces 8-item sidebar dashboard pattern |

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
| **4 – Scenario Speaking** | **AI role-play conversations (mock-first): scenario domain, AI provider, 10-15 templates, conversation UI** | **⬅️ Next** |
| 4b – Real Providers + Exam Speaking | Wire real Azure Speech + R2 + OpenAI; add IELTS speaking as scenario variant; speaking metrics | ⬜ |
| 5 – AI Study Coach (Rules-Based) | Homepage "Today's Focus" based on weakest scores; quick practice actions; no LLM needed | ⬜ |
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

## Code Patterns & Conventions

### Backend
- Layer order: `route → controller → service → repository` — no skipping layers
- All responses use the envelope: `{ success, message, data }`
- UUID validation in every controller before passing to service
- Repositories return plain objects only — no business logic
- Errors thrown as `{ status, message }` objects; caught by `errorMiddleware.js`
- Use `Promise.all()` for parallel DB queries in services

### Frontend
- API calls go through `lib/api.ts` only — no raw `fetch` in components
- Data fetching in custom hooks (`hooks/`) — never in components directly
- Types defined in `lib/types.ts` — keep in sync with API shapes
- Tailwind for all styling — no inline styles, no CSS modules
- Component files: PascalCase. Hook files: camelCase with `use` prefix

### Database
- All PKs are UUIDs
- All tables get `created_at TIMESTAMPTZ DEFAULT now()`
- Mutable tables get `updated_at` + trigger
- Soft deletes via `deleted_at TIMESTAMPTZ NULLABLE`
- Every schema change is a numbered `node-pg-migrate` migration file

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
