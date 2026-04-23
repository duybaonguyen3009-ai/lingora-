# Lingona — Claude Code Instructions

## 1. Project Identity

**Lingona** is an IELTS preparation platform for Vietnamese learners aged 18–25, built solo by **Louis Nguyen**. Target launch: **2026-07-09**. Pro pricing: **179.000₫/tháng**, **499.000₫/3 tháng**, **929.000₫/6 tháng**, or **1.490.000₫/năm** (best value, save ~31%). 3-day free trial.

**Product philosophy:** Simulate the **real IELTS exam environment** (layout, colors, behavior), not just content. This is the moat vs Study4 (ugly dashboard) and DOL IELTS (no CBT fidelity).

**Monorepo:** `frontend/` (Next.js 14 + TS, deployed on Vercel) + `backend/` (Node.js + Express + PostgreSQL, deployed on Railway).

**Mascot:** Lintopus (octopus SVG). **Brand palette:** navy `#1B2B4B` + teal `#00A896`.

### Current state of the 4 skills

| Skill | Status | Notes |
|---|---|---|
| Speaking | Active — polish | Core engine OK, UI refinement ongoing |
| Writing | **Active rework** | Task 1 UI incomplete, missing prompts + visuals, must redo |
| Reading | **Active rework** | Layout must follow real IELTS CBT (split view + authentic palette) |
| Listening | **Not built** | Post-launch backlog |

**Features outside the 4 skills:** Battle Arena (Reading MVP), XP, streaks, badges, leaderboard, social (friend chat, public profile), onboarding diagnostic, Pro upgrade flow (gating + payment pending).

### Tiers

**Free tier (everything a serious learner needs to start):**
- Speaking AI: 1x/day
- Writing AI: 1x/day
- Grammar, Reading, Listening: unlimited
- Battle Arena, Rank, Streak: full access
- Study Rooms (social feature — keep viral loop in free tier)
- AI Study Coach (rules-based "Today's Focus")
- Friend Chat, Achievements, public profile

**Pro tier:**
- Unlimited Speaking AI
- Unlimited Writing AI
- Detailed Analytics (planned, post-launch)
- Personal Roadmap (planned, post-launch)
- Priority Support

Do NOT gate Study Rooms or AI Study Coach behind Pro — they are free features. If any doc or code implies otherwise, this section wins.

**Do NOT treat any skill marked "Active rework" as done.** The old doc said "Pronunciation ✅ Done" when it was still being reworked — that is how drift happens. If unsure, assume in-progress.

---

## 2. The Soul of Lingona (non-negotiable)

Every feature, every piece of copy, every animation must pass through this lens. If a design decision conflicts with this section, the section wins.

### What Lingona believes

Anyone who wants to learn a language deserves an easy, unconfused path. When a learner is lost, Lingona is the companion who gives honest advice — not false comfort.

### Emotional contract with the user

- **When the user opens the app → ORIENTED**: "I know where I am and what to do next."
- **When the user closes the app → IMPROVEMENT**: "I'm better today than yesterday."

Every screen must earn one of these two feelings. A screen that creates confusion or stagnation is a bug, regardless of whether the code works.

### Core principle: Motivated Empathy

Not empathy as in "poor you, take it easy." Empathy as in **"I understand you, and *because* I understand, I'm pushing you in the right direction."** Life is hard — Lingona does not hide the user from difficulty, Lingona makes sure the user does not face it alone.

Concrete rules this generates:
- Band score is **never displayed in red**. Band 4.0 is still Band 4.0 — and Lintopus is standing next to it saying "I'm here, I'll help you."
- Quota exhaustion is **never sugar-coated**. Out of attempts = "Out of attempts! If the app is helping you, come upgrade to Pro with me. Heads up: way cheaper than any IELTS center." No fake "take a break" framing when we are actually gating.
- Failure screens always pair the result with a next step. Never "you failed" without "try this next."

### Lintopus = Doraemon

Lintopus is the all-capable friend. Tentacles = many skills, all used to help the user. Friendly, direct, non-judgmental. Never Clippy.

- Appears in **~70% positive moments** (wins, streaks, completions, level-ups).
- Appears in **~30% stuck moments** (low score, repeated failure, abandoned session) — to help, not to scold.
- Speaks via text bubble + animation. Does not block the flow.
- Stands next to every result screen — win or loss, the user is not alone.

### Direct, not manipulative

Gen Z Vietnamese users hate being manipulated. Lingona is honest about what's happening: when something is gated, we say it's gated, we say why, we say what Pro costs. No dark patterns. No fake urgency. No "nghỉ ngơi nhé" when we mean "you hit the paywall."

### Competition has its own beauty

Battle Arena stays — even Nobita has to face Jaian. But:
- Matchmaking is same-rank only.
- Lintopus bot fills in when no human opponent is available (maintains flow-state difficulty).
- Battle is gated behind 5 completed practice sessions (earned, not handed).
- Lintopus stands next to every battle result.

---

## 2.5. Skills Protocol (read before coding)

Lingona uses the Claude Code skills system. Skills are folders containing condensed best practices built up through trial and error. **Before writing or modifying any code, read the relevant `SKILL.md` files.** Skipping this step produces generic, inconsistent output — the exact failure mode we are trying to avoid.

### Mandatory skill reads by task

| Task | Skill file to read FIRST |
|---|---|
| Creating or modifying any frontend component (React, Tailwind, UI) | `/mnt/skills/public/frontend-design/SKILL.md` |
| Reading an uploaded file whose content isn't in context | `/mnt/skills/public/file-reading/SKILL.md` |
| Reading / extracting from a PDF | `/mnt/skills/public/pdf-reading/SKILL.md` |
| Creating a `.docx`, `.xlsx`, `.pptx`, or `.pdf` deliverable | The matching skill under `/mnt/skills/public/{docx,xlsx,pptx,pdf}/SKILL.md` |
| Any task about Anthropic's products (Claude API, Claude Code, Claude.ai plans) | `/mnt/skills/public/product-self-knowledge/SKILL.md` |

Multiple skills may apply to one task — read all relevant ones. Reading a SKILL.md is cheap; skipping it is not.

### Rules

1. **Frontend work is gated.** Before touching any file under `frontend/components/`, `frontend/app/`, or creating any new React/Tailwind component, read `frontend-design/SKILL.md`. Non-negotiable.
2. **Read before you write.** The SKILL.md tells you what patterns, CSS variables, and constraints apply. Discovering them after writing code means a rewrite.
3. **User skills win over defaults.** If `/mnt/skills/user/` contains a skill, it overrides the public version. Read user skills with extra attention.
4. **If unsure whether a skill applies, read it.** The cost of reading an irrelevant SKILL.md is seconds. The cost of ignoring a relevant one is an hour of rework.

---

## 3. Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind, Zustand, next-themes, Socket.IO client
- **Backend:** Node.js, Express, PostgreSQL (Railway), node-pg-migrate, Socket.IO
- **Auth:** JWT — access token in Zustand memory, refresh token in httpOnly SameSite=Strict cookie
- **External providers:** OpenAI (GPT-4o-mini + TTS), Azure Speech (REST), Cloudflare R2 (credentials pending), Sentry
- **Payment (pending, launch blocker):** MoMo
- **Infra target (post-launch):** Docker + K3s on Hetzner VPS, replacing Railway + Vercel

---

## 4. Modular Monolith Architecture

One deployable unit, one database — but with strict domain boundaries so services can be extracted when scale demands (target 50K+ DAU).

### Principles

1. **Monolith now, microservices later.** No premature extraction.
2. **Loose coupling between domains.** Modules communicate through service interfaces, never by reaching into another module's repository.
3. **Provider abstraction.** All external infrastructure (storage, speech, AI, TTS, payment) is accessed through an abstraction. Swapping providers means changing one implementation file.
4. **Clear DTOs.** Controllers validate and transform HTTP input into domain DTOs. Services never receive raw `req`/`res` objects.

### Domain Boundaries

| Domain | Owns | Boundary Rule |
|---|---|---|
| `auth` | Users, sessions, JWT, roles | Other domains only receive `userId` from auth middleware — never query `users` directly |
| `lessons` | Course/lesson/vocab/quiz content | Read-only reference data for progress + speaking |
| `progress` | Completion state, scores | Publishes events to gamification |
| `gamification` | XP ledger, streaks, badges, leaderboard | Consumes completion events; fully self-contained scoring |
| `media` | Audio/image upload, pre-signed URLs | Supplies URLs to speaking/writing; never stores domain metadata |
| `speaking` | Pronunciation scoring, scenario/exam sessions | Consumes media URLs; calls speech APIs via provider abstraction |
| `writing` | Essay submission, AI band scoring | Calls AI APIs via provider abstraction |
| `reading` | Passages, questions, battle matches | Owns `passages`, `reading_answers`, `battle_matches` |
| `social` | Friend chat (Socket.IO), public profiles | Isolated from learning data |
| `payments` | Orders, subscriptions, MoMo webhook | Grants `is_pro` flag — no other domain sets it |

### Design rules

- **No cross-domain repository access.** Service A must never import repository B. Use the other domain's service instead.
- **Provider integrations are isolated.** One file per provider (`providers/ai/openai.js`, `providers/speech/azureSpeech.js`). Services import an interface, not the SDK.
- **Service signatures as contracts.** Document return shapes in JSDoc.
- **No shared mutable state** across domains.
- **Each domain owns its tables.** Cross-domain JOINs only in read-only analytics paths, never in write paths.

---

## 5. Business Logic Layers

Every rule in Lingona falls into one of the categories below. When implementing a feature, classify each rule first, then write it in the correct layer.

### Rule types (WHAT)

| Type | Answers | Lingona example |
|---|---|---|
| Validation | Is the input valid? | Essay ≥ 150 words before accepting Task 1; MoMo amount ∈ {179000, 1199000} |
| Authorization | Is the user allowed? | Free user past daily Speaking/Writing limit → 403 PRO_REQUIRED; only post owner can delete their comment |
| Calculation | What's the computed value? | Band = avg of 4 skills, IELTS rounding rule; rank ±25/−18 per win/loss |
| State transition | Is A → B valid? | Order: `pending → paid → completed`; no skipping, no rewinding |
| Limit / Quota | Has a threshold been crossed? | 1 Speaking/day free, 1 Writing/day free; 1 pending order per user |
| Side effect | What else must happen when X occurs? | 7-day streak → badge + push notification + XP |

### Execution layer (WHERE)

| Layer | Role | Example |
|---|---|---|
| Frontend (Next.js) | Smooth UX, optimistic | Hide button when quota is exhausted |
| Backend (Express) | Source of truth, security | Actually reject the 4th request, even if FE is bypassed |
| Database (Postgres) | Final safety net | `UNIQUE` constraints, `FOREIGN KEY ON DELETE CASCADE` |

**Golden rule:** critical rules (money, quota, auth) **must** exist at the backend. Frontend only smooths UX. Database is the last line of defense.

---

## 6. IELTS Domain Layer (locked)

Lives in `backend/src/domain/ielts/` (JavaScript + CommonJS, mirrored in `frontend/lib/domain/ielts/` where needed). Pure functions and constants — no DB, no API. All features import from this layer via `require('./domain/ielts')`.

This layer encodes specifications from IELTS itself (IDP/British Council). **You cannot change these values** — Task 2 = 250 words, not 200.

**Structure (6 files):**
- `format.js` — test spec constants (question counts, timing, task types)
- `scoring.js` — band calculation, IELTS rounding, raw→band conversion, tier mapping
- `exam-ux.js` — Practice vs Full Test vs Battle behavior configs
- `rubrics.js` — 4-tier rubric per criterion (descriptors + signals + suggestions + promptBrief)
- `postProcessor.js` — LLM output sanitizer (parse, validate, clamp, hallucination guard)
- `index.js` — barrel export

### What lives here

| Group | Content |
|---|---|
| Format | Question counts, timing (Reading 40 Qs / 60 min, Writing T1 150 words / 20 min, T2 250 words / 40 min) |
| Scoring rubric | Writing: TA/CC/LR/GRA × 0–9; Speaking: FC/LR/GR/P × 0–9 |
| Band calculation | Overall = avg(4 skills), IELTS rounding (.25 → .5, .75 → +1) |
| Raw → band conversion | Reading Academic table (e.g. 30/40 ≈ 7.0) |
| Content classification | Each passage tagged with band range + topic |
| Answer validation | "NO MORE THAN TWO WORDS", digits = words, case-insensitive, spelling must be correct |
| Timing rules | Practice = pauseable; Full Test = hard cutoff |

### Exam UX fidelity (`domain/ielts/exam-ux.js`)

Behavior rules that simulate the real exam room — this is business logic, not styling.

| Group | Key rules |
|---|---|
| Layout | Reading split view (passage left, questions right, independent scroll); Writing real-time word count |
| Timer | Practice: pauseable. Full Test: cannot pause, auto-submit on timeout |
| Navigation | Full Test is one-way (L → R → W → S), no back; within a section, free jumping allowed |
| Input constraints | `spellCheck={false}`, `autoCorrect="off"`, no paste in Writing; gap-fill enforces word limit |
| Anti-cheat (Full Test + Ranked Battle only) | Tab-switch detection, block right-click/copy on passages, optional fullscreen lock |
| Progress indicator | Show answered count (e.g. 24/40), never show correct/incorrect during the test |

### Visual theming (dual palette)

Color is part of exam fidelity, not decoration.

| Mode | Palette | Font | Why |
|---|---|---|---|
| Landing, Dashboard, Social, Battle Friend | **Brand** (navy + teal) | Playfair + DM Sans | Brand moment, retention |
| Practice Mode | **Brand-soft** (brand + subtle cream) | Brand fonts | Transition toward exam feel |
| **Full Test, Battle Ranked** | **IELTS-authentic** (cream `#F5EFDC` + navy + yellow highlight) | Georgia + Arial | User must get comfortable with the real exam interface |

Authentic palette will live in the IELTS exam-room CSS var block in `app/globals.css` (see `--ielts-*` tokens). A dedicated `exam-authentic.css` is no longer planned — tokens live alongside the rest of the design system. Switching is driven by a theme provider that reads `EXAM_UX[mode].palette`.

---

## 7. Architecture Decisions (locked — do not change without discussion)

| Decision | Choice | Reason |
|---|---|---|
| JWT storage | Refresh in httpOnly SameSite=Strict cookie; access in Zustand memory | Safest vs XSS, no localStorage |
| XP system | Append-only `xp_ledger` table (never mutate `users.xp`) | Audit trail, retroactive awards, time-window leaderboards |
| DB migrations | `node-pg-migrate`, no raw SQL files | Ordered, reversible |
| Audio upload | Pre-signed R2 URL; browser uploads directly | API never proxies large files |
| Pronunciation | Azure Speech REST (behind `providers/speech/`) | Best phoneme feedback |
| Writing evaluation | AI rubric scoring behind `providers/ai/` | Aligned to IELTS band descriptors |
| State management | Zustand | Lightweight, App Router-compatible |
| Monolith threshold | Stay monolith until 50K+ DAU. Exception: media never goes through API server | Premature extraction adds ops overhead |
| AI conversation provider | OpenAI GPT-4o-mini via `providers/ai/` | Cost-effective; single model until data proves otherwise |
| No AI orchestration layer | Scenario engine is core product logic in `speaking/scenarios/` | ClawDBot-style orchestration is premature |
| Theme system | CSS custom properties + `next-themes` | SSR-safe, zero runtime cost |
| Frontend navigation | 5-tab BottomNav, mobile-first | Replaces 8-item sidebar dashboard |
| Payment provider | MoMo (Vietnam market) | PSP of choice for 18–25 VN demographic |
| Backend language | JavaScript + CommonJS (TypeScript migration deferred post-launch) | Converting 109 files blocks 2+ weeks of launch-critical work; JSDoc gives ~70% of TS benefit |

---

## 8. Examiner Control System (HARD LOCK)

**Decision:** The IELTS examiner is a CONTROLLED OUTPUT SYSTEM, not a conversational agent. All transitions are hardcoded. All LLM outputs are sanitized. **Do not change this section without explicit discussion.**

**Non-negotiable rules:**
1. **Zero Reaction Policy** — the examiner NEVER reacts to user answers. No "interesting", "thank you", "I see".
2. **Hardcoded Transitions** — `FIXED_TRANSITIONS` object contains exact strings. The LLM never generates transitions.
3. **One Utterance Rule** — each response is exactly ONE question OR ONE transition. Never combined.
4. **Question Length Lock** — max 12 words (15 for Part 3). Enforced by `sanitizeExaminerOutput()`.
5. **Validation Layer** — `sanitizeExaminerOutput()` strips banned phrases, enforces single sentence, caps word count.
6. **Opening = Name Only** — the examiner asks name; system then outputs "Now let's start Part 1." No ID check, no explanation.

**Architecture:**
- `FIXED_TRANSITIONS` — hardcoded strings for part1/part2/part3/closing.
- `BANNED_PATTERNS` — regex array of forbidden phrases.
- `sanitizeExaminerOutput()` — post-processes every LLM response before delivery.
- `buildIeltsSystemPrompt()` — minimal prompt (no personality, no acknowledgment instructions).

**Why:** Prompt-based control is unreliable. The LLM drifts, adds reactions, improvises. Code-based control with post-processing ensures deterministic examiner behavior.

---

## 9. Feature Status & Launch Blockers

### Launch blockers (must ship before 2026-07-09)

| Blocker | Owner | Est. effort |
|---|---|---|
| MoMo payment integration | Louis + Claude Code | 8–12h |
| Pro gating UI (paywall triggers on quota hit + band prediction) | Louis + Claude Code | 2h |
| `og-image` commit | Louis | <1h |

### Active rework tracks (do not treat as done)

| Track | What's wrong | What "done" looks like |
|---|---|---|
| Reading UI | Doesn't follow IELTS CBT layout | Split view (passage left, questions right), authentic palette in Full Test mode, independent scroll |
| Writing Task 1 | UI unclear, no prompts, no visual (charts/graphs) | Prompt bank seeded with visuals, real-time word count, no spellcheck, split view with prompt left + editor right |
| Speaking | Core engine OK, UI needs refine | TTS quality, smooth transitions, Lintopus presence on result screen |

### Shipped (see `docs/CHANGELOG.md` for detail)

Auth + JWT, migrations 0001–0027, gamification (XP/streak/badge/leaderboard), pronunciation (provider abstraction + Azure REST), scenario speaking (12 scenarios + IELTS exam mode), AI study coach (rules-based), dark/light theme, BottomNav, profile section, onboarding 6-screen diagnostic, Battle Arena MVP (Reading, 1v1 async 2h, ranked + friend, 56 passages seeded), Friend Chat (Socket.IO + voice notes), Achievement system (45 badges), landing page.

### Post-launch backlog

Listening feature, Full Test Mode (all 4 skills), team Battle V2, Exam tab redesign (Practice + Full Test split), deeper SEO, admin CMS.

---

## 10. Code Patterns & Conventions

### Backend

- Layer order: `route → controller → service → repository`. Never skip layers.
- All responses use envelope `{ success, message, data }`.
- UUID validation in every controller before calling service.
- Repositories return plain objects only — no business logic.
- Errors thrown as `Error` instances with `.status` attached (never plain objects — they have no `.stack` and Sentry can't capture them).
- `Promise.all()` for parallel DB queries inside services.
- `userId` is always derived from `req.user.id` (verified JWT), never from request body.
- **JSDoc discipline.** Every exported function has JSDoc with `@typedef`, `@param`, `@returns`. Types defined in JSDoc mirror frontend TypeScript types where they cross the API boundary. When we migrate to TypeScript post-launch, `@typedef` → `interface` is a 1:1 mapping.
- **Freeze constants.** Configuration objects exported from `domain/` use `Object.freeze()` recursively to prevent accidental mutation.

### Frontend

- API calls go through `lib/api.ts` only. No raw `fetch` in components.
- Data fetching in custom hooks (`hooks/`), never in components directly.
- Types in `lib/types.ts`, kept in sync with API shapes.
- Tailwind for all styling. No inline styles, no CSS modules.
- Components: PascalCase. Hooks: camelCase with `use` prefix.

### Database

- All PKs are UUIDs.
- Every table has `created_at TIMESTAMPTZ DEFAULT now()`.
- Mutable tables add `updated_at` + trigger.
- Soft delete via `deleted_at TIMESTAMPTZ NULLABLE`.
- Every schema change is a numbered `node-pg-migrate` file. Next migration: `0028_*`.

### IELTS-specific

- All IELTS constants and scoring functions live in `backend/src/domain/ielts/`. Do not hardcode band rules, word counts, or timers elsewhere.
- Exam UX behaviors (pauseable, one-way nav, anti-cheat) are read from `EXAM_UX[mode]` in `domain/ielts/exam-ux.js`. Components must not hardcode these.
- Band scores are never displayed in red (see Soul section).

---

## 11. Folder Structure (top-level only)

```
frontend/
  app/              Next.js App Router pages
  components/       UI components (PascalCase)
  hooks/            Data-fetching hooks (use-prefix)
  lib/              api.ts, types.ts, domain/ielts/ mirror, stores/
  config/           nav.ts and other static config
  providers/        Client-side providers (Auth, Theme)

backend/
  src/
    routes/         URL registration
    controllers/    HTTP layer
    services/       Business logic
    repositories/   SQL queries
    middleware/     Auth, error, rate-limit
    providers/      storage/, speech/, ai/, tts/, payment/
    domain/ielts/   Format, scoring, exam-ux, constants (PURE — no DB, no API)
    config/         sentry.js, etc.
  migrations/       node-pg-migrate files (0001..0027)
  sql/              Seed data

docs/
  technical-roadmap.md
  CHANGELOG.md      Detailed phase history
```

For any file not listed above, use `grep` or `glob` — do not ask.

---

## 12. What NOT to do

- Do not write frontend code without first reading `/mnt/skills/public/frontend-design/SKILL.md`.
- Do not treat "Active rework" skills (Writing, Reading) as done.
- Do not hardcode IELTS rules (word counts, timings, band formulas) outside `domain/ielts/`.
- Do not skip the sanitizer in the Examiner flow — it is the Zero Reaction enforcement.
- Do not mutate `users.xp` directly. Write to `xp_ledger` only.
- Do not bypass the service layer from a controller (no direct repository imports).
- Do not display band scores in red, ever.
- Do not use manipulative copy ("nghỉ ngơi nhé" when we mean "upgrade to continue").
- Do not create new `docs/*.md` files without updating this file's folder map. If a doc drifts, delete it — git history is the archive.
- Do not reintroduce `localStorage` for auth tokens.

---

**Source of truth:** This file. For phase history, see `docs/CHANGELOG.md`. For architecture target, see `docs/technical-roadmap.md`.
