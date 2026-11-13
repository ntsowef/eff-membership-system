# Plan: Role-Based Access Control (RBAC) Matrix & Menu Presentation Clean-Up

> **Status:** Draft Plan (Awaiting User Approval — No Code or DB Changes Executed)  
> **Access Rule:** **National Admin Only** may view, edit, or reset this Access Control & Menu Presentation Matrix  
> **Companion Plan:** Aligns with [meeting-id-checkin-credentials.md](file:///c:/Development/NewProj/Membership-newV2/meeting-id-checkin-credentials.md) (`SGO_SUPPORT_STAFF` strict sandbox isolation)

---

## 1. Current System Audit: Why Clean-Up Is Needed

Inspecting the live database (`roles`, `permissions`, `role_permissions`) and codebase revealed **four disconnected permission layers** causing inconsistent menu visibility and weak backend enforcement:

1. **Database `role_permissions` Is Almost Empty:**
   - The `permissions` table contains 28 rows (`MEMBERS_READ`, `APPLICATIONS_APPROVE`, `ROLES_MANAGE`, `SYSTEM_CONFIGURE`, etc.), yet `role_permissions` currently has **`0` mappings** for `SUPER_ADMIN`, `DISTRICT_ADMIN`, `MUNICIPAL_ADMIN`, `WARD_ADMIN`, `MEMBER`, and `GUEST`, **`5`** for `NATIONAL_ADMIN`, and **`3`** for `PROVINCIAL_ADMIN`.
2. **Backend `requirePermission(...)` Is Currently a No-Op Bypass:**
   - In [auth.ts](file:///c:/Development/NewProj/Membership-newV2/backend/src/middleware/auth.ts#L1101-L1137), `requirePermission()` logs `"GRANTED (simplified)"` and calls `next()` for **every authenticated user**, regardless of role.
3. **Frontend Hardcodes Different Permission Logic in 4 Places:**
   - [Sidebar.tsx](file:///c:/Development/NewProj/Membership-newV2/frontend/src/components/layout/Sidebar.tsx) & [HorizontalNav.tsx](file:///c:/Development/NewProj/Membership-newV2/frontend/src/components/layout/HorizontalNav.tsx) use `menuItems` with coarse `adminLevels` flags—leaving sensitive submenus (`All Members`, `Add Member`, `Bulk Upload`, `Digital Membership Cards`, `Expiration Management`, `Schedule Meeting`, `Member Audit`, `Reports`) visible to every admin tier (even `WARD_ADMIN` / `MUNICIPAL_ADMIN`).
   - [usePermissions.ts](file:///c:/Development/NewProj/Membership-newV2/frontend/src/hooks/usePermissions.ts) defines dot-style keys (`members.view`) and references `financial_reviewer` / `membership_approver`, which do not even exist in PostgreSQL `roles`.
   - [useRolePermissions.ts](file:///c:/Development/NewProj/Membership-newV2/frontend/src/hooks/useRolePermissions.ts) defines boolean helper flags (`canAccessSMS`, `canAccessWardAudit`, etc.).
   - [store/index.ts](file:///c:/Development/NewProj/Membership-newV2/frontend/src/store/index.ts) defines its own `hasPermission()` heuristics (`statistics`/`analytics` <= district).
4. **Route Guards Have Missing Coverage & Dead Redirects:**
   - [ProtectedRoute.tsx](file:///c:/Development/NewProj/Membership-newV2/frontend/src/components/auth/ProtectedRoute.tsx#L152) redirects denied users to `/dashboard` (which should be `/admin/dashboard` or role landing route), and many routes in [AppRoutes.tsx](file:///c:/Development/NewProj/Membership-newV2/frontend/src/routes/AppRoutes.tsx) do not require route-level permission keys.

---

## 2. Target Architecture: Single Source of Truth

Unify **"Who Sees What" (Menu Presentation)** and **"Who Is Authorized To Do What" (Backend + Action Permissions)** into PostgreSQL, managed exclusively by National Admin via a visual Matrix Console:

```text
PostgreSQL (system_menus, role_menu_access, permissions, role_permissions, roles)
        │
        ├──► Backend Redis / In-Memory Cache (invalidated live on Matrix Save)
        │       ├── Enforces every API endpoint via real DB-backed requirePermission(...)
        │       └── Returns { visible_menus[], effective_permissions[], default_route } on /auth/login & /access-control/my-access
        │
        └──► Frontend Single Permission Resolver (useAuth + AccessControlContext)
                ├── Sidebar.tsx & HorizontalNav.tsx filter strictly by visible_menus[]
                ├── ProtectedRoute.tsx enforces route access & menu key checks
                └── Page action buttons (Create / Edit / Delete / Export / Approve) check effective_permissions[]
```

---

## 3. Database Design (`backend/migrations/052_rbac_access_matrix_and_menus.sql`)

### 3.1 New & Extended Tables
1. **`system_menus` (Canonical Registry of All UI Menus & Routes):**
   - `menu_id SERIAL PRIMARY KEY`
   - `menu_key VARCHAR(100) NOT NULL UNIQUE` (matches `MenuItem.id` in [Sidebar.tsx](file:///c:/Development/NewProj/Membership-newV2/frontend/src/components/layout/Sidebar.tsx), e.g., `'dashboard'`, `'members-list'`, `'members-bulk-upload'`, `'financial-dashboard'`, `'access-control-matrix'`, `'sgo-id-scan'`)
   - `parent_key VARCHAR(100) NULL` (tree grouping matching `Sidebar.tsx` / `HorizontalNav.tsx` groups: Dashboards, Membership, Search, Leadership & Meetings, Communication, Finance, Analytics, Audit & Compliance, Administration, Profile)
   - `label VARCHAR(150) NOT NULL`
   - `route_path VARCHAR(255) NULL`
   - `module_group VARCHAR(80) NOT NULL`
   - `display_order INTEGER NOT NULL DEFAULT 0`
   - `is_national_only BOOLEAN NOT NULL DEFAULT FALSE` (hard guardrail flag for Matrix itself / System / Deceased Purge)
   - `is_sgo_exclusive BOOLEAN NOT NULL DEFAULT FALSE` (locks `/sgo/id-scan` to `SGO_SUPPORT_STAFF`)
   - `is_active BOOLEAN NOT NULL DEFAULT TRUE`
2. **`role_menu_access` ("Who Sees What" Join Table):**
   - `id SERIAL PRIMARY KEY`
   - `role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE`
   - `menu_id INTEGER NOT NULL REFERENCES system_menus(menu_id) ON DELETE CASCADE`
   - `can_view BOOLEAN NOT NULL DEFAULT TRUE`
   - `updated_by INTEGER NULL REFERENCES users(user_id) ON DELETE SET NULL`
   - `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
   - `UNIQUE (role_id, menu_id)`
3. **`roles` Enhancements:**
   - Add `default_landing_route VARCHAR(255) DEFAULT '/admin/dashboard'` (e.g., `/admin/super-admin/dashboard` for `SUPER_ADMIN`, `/admin/dashboard` for Regional/Provincial/National Admins, `/sgo/id-scan` for `SGO_SUPPORT_STAFF`).
   - Add `is_system_locked BOOLEAN DEFAULT FALSE` (protects core metadata rows while allowing permission edits, except hard-locked security guardrails).
   - Clean up role consistency: decide whether to formalize `FINANCIAL_REVIEWER` / `MEMBERSHIP_APPROVER` roles in `roles` or remove unused legacy references in [usePermissions.ts](file:///c:/Development/NewProj/Membership-newV2/frontend/src/hooks/usePermissions.ts).
4. **`permissions` Standardization & Expansion:**
   - Retain existing `permission_code` rows (avoiding breaking FK/IDs) and seed missing resource × action permissions so **every UI module and API group has granular control**, e.g.:
     - Meetings & Check-In: `MEETINGS_VIEW`, `MEETINGS_CREATE`, `MEETINGS_EDIT`, `MEETINGS_DELETE`, `MEETINGS_INVITE`, `MEETINGS_CREDENTIALS_VIEW`, `MEETINGS_APOLOGIES_MANAGE`, `MEETINGS_CREDENTIALS_EXPORT`, `MEETING_ID_SCAN`
     - Members & Cards: `MEMBERS_BULK_UPLOAD`, `MEMBERS_EXPIRATION_MANAGE`, `DIGITAL_CARDS_VIEW`, `DIGITAL_CARDS_GENERATE`
     - LGE2026 & Ward Audit: `WARD_AUDIT_VIEW`, `WARD_AUDIT_MANAGE`, `LGE2026_CANDIDATES_VIEW`, `LGE2026_CANDIDATES_MANAGE`, `DELEGATES_MANAGE`, `SRPA_CONFIGURE`
     - Admin & Matrix: `ADMIN_MANAGEMENT`, `DECEASED_PURGE`, `MFA_EMERGENCY_ACCESS`, `ACCESS_MATRIX_VIEW`, `ACCESS_MATRIX_MANAGE`
     - Communication: `WHATSAPP_MANAGE`, `SMS_CREDITS_VIEW`
     - Analytics / BI / Financial: `FINANCIAL_DASHBOARD_VIEW`, `FINANCIAL_TRANSACTIONS_VIEW`, `BI_ANALYTICS_VIEW`, `REPORTS_VIEW`, `AUDIT_REPORTS_VIEW`
5. **`access_control_audit_log`:**
   - `audit_id SERIAL PRIMARY KEY`, `actor_user_id INTEGER NOT NULL REFERENCES users(user_id)`, `target_role_id INTEGER REFERENCES roles(role_id)`, `change_type VARCHAR(40)` (`'MENU_UPDATE' | 'PERMISSION_UPDATE' | 'ROLE_CREATE' | 'RESET_DEFAULTS'`), `diff_payload JSONB NOT NULL`, `reason TEXT NULL`, `ip_address VARCHAR(64) NULL`, `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`.

---

## 4. Recommended Baseline Clean-Up Matrix (Seeded Starting State)

National Admin starts with a clean, least-privilege baseline across all roles and can adjust any cell afterward (subject only to safety locks on SGO sandbox and National Admin self-lockout):

| Menu / Capability Group | National Admin (`NATIONAL_ADMIN`) | Provincial Admin (`PROVINCIAL_ADMIN`) | District Admin (`DISTRICT_ADMIN`) | Municipal Admin (`MUNICIPAL_ADMIN`) | Ward Admin (`WARD_ADMIN`) | SGO Support Staff (`SGO_SUPPORT_STAFF`) |
|---|---|---|---|---|---|---|
| **Dashboards** (Standard / Hierarchical) | Full | Province-Scoped | District Summary | Municipality Summary | Ward Summary | Blocked (`403`) |
| **Access Control & Menu Matrix** | **Full (Exclusive Owner)** | Hidden / `403` | Hidden / `403` | Hidden / `403` | Hidden / `403` | Blocked (`403`) |
| **User & Admin Management / MFA / Deceased Purge / System** | Full | Province User Mgmt only | Hidden / `403` | Hidden / `403` | Hidden / `403` | Blocked (`403`) |
| **Members: View / Search / Add** | All | Province-Scoped | District-Scoped | Municipality-Scoped | Ward-Scoped (View/Add) | Blocked (`403`) |
| **Members: Bulk Upload / Delete / Bulk Export** | Full | Province Approve/Export | Hidden / View-Only | Hidden | Hidden | Blocked (`403`) |
| **Digital Membership Cards / Renewals / Applications Review** | Full | Province Cards View | Read-Only Card Lookup | Read-Only Card Lookup | Card Status View | Blocked (`403`) |
| **Financial Dashboard & Transactions** | Full | Hidden *(or toggleable)* | Hidden / `403` | Hidden / `403` | Hidden / `403` | Blocked (`403`) |
| **Leadership Management** | Full | Province-Scoped | View-Only | Hidden | Hidden | Blocked (`403`) |
| **Meetings: Schedule / Invite / Edit / Delete** | Full | Province/Lower Meetings | District/Lower Meetings | Municipal/Ward Meetings | Branch Meetings Only | Blocked (`403`) |
| **Meetings: Credentials Dashboard / Apologies / PDF Export** | Full | Province & Lower Meetings | District Meetings | Municipal Meetings | Branch Meetings | Blocked (`403`) |
| **Physical Meeting Door ID Scanner (`/sgo/id-scan`)** | Blocked *(SGO Exclusive)* | Blocked | Blocked | Blocked | Blocked | **ONLY Feature Allowed** |
| **SMS / WhatsApp / Credits** | Full | Hidden (configurable) | Hidden | Hidden | Hidden | Blocked (`403`) |
| **Ward Audit / LGE2026 / Delegates / Member Audit** | Full | Province-Scoped | View Region Audit | View Municipal/Ward | Ward Compliance View | Blocked (`403`) |
| **Analytics & Business Intelligence** | Full BI + Reports | Province Analytics | Summary Charts | Summary Charts | Basic Ward Counts | Blocked (`403`) |

---

## 5. Backend Implementation Plan

### 5.1 Real DB-Backed RBAC Service (`backend/src/services/accessControlService.ts`)
1. `getRoleEffectiveAccess(roleId)`:
   - Queries `role_menu_access JOIN system_menus` and `role_permissions JOIN permissions` (+ `roles.default_landing_route`).
   - Caches normalized `{ visible_menus: string[], permission_codes: string[], default_route: string }` in Redis (`rbac:role:${roleId}`, TTL 5 min) with immediate cache invalidation whenever National Admin updates the matrix.
2. `getFullMatrix()` / `updateRoleMatrix(roleId, updates, actorUser, reason, req)`:
   - Runs inside a database transaction (`executeTransaction`):
     - Updates `role_menu_access` (`can_view`) and `role_permissions`.
     - **Hard Safety Guardrails (Non-Bypassable):**
       1. Prevents removing `ACCESS_MATRIX_VIEW`, `ACCESS_MATRIX_MANAGE`, or `'access-control-matrix'` menu from `NATIONAL_ADMIN` (prevents National Admin from locking themselves out).
       2. Enforces `SGO_SUPPORT_STAFF` exclusive rules (`MEETING_ID_SCAN` / `/sgo/id-scan` cannot be granted to non-SGO roles; non-scanner admin menus/permissions cannot be granted to `SGO_SUPPORT_STAFF` unless explicitly unlocked later).
     - Writes `access_control_audit_log` entry, clears Redis cache, and emits Socket.IO event `access_matrix_updated` so active sessions refresh permissions seamlessly.
3. `resetRoleToDefaults(roleId, actorUser, reason)`: Restores recommended baseline cleanly.

### 5.2 Upgrade Middleware & Route Protection
1. **Replace Simplified `requirePermission(...)` in [auth.ts](file:///c:/Development/NewProj/Membership-newV2/backend/src/middleware/auth.ts#L1101):**
   - Look up `AccessControlService.hasPermission(req.user.role_id, permissionCode)` cleanly (zero hardcoded `"GRANTED (simplified)"`!).
   - Keep `NODE_ENV === 'development'` bypass **disabled for RBAC matrix tests** or configurable via explicit `ENFORCE_RBAC_IN_DEV=true` flag so RBAC restrictions can be tested accurately in local dev as well as production!
2. **Harden `requireNationalAdminOnly()` in [auth.ts](file:///c:/Development/NewProj/Membership-newV2/backend/src/middleware/auth.ts#L1440):**
   - Verify `req.user.admin_level === 'national' && req.user.role_name !== 'SGO_SUPPORT_STAFF'` (explicitly allowing `NATIONAL_ADMIN` / `SUPER_ADMIN` National tier and denying Provincial/District/Municipal/Ward/Member/SGO Support with `403`).
3. **Audit & Apply `requirePermission(...)` Across Backend Route Files:**
   - Map all route files (`members.ts`, `membershipApplications.ts`, `membershipRenewal.ts`, `unifiedFinancialDashboard.ts`, `financialTransactionQuery.ts`, `meetings.ts`, `hierarchicalMeetings.ts`, `leadership.ts`, `smsManagement.ts`, `whatsappBot.ts`, `wardAudit.ts`, `lge2026.ts`, `delegatesManagement.ts`, `analytics.ts`, `reports.ts`, `adminManagement.ts`, `deceasedPurge.ts`) to their exact canonical `permission_code`.
4. **Update Login / Refresh / Profile Payloads ([auth.ts](file:///c:/Development/NewProj/Membership-newV2/backend/src/middleware/auth.ts#L609-L632)):**
   - Include `visible_menus`, `effective_permissions`, and `default_route` in login response and add `GET /api/v1/access-control/my-access` so active clients reload cleanly after any edit.

### 5.3 National-Admin-Only REST Endpoints (`backend/src/routes/accessControl.ts`)
Mounted at `/api/v1/access-control`:
- `GET /my-access` (`authenticate` — returns caller's own `visible_menus`, `effective_permissions`, `default_route`)
- **Below endpoints protected strictly by `authenticate` + `requireNationalAdminOnly()`:**
  - `GET /matrix` -> Full roles list, menu tree, grouped permissions, current `role_menu_access` + `role_permissions` state
  - `PUT /matrix/roles/:roleId` -> Save menu visibility & permission toggles + `reason` (Joi validated)
  - `POST /roles` -> Optionally create a new custom role (cloning permissions from a template role)
  - `POST /matrix/roles/:roleId/reset-defaults` -> Reset a role back to recommended baseline
  - `GET /audit-log` -> Paginated history of matrix changes

---

## 6. Frontend Implementation Plan

### 6.1 Consolidate Store, Hooks, Navigation & Route Guards
1. **Update Zustand Auth Store ([store/index.ts](file:///c:/Development/NewProj/Membership-newV2/frontend/src/store/index.ts)) & [useAuthInit.ts](file:///c:/Development/NewProj/Membership-newV2/frontend/src/hooks/useAuthInit.ts):**
   - Persist & refresh `visibleMenus: string[]`, `effectivePermissions: string[]`, `defaultRoute: string`.
   - Replace hardcoded `hasPermission()` heuristics with real `effectivePermissions.includes(code)` + add `canViewMenu(menuKey)`.
   - Listen to Socket.IO `access_matrix_updated` for current `role_id` -> automatically re-fetch `/access-control/my-access` without forcing logouts!
2. **Unify [usePermissions.ts](file:///c:/Development/NewProj/Membership-newV2/frontend/src/hooks/usePermissions.ts) & [useRolePermissions.ts](file:///c:/Development/NewProj/Membership-newV2/frontend/src/hooks/useRolePermissions.ts):**
   - Delegate to the single source of truth from `useAuth()` / `/access-control/my-access`, eliminating duplicate hardcoded role booleans while maintaining backward-compatible helper signatures for existing components.
3. **Clean Up [Sidebar.tsx](file:///c:/Development/NewProj/Membership-newV2/frontend/src/components/layout/Sidebar.tsx) & [HorizontalNav.tsx](file:///c:/Development/NewProj/Membership-newV2/frontend/src/components/layout/HorizontalNav.tsx):**
   - Update `getVisibleMenuItems(...)` so every leaf & parent menu item resolves directly against `user.visible_menus` (`item.id`), keeping menus 100% synchronized with what National Admin configured in the matrix.
   - Add **`Access Control Matrix`** menu item under **Administration** (`id: 'access-control-matrix'`, `path: '/admin/access-control'`), flagged `is_national_only: true`.
4. **Harden [ProtectedRoute.tsx](file:///c:/Development/NewProj/Membership-newV2/frontend/src/components/auth/ProtectedRoute.tsx) & [AppRoutes.tsx](file:///c:/Development/NewProj/Membership-newV2/frontend/src/routes/AppRoutes.tsx):**
   - Fix dead `/dashboard` buttons -> route to `user.defaultRoute || '/admin/dashboard'`.
   - Add `requireMenuKey` & canonical `requirePermission` props on every route in [AppRoutes.tsx](file:///c:/Development/NewProj/Membership-newV2/frontend/src/routes/AppRoutes.tsx), plus `requireAdminLevel="national"` on `/admin/access-control`.

### 6.2 National-Admin-Only Matrix Console (`frontend/src/pages/admin/AccessControlMatrixPage.tsx`)
Designed strictly within **EFF brand palette (Crimson `#D32F2F`, Obsidian Black `#111827`, Emerald `#15803D`, Amber `#B45309`, Slate — ZERO purple/violet/indigo)** using MUI v5 components (`DataGrid`/sticky matrix table, Chips, Switches, Drawers):

- **Header Bar:** Role Filter pills, **"Copy Settings From Role"** action, **"Reset Selected Role to Clean Defaults"**, and live unsaved diff badge + **"Publish Matrix Changes"** CTA (opens confirmation dialog with Change Summary + required optional Audit Note).
- **Tab 1 — Menu Presentation Matrix ("Who Sees What"):**
  - Collapsible module groups (`Dashboards`, `Membership`, `Search & Lookup`, `Leadership & Meetings`, `Communication`, `Finance`, `Analytics & BI`, `Audit & Compliance`, `Administration`, `SGO Door Check-In`).
  - Rows show Menu Label, Route Path, and Guardrail Lock badges (`National Only`, `SGO Locked`).
  - Columns show each active Role with per-cell switches + module-level "Toggle All in Group" checkbox + live count indicator (`e.g. 12 / 46 menus visible`).
- **Tab 2 — Action & Authorization Matrix ("Who Can Do What"):**
  - Resource-grouped permission switches (`VIEW`, `CREATE`, `EDIT`, `DELETE`, `APPROVE`, `EXPORT`, `CONFIGURE`, `SCAN`) mapping cleanly to backend API protection, with quick presets (`Read Only`, `Full Manage`, `Clear All`).
- **Tab 3 — Live Role Preview ("Simulate User Experience"):**
  - Split preview showing: **Left:** exact Sidebar/HorizontalNav tree rendered for the chosen role, **Middle:** allowed landing route & action buttons summary, **Right:** blocked routes list — letting National Admin verify cleanup visually *before* publishing!
- **Tab 4 — Audit Trail & Compliance:**
  - Full log of every role/menu/permission modification (Actor Name, Target Role, Added/Removed Keys, Timestamp, IP, Note).

---

## 7. Dependencies & Operational Safety

- **No New NPM Packages Required:** Uses existing MUI v5 (`@mui/material`, `@mui/icons-material`), `@tanstack/react-query`, `zustand`, `joi`, `pg`, and `redisService`.
- **Zero Disruption Migration Rollout:**
  - Migration `052` pre-seeds recommended defaults in a single transaction so existing National/Provincial admins retain needed access on deploy while unintended menus are cleanly hidden from Ward/District/Municipal accounts.
  - Self-lockout protection guarantees National Admin can never remove their own `/admin/access-control` access.
  - Audit trail records every future permission change for governance & NEC accountability.

---

## 8. Implementation Phases & Verification Plan

- **Phase 1 — Database Schema & Seed Migration:**
  - Create & apply `backend/migrations/052_rbac_access_matrix_and_menus.sql` (`system_menus`, `role_menu_access`, expanded `permissions`, baseline `role_permissions`, `access_control_audit_log`).
- **Phase 2 — Backend Service, Middleware & Matrix API:**
  - Implement `AccessControlService` (Redis/memory cache + audit logging + guardrails).
  - Replace simplified `requirePermission` bypass in [auth.ts](file:///c:/Development/NewProj/Membership-newV2/backend/src/middleware/auth.ts), update login/`/my-access` responses, apply canonical permission checks across routes, and mount `/api/v1/access-control` guarded by `requireNationalAdminOnly()`.
- **Phase 3 — Frontend Unification & Matrix Management Console:**
  - Update [store/index.ts](file:///c:/Development/NewProj/Membership-newV2/frontend/src/store/index.ts), [usePermissions.ts](file:///c:/Development/NewProj/Membership-newV2/frontend/src/hooks/usePermissions.ts), [useRolePermissions.ts](file:///c:/Development/NewProj/Membership-newV2/frontend/src/hooks/useRolePermissions.ts), [Sidebar.tsx](file:///c:/Development/NewProj/Membership-newV2/frontend/src/components/layout/Sidebar.tsx), [HorizontalNav.tsx](file:///c:/Development/NewProj/Membership-newV2/frontend/src/components/layout/HorizontalNav.tsx), [ProtectedRoute.tsx](file:///c:/Development/NewProj/Membership-newV2/frontend/src/components/auth/ProtectedRoute.tsx), and [AppRoutes.tsx](file:///c:/Development/NewProj/Membership-newV2/frontend/src/routes/AppRoutes.tsx).
  - Build `AccessControlMatrixPage.tsx` (`/admin/access-control`).

### Verification Plan (Phase X)
- **Backend Jest Tests (`backend/src/services/__tests__/accessControlService.test.ts`):**
  - National Admin can fetch & update matrix, invalidate cache, reset defaults, and read audit logs.
  - Non-National roles (`PROVINCIAL_ADMIN`, `DISTRICT_ADMIN`, `MUNICIPAL_ADMIN`, `WARD_ADMIN`, `SGO_SUPPORT_STAFF`) receive **403 Forbidden** on `/api/v1/access-control/matrix` (`GET`/`PUT`/`POST`).
  - Real `requirePermission()` enforcement returns `403` when a permission toggle is disabled for a role and `200` immediately after National Admin enables it.
  - Self-lockout & SGO sandbox guardrails reject invalid mutations cleanly.
- **Frontend Typecheck & Vitest (`npx tsc -b --noEmit`, `npx vitest run`):**
  - `Sidebar` / `HorizontalNav` render only `visible_menus` returned for the active role.
  - `ProtectedRoute` blocks unpermitted direct URL navigation and restricts `/admin/access-control` strictly to National Admin.
  - `AccessControlMatrixPage` toggles menus/permissions, displays diff summary, previews role navigation, and saves with audit note.

---

## 9. Dual-Environment Database Rollout (Local + Production Parity)

Per production parity requirement, `backend/migrations/052_rbac_access_matrix_and_menus.sql` will be rolled out cleanly to **both** local PostgreSQL (`backend/.env`) and production PostgreSQL (`.env.prod-db` using `PROD_DB_*`):

1. **100% Additive & Idempotent Migration:** Uses `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, and `ON CONFLICT DO NOTHING` (never overwriting customized permissions or dropping active roles/tables).
2. **Pre-Migration Production Snapshot & Inspection:** Inspect production `roles`, `permissions`, `role_permissions`, and `users` constraints before applying, and export a pre-migration backup snapshot of existing production `roles` + `role_permissions` rows.
3. **Transactional Dual Execution (`backend/scripts/applyMigrationDual.ts`):**
   - Apply and test `052_rbac_access_matrix_and_menus.sql` on local DB first (`BEGIN ... COMMIT`).
   - Apply transactionally to production DB via `.env.prod-db`.
   - Verify schema + baseline row parity across local and production DBs so deployed backend code and live database stay 100% synchronized.


