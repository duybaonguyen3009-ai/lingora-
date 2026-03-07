# Lingora – Project Blueprint

## Vision

Lingora is an English-learning app for kids that makes language acquisition fun through communication exercises, vocabulary building, interactive quizzes, and speaking practice.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│                  Next.js (React + TS)                   │
│         app/ · components/ · lib/ · hooks/              │
└─────────────────────┬───────────────────────────────────┘
                      │  HTTP/REST  (JSON)
┌─────────────────────▼───────────────────────────────────┐
│                   Express API                           │
│      routes → controllers → services → repositories    │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                   Database (TBD)                        │
│          PostgreSQL or MongoDB (Phase 2)                │
└─────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

**Framework:** Next.js 14 (App Router)  
**Language:** TypeScript  
**Routing:** File-system based via `src/app/`

### Key directories

| Directory       | Purpose                                             |
|-----------------|-----------------------------------------------------|
| `app/`          | Pages and layouts (App Router)                      |
| `components/`   | Reusable UI components, organised by domain         |
| `lib/`          | Shared utilities, API client, constants             |
| `hooks/`        | Custom React hooks                                  |
| `types/`        | TypeScript type definitions mirroring API shapes    |
| `styles/`       | Global CSS, design tokens                           |

---

## Backend Architecture

**Runtime:** Node.js ≥ 18  
**Framework:** Express 4  
**Pattern:** Layered architecture — strict separation between HTTP and business logic

### Layer responsibilities

| Layer          | Responsibility                                         |
|----------------|--------------------------------------------------------|
| `routes/`      | URL + HTTP verb registration; no logic                 |
| `controllers/` | Parse request, call service, format response           |
| `services/`    | Business logic; orchestrates repositories              |
| `repositories/`| Data access only; returns plain objects                |
| `middleware/`  | Cross-cutting concerns (auth, error handling, logging) |
| `config/`      | Environment-derived configuration                      |
| `utils/`       | Pure helper functions                                  |

### Why this layering?

- **Testability** — services can be unit-tested without HTTP or a real DB
- **Replaceability** — swap PostgreSQL for MongoDB by changing only repositories
- **Readability** — a new engineer can trace a request end-to-end without context-switching

---

## Monorepo Strategy

- npm workspaces — no extra tooling (Turborepo/Nx) until build times warrant it
- Shared types will live in a future `packages/shared` workspace when the API surface stabilises
- Independent deployments — frontend and backend are deployed separately

---

## Non-goals (Phase 1)

- Authentication
- Database integration
- AI / speech recognition
- Payment / subscription
- Native mobile app
