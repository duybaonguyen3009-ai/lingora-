# Lingora

> An intelligent English-learning platform focused on communication, vocabulary, quizzes, and speaking practice.
---

## Monorepo Structure

```
lingora/
├── frontend/        # Next.js application (React, TypeScript)
├── backend/         # Node.js + Express REST API
├── docs/            # Architecture docs, blueprints, specs
├── package.json     # Root workspace manager
├── .gitignore
└── README.md
```
## Tech Stack

### Frontend
- Next.js
- React
- TypeScript

### Backend
- Node.js
- Express
- PostgreSQL
---

## Getting Started

### Prerequisites
- Node.js >= 18
- npm >= 9

### Install all dependencies
```bash
npm install
```

### Run both apps in development
```bash
npm run dev
```

### Run individually
```bash
npm run dev:frontend   # http://localhost:3000
npm run dev:backend    # http://localhost:4000
```

---

## Workspaces

| Workspace    | Path         | Purpose                            |
|--------------|--------------|------------------------------------|
| `frontend`   | `./frontend` | Next.js UI — pages, components     |
| `backend`    | `./backend`  | Express API — routes, services     |
## Backend Architecture

The backend follows a layered architecture:

Routes  
↓  
Controllers  
↓  
Services  
↓  
Repositories  
↓  
Database
---

## Documentation

| File                          | Description                                                         |
|-------------------------------|---------------------------------------------------------------------|
| `CLAUDE.md`                   | Authoritative project overview, architecture decisions, phase plan  |
| `docs/technical-roadmap.md`   | Full system architecture + scaling target (1M users)                |

---

## Architecture Principles

- **Separation of concerns** — frontend and backend are fully independent packages
- **Layered backend** — routes → controllers → services → repositories
- **Feature-first frontend** — components organized by domain, not by type
- **No premature optimization** — structure grows with the product
- **TypeScript throughout** — types enforced on both sides

---

## Current Status

🟡 The project is currently under active development. Core backend architecture and frontend foundations are being built.
