# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Enterprise membership management system for a South African political organization. Handles member lifecycle, leadership appointments, meetings, SMS communication, analytics, and bulk data operations.

**Note:** The README and `.env.example` reference MySQL, but the project has been migrated to PostgreSQL. The Prisma schema uses `postgresql` as its provider. Ignore MySQL references in older docs.

## Common Commands

### Backend (`backend/`)
```bash
npm run dev          # Start dev server (nodemon, watches src/app.ts, port 5000)
npm run build        # Compile TypeScript + copy assets to dist/
npm start            # Run compiled dist/app.js (production)
npm run lint         # ESLint
npm run lint:fix     # ESLint auto-fix
npm test             # Jest tests
npm run migrate      # Run database migrations
npm run migrate:status  # Check migration status
```

### Frontend (`frontend/`)
```bash
npm run dev          # Vite dev server (port 3000, proxies /api to localhost:5000)
npm run build        # TypeScript check + Vite production build
npm run lint         # ESLint
npm run preview      # Preview production build
```

### Production (PM2)
```bash
pm2 start ecosystem.config.cjs
```

## Architecture

### Backend: Express.js + TypeScript
- **Entry point:** `backend/src/app.ts`
- **Database:** PostgreSQL via Prisma ORM + raw SQL pool (`backend/src/config/database-hybrid.ts`)
- **Schema:** `backend/prisma/schema.prisma` (150+ models)
- **SQL migrations:** `backend/migrations/` (numbered .sql files)
- **Cache:** Redis (optional, controlled by `REDIS_ENABLED` env var)
- **Real-time:** Socket.io WebSocket
- **Queues:** Bull (Redis-backed) for file/bulk upload processing

### Frontend: React 18 + TypeScript + Vite
- **Entry point:** `frontend/src/main.tsx`
- **UI framework:** Material-UI (MUI) v5 with MUI X Data Grid
- **State:** Zustand (auth, UI, application stores in `frontend/src/store/`) + React Query for server state
- **Routing:** React Router v6 (`frontend/src/routes/AppRoutes.tsx`)
- **HTTP:** Axios with interceptors for auth tokens, maintenance mode, error handling

### Request Flow
Routes (`backend/src/routes/`) → middleware chain (authenticate → requirePermission → validate) → Services (`backend/src/services/`) → Models (`backend/src/models/`) or Prisma directly

### Key Patterns
- **Services** use static methods on classes (e.g., `LeadershipService.createAppointment(data)`)
- **Auth:** JWT tokens, verified in `backend/src/middleware/auth.ts`, role-based permission checks
- **Validation:** Joi schemas defined inline in route files
- **Error handling:** Custom error classes (`AuthenticationError`, `ValidationError`, `NotFoundError`) caught by global `errorHandler` middleware
- **Database access is hybrid:** Prisma Client for type-safe queries, raw PostgreSQL pool (`executeQuery()`) for complex queries and views

### Background Jobs (started in app.ts)
- Meeting status updates (every 5 min)
- Membership status updates (daily midnight)
- Birthday SMS (daily 08:00 SAST)
- Renewal SMS reminders (daily 08:00)
- Ward audit view refresh (every 15 min)
- File/queue cleanup (daily 2-3 AM)

## Environment Setup

Backend requires `backend/.env` — copy from `backend/.env.example`. Critical variables:
- `DATABASE_URL` — PostgreSQL connection string (for Prisma)
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` — PostgreSQL config (for raw pool)
- `JWT_SECRET` — Auth token signing
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_ENABLED` — Redis config
- `SMS_PROVIDER` — `mock`, `twilio`, `clickatell`, `gateway`, or `smpp`
- `CORS_ORIGIN` — Frontend URL (default `http://localhost:3000`)

## Important Directories

- `backend/src/routes/` — 80+ Express route files organized by domain
- `backend/src/services/` — 90+ service files with business logic
- `backend/src/models/` — Database model query helpers
- `backend/src/middleware/` — Auth, validation, rate limiting, error handling
- `backend/src/jobs/` — Scheduled background jobs
- `frontend/src/pages/` — Page-level components
- `frontend/src/components/` — Reusable UI components
- `frontend/src/services/` — API client functions (Axios)
- `frontend/src/store/` — Zustand stores (auth, UI, application)
