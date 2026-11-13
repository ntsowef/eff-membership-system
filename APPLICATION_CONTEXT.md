# EFF Membership Management Platform — Application Context

A comprehensive, enterprise-grade membership and organizational management system designed for large-scale operations in South Africa. The system manages **1.25M+ consolidated member records**, organizational hierarchies, leadership structures, voter verification, communications, and digital membership cards.

---

## 1. System Overview & Core Capabilities

- **Member Lifecycle & Records**: Comprehensive member profiles (`members_consolidated`), status tracking (active, expired, deceased, resigned), voter registration statuses, and phone deduplication (`is_duplicate`).
- **South African Geographic Hierarchy**: Full administrative drill-down:
  `National -> Province -> District / Metro -> Municipality -> Ward -> Voting District (VD)`
- **Leadership & Governance**: Branch, Ward, Sub-regional, Regional, Provincial, and National leadership appointments, terms, quotas, and election nominations.
- **Electoral & IEC Integration**: Integration with the Electoral Commission of South Africa (IEC API) for voter registration audits, district mapping, and deceased member purges.
- **Multi-Channel Communications**:
  - **SMS**: High-throughput messaging via JSON AppLink and SMPP protocols (daily birthday notifications, renewal notices, bulk campaigns).
  - **WhatsApp**: Dual-provider integration via Meta Cloud API and WasenderAPI.
  - **Email**: SMTP dispatch with customizable templates.
- **Payments & Cards**: Peach Payments V2 checkout integration for membership subscriptions, renewals, and digital card generation with QR verification.
- **High-Volume Data Operations**: Bull/Redis-backed job queue for processing large-scale Excel uploads, attendance registers, and bulk data exports.
- **Support & Fieldwork**: Real-time support chat system (National vs. Regional Admins), VD Coordinator registration workflows, and program volunteer management.

---

## 2. Technology Stack

```
┌────────────────────────────────────────────────────────┐
│               Frontend (React 18 + Vite)               │
│      MUI v5 • Zustand • TanStack Query • Socket.io     │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / WSS
┌───────────────────────────▼────────────────────────────┐
│              Backend (Node.js + TypeScript)            │
│   Express.js • Bull Queues • Node-Cron • Joi • JWT     │
└─────────────┬───────────────────────────┬──────────────┘
              │                           │
┌─────────────▼──────────────┐   ┌────────▼──────────────┐
│     PostgreSQL Database    │   │      Redis Cache      │
│  Prisma ORM + pg Raw Pool  │   │  Session • Rate Limit │
│  (eff_membership_database) │   │  Bull Queue Storage   │
└────────────────────────────┘   └───────────────────────┘
```

| Layer | Technologies & Libraries |
| :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript, Material-UI (MUI v5), MUI X Data Grid, Zustand, TanStack React Query v5, React Hook Form, Yup, Socket.io-client, Chart.js / Recharts |
| **Backend** | Node.js 18+, TypeScript, Express.js, Prisma ORM, `pg` (node-postgres), Bull, Redis (`ioredis`), Socket.io, Node-cron, Joi, Morgan |
| **Database** | PostgreSQL (`eff_membership_database` — migrated from MySQL, 150+ tables/views, indexed for 1M+ rows) |
| **Infrastructure** | Ubuntu Linux (Production server: `69.164.245.173` / `api.effmemberportal.org`), Nginx (Reverse Proxy & SSL), PM2 Process Manager, Docker |
| **Integrations** | IEC Web API, Peach Payments V2, JSON AppLink SMS, SMPP, Meta Cloud WhatsApp API, WasenderAPI |

---

## 3. Architecture & Data Access Patterns

### Hybrid Database Pattern (`backend/src/config/database-hybrid.ts`)
The platform employs a hybrid database strategy:
1. **Prisma ORM (`@prisma/client`)**: Type-safe data modeling, standard CRUD operations, relationship traversal, and schema introspection (`backend/prisma/schema.prisma`).
2. **PostgreSQL Raw Pool (`pg.Pool`)**: High-performance bulk data processing, materialized view refreshes, complex analytical aggregations, and large-dataset mutations (`executeQuery`, `executeQuerySingle`, `executeUpdate`, `executeTransaction`).

### Request Pipeline
`Request -> Nginx -> Auth Middleware (JWT) -> Role/Geo-Permission Check -> Joi Validation -> Controller/Service Layer -> Prisma / Raw Pool`

### Geographic Multi-Level Access Control
Admins possess scoped administrative permissions based on their assigned geographic boundary:
- **National Admins**: System-wide view and configuration access.
- **Provincial / Regional / Municipality / Ward Admins**: Data queries are automatically scoped to specific `province_code`, `district_code`, `municipality_code`, or `ward_code` boundaries.
- **VD Coordinators (`municipality_coordinator`)**: Scoped access for voting district operations and submissions.

---

## 4. Key Directory Structure

```
Membership-newV2/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma            # Canonical DB schema (150+ models)
│   ├── migrations/                  # Numbered SQL database migration files
│   ├── scripts/                     # Production scripts & maintenance tasks
│   │   ├── flag-duplicates.ts       # Phone cleanup & deduplication logic
│   │   ├── prod-dry-run.ts          # Non-destructive production analysis script
│   │   ├── generate-reports.ts      # Automated report generators
│   │   └── manage-sms-credits.ts    # SMS credit management utility
│   ├── src/
│   │   ├── app.ts                   # Express server bootstrap & cron jobs
│   │   ├── config/
│   │   │   ├── config.ts            # Environment validation & configuration
│   │   │   ├── database.ts          # Database entry re-exports
│   │   │   └── database-hybrid.ts   # Prisma + pg Pool hybrid client
│   │   ├── controllers/             # HTTP controller handlers
│   │   ├── middleware/              # Auth (JWT), rate limiting, error handler
│   │   ├── models/                  # Data models & SQL query wrappers
│   │   ├── routes/                  # Express route declarations with Joi schemas
│   │   ├── services/                # Business logic (Members, SMS, IEC, Payments, Purge)
│   │   └── utils/                   # Loggers, token generators, formatters
│   ├── .env                         # Local/Development environment variables
│   └── .env.production              # Production server environment configuration
│
├── frontend/
│   ├── src/
│   │   ├── api/                     # Axios clients and REST endpoints
│   │   ├── components/              # Reusable UI components (MUI based)
│   │   ├── pages/                   # Application views (Members, Dashboard, MyCard, etc.)
│   │   ├── routes/                  # React Router v6 definitions (AppRoutes.tsx)
│   │   ├── store/                   # Zustand global state (Auth, UI, application stores)
│   │   └── theme/                   # Brand styling (Crimson red palette, typography)
│   ├── package.json
│   └── vite.config.ts
│
├── deployment/                      # Nginx configs, PM2 scripts, Docker files
├── CLAUDE.md                        # Developer quick-reference guide
└── APPLICATION_CONTEXT.md           # Full application context document
```

---

## 5. Critical Database Entities

- **`members_consolidated`**: Core master table containing all historical and active members, South African ID numbers, normalized contact numbers (`cell_number` with `27` prefix), geographic linkage (`province_code`, `district_code`, `municipality_code`, `ward_code`, `voting_district_code`), voter status, and duplicate phone flagging (`is_duplicate`).
- **`provinces`, `districts`, `municipalities`, `wards`, `voting_districts`**: Electoral and administrative boundaries mapping directly to official South African demarcation and IEC codes.
- **`users` & `roles`**: System users, administrative roles, MFA settings, and geographic access scopes.
- **`leadership_appointments` & `leadership_structures`**: Official position appointments with role designations and start/end tenures.
- **`sms_logs` & `sms_campaigns`**: Delivery logs, gateway transaction references, statuses, and duplicate message prevention constraints.
- **`payment_transactions` & `membership_renewals`**: Peach Payments tracking records linked to subscriptions and member card issuance.

---

## 6. Background Scheduled Jobs (`backend/src/app.ts`)

| Schedule | Task | Purpose |
| :--- | :--- | :--- |
| **Every 5 min** | Meeting Status Updater | Advances scheduled meetings to in-progress or concluded |
| **Every 15 min** | Ward Audit Views Refresh | Refreshes materialized views for ward performance and voter counts |
| **Daily 00:00 SAST** | Membership Status Check | Flags expired memberships based on renewal dates |
| **Daily 08:00 SAST** | Birthday SMS Service | Sends automated birthday greetings to active members |
| **Daily 08:00 SAST** | Renewal Reminder SMS | Notifies members whose subscriptions are up for renewal |
| **Daily 02:00 SAST** | File Cleanup Queue | Purges temporary Excel uploads and stale exports |
| **Monthly** | Deceased Member Purge | Cross-references member IDs against IEC status and purges deceased records |

---

## 7. Environment & Operations

### Environment Files
- `backend/.env`: Active environment loaded by default via `backend/src/config/config.ts`.
- `backend/.env.production`: Production credentials and settings for `69.164.245.173` (`eff_membership_database`).

### Common Commands

#### Backend (`/backend`)
```bash
npm run dev              # Start development server via nodemon (port 5000)
npm run build            # Compile TypeScript + copy assets to dist/
npm start                # Run compiled dist/app.js (production)
npm run lint             # Run ESLint across src/**/*.ts
npm test                 # Run Jest test suite
npm run migrate          # Run SQL migrations
npx prisma generate      # Regenerate Prisma Client types
```

#### Frontend (`/frontend`)
```bash
npm run dev              # Launch Vite dev server (port 3000, proxies /api to :5000)
npm run build            # TypeScript check + Vite production bundle
npm run preview          # Preview local production build
```
