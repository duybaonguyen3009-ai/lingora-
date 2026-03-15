# Lingora – Technical Roadmap
> Last updated: 2026-03-10. Authoritative reference for all development decisions.

---

## 1. Full System Architecture

### Current (MVP)
```
Browser (Next.js)
       │ REST/JSON
Express monolith (Node.js)
       │
PostgreSQL (single instance)
```

### Target (1M+ users)
```
┌─────────────────────────────────────────────┐
│         Client Layer                        │
│  Next.js SSR  ←→  Cloudflare CDN            │
│  PWA / Service Worker (offline support)     │
└─────────────┬───────────────────────────────┘
              │ HTTPS
┌─────────────▼───────────────────────────────┐
│         Edge / Gateway Layer                │
│  Cloudflare (WAF, DDoS, rate limiting)      │
│  Nginx load balancer (or cloud LB)          │
└──────┬────────────────────────┬─────────────┘
       │                        │
┌──────▼──────────┐   ┌─────────▼──────────────┐
│  API Cluster    │   │   Media Service         │
│  Express (n     │   │   (audio upload,        │
│  stateless      │   │    pre-signed S3 URLs)  │
│  replicas)      │   └─────────────────────────┘
└──────┬──────────┘
       │
┌──────▼──────────────────────────────────────┐
│         Data Layer                          │
│  PostgreSQL primary   ←→  Read replica      │
│  PgBouncer (connection pool)                │
│  Redis (sessions, rate limits,              │
│          leaderboard sorted sets,           │
│          BullMQ job queues)                 │
│  S3 / Cloudflare R2 (audio, images)         │
└─────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────┐
│         Background Workers                  │
│  BullMQ worker: audio analysis jobs         │
│  BullMQ worker: email / push notifications  │
│  BullMQ worker: XP ledger aggregation       │
└─────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────┐
│         External Services                   │
│  Azure Speech (pronunciation scoring)       │
│  SendGrid (transactional email)             │
│  Stripe (subscription billing)              │
│  PostHog (analytics / feature flags)        │
│  Sentry (error tracking)                    │
└─────────────────────────────────────────────┘
```

**Key principles:**
- API nodes are stateless — all sessions live in Redis
- Audio upload never goes through the API server (pre-signed S3 URL, direct browser → S3)
- Stay monolith until 50K+ DAU; extract only when a module hits resource limits
- Read replica handles all analytics/reporting queries; primary handles writes only

---

## 2. Database Model

### Current Schema (implemented)
- `users`, `courses`, `units`, `lessons`
- `vocab_items`, `quiz_items`, `speaking_prompts`
- `user_progress` (upsert, keeps highest score)
- `lesson_summary` view

### Critical Schema Gaps & Fixes

| Problem | Fix |
|---|---|
| `users.xp` is a mutable integer — no audit trail | Replace with append-only `xp_ledger` table |
| `user_progress` keeps only highest score | Add `learning_events` log for full event history |
| No `refresh_tokens` table | Add in Phase 1 (required for auth) |
| No schools/classrooms model | Add before user table grows |
| No soft deletes | Add `deleted_at TIMESTAMPTZ` to all content tables |
| No content versioning | Add `version SMALLINT` + `published BOOLEAN` to lessons |
| No COPPA fields | Add `dob DATE`, `parent_id UUID FK`, `consent_at TIMESTAMPTZ` |

### Target Schema Additions

```sql
-- Auth (Phase 1)
ALTER TABLE users
  ADD COLUMN password_hash TEXT,
  ADD COLUMN dob DATE,
  ADD COLUMN parent_id UUID REFERENCES users(id),
  ADD COLUMN consent_at TIMESTAMPTZ,
  ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  token_hash  TEXT NOT NULL,       -- SHA-256 hash, never plain text
  family      UUID NOT NULL,       -- token rotation family
  issued_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id) WHERE revoked_at IS NULL;

-- Gamification (Phase 2)
CREATE TABLE xp_ledger (           -- APPEND-ONLY, never UPDATE or DELETE
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id),
  delta      SMALLINT NOT NULL,    -- positive or negative
  reason     TEXT NOT NULL,        -- 'lesson_complete' | 'badge_award' | 'streak_bonus' | etc.
  ref_id     UUID,                 -- lesson_id / badge_id / etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_xp_ledger_user ON xp_ledger(user_id, created_at DESC);

CREATE TABLE badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(50) UNIQUE NOT NULL,  -- 'first_lesson', 'streak_7'
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  icon_url    TEXT,
  xp_reward   SMALLINT DEFAULT 0
);

CREATE TABLE user_badges (
  user_id    UUID NOT NULL REFERENCES users(id),
  badge_id   UUID NOT NULL REFERENCES badges(id),
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

CREATE TABLE user_streaks (
  user_id          UUID PRIMARY KEY REFERENCES users(id),
  current_streak   SMALLINT NOT NULL DEFAULT 0,
  longest_streak   SMALLINT NOT NULL DEFAULT 0,
  last_activity_at DATE
);

-- Analytics (Phase 2)
CREATE TABLE learning_events (     -- APPEND-ONLY, partition by month at >10M rows
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id),
  lesson_id  UUID NOT NULL REFERENCES lessons(id),
  event_type TEXT NOT NULL,        -- 'lesson_started' | 'vocab_viewed' | 'quiz_answered' |
                                   -- 'speaking_submitted' | 'lesson_completed' | 'lesson_abandoned'
  payload    JSONB,                -- { question_id, answer, correct, time_spent_ms }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_learning_events_user ON learning_events(user_id, created_at DESC);

-- Classrooms (Phase 4)
CREATE TABLE schools (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(200) NOT NULL,
  plan       TEXT NOT NULL DEFAULT 'free',  -- 'free' | 'pro' | 'enterprise'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE classrooms (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID REFERENCES schools(id),
  teacher_id UUID NOT NULL REFERENCES users(id),
  name       VARCHAR(200) NOT NULL,
  invite_code VARCHAR(10) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE classroom_students (
  classroom_id UUID NOT NULL REFERENCES classrooms(id),
  student_id   UUID NOT NULL REFERENCES users(id),
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (classroom_id, student_id)
);

CREATE TABLE assignments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id),
  lesson_id    UUID NOT NULL REFERENCES lessons(id),
  due_at       TIMESTAMPTZ,
  created_by   UUID NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Media (Phase 3)
CREATE TABLE media_assets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL,
  owner_type  TEXT NOT NULL,       -- 'user' | 'lesson' | 'vocab_item'
  type        TEXT NOT NULL,       -- 'audio' | 'image' | 'video'
  storage_key TEXT NOT NULL,       -- S3/R2 object key
  mime_type   VARCHAR(50),
  size_bytes  INT,
  duration_ms INT,                 -- for audio files
  cdn_url     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE speaking_submissions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id),
  prompt_id      UUID NOT NULL REFERENCES speaking_prompts(id),
  media_id       UUID NOT NULL REFERENCES media_assets(id),
  ai_score       SMALLINT,         -- 0-100 from Azure Speech
  teacher_score  SMALLINT,
  feedback       TEXT,
  status         TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'ai_reviewed' | 'teacher_reviewed'
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subscriptions (Phase 7)
CREATE TABLE subscriptions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id),
  stripe_sub_id      TEXT UNIQUE,
  plan               TEXT NOT NULL DEFAULT 'free',  -- 'free' | 'student_monthly' | 'school_annual'
  status             TEXT NOT NULL,                 -- 'active' | 'past_due' | 'canceled' | 'trialing'
  current_period_end TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Content improvements (Phase 1+)
ALTER TABLE lessons
  ADD COLUMN version  SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN published BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN deleted_at TIMESTAMPTZ;

ALTER TABLE vocab_items     ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE quiz_items      ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE speaking_prompts ADD COLUMN deleted_at TIMESTAMPTZ;

-- Full-text search on vocabulary
CREATE INDEX idx_vocab_fts ON vocab_items
  USING GIN(to_tsvector('english', word || ' ' || coalesce(meaning, '')));
```

---

## 3. Product Feature Map

| Domain | Feature | Priority | Phase |
|---|---|---|---|
| Auth | Register, login, logout, refresh | P0 | 1 |
| Auth | Password reset (email) | P0 | 1 |
| Auth | Google SSO | P1 | 2 |
| Auth | COPPA parental consent flow | P0 (legal) | 1 |
| Learning | Vocabulary flashcards | ✅ Done | — |
| Learning | Multiple-choice quiz | ✅ Done | — |
| Learning | Fill-in-blank quiz | P0 | 2 |
| Learning | Speaking prompt display | ✅ Done | — |
| Learning | Audio recording + upload | P0 | 3 |
| Learning | Pronunciation AI scoring | P1 | 3 |
| Learning | Spaced repetition review mode | P1 | 2 |
| Learning | Placement test (initial level) | P1 | 2 |
| Progress | XP events + level progression | P0 | 2 |
| Progress | Streak tracking (daily) | P0 | 2 |
| Progress | Badges / achievements | P1 | 2 |
| Progress | Weekly leaderboard | P1 | 2 |
| Progress | Skills heatmap (real data) | P1 | 2 |
| Social | Classrooms (create + invite code) | P1 | 4 |
| Social | Assignments (lesson + due date) | P1 | 4 |
| Social | Teacher dashboard | P1 | 4 |
| Social | Parent dashboard | P1 | 4 |
| Social | Dialogue conversation exercises | P2 | 6 |
| Content | Admin CMS (manage lessons/vocab) | P1 | 5 |
| Content | Lesson versioning + drafts | P1 | 5 |
| Infra | node-pg-migrate migrations | P0 | 1 |
| Infra | Redis (cache + jobs + leaderboard) | P1 | 2 |
| Infra | BullMQ job queues | P1 | 3 |
| Infra | S3 / R2 audio storage | P0 | 3 |
| Infra | CI/CD (GitHub Actions) | P0 | 1 |
| Infra | Staging + production deploy | P0 | 1 |
| Infra | Sentry error tracking | P0 | 1 |
| Infra | Rate limiting | P0 | 1 |
| Monetization | Stripe subscription (free/pro) | P2 | 7 |
| Polish | i18n scaffolding | P2 | 8 |
| Polish | PWA + offline mode | P2 | 8 |
| Polish | WCAG 2.1 AA | P1 | 8 |

---

## 4. Phase Breakdown

### Phase 1 — Auth & Infrastructure (3–4 weeks)
**Goal:** Secure, deployable foundation. Guest system migrates to real accounts.

```
Backend:
  ✦ node-pg-migrate setup + migration files for auth schema changes
  ✦ bcryptjs password hashing
  ✦ JWT access token (15min TTL) + httpOnly refresh token (30day, DB-stored)
  ✦ POST /auth/register  POST /auth/login
  ✦ POST /auth/refresh   POST /auth/logout
  ✦ GET /users/me        PATCH /users/me
  ✦ verifyToken middleware protecting sensitive routes
  ✦ Rate limiting (express-rate-limit): 10 req/min on auth routes
  ✦ COPPA: dob field + parental consent flow for under-13

Frontend:
  ✦ Zustand authStore (login, logout, register, token refresh on 401)
  ✦ /login + /register pages
  ✦ Guest UUID → real account migration on login
  ✦ Protected route wrapper (redirect to /login if no token)
  ✦ User avatar + name shown in Sidebar

Infrastructure:
  ✦ GitHub Actions: lint + build on every PR
  ✦ Deploy: Railway (backend + Postgres) + Vercel (frontend)
  ✦ Staging environment (separate Railway project)
  ✦ Sentry (backend + frontend)
  ✦ Environment secrets management
```

**Exit criteria:** Real user creates account, logs in, completes a lesson, progress persists on refresh.

---

### Phase 2 — Gamification & Learning Engine (3–4 weeks)
**Goal:** Daily engagement loop with XP, streaks, badges, leaderboard.

```
Backend:
  ✦ xp_ledger table + XP events emitted on lesson_complete
  ✦ Level thresholds computed from xp_ledger aggregate (cached)
  ✦ Streak service: consecutive days from learning_events → user_streaks
  ✦ Badge system: award 'first_lesson', 'streak_3', 'streak_7', 'perfect_score'
  ✦ Leaderboard: weekly XP aggregate → Redis sorted set, refreshed hourly
  ✦ GET /leaderboard?scope=weekly|all-time
  ✦ Fill-in-blank question type in quiz_items + QuizSection

Frontend:
  ✦ XP progress bar animated on completion
  ✦ Level-up celebration screen
  ✦ Badge notification toast
  ✦ Leaderboard page (real data)
  ✦ Streak counter in Sidebar + StatsRow (real data)
  ✦ Skills heatmap wired to learning_events
  ✦ Fill-in-blank quiz component
```

**Exit criteria:** XP and streaks persist across devices. Leaderboard shows real rankings.

---

### Phase 3 — Speaking Module (3–4 weeks)
**Goal:** Kids can record and get scored on speaking exercises.

```
Backend:
  ✦ Cloudflare R2 / S3 bucket + IAM credentials
  ✦ POST /speaking/upload-url → pre-signed S3 URL (expires 5min)
  ✦ POST /speaking/submissions (after client uploads audio)
  ✦ BullMQ audio-analysis queue
  ✦ Worker: calls Azure Speech Pronunciation Assessment API
  ✦ Score + feedback written back to speaking_submissions
  ✦ GET /speaking/submissions/:id (polling for score)

Frontend:
  ✦ Web Audio API recording (MediaRecorder API)
  ✦ Waveform visualizer during recording
  ✦ Upload progress indicator
  ✦ Score display in CompletionScreen
  ✦ Polling / optimistic UI while AI scores
```

**Exit criteria:** Kid records speech, uploads, sees AI pronunciation score within 30 seconds.

---

### Phase 4 — Classroom & Teacher Dashboard (3–4 weeks)
**Goal:** Schools can adopt Lingora as a classroom tool.

```
Backend:
  ✦ schools, classrooms, classroom_students, assignments tables
  ✦ POST /classrooms  (teacher creates, gets invite code)
  ✦ POST /classrooms/:id/join  (student joins by invite code)
  ✦ GET /classrooms/:id/progress  (aggregate student progress)
  ✦ Assignments CRUD
  ✦ requireRole('teacher') middleware enforcement
  ✦ GET /children/:id/progress  (parent view)
  ✦ Email notification on assignment due (BullMQ + SendGrid)

Frontend:
  ✦ /teacher dashboard: class list, student progress grid
  ✦ Assignment creation modal (lesson picker + due date)
  ✦ Student detail view: completed lessons, streak, scores
  ✦ /parent dashboard: child's weekly progress summary
```

**Exit criteria:** Teacher creates classroom, assigns lesson, sees all students' scores.

---

### Phase 5 — Admin Content Management (2–3 weeks)
**Goal:** Content team manages lessons without touching the database.

```
Backend:
  ✦ requireRole('admin') on all CRUD endpoints
  ✦ Full CRUD: lessons, vocab_items, quiz_items, speaking_prompts
  ✦ Draft + publish workflow (published flag)
  ✦ Pre-signed URL upload for vocab audio/images
  ✦ Lesson versioning (preserve in-progress student data)

Frontend (/admin route, role-gated):
  ✦ Lesson list + create/edit form
  ✦ Vocab editor (add/edit/delete words per lesson)
  ✦ Quiz question builder
  ✦ Media uploader for audio/images
  ✦ Publish / unpublish toggle
```

**Exit criteria:** Content editor builds a complete lesson in the browser with no code changes.

---

### Phase 6 — Dialogue Module (3 weeks)
**Goal:** Guided turn-based conversation exercises.

```
Backend:
  ✦ dialogue_scenarios, dialogue_turns tables
  ✦ Scenario CRUD (admin)
  ✦ POST /dialogue/sessions  (start scenario)
  ✦ POST /dialogue/sessions/:id/turns  (submit turn, optional audio)
  ✦ Completion tracking → XP ledger event

Frontend:
  ✦ Dialogue modal: chat-bubble style turn display
  ✦ Text input + optional audio response per turn
  ✦ Scenario library page
```

---

### Phase 7 — Monetization (2–3 weeks)
**Goal:** Sustainable revenue.

```
Backend:
  ✦ Stripe webhook handler (subscription lifecycle events)
  ✦ subscriptions table + plan enforcement middleware
  ✦ Free tier: 3 lessons/day, no leaderboard
  ✦ Pro tier: unlimited lessons, leaderboard, speaking AI scoring
  ✦ School tier: unlimited seats + teacher dashboard

Frontend:
  ✦ /pricing page
  ✦ Upgrade modal (triggered by free-tier limits)
  ✦ Stripe Customer Portal link (billing management)
```

---

### Phase 8 — Production Hardening (2–3 weeks)

```
Infrastructure:
  ✦ PgBouncer connection pooling in front of Postgres
  ✦ Redis Cluster (or Upstash) for leaderboard + sessions
  ✦ learning_events table partitioned by month
  ✦ Database read replica for analytics queries
  ✦ Horizontal API scaling (3+ Node instances behind LB)
  ✦ Cloudflare CDN for all media assets

Testing:
  ✦ Unit tests: all services + repositories (Vitest)
  ✦ Integration tests: all API endpoints (Supertest + test DB)
  ✦ E2E: critical flows (register → lesson → complete) via Playwright
  ✦ Load test: 1000 concurrent users (k6)

Observability:
  ✦ Structured JSON logging (pino)
  ✦ APM tracing (Sentry Performance)
  ✦ DB slow query alerts
  ✦ Uptime monitoring
  ✦ WCAG 2.1 AA audit + fixes
  ✦ OpenAPI/Swagger spec auto-generated
```

---

## 5. Critical Design Decisions

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D1 | JWT token storage | `httpOnly` SameSite=Strict cookie for refresh token; access token in Zustand memory | Kids app — safest against XSS; never localStorage |
| D2 | XP system | Append-only `xp_ledger` — never mutate `users.xp` | Audit trail, retroactive awards, time-window leaderboards |
| D3 | DB migrations | `node-pg-migrate` from Phase 1 | No raw SQL files; every change is versioned |
| D4 | Audio upload | Pre-signed S3/R2 URL — browser uploads directly | Never proxy large files through API server |
| D5 | Pronunciation scoring | Azure Speech API, abstracted behind `pronunciationService.js` | Best phoneme feedback; swappable interface |
| D6 | Frontend state | Zustand (added in Phase 1) | Lightweight; works cleanly with Next.js App Router |
| D7 | Multi-tenancy | Row-level isolation via `school_id` FK | No per-school PostgreSQL schemas needed |
| D8 | Service extraction | Stay monolith until 50K+ DAU | Premature extraction adds ops overhead |
| D9 | COPPA | `dob` required; age < 13 triggers parental email consent | US legal requirement for kids' apps |
| D10 | Leaderboard | Redis sorted set as primary, DB as source of truth | O(log n) rank lookup vs O(n) ORDER BY |

---

## Phase Timeline

| Phase | Weeks | Milestone |
|---|---|---|
| 1 – Auth + Infra | 3–4 | Deployed app, real accounts, CI/CD |
| 2 – Gamification | 3–4 | XP, streaks, badges, leaderboard live |
| 3 – Speaking | 3–4 | Audio upload + AI score < 30s |
| 4 – Classrooms | 3–4 | Teacher assigns, monitors class |
| 5 – Admin CMS | 2–3 | Content editable in browser |
| 6 – Dialogues | 3 | Conversation exercises complete |
| 7 – Monetization | 2–3 | Stripe subscriptions live |
| 8 – Hardening | 2–3 | Load-tested, WCAG AA, observable |
| **Total** | **~25–32 weeks** | **Production launch** |
