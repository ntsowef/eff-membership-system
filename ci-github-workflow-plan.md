# CI/CD & GitHub Actions Deployment Plan (`ci-github-workflow-plan.md`)

> **Status:** CI & Deploy Workflows Shipped to `origin/chore/ci-workflows` (`3478489`) — Ready for PR into `main` + GitHub `production` Environment setup.  
> **Verified Live Servers:**  
> - **Backend (`69.164.245.173`):** `/var/www/eff-membership-system/backend`, PM2 `eff-backend` (`online`), Node `v20.19.5`, `/usr/bin/pg_dump`, `/usr/bin/rsync`.  
> - **Frontend (`69.164.245.125`):** `/var/www/eff-membership-system/frontend/dist`, Nginx static (`/usr/sbin/nginx`), Node `v22.21.0`, `PM2_APPS: []`.  
> - **SSH Key Status:** `eff_github_deploy_ed25519.pub` (`SHA256:wMIqfr5c/vQxV3bbTISKvbekoxnkcN/kM5mnFv73kU4`) installed on **both** servers; clear the key's passphrase (`ssh-keygen -p`) before pasting `PROD_SSH_KEY` into GitHub Secrets.  
> **Companion Plans:**  
> - [rbac-permission-matrix-menu-cleanup.md](file:///c:/Development/NewProj/Membership-newV2/rbac-permission-matrix-menu-cleanup.md) (RBAC Matrix & Menu Cleanup — Migrations `051`)  
> - [meeting-id-checkin-credentials.md](file:///c:/Development/NewProj/Membership-newV2/meeting-id-checkin-credentials.md) (SGO ID Scanning + PWA/Capacitor + Credentials — Migration `052`)

---

## 1. Objective

Replace broken, unguarded deployment workflows with a reliable, repeatable, zero-downtime GitHub Actions CI/CD pipeline covering:
1. **Automated Pull Request & Push CI (`ci.yml`)** — secret scanning, TypeScript type-checking, linting, Jest backend tests, Vitest frontend tests, and production bundle verification.
2. **Backend Production Deploy (`backend-deploy.yml`)** — runner-side TypeScript build, atomic symlink release swap, OS-safe dependency install, **pre-migration `pg_dump` backup + tracked PostgreSQL SQL migration runner**, PM2 zero-downtime reload, `/api/v1/health/detailed` check, and automatic symlink rollback on failure.
3. **Frontend PWA Production Deploy (`frontend-deploy.yml`)** — complete `VITE_*` environment injection, mixed-content guard, atomic Nginx symlink swap to the canonical web root, and Nginx/PWA cache verification.
4. **Android Capacitor APK Pipeline (`android-capacitor-build.yml`)** — automated Capacitor sync + Android `.apk`/`.aab` build for SGO Support Staff scanners once the mobile scanner phase is implemented.

---

## 2. Forensic Audit of Current Broken Workflows & Repo Contradictions

Direct inspection of the repository exposed several bugs that prevent `.github/workflows/` from succeeding today:

| Area | Observed Problem | Exact Evidence in Repo | Risk if Left Unfixed |
| :--- | :--- | :--- | :--- |
| **No CI Validation** | No `.github/workflows/ci.yml` exists; no tests or `tsc` run on PRs/pushes. | `.github/workflows/` only contains `backend-deploy.yml` and `frontend-deploy.yml` | Broken TypeScript, failing Jest/Vitest tests, or broken Vite builds reach `main`. |
| **Backend Build Fails on Deploy** | Workflow installs production-only packages **before** running `npm run build`, omitting `typescript` (`devDependencies`). | `.github/workflows/backend-deploy.yml#L40-L47`; `typescript` & `@types/*` are in `backend/package.json#L91-L115` | `tsc && npm run copy-assets` fails immediately on every deploy. |
| **Database Migrations Broken** | Workflow calls `npx prisma migrate deploy`, while schema changes live in flat `.sql` files under `backend/migrations/001..050`. Even `backend/prisma/migrations/` contains flat `.sql` files, and `backend/package.json` `migrate` script calls a nonexistent file. | `.github/workflows/backend-deploy.yml#L44`; `backend/prisma/migrations/001..012*.sql`; `backend/migrations/001..050*.sql`; `backend/package.json#L19` references missing `backend/run-migrations.js` | New RBAC (`051`) and Meeting Check-In (`052`) tables never reach production DB, causing runtime SQL errors. |
| **Frontend Missing Runtime Env Vars** | Workflow passes only `VITE_API_URL`, omitting `VITE_API_BASE_URL`, `VITE_WS_URL`, and `VITE_WS_PATH`. Meanwhile `frontend/src/lib/api.ts` hardcodes `baseURL: '/api/v1'`. | `.github/workflows/frontend-deploy.yml#L33`; `frontend/.env.production#L1-L40`; `frontend/src/lib/api.ts` | Deployed SPA/PWA or Capacitor app hits wrong API origin or breaks Socket.IO live attendance updates. |
| **Frontend Test Script Missing** | `vitest` is installed in `devDependencies`, `*.test.tsx` files exist, but `"test"` is absent from `frontend/package.json` `"scripts"`. | `frontend/package.json#L6-L11`, `#L67`; `frontend/src/pages/auth/__tests__/LoginPage.test.tsx` | CI cannot run `npm test` in `frontend/` until `"test": "vitest run"` is added. |
| **Conflicting Server Paths & PM2 Names** | Docs, workflows, shell scripts, Nginx configs, and PM2 configs disagree on where apps live and what PM2 process name runs. | Backend: `/var/www/api.effmemberportal.org/backend` (`backend-deploy.yml`) vs `/var/www/eff-membership-system` (`ecosystem.production.config.cjs`) vs `/opt/eff-membership/backend` (`deployment/ecosystem.config.js`). Frontend: `/var/www/effmemberportal.org/html` (`frontend-deploy.yml#L43`, `deploy-frontend-production.sh`) vs `/var/www/eff-membership-system/frontend/dist` (`nginx/effmemberportal.org.conf#L45`). PM2: `eff-backend` vs `eff-api` vs `ecosystem.config.js`. | Deploy workflow writes files into a directory Nginx/PM2 isn't serving, leaving production stale. |
| **No GitHub Environment Gate / Concurrency** | Deploying directly on push to `main` has no manual approval gate, no concurrency queue, and no rollback path. | `.github/workflows/backend-deploy.yml#L3-L7` & `frontend-deploy.yml#L3-L7` | Two simultaneous merges race on the VPS or deploy untested migrations without a `pg_dump` backup. |
| **Branch & Working Tree Hygiene** | Active work sits on `prisma-migration` with modified `deployment/backend.env.production`, `*.backup` files in `src/`, untracked `_exports/`, `backend/exports/`, `*.docx`, and IP-stamped backup JSONs. | `git branch -a`, `git status --short`, `.gitignore#L1-L80` | Accidental commit of `.env` credentials, CSV member PII exports, or stale `.backup` files. |

---

## 3. Canonical Production Layout & Branch Strategy

> **Confirmation Needed Before Editing Deploy Workflows:** We must verify which backend folder, frontend web root, and PM2 process name are **actually running on the live VPS today** (see Section 8 Questions). The layout below standardizes on the Nginx-matched paths unless your VPS uses another active directory.

### 3.1 Branch & Release Flow
- **Protected `main` branch:**
  - Direct pushes blocked; all changes land via Pull Request from feature branches (`feat/rbac-matrix`, `feat/sgo-id-checkin`, `chore/ci-workflows`, or merged cleanup from `prisma-migration`).
  - Required status checks before merge: `backend-ci`, `frontend-ci`, `repo-hygiene`.
- **Optional `staging` branch / manual `workflow_dispatch`:** Allows testing migrations and builds before merging to `main`.
- **GitHub `production` Environment:**
  - Restrict deployments to branch `main` only.
  - Enable **Required reviewers** (at least 1 maintainer approval before production deploy runs, ensuring database migrations never run unexpectedly).

### 3.2 Atomic Symlink Release Structure on VPS
Instead of overwriting live files in place (`rsync --delete` directly over a running Node process or Nginx root), deploy into immutable timestamped release folders and switch a single symlink:

```text
/var/www/eff-membership-system/            (canonical root — confirm vs VPS)
├── backend/
│   ├── shared/
│   │   ├── .env                           (server-only secrets, chmod 600, NOT in git)
│   │   ├── uploads/                       (persistent uploads & excel-processing dirs)
│   │   ├── logs/                          (PM2 stdout/stderr logs)
│   │   └── backups/                       (pre-migration pg_dump custom backups)
│   ├── releases/
│   │   ├── 20261113_120000_a1b2c3d/
│   │   └── ... (retain last 5 releases)
│   └── current -> /var/www/eff-membership-system/backend/releases/20261113_120000_a1b2c3d
└── frontend/
    ├── releases/
    │   ├── 20261113_120500_a1b2c3d/       (built Vite dist/*)
    │   └── ... (retain last 5 releases)
    └── dist -> /var/www/eff-membership-system/frontend/releases/20261113_120500_a1b2c3d
```

- **Why symlink `/var/www/eff-membership-system/frontend/dist -> releases/<id>`:** Matches `nginx/effmemberportal.org.conf` line 45 (`root /var/www/eff-membership-system/frontend/dist;`) without requiring Nginx rewrites while enabling 1-second instant rollback (`ln -sfn <prev_release> dist && sudo systemctl reload nginx`).
- **Why compile backend on runner + install prod deps on VPS:** `backend/package.json` includes native C++ addons (`bcrypt`, `canvas`). Building TypeScript on GitHub Runner avoids needing `devDependencies` (`typescript`, `@types/*`) to compile on the VPS, while running `npm ci --omit=dev --prefer-offline` on the VPS guarantees `bcrypt`/`canvas` binaries match the VPS Ubuntu/glibc version.

---

## 4. Planned GitHub Actions Workflows (`.github/workflows/`)

### Workflow 1: `.github/workflows/ci.yml` (Quality, Security & Build Verification)
- **Triggers:**
  - `pull_request` targeting `main` or `prisma-migration`
  - `push` to `main`, `prisma-migration`, `feat/**`
  - `workflow_dispatch`
- **Concurrency:** `group: ci-${{ github.ref }}`, `cancel-in-progress: true`
- **Jobs:**
  1. **`repo-hygiene`:**
     - Run Gitleaks (`gitleaks/gitleaks-action@v2`) with `fetch-depth: 0` on PR diffs to block leaked API keys, JWT secrets, DB passwords, or private keys.
     - Verify no tracked/added `.env`, `.env.prod-db`, `*.pem`, `*.key`, `*.backup`, or CSV member export files exist in PR changes.
     - Validate `.github/workflows/*.yml` syntax cleanly (optional `actionlint` job).
  2. **`backend-ci` (Node `20.x`, `npm` cache on `backend/package-lock.json`):**
     - Attach **PostgreSQL 16** and **Redis 7** GitHub service containers for isolated test execution (`TEST_DB_*`, dummy `JWT_SECRET`).
     - `working-directory: backend`:
       - `npm ci`
       - `npx prisma generate`
       - `npx tsc --noEmit` (type-check `src/**/*.ts`)
       - `npm run lint` (or scoped lint on changed TS files during legacy warning cleanup, ratcheting toward zero warnings)
       - `npm test -- --ci --runInBand` (runs Jest suite: `cctInvitations.test.ts`, `hierarchicalAutoInvitations.test.ts`, `bulk-upload/__tests__/*`, plus upcoming RBAC Matrix, SGO Scanner, and `run-sql-migrations` tests)
       - `npm run build` (`tsc && npm run copy-assets`) and assert `test -f dist/app.js`
     - Smoke-validate `backend/migrations/*.sql` syntax (dry-run apply `001..052` or post-baseline test against the ephemeral CI Postgres container if clean-start SQL script supports it).
  3. **`frontend-ci` (Node `20.x`, `npm` cache on `frontend/package-lock.json`):**
     - `working-directory: frontend`:
       - `npm ci`
       - `npx tsc -b --noEmit`
       - `npm run lint`
       - `npm test` (`vitest run` — added to `frontend/package.json`)
       - `npm run build` with dummy CI env (`VITE_API_URL=https://api.effmemberportal.org`, `VITE_API_BASE_URL=https://api.effmemberportal.org/api/v1`, `VITE_WS_URL=https://api.effmemberportal.org`, `VITE_WS_PATH=/socket.io`)
       - Assert `dist/index.html` exists and zero occurrences of `http://localhost` appear in `dist/assets/*.js`.

---

### Workflow 2: `.github/workflows/backend-deploy.yml` (Backend Build, DB Backup/Migrate, Zero-Downtime PM2 Reload)
- **Triggers:**
  - `push` on `main` (paths: `backend/**`, `ecosystem.production.config.cjs`, `.github/workflows/backend-deploy.yml`)
  - `workflow_dispatch` with inputs:
    - `skip_migrations` (boolean, default `false`)
    - `rollback_to_release` (string, optional release folder name for emergency instant rollback)
- **Guards:**
  - First job calls reusable CI workflow (`uses: ./.github/workflows/ci.yml`) or re-runs backend `tsc` + `jest` + `build` before deploy starts.
  - `deploy` job uses `environment: production` and `concurrency: { group: deploy-backend-prod, cancel-in-progress: false }`.
- **Job 1 (`build-artifact` on `ubuntu-latest`):**
  - `npm ci` -> `npx prisma generate` -> `npm run build`.
  - Include compiled `dist/scripts/run-sql-migrations.js` inside `dist/`.
  - Archive minimal runtime tarball `backend-release.tar.gz`:
    `dist/`, `package.json`, `package-lock.json`, `prisma/schema.prisma`, `migrations/`, `../ecosystem.production.config.cjs`.
  - Upload workflow artifact (short 7-day retention).
- **Job 2 (`deploy-production`, `needs: build-artifact`, `environment: production`):**
  1. **SSH Setup:** Install ephemeral SSH private key (`secrets.PROD_SSH_KEY`) and pin `secrets.SSH_KNOWN_HOSTS` (`StrictHostKeyChecking=yes` — never `StrictHostKeyChecking=no` in production workflows).
  2. **Stage Release on VPS:**
     - Create `$BACKEND_DIR/releases/$RELEASE_ID` and extract `backend-release.tar.gz`.
     - Symlink shared state:
       - `ln -sfn "$BACKEND_DIR/shared/.env" "$RELEASE_DIR/.env"`
       - `ln -sfn "$BACKEND_DIR/shared/uploads" "$RELEASE_DIR/uploads"`
       - `ln -sfn "$BACKEND_DIR/shared/logs" "$RELEASE_DIR/logs"`
     - Install production dependencies safely inside release dir:
       `npm ci --omit=dev --prefer-offline` (with `npm_config_cache="$BACKEND_DIR/shared/.npm-cache"`) + `npx prisma generate`.
  3. **Pre-Migration Safety Backup & Transactional SQL Migrations:**
     - Run `node dist/scripts/run-sql-migrations.js status` (reads DB credentials from `shared/.env`).
     - **If pending migrations > 0 (and `skip_migrations != true`):**
       - Take timestamped PostgreSQL backup BEFORE altering schema:
         `pg_dump --format=custom --no-owner --file="$BACKEND_DIR/shared/backups/pre_${RELEASE_ID}.dump"` (fail deploy immediately if `pg_dump` fails or produces < 1 KB!).
       - Run `node dist/scripts/run-sql-migrations.js run`.
         (Each migration runs inside `BEGIN ... COMMIT` and records SHA-256 checksum in `schema_migrations`; failure aborts BEFORE `current` symlink flips.)
  4. **Atomic Swap & PM2 Reload:**
     - Save `PREV_RELEASE=$(readlink -f "$BACKEND_DIR/current" || true)`.
     - Swap symlink: `ln -sfn "$RELEASE_DIR" "$BACKEND_DIR/current"`.
     - Reload PM2 cleanly from `$BACKEND_DIR/current`:
       `pm2 startOrReload "$BACKEND_DIR/current/ecosystem.production.config.cjs" --env production --update-env`
       (Using unified process name — confirm `eff-backend` vs `eff-api`).
  5. **Local + Public Health Check & Automatic Code Rollback:**
     - Retry up to 6 times (5s interval):
       `curl -fsS --max-time 5 http://127.0.0.1:5000/api/v1/health/detailed`
       and verify JSON `.data.status == "healthy"` (confirming both Express AND live PostgreSQL pool are healthy).
     - **If health check fails:**
       - Print last 80 lines of `pm2 logs --nostream --lines 80`.
       - If `$PREV_RELEASE` exists: `ln -sfn "$PREV_RELEASE" "$BACKEND_DIR/current"` and `pm2 reload "$PREV_RELEASE/ecosystem.production.config.cjs" --env production --update-env`.
       - Emit clear alert note if SQL migrations executed before failure (so operator knows whether to restore `shared/backups/pre_${RELEASE_ID}.dump`).
       - Exit non-zero so GitHub Actions marks the run failed.
  6. **Cleanup & Public Verification:**
     - From GitHub Runner, verify `curl -fsS https://api.effmemberportal.org/api/v1/health/detailed` returns HTTP 200.
     - Prune `releases/` keeping newest 5 releases and keep latest 10 `shared/backups/*.dump`.
     - Run `pm2 save` so reboots restore `$BACKEND_DIR/current`.

---

### Workflow 3: `.github/workflows/frontend-deploy.yml` (Frontend Web + PWA Deploy)
- **Triggers:**
  - `push` on `main` (paths: `frontend/**`, `.github/workflows/frontend-deploy.yml`)
  - `workflow_dispatch` (including optional `rollback_to_release`)
- **Environment & Concurrency:**
  - `environment: production`, `concurrency: { group: deploy-frontend-prod, cancel-in-progress: false }`.
- **Build Job:**
  - `npm ci` -> `npx tsc -b --noEmit` -> `npm test` (`vitest run`) -> `npm run build` with:
    - `VITE_API_URL: ${{ vars.VITE_API_URL }}` (`https://api.effmemberportal.org`)
    - `VITE_API_BASE_URL: ${{ vars.VITE_API_BASE_URL }}` (`https://api.effmemberportal.org/api/v1`)
    - `VITE_WS_URL: ${{ vars.VITE_WS_URL }}` (`https://api.effmemberportal.org`)
    - `VITE_WS_PATH: ${{ vars.VITE_WS_PATH }}` (`/socket.io`)
    - `VITE_APP_NAME: ${{ vars.VITE_APP_NAME }}`
  - Sanity checks on `frontend/dist/`:
    - Must contain `index.html` and `assets/*.js`.
    - Once PWA phase lands, must contain `manifest.webmanifest` and service worker bundle (`sw.js`).
    - Fail build if `grep -rn "http://localhost" frontend/dist/` finds any accidental local dev URLs baked into production JS!
- **Deploy Job:**
  - SCP/rsync tarball `frontend-dist.tar.gz` into `$FRONTEND_DIR/releases/$RELEASE_ID/`.
  - Record `$PREV_RELEASE`, atomically swap `$FRONTEND_DIR/dist -> $FRONTEND_DIR/releases/$RELEASE_ID` (matching `nginx/effmemberportal.org.conf` line 45).
  - Run `sudo nginx -t && sudo systemctl reload nginx`.
  - Verify `curl -fsSI https://effmemberportal.org/` returns HTTP 200 and verify `/manifest.webmanifest` / `/assets/*.js` load properly; rollback `dist` symlink + reload Nginx if HTTP verification fails.
  - Note on `nginx/effmemberportal.org.conf` headers during PWA phase: ensure `index.html`, `sw.js`, and `manifest.webmanifest` send `Cache-Control: no-cache, must-revalidate` while `/assets/*` keep `immutable` 1-year caching so SGO scanners pick up updates immediately.

---

### Workflow 4: `.github/workflows/android-capacitor-build.yml` (Mobile Scanner APK — Triggered After Capacitor Phase)
- **Triggers:**
  - `workflow_dispatch` (inputs: `build_type: debug | release`, `api_env: production | staging`)
  - Tag push matching `mobile-v*` (e.g. `mobile-v1.0.0`)
- **Purpose:** Builds installable Android `.apk` (or Play `.aab`) for SGO Support Staff handhelds/phones using `@capacitor/android` + `@capacitor-mlkit/barcode-scanning` from Plan 1 (`meeting-id-checkin-credentials.md`).
- **Steps:**
  1. Node 20 -> `frontend`: `npm ci` -> `npm run build` with production HTTPS `VITE_API_BASE_URL` & `VITE_WS_URL`.
  2. `npx cap sync android` (syncs `frontend/dist` and Capacitor plugins into `frontend/android`).
  3. Setup Java 17 (`actions/setup-java@v4`, `temurin`) + Android SDK + Gradle cache.
  4. If `release`: decode `secrets.ANDROID_KEYSTORE_BASE64` and sign APK using `secrets.ANDROID_KEYSTORE_PASS`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASS`.
  5. Run `./gradlew assembleRelease` (or `assembleDebug` for internal test APK).
  6. Upload APK (`sgo-scanner-<version>.apk`) as a GitHub Actions Artifact / attached Release asset for controlled SGO staff distribution.

---

## 5. Required Codebase & Repo Prerequisites Before Workflows Go Live

These concrete prep items align `package.json`, SQL migrations, and repo hygiene with the workflows above:

1. **Create Idempotent PostgreSQL SQL Migration Runner (`backend/src/scripts/run-sql-migrations.ts`):**
   - Replaces the missing `backend/run-migrations.js` referenced in `backend/package.json#L19-L20`.
   - Creates `schema_migrations (filename TEXT PRIMARY KEY, checksum_sha256 TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), applied_by TEXT NOT NULL DEFAULT current_user)`.
   - Supports three subcommands compiled into `dist/scripts/run-sql-migrations.js`:
     - `status`: lists applied vs pending `.sql` files in `backend/migrations/`.
     - `baseline --through 050_sync_provinces_districts_municipalities_with_metros_and_boundaries.sql`: marks historical migrations `001`..`050` (already present in local/prod DBs) as baselined without re-executing them, after verifying key baseline tables (`users`, `roles`, `meetings`, `members_consolidated`) exist.
     - `run`: verifies checksums of already-applied files (`051+`) haven't drifted, wraps each pending migration in `BEGIN ... COMMIT` (unless `--no-tx` is flagged via header comment `-- @no-transaction` for `CONCURRENTLY` index files), records checksum in `schema_migrations`, and exits cleanly.
   - Update `backend/package.json`: `"migrate": "node dist/scripts/run-sql-migrations.js run"`, `"migrate:status": "node dist/scripts/run-sql-migrations.js status"`.
2. **Add `test` Script in Frontend (`frontend/package.json`):**
   - Add `"test": "vitest run"` and verify existing Vitest tests pass cleanly under Node 20 in CI (and ensure `vite.config.ts` / `vitest.config.ts` has `environment: 'jsdom'`).
3. **Fix API Base URL Usage in `frontend/src/lib/api.ts`:**
   - Replace hardcoded `baseURL: '/api/v1'` with `import.meta.env.VITE_API_BASE_URL || '/api/v1'` so built web and Capacitor APKs respect CI environment injection (already planned in [meeting-id-checkin-credentials.md](file:///c:/Development/NewProj/Membership-newV2/meeting-id-checkin-credentials.md)).
4. **Canonicalize Legacy Deploy Scripts & PM2 Configs:**
   - Standardize on ONE root ecosystem file (`ecosystem.production.config.cjs`) reading port `5000` (`http://127.0.0.1:5000/api/v1/health/detailed`) and mark legacy conflicting shell scripts (`deploy-backend-production.sh`, `deploy-frontend-production.sh`, `deploy-production.sh`, `deployment/ecosystem.config.js`, `ecosystem.production.config.js`) as deprecated or remove/consolidate them so nobody runs a mismatched script by hand.
5. **Git Working Tree & Secret Audit Cleanup (`prisma-migration` -> `main`):**
   - Audit `git diff deployment/backend.env.production` — **never** commit live passwords, Peach/PayFast keys, or SMTP credentials; remove tracked `.env.production` values or move secrets strictly to VPS `shared/.env`.
   - Remove accidental untracked export/backup artifacts from workspace/git (`*.backup` in `backend/src/`, `_exports/*.csv`, `backend/exports/`, `Membership_ID_Lookup_Report.docx`, `scripts/*.txt`) and expand `.gitignore` to ignore `*.backup`, `*.mysql-backup`, `_exports/`, `backend/exports/`, `*.dump`.
   - Merge or cherry-pick verified changes from `prisma-migration` onto `main` cleanly via PR.

---

## 6. GitHub Repository Secrets, Variables & Server Setup Checklist

### 6.1 GitHub Secrets (`Settings -> Environments -> production -> Secrets` or Repository Secrets)

| Name | Purpose | Notes |
| :--- | :--- | :--- |
| `PROD_SSH_HOST` | Production VPS IP / hostname | Stored as Secret instead of plain hardcoded IPs in repo scripts |
| `PROD_SSH_PORT` | SSH port (default `22`) | Optional if standard `22` |
| `PROD_SSH_USER` | Dedicated non-root deploy user (`deploy` or confirmed user) | Least-privilege sudo limited cleanly via `/etc/sudoers.d/eff-deploy` to `nginx -t` and `systemctl reload nginx` |
| `PROD_SSH_KEY` | Dedicated Ed25519 deploy private key (CI-only keypair) | Public key installed in VPS `~/.ssh/authorized_keys` |
| `SSH_KNOWN_HOSTS` | Output of `ssh-keyscan -H <PROD_SSH_HOST>` | Prevents MITM attacks during CI SSH/SCP |
| `ANDROID_KEYSTORE_BASE64` | Base64 Android release `.jks` keystore (for Capacitor APK pipeline) | Needed only when signing release `.apk`/`.aab` builds |
| `ANDROID_KEYSTORE_PASS` / `ANDROID_KEY_ALIAS` / `ANDROID_KEY_PASS` | Signing credentials for Android release builds | Protected in `production` environment |

### 6.2 GitHub Environment Variables (`Settings -> Environments -> production -> Variables`)

| Name | Expected Value (Confirm Before Cutover) | Used By |
| :--- | :--- | :--- |
| `DEPLOY_BACKEND_PATH` | `/var/www/eff-membership-system/backend` *(or VPS active path)* | `backend-deploy.yml` |
| `DEPLOY_FRONTEND_PATH` | `/var/www/eff-membership-system/frontend` *(serves `dist`)* | `frontend-deploy.yml` |
| `PM2_APP_NAME` | `eff-backend` *(or `eff-api` — must match live VPS)* | `backend-deploy.yml` |
| `VITE_API_URL` | `https://api.effmemberportal.org` | `frontend-deploy.yml` & `android-capacitor-build.yml` |
| `VITE_API_BASE_URL` | `https://api.effmemberportal.org/api/v1` | `frontend-deploy.yml` & `android-capacitor-build.yml` |
| `VITE_WS_URL` | `https://api.effmemberportal.org` | `frontend-deploy.yml` & `android-capacitor-build.yml` |
| `VITE_WS_PATH` | `/socket.io` | `frontend-deploy.yml` |
| `VITE_APP_NAME` | `EFF Membership Portal` | `frontend-deploy.yml` |

---

## 7. Dual-Database Rollout & CI Cutover Sequence

Matches the rollout requirements in [rbac-permission-matrix-menu-cleanup.md](file:///c:/Development/NewProj/Membership-newV2/rbac-permission-matrix-menu-cleanup.md) and [meeting-id-checkin-credentials.md](file:///c:/Development/NewProj/Membership-newV2/meeting-id-checkin-credentials.md):

1. **Stage 0 — Baseline & Server Discovery (Zero Risk):**
   - Confirm live VPS directory layout, active PM2 process name, PostgreSQL `pg_dump` access, and Node version on the VPS.
   - Generate CI-dedicated SSH deploy key and configure GitHub `production` Environment + Secrets/Vars.
2. **Stage 1 — CI Validation First (`ci.yml`):**
   - Implement `run-sql-migrations.ts` + add `"test": "vitest run"` + land `.github/workflows/ci.yml`.
   - Open PR to `main` and confirm green `repo-hygiene`, `backend-ci`, and `frontend-ci` runs before enabling deploy automation.
3. **Stage 2 — Migration Tracker Baseline (`001..050`):**
   - Run `run-sql-migrations.js baseline --through 050_...` against **local DB** first, then verify status against `.env.prod-db` (read-only status check + user-approved baseline insert so `schema_migrations` reflects existing production schema `001..050`).
4. **Stage 3 — RBAC (`051`) & SGO ID Scanner (`052`) Rollout Through Pipeline:**
   - Merge RBAC PR -> CI validates -> `production` approval clicked -> runner builds -> VPS runs `pg_dump` -> applies `051` -> swaps symlink & reloads PM2 -> health check passes -> frontend deploys.
   - Merge Meeting ID Scanner PR -> repeats exact automated sequence for `052` + PWA assets -> optionally trigger `android-capacitor-build.yml` to produce SGO Android APK.

---

## 8. Verification Plan

Before marking CI/CD complete, verify every layer:
1. **Workflow Lint:** Run static workflow validation (`actionlint` or YAML schema check) on all files in `.github/workflows/`.
2. **PR Gate Drill:** Push a test branch PR with a deliberate TypeScript error and confirm `ci.yml` fails fast and blocks merge; push fix and confirm green pass.
3. **Migration Runner Jest Unit Tests:** Test `run-sql-migrations.ts`:
   - `baseline` marks historical files without re-executing SQL.
   - `run` applies a new migration inside a transaction and rolls back atomically on syntax error without polluting `schema_migrations`.
   - Checksum mismatch on an already-applied migration aborts loudly before altering production schema.
4. **Build Output Verification:** Verify `frontend/dist` contains zero references to `localhost`, and `backend/dist/app.js` + `dist/scripts/run-sql-migrations.js` are packaged cleanly in `backend-release.tar.gz`.
5. **First Controlled Deploy & Rollback Drill:** Run `backend-deploy.yml` and `frontend-deploy.yml` manually via `workflow_dispatch` on `main`, inspect `/api/v1/health/detailed`, confirm `shared/backups/pre_<release>.dump` was created before migration, and test `workflow_dispatch` rollback to the previous release folder.

---

## 9. Open Confirmations Required Before Execution Starts

1. **Canonical VPS Paths & PM2 App Name:** On your live server today, which exact directories and PM2 process are running?
   - Backend dir: `/var/www/eff-membership-system/backend` vs `/var/www/api.effmemberportal.org/backend` vs `/opt/eff-membership/backend`?
   - Frontend dir: `/var/www/eff-membership-system/frontend/dist` (`nginx/effmemberportal.org.conf`) vs `/var/www/effmemberportal.org/html`?
   - PM2 process name: `eff-backend` vs `eff-api`?
2. **Production Database Wording:** Confirm that *"if you make changes to our database, do so with out production database also"* meant **"with our production database also"** — i.e., after testing migrations `051`/`052` locally, also back up and apply them cleanly to production (`.env.prod-db`)?
3. **Execution Order:** Should we implement in this sequence:
   1) Repo hygiene + `ci.yml` + `run-sql-migrations.ts` baseline (`ci-github-workflow-plan.md` Phase 1),
   2) **RBAC Access Control Matrix & Menu Clean-Up** (`051`),
   3) **SGO ID Scanning + PWA/Capacitor + Credentials** (`052`),
   4) Live Deploy Workflows (`backend-deploy.yml`, `frontend-deploy.yml`, `android-capacitor-build.yml`)?
4. **Capacitor Platforms:** Should the Capacitor mobile wrapper target **Android only** (`@capacitor/android`) for SGO tablets/phones, or **both Android and iOS** (`@capacitor/ios`)?
5. **Orphan Approver Roles:** Should `FINANCIAL_REVIEWER` and `MEMBERSHIP_APPROVER` (currently referenced in `frontend/src/hooks/usePermissions.ts` but absent from the live DB `roles` table) be formalized in migration `051` as selectable RBAC roles or retired in favor of the existing admin roles?

