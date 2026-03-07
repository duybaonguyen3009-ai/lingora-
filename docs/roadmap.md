# Lingora – Product Roadmap

> Phases are sequential. Each phase must be stable before the next begins.

---

## Phase 0 – Foundation ✅ *(current)*

**Goal:** Clean, maintainable monorepo scaffold.

- [x] Monorepo structure (frontend / backend / docs)
- [x] Next.js app with typed API client
- [x] Express app with layered architecture
- [x] Error handling middleware
- [x] Environment variable management
- [x] Documentation skeleton

---

## Phase 1 – Core Infrastructure

**Goal:** Working full-stack skeleton with auth and persistence.

- [ ] Database setup (PostgreSQL + migrations)
- [ ] User model (kids + parent/teacher roles)
- [ ] JWT authentication (register, login, refresh)
- [ ] Session management
- [ ] Basic frontend auth flow (login page, protected routes)
- [ ] CI pipeline (GitHub Actions lint + test)

---

## Phase 2 – Vocabulary Module

**Goal:** Kids can learn and review words.

- [ ] Vocabulary data model (word, definition, image, audio)
- [ ] Vocabulary API endpoints (CRUD, filtering by level)
- [ ] VocabularyCard component
- [ ] WordList page
- [ ] Word detail page with audio playback
- [ ] Progress tracking per user

---

## Phase 3 – Quiz Module

**Goal:** Kids can test their knowledge interactively.

- [ ] Quiz and QuizQuestion data models
- [ ] Quiz API endpoints
- [ ] Multiple-choice quiz UI
- [ ] Fill-in-the-blank quiz UI
- [ ] Score calculation and result screen
- [ ] XP / reward system (basic)

---

## Phase 4 – Speaking Module

**Goal:** Kids can practise pronunciation.

- [ ] Browser-based audio recording (Web Audio API)
- [ ] Speaking prompt UI
- [ ] Audio upload to storage (S3 or equivalent)
- [ ] Teacher review interface (manual review, Phase 4a)
- [ ] Automated pronunciation scoring (Phase 4b, AI-assisted)

---

## Phase 5 – Communication Module

**Goal:** Guided conversation exercises.

- [ ] Dialogue scenario data model
- [ ] Turn-based dialogue UI
- [ ] Scenario library (greetings, shopping, school…)
- [ ] Completion tracking

---

## Phase 6 – Teacher / Parent Dashboard

**Goal:** Adults can monitor progress.

- [ ] Child progress overview
- [ ] Assignment creation
- [ ] Report export (PDF)

---

## Phase 7 – Polish & Growth

- [ ] Internationalisation (i18n) scaffolding
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance profiling and optimisation
- [ ] Analytics integration
- [ ] Subscription / payment (Stripe)

---

*Last updated: scaffold*
