# Plan: Physical Leadership Meeting ID Scanning & Secretary Credentials System (PWA + Capacitor · SGO-Exclusive ID Scanner)

> **Status:** Draft Plan v3 (Amended for Exclusive SG Office Support Staff Access — Awaiting User Approval, No Code Executed)  
> **Scope:** CCT, PCT, War Council, Assembly, and Hierarchical Leadership Physical Meetings  
> **Target Stack:** PostgreSQL · Express/TypeScript · React/MUI v5 + TypeScript · Vite PWA · Capacitor (`@capacitor/core` + `@capacitor-mlkit/barcode-scanning`) · Socket.IO · `@zxing/browser` · `jsPDF` + `jspdf-autotable`

---

## 1. Overview & Strict Role-Boundary Architecture

On meeting day for physical Leadership meetings (e.g., Central Command Team [CCT], Provincial Command Team [PCT], Regional, or Assembly meetings), attendance capture is separated into **two strictly scoped operational roles** across both the PWA and Capacitor mobile wrapper:

1. **ID Scan Check-In (Door Registration) — EXCLUSIVELY Secretary General's Office Support Staff (`SGO_SUPPORT_STAFF`):**
   - **Single-Feature Lockdown:** Support staff users from the Secretary General's Office (`SGO_SUPPORT_STAFF`) have **access ONLY to the Meeting ID Check-In Scanner workspace (`/sgo/id-scan`)** and zero access to any other portal module (no Dashboard, Members directory/edit, Applications, Finance, SMS, Leadership management, Users, Audit logs, Meeting Create/Edit/Delete, or Bulk Exports).
   - **Exclusive Ownership of Scanning:** **Only `SGO_SUPPORT_STAFF`** may open the Camera ID Scanner or call ID check-in/walk-in/offline-manifest API endpoints. Ward, Municipal, District, Provincial, and general National administrators are blocked from scanning endpoints and do not see ID scanning controls.
2. **Secretary / Leadership Credentials Oversight — Authorized Meeting Admins (`MeetingAttendancePage`):**
   - Views real-time Credentials Dashboard updates via Socket.IO (Quorum %, Present, Late, Apologies/`Excused`, Absent, Walk-Ins/Observers, Structure breakdown), records Secretary/Pre-meeting Apologies (`Excused`), finalizes Absent registers, and exports **Official Credentials Report PDF / CSV**. *(Cannot launch the live Door ID Scanner.)*

### Confirmed Functional & Platform Decisions
- **Scanning Engine (Capacitor Native + Web PWA Hybrid):** Native **`@capacitor-mlkit/barcode-scanning`** (hardware autofocus, torch/flashlight toggle, zoom, haptic feedback for SA Smart ID PDF417, SA Green ID Book Code 39, EFF Digital Card QR), with `BarcodeDetector` + `@zxing/browser` fallback for desktop/browser PWA and emergency manual 13-digit SA ID entry.
- **Invite Matching & Walk-Ins:** Matches `meeting_invitations` first; if not invited, verifies active membership & leadership roles (`members_consolidated` + `vw_leadership_hierarchy`) and prompts SGO Support Staff to admit as **Walk-In**, **Observer** (non-voting), or **Co-opted** (optional voting rights + reason), or deny entry.
- **Auto-Late & Apologies:** Scans after `meeting_date + meeting_time + late_grace_minutes` (default `15` min) mark **`Late`**; earlier scans mark **`Present`**. Apologies (`Excused`) come from tokenized invite RSVP/Apology links or Secretary entry.

---

## 2. Critical Existing Issues & Security Traps Found During Audit

1. **Legacy MySQL Syntax in [meetings.ts](file:///c:/Development/NewProj/Membership-newV2/backend/src/models/meetings.ts):**
   - `recordAttendance`, `createAttendance`, `updateAttendance`, and `getMeetingAttendance` still use MySQL syntax (`ON DUPLICATE KEY UPDATE`, `VALUES(...)`, `recorder.id`, `ma.id`, `WHERE id = ?`) against PostgreSQL (`users.user_id`, `meeting_attendance.attendance_id`).
2. **Hardcoded Zeros in [meetingInvitationService.ts](file:///c:/Development/NewProj/Membership-newV2/backend/src/services/meetingInvitationService.ts):**
   - `getMeetingAttendance` ignores `meeting_attendance` and returns hardcoded `present: 0, absent: 0, excused: 0, late: 0`.
3. **CRITICAL RBAC & Middleware Trap in Existing Codebase:**
   - [auth.ts](file:///c:/Development/NewProj/Membership-newV2/backend/src/middleware/auth.ts#L1101-L1137): `requirePermission(...)` currently logs `"GRANTED (simplified)"` and lets **all authenticated users through**!
   - [auth.ts](file:///c:/Development/NewProj/Membership-newV2/backend/src/middleware/auth.ts#L304-L320): `authorize(...)` auto-bypasses **anyone with `admin_level === 'national'` or `role_name === 'super_admin'`**!
   - [usePermissions.ts](file:///c:/Development/NewProj/Membership-newV2/frontend/src/hooks/usePermissions.ts#L95-L106) and [Sidebar.tsx](file:///c:/Development/NewProj/Membership-newV2/frontend/src/components/layout/Sidebar.tsx#L518-L536): `admin_level === 'national'` grants **ALL portal permissions** everywhere!
   - **Fix Required:** Introduce a distinct `admin_level = 'sgo_support'` (NEVER `'national'`) in `users_admin_level_check` + strict `requireSgoSupportStaffOnly()` middleware (zero bypass) + global `denySgoSupportStaff()` guard blocking `SGO_SUPPORT_STAFF` from every non-scanner route.
4. **Capacitor WebView BaseURL & CORS Gaps:**
   - [frontend/src/lib/api.ts](file:///c:/Development/NewProj/Membership-newV2/frontend/src/lib/api.ts) hardcodes `baseURL: '/api/v1'`. Inside Capacitor (`https://localhost` / `capacitor://localhost`), it must resolve to `VITE_API_BASE_URL` (already set in [frontend/.env.production](file:///c:/Development/NewProj/Membership-newV2/frontend/.env.production)), and [config.ts](file:///c:/Development/NewProj/Membership-newV2/backend/src/config/config.ts) / [websocketService.ts](file:///c:/Development/NewProj/Membership-newV2/backend/src/services/websocketService.ts) must whitelist Capacitor origins.

---

## 3. Database Design (`backend/migrations/051_meeting_id_checkin_and_credentials.sql`)

### 3.1 Exclusive Role, Admin Level & Permission Isolation
1. **Insert Dedicated Role into `roles`:**
   - `role_name = 'Secretary General Office Support Staff'`
   - `role_code = 'SGO_SUPPORT_STAFF'`
   - `description = 'Secretary General Office check-in staff restricted strictly to Physical Meeting ID Scanning'`
2. **Alter `users` Constraint (`users_admin_level_check`):**
   - Expand `CHECK (admin_level IN ('national', 'province', 'district', 'municipality', 'ward', 'sgo_support'))` so SG Office Support Staff accounts use `admin_level = 'sgo_support'` and never trigger any `'national'` privilege bypass.
3. **Seed `permissions` & `role_permissions`:**
   - Insert `permission_code = 'MEETING_ID_SCAN'` (`resource = 'meeting_checkin'`, `action = 'scan'`) mapped strictly to `SGO_SUPPORT_STAFF`.

### 3.2 Meeting Check-In & Credentials Schema Extensions
- **`meetings` extensions:** `late_grace_minutes INTEGER DEFAULT 15`, `allow_walk_ins BOOLEAN DEFAULT TRUE`, `check_in_opened_at TIMESTAMP NULL`, `credentials_closed_at TIMESTAMP NULL`, `credentials_closed_by INTEGER NULL REFERENCES users(user_id)`.
- **`meeting_invitations` extensions:** `rsvp_token VARCHAR(128) NULL UNIQUE`, `rsvp_token_expires_at TIMESTAMP NULL`, `role_in_meeting VARCHAR(150) NULL`, `structure_name VARCHAR(200) NULL`, `voting_rights BOOLEAN NOT NULL DEFAULT TRUE`, plus unique index `(meeting_id, invitee_type, invitee_id) WHERE invitee_id IS NOT NULL` and `idx_meeting_invitations_rsvp_token`.
- **`meeting_attendance` extensions** (preserving existing `('Present', 'Absent', 'Excused', 'Late')` check & `UNIQUE (meeting_id, member_id)`):
  - `invitation_id INTEGER NULL REFERENCES meeting_invitations(invitation_id) ON DELETE SET NULL`
  - `attendance_type VARCHAR(20) NOT NULL DEFAULT 'Required'` (`CHECK IN ('Required', 'Optional', 'Walk-In', 'Observer', 'Co-opted', 'Proxy')`)
  - `check_in_method VARCHAR(30) NOT NULL DEFAULT 'Manual'` (`CHECK IN ('SA_Smart_ID', 'SA_ID_Book', 'Digital_Card_QR', 'Manual_ID', 'Manual_Toggle')`)
  - `client_scan_uuid VARCHAR(64) NULL UNIQUE` (offline batch sync idempotency)
  - `scanned_identifier VARCHAR(64) NULL` (masked metadata only; never raw IDs/images)
  - `is_walk_in BOOLEAN NOT NULL DEFAULT FALSE`, `walk_in_approved_by INTEGER NULL REFERENCES users(user_id)`, `walk_in_reason TEXT NULL`
  - `apology_reason TEXT NULL`, `apology_submitted_at TIMESTAMP NULL`, `apology_source VARCHAR(20) NULL` (`'Secretary' | 'Self_RSVP'`)
  - `voting_rights BOOLEAN NOT NULL DEFAULT TRUE`, `role_snapshot VARCHAR(150) NULL`, `structure_snapshot VARCHAR(200) NULL`

---

## 4. Strict Backend Access Control & APIs

### 4.1 Hard Isolation Guards (`backend/src/middleware/auth.ts` + [app.ts](file:///c:/Development/NewProj/Membership-newV2/backend/src/app.ts))
1. **`requireSgoSupportStaffOnly()`:**
   - Verifies `req.user?.role_name === 'SGO_SUPPORT_STAFF'` (mapped from `roles.role_code` in JWT) AND `req.user?.admin_level === 'sgo_support'`.
   - Returns `403 Forbidden` for **every other user** (including Ward/Municipal/District/Province/National admins and general Super Admins) so **only SG Office Support Staff can run ID scans**.
2. **`denySgoSupportStaff()` (Global Sandbox Middleware in `app.ts`):**
   - Applied globally to all `/api/v1/*` routes **except** whitelist:
     - `/api/v1/auth/*`, `/api/v1/session/*` (login, logout, password change, current user profile check)
     - `/api/v1/sgo/*` (the SGO ID Scanner API surface)
   - Immediately rejects any `SGO_SUPPORT_STAFF` request to `/members`, `/applications`, `/renewals`, `/financial-*`, `/sms*`, `/analytics`, `/admin-management`, `/users`, `/leadership`, `/elections`, `/audit*`, `/reports`, or `/meetings` admin mutations with `403 Forbidden`.
3. **WebSocket Isolation ([websocketService.ts](file:///c:/Development/NewProj/Membership-newV2/backend/src/services/websocketService.ts)):**
   - Reject `SGO_SUPPORT_STAFF` from `subscribe_file_processing`, `subscribe_bulk_upload`, `subscribe_queue_updates`, etc. Allow only emitting/listening on their assigned door-check-in update confirmation channel if needed.
4. **Admin Provisioning Support ([adminManagement.ts](file:///c:/Development/NewProj/Membership-newV2/backend/src/routes/adminManagement.ts) & [userManagementService.ts](file:///c:/Development/NewProj/Membership-newV2/backend/src/services/userManagementService.ts)):**
   - Update Joi & TypeScript `admin_level` validation to permit `'sgo_support'` so Super/National Admins can provision Secretary General's Office Support Staff accounts cleanly.

### 4.2 REST Endpoints Split by Role Scope

| Route Group & Path | Allowed Role(s) | Purpose |
|---|---|---|
| **ID Scanning (SGO Exclusive Namespace)** | | |
| `GET /api/v1/sgo/meetings` | **`SGO_SUPPORT_STAFF` ONLY** | Minimal active/today physical meetings list (`meeting_id`, `meeting_title`, `hierarchy_level`, `entity_name`, `meeting_date`, `meeting_time`, `location`, `allow_walk_ins`, counts) — no member lists returned |
| `GET /api/v1/sgo/meetings/:id/offline-manifest` | **`SGO_SUPPORT_STAFF` ONLY** | Minimal invitee cache (SHA-256 hashed SA ID numbers, `membership_number`, `name`, `role`, `structure`) for offline hall check-in |
| `POST /api/v1/sgo/meetings/:id/check-in/scan` | **`SGO_SUPPORT_STAFF` ONLY** | Verifies scanned Smart ID PDF417 / ID Book Code 39 / Digital Card QR (both [digitalMembershipCard.ts](file:///c:/Development/NewProj/Membership-newV2/backend/src/models/digitalMembershipCard.ts) & [optimizedDigitalCard.ts](file:///c:/Development/NewProj/Membership-newV2/backend/src/models/optimizedDigitalCard.ts)) against invites & `members_consolidated`; marks `Present`/`Late` or returns Walk-In prompt |
| `POST /api/v1/sgo/meetings/:id/check-in/batch-sync` | **`SGO_SUPPORT_STAFF` ONLY** | Replays offline-queued check-ins idempotently via `client_scan_uuid` |
| `GET /api/v1/sgo/meetings/:id/recent-scans` | **`SGO_SUPPORT_STAFF` ONLY** | Last ~20 door scans performed on this session/device for immediate visual verification (no full member roster or export) |
| **Secretary Credentials Dashboard (Meeting Admins)** | | |
| `GET /api/v1/meetings/:id/credentials` | Authorized Meeting Admins (non-SGO) | Full Quorum %, Present, Late, Apologies, Absent, Walk-Ins, Structure breakdown, and merged roster |
| `POST /api/v1/meetings/:id/apologies` | Authorized Meeting Admins (non-SGO) | Log Secretary apology (`Excused` + reason) |
| `PATCH /api/v1/meetings/:id/attendance/:memberId` | Authorized Meeting Admins (non-SGO) | Override `Present \| Late \| Excused \| Absent` or `voting_rights` |
| `POST /api/v1/meetings/:id/credentials/finalize-absent` | Authorized Meeting Admins (non-SGO) | Bulk-mark remaining unchecked invitees `Absent` & lock credentials register |
| `GET /api/v1/meetings/:id/credentials/export?format=csv\|pdf` | Authorized Meeting Admins (non-SGO) | Official Secretary Credentials Report CSV / PDF export |
| **Public Invitee Self-Service** | | |
| `GET /api/v1/meetings/rsvp/:token` & `POST /api/v1/meetings/rsvp/:token` | Public (token-scoped, rate-limited) | Invited members confirm attendance or submit pre-meeting Apology (`Excused`) |

### 4.3 Backend Fixes & `meetingCheckinService.ts`
- Fix [meetings.ts](file:///c:/Development/NewProj/Membership-newV2/backend/src/models/meetings.ts) MySQL -> PostgreSQL syntax.
- Fix [meetingInvitationService.ts](file:///c:/Development/NewProj/Membership-newV2/backend/src/services/meetingInvitationService.ts) & [meetingNotificationService.ts](file:///c:/Development/NewProj/Membership-newV2/backend/src/services/meetingNotificationService.ts) (join `membership_statuses`, use `firstname`/`surname`/`cell_number`, embed RSVP/Apology link).
- Implement `backend/src/services/meetingCheckinService.ts`: SA ID Luhn/DOB validation, Dual Digital Card QR verification, Invite vs Active Member + `vw_leadership_hierarchy` role resolution, UTC/SAST grace-period (`late_grace_minutes`) `Present` vs `Late` classification, duplicate-scan idempotency, Walk-In admission recording `walk_in_approved_by = sgo_user_id`, and `WebSocketService.emitMeetingCredentialsUpdate(meetingId, summary)`.

---

## 5. PWA + Capacitor Native Scanner & Single-Feature SGO App Shell

### 5.1 PWA & Capacitor Config (`frontend/`)
- **PWA (`vite-plugin-pwa` in [vite.config.ts](file:///c:/Development/NewProj/Membership-newV2/frontend/vite.config.ts) & [index.html](file:///c:/Development/NewProj/Membership-newV2/frontend/index.html)):**
  - `manifest.webmanifest` (`theme_color: '#D32F2F'`, `background_color: '#111827'`, `display: 'standalone'`), `viewport-fit=cover`, Workbox caching.
- **Capacitor (`frontend/capacitor.config.ts`):**
  - `appId: 'org.eff.membership.portal'`, `appName: 'EFF Portal'`, `webDir: 'dist'`, `server: { androidScheme: 'https', iosScheme: 'capacitor' }`.
  - Native permissions: Android `CAMERA`, `VIBRATE`, bundled ML Kit (`@capacitor-mlkit/barcode-scanning`); iOS `NSCameraUsageDescription`.
  - [frontend/src/lib/api.ts](file:///c:/Development/NewProj/Membership-newV2/frontend/src/lib/api.ts) uses `VITE_API_BASE_URL` / `VITE_WS_URL` automatically when `Capacitor.isNativePlatform()`.

### 5.2 Unified 3-Tier Camera Scanner (`useBarcodeScanner.ts` + `scanPayloadParser.ts`)
- **Tier 1 (Capacitor Mobile App):** `@capacitor-mlkit/barcode-scanning` (`Pdf417`, `Code39`, `Code128`, `QrCode`) + `@capacitor/haptics` + flashlight torch + zoom + 2.5s cooldown.
- **Tier 2 (Chrome / Edge PWA):** Chromium native `BarcodeDetector`.
- **Tier 3 (Safari / Firefox Web PWA):** `@zxing/browser` + `@zxing/library`.
- **Tier 4:** Compact manual 13-digit SA ID / Membership Number fallback inside scanner dialog.
- **Offline Venue Queue (`offlineCheckinQueue.ts`):** Uses `@capacitor/network` + SHA-256 hashed offline invite manifest so SGO Support Staff can continue scanning invited members if hall Wi-Fi drops and auto-sync on reconnect via `/check-in/batch-sync`.

### 5.3 Frontend Route & UI Lockdown (`SGO_SUPPORT_STAFF` Isolated Experience)
1. **Login Routing ([LoginPage.tsx](file:///c:/Development/NewProj/Membership-newV2/frontend/src/pages/auth/LoginPage.tsx)):**
   - When `user.role === 'SGO_SUPPORT_STAFF'` signs in (or already has an active session), immediately navigate to **`/sgo/id-scan`** (never `/admin/dashboard`).
2. **Route Sandbox ([AppRoutes.tsx](file:///c:/Development/NewProj/Membership-newV2/frontend/src/routes/AppRoutes.tsx) & [ProtectedRoute.tsx](file:///c:/Development/NewProj/Membership-newV2/frontend/src/components/auth/ProtectedRoute.tsx)):**
   - Add `requireRole="SGO_SUPPORT_STAFF"` guard on `/sgo/id-scan`.
   - Wrap `/admin/*` protected routes so if `user?.role === 'SGO_SUPPORT_STAFF'`, any direct URL navigation to `/admin/*` immediately redirects to `/sgo/id-scan` with zero flash of admin UI or API fetches.
   - Hide all [Sidebar.tsx](file:///c:/Development/NewProj/Membership-newV2/frontend/src/components/layout/Sidebar.tsx), [HorizontalNav.tsx](file:///c:/Development/NewProj/Membership-newV2/frontend/src/components/layout/HorizontalNav.tsx), and [usePermissions.ts](file:///c:/Development/NewProj/Membership-newV2/frontend/src/hooks/usePermissions.ts) admin privileges for `SGO_SUPPORT_STAFF`.
3. **Minimal Dedicated Workspace (`frontend/src/pages/sgo/SgoIdScannerWorkspace.tsx` + `IdCheckInScannerDialog.tsx`):**
   - Renders **outside `MainLayout`** in a clean, distraction-free **EFF SGO Check-In Shell** (Obsidian Black `#111827` & EFF Crimson `#D32F2F`, **zero purple/violet/indigo tones**, `>= 48px` mobile touch targets, `env(safe-area-inset-*)`):
     - Top bar: **EFF · Secretary General's Office · ID Check-In**, staff badge, connectivity indicator (`Online` / `Offline Queue (n)`), **Sign Out**.
     - Screen 1: **Active Physical Meetings Cards** (CCT / PCT / Assembly) -> `"Download Offline Pack"` + `"Open ID Scanner"`.
     - Screen 2: **Full-Screen Door Scanner** -> Smart ID PDF417 / Green ID Book / Digital Card QR viewfinder, bottom thumb-zone **Torch / Switch Camera / Manual ID**, live verification banner (`Present` green / `Late` amber / `Already Checked In` / `Walk-In Approval Bottom Sheet`), and compact `"Last 10 Door Scans"` confirmation strip (no member table, no export, no edits).
4. **Secretary Credentials Dashboard ([MeetingAttendancePage.tsx](file:///c:/Development/NewProj/Membership-newV2/frontend/src/pages/meetings/MeetingAttendancePage.tsx) & [MeetingDetailPage.tsx](file:///c:/Development/NewProj/Membership-newV2/frontend/src/pages/meetings/MeetingDetailPage.tsx)):**
   - Full live Quorum %, Present, Late, Apologies (`ApologyModal.tsx`), Absent, Walk-Ins, By Structure breakdown, Bulk Finalize Absent, and Official **Credentials PDF (`credentialsPdfExport.ts`) / CSV** export.
   - **No ID Scanner button on regular admin views or [CardVerification.tsx](file:///c:/Development/NewProj/Membership-newV2/frontend/src/components/cards/CardVerification.tsx)** — strictly enforcing that ID scanning lives solely in the `SGO_SUPPORT_STAFF` scanner workflow.

---

## 6. Dependencies & POPIA / Privacy Controls

- **Frontend Packages:** `vite-plugin-pwa` (dev), `@capacitor/core`, `@capacitor/cli` (dev), `@capacitor/android` (+ `@capacitor/ios` if selected), `@capacitor-mlkit/barcode-scanning`, `@capacitor/haptics`, `@capacitor/network`, `@capacitor/preferences`, `@zxing/browser`, `@zxing/library`.
- **Zero Photo Storage & Least Privilege:** No ID images are uploaded or saved; `SGO_SUPPORT_STAFF` tokens cannot browse member tables, financial data, or export member PII; offline manifest caches SHA-256 hashed SA IDs only.

---

## 7. Implementation Phases & Verification Plan

- **Phase 1 — Migration & Hardened RBAC + Backend APIs:**
  - `051_meeting_id_checkin_and_credentials.sql` (including `SGO_SUPPORT_STAFF` role, `users_admin_level_check` `'sgo_support'`, and `MEETING_ID_SCAN` permission).
  - Fix MySQL queries in [meetings.ts](file:///c:/Development/NewProj/Membership-newV2/backend/src/models/meetings.ts), [meetingInvitationService.ts](file:///c:/Development/NewProj/Membership-newV2/backend/src/services/meetingInvitationService.ts), [meetingNotificationService.ts](file:///c:/Development/NewProj/Membership-newV2/backend/src/services/meetingNotificationService.ts).
  - Add `requireSgoSupportStaffOnly()` & `denySgoSupportStaff()` in [auth.ts](file:///c:/Development/NewProj/Membership-newV2/backend/src/middleware/auth.ts) + [app.ts](file:///c:/Development/NewProj/Membership-newV2/backend/src/app.ts), update [adminManagement.ts](file:///c:/Development/NewProj/Membership-newV2/backend/src/routes/adminManagement.ts) & [userManagementService.ts](file:///c:/Development/NewProj/Membership-newV2/backend/src/services/userManagementService.ts), add `/api/v1/sgo/*` routes and Secretary `/credentials/*` + public `/rsvp/:token` routes.
- **Phase 2 — PWA + Capacitor Native Shell & Unified Scanner Hook:**
  - Configure Vite PWA, Capacitor (`capacitor.config.ts`, Android permissions/ML Kit), dynamic native API/WS URLs in [api.ts](file:///c:/Development/NewProj/Membership-newV2/frontend/src/lib/api.ts), `scanPayloadParser.ts`, `offlineCheckinQueue.ts`, and `useBarcodeScanner.ts`.
- **Phase 3 — Isolated SGO Scanner Workspace & Credentials Dashboard:**
  - Build `SgoIdScannerWorkspace.tsx`, `IdCheckInScannerDialog.tsx`, `ApologyModal.tsx`, `credentialsPdfExport.ts`, and `MeetingRsvpPage.tsx`.
  - Wire strict redirect & route isolation in [LoginPage.tsx](file:///c:/Development/NewProj/Membership-newV2/frontend/src/pages/auth/LoginPage.tsx), [ProtectedRoute.tsx](file:///c:/Development/NewProj/Membership-newV2/frontend/src/components/auth/ProtectedRoute.tsx), [AppRoutes.tsx](file:///c:/Development/NewProj/Membership-newV2/frontend/src/routes/AppRoutes.tsx), [Sidebar.tsx](file:///c:/Development/NewProj/Membership-newV2/frontend/src/components/layout/Sidebar.tsx), and [usePermissions.ts](file:///c:/Development/NewProj/Membership-newV2/frontend/src/hooks/usePermissions.ts).
  - Upgrade [MeetingAttendancePage.tsx](file:///c:/Development/NewProj/Membership-newV2/frontend/src/pages/meetings/MeetingAttendancePage.tsx) & [MeetingDetailPage.tsx](file:///c:/Development/NewProj/Membership-newV2/frontend/src/pages/meetings/MeetingDetailPage.tsx) (read-only credentials/apologies/reports without scanner access).

### Verification Plan (Phase X)
- **Backend Jest Tests (`backend/src/services/__tests__/meetingCheckinService.test.ts`):**
  - Positive & negative RBAC isolation tests:
    - `SGO_SUPPORT_STAFF` succeeds on `/api/v1/sgo/meetings/:id/check-in/scan` and gets **403** on `/api/v1/members`, `/api/v1/financial-dashboard`, `/api/v1/admin-management`, `/api/v1/meetings/:id/credentials/export`.
    - `WARD_ADMIN`, `PROVINCIAL_ADMIN`, `NATIONAL_ADMIN`, and `SUPER_ADMIN` get **403** on `/api/v1/sgo/meetings/:id/check-in/scan`.
  - ID parsing, Present/Late grace calculation, Walk-In confirmation, duplicate idempotency, offline batch sync, RSVP apology, and quorum math.
- **Frontend Vitest & TypeScript (`npx tsc -b --noEmit`, `npx vitest run`):**
  - `SGO_SUPPORT_STAFF` login redirect to `/sgo/id-scan`, redirect guard blocking `/admin/*`, scanner payload parsing, offline queue, and Secretary Credentials Dashboard & PDF export tests.
- **PWA + Capacitor Build:** `cd frontend && npm run build && npx cap sync android`.

---

## 8. Dual-Environment Database Rollout (Local + Production Parity)

Per production parity requirement, all schema changes in `backend/migrations/051_meeting_id_checkin_and_credentials.sql` will be applied cleanly to **both** the local database (`backend/.env`) and the production database (`.env.prod-db` using `PROD_DB_*`):

1. **Idempotent, Non-Destructive DDL Only:** All table/column/index/role/permission changes use `IF NOT EXISTS` and `ON CONFLICT DO NOTHING / DO UPDATE` with zero `DROP TABLE` or destructive row deletes.
2. **Pre-Flight Production Schema Check & Snapshot:** Before running on production, inspect live production `meetings`, `meeting_invitations`, `meeting_attendance`, `users`, and `roles` constraints (`information_schema.columns` / `pg_constraint`) and take a pre-migration snapshot of `roles`, `permissions`, and `role_permissions`.
3. **Transactional Dual Execution (`backend/scripts/applyMigrationDual.ts`):**
   - Run & verify locally first (`BEGIN ... COMMIT`, automatic rollback on error).
   - Once verified locally, execute the exact same migration transactionally against production via `.env.prod-db` (`PROD_DB_HOST`, `PROD_DB_PORT`, `PROD_DB_USER`, `PROD_DB_PASSWORD`, `PROD_DB_NAME`, `PROD_DB_SSL`).
   - Run automated post-migration parity comparison between local and production `information_schema.columns` & constraints to guarantee zero environment drift.

