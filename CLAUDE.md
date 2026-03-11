# Lingora – Claude Code Instructions

## Project Overview
Lingora is an AI-powered language learning platform focused on speaking practice, writing improvement, and preparation for international language certifications. The platform combines AI conversation, pronunciation analysis, writing feedback, and exam simulation.

Monorepo: `frontend/` (Next.js 14 + TS) and `backend/` (Node.js + Express + PostgreSQL).

**Full technical roadmap:** `docs/technical-roadmap.md`

---

## Module Architecture

```
speaking/
  pronunciation_practice   — Audio upload, speech-to-text, phoneme-level AI feedback
  scenario_speaking        — AI role-play (interviews, travel, meetings, daily conversations)
  exam_speaking            — IELTS speaking format with timers and rubric scoring
  ai_dialogue              — (Experimental) Multi-turn open-ended AI conversation partner

writing/
  grammar_training         — AI grammar correction, sentence rewriting, advanced explanations
  exam_writing             — IELTS Writing Task 1 & 2 with rubric-based AI evaluation
  practical_writing        — Real-world writing (emails, letters, short essays)

core/
  users                    — Accounts, profiles, guest UUID → real account migration
  auth                     — JWT authentication, refresh token rotation
  progress                 — Lesson completion, scores, learning history
  gamification             — XP ledger, streaks, badges, leaderboard

platform/
  exam_engine              — Exam session management, timers, scoring rubrics
  cms                      — Browser-based lesson/vocab/exam content editor
  payments                 — Stripe subscriptions (free / pro / exam prep packages)
  analytics                — Learning event log, heatmaps, observability
```

---

## Architecture Philosophy — Modular Monolith

Lingora follows a **modular monolith** architecture. The system runs as a single deployable unit today, but code is structured with strict domain boundaries to enable future extraction into independent microservices when scale demands it.

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
| Pronunciation practice | ❌ Not started |
| Scenario speaking | ❌ Not started |
| Exam speaking | ❌ Not started |
| Grammar & sentence training | ❌ Not started |
| Exam writing | ❌ Not started |
| Practical writing | ❌ Not started |
| AI dialogue | ❌ Not started |
| Admin CMS | ❌ Not started |
| Monetization | ❌ Not started |

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

## Active Phase: Phase 3 — Pronunciation Practice

**Goal:** Audio upload, speech-to-text transcription, and AI pronunciation scoring with phoneme-level feedback.

Tasks in order:
1. ⬅️ **NEXT** Backend: Pre-signed S3/R2 URL endpoint for audio upload
2. Backend: Azure Speech API integration — `pronunciationService.js`
3. Backend: `POST /api/v1/speaking/pronunciation-score` — accepts audio metadata, returns score + phoneme breakdown
4. Frontend: Audio recorder component in LessonModal SpeakingSection
5. Frontend: Upload audio to S3/R2 via pre-signed URL
6. Frontend: Display pronunciation score + phoneme feedback UI

**Exit criteria:** User can record speech, upload audio, and receive pronunciation feedback with phoneme-level detail within the lesson flow.

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

---

## Phase Roadmap Summary

| Phase | Goal | Status |
|---|---|---|
| 0 – Foundation | Monorepo + docs | ✅ Done |
| 1 – Auth + Infra | JWT auth, migrations, CI/CD, deploy | ✅ Done |
| 2 – Gamification | XP ledger, streaks, badges, leaderboard | ✅ Done |
| 3 – Pronunciation Practice | Audio upload, speech-to-text, AI pronunciation scoring, phoneme feedback | ⬅️ Next |
| 4 – Scenario Speaking | AI role-play speaking scenarios (interview, travel, meetings, daily conversations) | ⬜ |
| 5 – Exam Speaking | Speaking exam simulator (IELTS format with timers and scoring) | ⬜ |
| 6 – Grammar & Sentence Training | AI grammar correction, sentence rewriting, advanced grammar explanations | ⬜ |
| 7 – Exam Writing | Writing evaluation with rubric scoring (IELTS Writing Task 1 and Task 2) | ⬜ |
| 8 – Practical Writing | Real-world writing tasks (emails, letters, short essays) | ⬜ |
| 9 – AI Dialogue (Experimental) | Multi-turn AI conversation partner for open-ended discussions | ⬜ |
| 10 – Admin CMS | Browser-based lesson, vocabulary, and exam content editor | ⬜ |
| 11 – Monetization | Stripe subscriptions (free / pro plans, exam prep packages) | ⬜ |
| 12 – Hardening | Load testing, observability, analytics, accessibility improvements | ⬜ |

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
| `backend/migrations/` | node-pg-migrate files (`0001_auth`, `0002_content_meta`, `0003_gamification`, `0004_fill_in_blank`) |
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
