# Provincial, Municipal, and Ward Hierarchical Meeting Auto-Invitations (`provincial-municipal-ward-invitations.md`)

## 1. Goal & Scope
Implement end-to-end automatic invitation targeting, previewing, creation, and re-sending for **Provincial**, **Municipal**, and **Ward / Branch** hierarchical meetings across backend services, API routes, and the frontend meeting creation flow.

### User-Confirmed Business Rules (Socratic Gate Cleared)
1. **Provincial Meetings (`pct_provincial`, `provincial_agm`, `pct_ordinary`, `pga`, `special_pga`, `ppa`, `provincial_elective`):**
   - Invite **all active Provincial Leadership of the selected province** (`la.appointment_status = 'Active'`, `lp.is_active = TRUE`: Provincial Executive / Top 6, PCT / Additional members, Provincial Youth & Women heads, and the Provincial CCT Deployee `CCT_<PROVINCE>` deployed to that province).
   - Invite **all active Municipal Chairpersons (`MCHAIR_*`) and Municipal Secretaries (`MSEC_*`) across all municipalities in that province** (excluding Municipal Deputies, Treasurers, and Additional members).
2. **Municipal Meetings (`srct_municipal`, `srct_ordinary`, `sub_regional`):**
   - Invite **all active Municipal Leadership of the selected municipality** (Municipal / Sub-Regional Executive + Municipal Additional / SRCT members, plus sub-regions when a parent metro is selected).
   - Invite **all active Ward Chairpersons (`WCHAIR_*` / Branch Chairpersons) and Ward Secretaries (`WSEC_*` / Branch Secretaries) across all wards in that municipality** (excluding Ward Deputies, Treasurers, and BCT additional members).
3. **Ward / Branch Meetings:**
   - **Ward BCT (`bct_branch`, `bct_ordinary`):** Invite **active Ward / Branch Leadership of the selected ward ONLY** (`Executive`, `BCT`, `Branch Leadership`).
   - **Ward BGA (`bga_branch`, `bga`), BPA (`bpa_branch`, `bpa`), and Branch General Meeting (`branch_general_meeting`, `branch_meeting`):** Invite **all Ward Members of the selected ward (`members_consolidated.ward_code`) + active Ward / Branch Leadership of that ward**, deduplicating by `member_id` so Ward Leaders retain their higher `invitation_priority` and leadership `role_in_meeting`.
4. **Active Leadership & Deduplication Rule:**
   - Include all appointees with `la.appointment_status = 'Active'` and `lp.is_active = TRUE` for the selected geographic entity (ignoring `members_consolidated.expiry_date` for active leaders).
   - Deduplicate by `member_id`, retaining the highest `invitation_priority` role.

---

## 2. Root Causes Identified
1. **`meeting_types` `type_code` & `hierarchy_level` Mismatches:**
   - Live `meeting_types` uses `pct_provincial` (`23`), `provincial_agm` (`24`), `srct_municipal` (`25`), `bct_branch` (`26`, `hierarchy_level = 'Branch'`), `bga_branch` (`27`, `hierarchy_level = 'Branch'`), and `bpa_branch` (`30`, `hierarchy_level = 'Branch'`).
   - `HierarchicalMeetingService.getMeetingTypes('Ward')` filtered strictly by `hierarchy_level = 'Ward'`, returning `0` meeting types when `Ward` was selected in the UI.
   - `HierarchicalMeetingService.generateAutoInvitations` only matched legacy codes (`pct_ordinary`, `srct_ordinary`, `bct_ordinary`, `bga`, `bpa`), falling back to `addNPAInvitations` for all active Provincial, Municipal, and Branch meeting types.
2. **Entity Resolution & Hardcoded `entity_id: 1` Bug:**
   - `HierarchicalMeetingCreatePage.tsx` hardcoded `entity_id = 1` in `getEntityIdFromSelection` for Provincial, Municipal, and Ward levels, preventing `resolveEntityIdFromCodes` from resolving the real `province_id`, `municipality_id`, or `ward_id`, and omitted `province_code`, `municipality_code`, and `ward_code` in `handlePreviewInvitations`.
   - `POST /api/v1/hierarchical-meetings` rejected `Branch` meeting types when `hierarchy_level === 'Ward'` and saved `meetings.entity_id` BEFORE resolving `resolveEntityIdFromCodes`.
3. **Frontend Geographic Selector for Provincial Meetings:**
   - `HierarchicalGeographicSelector.tsx` always rendered the `Municipality *` dropdown even when `hierarchy_level === 'Provincial'`.

---

## 3. Task Breakdown

### Task 1: Model Enhancements (`backend/src/models/meetings.ts`)
- Update `MeetingType`, `Meeting`, and `CreateMeetingData` interfaces to include `'Province' | 'Municipality' | 'Branch'` where appropriate.
- Update `MeetingModel.getMeetingById` to resolve `entity_name`, `province_code`, `municipality_code`, and `ward_code` across `National`, `Province`/`Provincial`, `Municipality`/`Municipal`, and `Ward`/`Branch` levels.
- Ensure `MeetingModel.createMeeting` safely resolves `created_by` against `users.user_id` when fallback is needed.

### Task 2: Hierarchical Auto-Invitation Engine (`backend/src/services/hierarchicalMeetingService.ts`)
- Update `getMeetingTypes(hierarchyLevel)` to map equivalent hierarchy aliases (`'Ward'`/`'Branch'`, `'Provincial'`/`'Province'`, `'Municipal'`/`'Municipality'`).
- Add `resolveGeographicContext(request)` to resolve `{ provinceId, provinceCode, municipalityId, municipalityCode, wardId, wardCode }` from any combination of `entity_id` and geographic codes using parameterized PostgreSQL queries (`$1`, no parameter reuse across incompatible types).
- Implement:
  - `addProvincialLeadershipAndMunicipalOfficersInvitations(targets, request)`
  - `addMunicipalLeadershipAndWardOfficersInvitations(targets, request)`
  - `addWardLeadershipInvitations(targets, request)`
  - `addWardMembersAndLeadershipInvitations(targets, request)`
- Wire all Provincial, Municipal, and Ward/Branch `type_code` values in both `generateAutoInvitations` and `generateAutomaticInvitations` (plus `addGenericHierarchicalInvitations` level-aware fallback).
- Expand `resolveLeadershipInvitationPriority` across National, Provincial, Municipal, and Ward leadership & member roles.

### Task 3: Route Validation & Entity Resolution (`backend/src/routes/hierarchicalMeetings.ts`)
- Update Joi schemas (`createHierarchicalMeetingSchema`, `invitationPreviewSchema`) and hierarchy level compatibility check so `'Ward'` and `'Branch'` (and `'Provincial'`/`'Province'`, `'Municipal'`/`'Municipality'`) work seamlessly.
- Update `resolveEntityIdFromCodes` to use `$1` parameterized queries and ALWAYS prefer resolving from `ward_code` / `municipality_code` / `province_code` when provided (overriding dummy `entity_id = 1`).
- Resolve `effectiveEntityId` and valid `createdByUserId` BEFORE `MeetingModel.createMeeting` (and in `PUT /:meetingId`), and pass `meeting.province_code`, `meeting.municipality_code`, and `meeting.ward_code` in `POST /:meetingId/send-invitations`.

### Task 4: Frontend Geographic Selection & Preview Payload (`frontend/src/components/users/HierarchicalGeographicSelector.tsx` & `frontend/src/pages/meetings/HierarchicalMeetingCreatePage.tsx`)
- Extend `HierarchicalGeographicSelector` `adminLevel` prop to `'Provincial' | 'Municipal' | 'Ward'` so Provincial meetings only require/display Province selection while preserving Municipal and Ward behavior for `CreateUserDialog.tsx`.
- In `HierarchicalMeetingCreatePage.tsx`:
  - Fix `getEntityIdFromSelection` to return numeric IDs only when present (or `undefined` so backend resolves from codes).
  - Include `province_code`, `municipality_code`, and `ward_code` in `handlePreviewInvitations`.
  - Normalize DB `hierarchy_level` (`'Province'` -> `'Provincial'`, `'Municipality'` -> `'Municipal'`, `'Branch'` -> `'Ward'`) when loading a meeting in edit mode.

### Task 5: Unit Tests & Live PostgreSQL Verification
- Create `backend/src/models/__tests__/hierarchicalAutoInvitations.test.ts` covering Provincial, Municipal, Ward BCT, Ward BGA/BPA deduplication, and `getMeetingTypes('Ward')`.
- Verify live PostgreSQL queries against real Free State (`FS`), Eastern Cape (`EC`), Gauteng (`TSH004` / `JHB004`), and Ward `79900048` (`ward_id = 3098`) data.

---

## Phase X: Verification Checklist — ✅ PHASE X COMPLETE
- [x] Plan created (`provincial-municipal-ward-invitations.md`)
- [x] Backend TypeScript check (`npx tsc --noEmit`) — 0 errors
- [x] Backend Jest unit tests (`hierarchicalAutoInvitations.test.ts`, `cctInvitations.test.ts`, `meetingDocuments.test.ts`, `meetings.deleteMeeting.test.ts`) — 4/4 suites, 20/20 tests passing
- [x] Frontend TypeScript check (`npx tsc -b --noEmit`) — 0 errors
- [x] Frontend Vitest suite (`MeetingsPage.delete.test.tsx`) — 2/2 tests passing
- [x] Live PostgreSQL read-only verification across Provincial (`EC` = 2, `FS` = 32), Municipal (`FS181` = 13, `TSH004` = 1), Ward BCT (`79900048` = 2 leaders), and Ward BGA (`79900048` = 191 members + deduplicated leaders)

