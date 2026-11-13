# National CCT Hierarchical Meeting Invitations

## Overview
When a user creates a hierarchical meeting at the **National** level and selects **CCT Meeting (Central Command Team)** (`meeting_types.type_code = 'cct_national'`, `type_id = 21`), automatically generate and record system invitations in `meeting_invitations` (and preview them accurately in `/hierarchical-meetings/invitation-preview`) for:
1. **War Council:** All active appointees in the National Top 6 (`PRES`, `DPRES`, `SG`, `DSG`, `NCHAIR`, `TG`) and all 9 Provincial CCT Deployees (`CCT_EC`..`CCT_WC`).
2. **CCT Leadership & National Executive Heads:** All active appointees in `CCT01`–`CCT60` (`position_category = 'CCT'`) plus National Executive/Youth/Women heads (`HOP`, `HOC`, `NORG`, `PYOUTH`, `PWOMEN`).
3. **Provincial Chairpersons & Secretaries:** All active appointees holding Provincial Chairperson (`PCHAIR_*`) or Provincial Secretary (`PSEC_*`) positions across all 9 provinces.

All invitees are deduplicated by `member_id` while retaining each member's highest `invitation_priority` role, without excluding active leaders due to `expiry_date`.

## Project Type
**WEB** (Express + TypeScript + PostgreSQL backend, React + MUI + TanStack Query frontend)

## Success Criteria
- Selecting **National** → **CCT Meeting (Central Command Team)** and clicking **Preview Invitations** returns all active War Council, CCT Leadership (`CCT01`–`CCT60` + `HOP`/`HOC`/`NORG`/`PYOUTH`/`PWOMEN`), and Provincial Chairperson/Secretary (`PCHAIR_*` / `PSEC_*`) appointees with zero PostgreSQL errors and zero duplicate `member_id` rows.
- Creating a National CCT meeting with auto-invitations enabled inserts accurate `meeting_invitations` rows (`invitee_type = 'Member'`, `invitee_id = member_id`, `invitee_name = member full name`, `invitee_email = member email`, `invitation_status = 'Sent'`).
- Redirecting to `/admin/meetings/:id` (`MeetingDetailPage`) and `/admin/meetings/:id/attendance` (`MeetingAttendancePage`) immediately displays the invited count and full invitee list with names, membership numbers, contact info, and sender names.
- All backend Jest unit tests, frontend Vitest tests, and TypeScript builds pass with zero errors.

## Tech Stack
- **Backend:** Node.js, Express, TypeScript, PostgreSQL (`pg` via `database-hybrid.ts`)
- **Frontend:** React 18, TypeScript, Material UI, TanStack Query v5
- **Testing:** Jest (`ts-jest`) for backend unit tests, Vitest + React Testing Library for frontend tests

## File Structure
```text
backend/
├── src/
│   ├── models/
│   │   ├── meetings.ts                              # Extend InvitationTarget, fix updateMeeting & duplicate-safe invitation helpers
│   │   └── __tests__/
│   │       └── cctInvitations.test.ts               # Unit tests for cct_national & war_council auto-invitations + deduplication
│   ├── routes/
│   │   └── hierarchicalMeetings.ts                  # Fix PostgreSQL preview query (members_consolidated + LPAD::text) & populate invitee_name/email
│   └── services/
│       ├── hierarchicalMeetingService.ts            # Add cct_national handler, fix War Council & Provincial PCHAIR_*/PSEC_* queries, priority-preserving dedup
│       └── meetingInvitationService.ts              # Fix getMeetingAttendance creator join (users.user_id) & phone_number/member_name coalescing
frontend/
└── src/
    └── pages/
        └── meetings/
            └── MeetingDetailPage.tsx                # Fix unwrapped attendanceData response reading & wire Invite Members action for hierarchical meetings
```

## Task Breakdown

- [x] **Task 1 (`T1` — `backend-specialist`, P0, deps: none): Update `InvitationTarget` and `MeetingModel` PostgreSQL helpers**
  - **INPUT:** `backend/src/models/meetings.ts`
  - **OUTPUT:** Optional `member_name`, `member_email`, `member_phone`, `membership_number` fields on `InvitationTarget`; PostgreSQL `RETURNING meeting_id` fix in `MeetingModel.updateMeeting`.
  - **VERIFY:** `Set-Location backend; npx tsc --noEmit` compiles cleanly.

- [x] **Task 2 (`T2` — `backend-specialist`, P1, deps: `T1`): Implement `cct_national` & `war_council` invitation rules and priority-preserving deduplication**
  - **INPUT:** `backend/src/services/hierarchicalMeetingService.ts`
  - **OUTPUT:**
    - Handle `case 'cct_national':` (and `'cct_nec_quarterly'`) in `generateAutoInvitations` via `addNationalCCTInvitations`.
    - Query `leadership_appointments` + `leadership_positions` + `members_consolidated` (`la.appointment_status = 'Active' AND lp.is_active = TRUE`) covering:
      - War Council core (`PRES`, `DPRES`, `SG`, `DSG`, `NCHAIR`, `TG`) + 9 CCT Deployees (`LEFT(lp.position_code, 4) = 'CCT_'`).
      - CCT Leadership (`position_category = 'CCT'` / `CCT01`–`CCT60`) + National Executive heads (`HOP`, `HOC`, `NORG`, `PYOUTH`, `PWOMEN`).
      - Provincial Chairpersons (`LEFT(lp.position_code, 7) = 'PCHAIR_'` / `PCHAIR`) and Provincial Secretaries (`LEFT(lp.position_code, 5) = 'PSEC_'` / `PSEC`) across all 9 provinces (excluding `PDCHAIR_*` and `PDSEC_*`).
    - Align `war_council` (`addWarCouncilInvitations`) with actual War Council position codes (`PRES`, `DPRES`, `SG`, `DSG`, `NCHAIR`, `TG`, `CCT_EC`..`CCT_WC`).
    - Update `removeDuplicateInvitations` to keep the highest `invitation_priority` target per `member_id` (and preserve `voting_rights`).
    - Delegate `generateAutomaticInvitations` to `generateAutoInvitations` for `cct_national`, `cct_nec_quarterly`, and `war_council`.
  - **VERIFY:** Read-only check against live PostgreSQL confirms all active War Council, CCT01–CCT05, and Provincial Chairpersons/Secretaries are returned with zero duplicates and sorted by priority descending.

- [x] **Task 3 (`T3` — `backend-specialist`, P1, deps: `T1`, `T2`): Fix `/invitation-preview`, `POST /hierarchical-meetings`, `POST /:meetingId/send-invitations`, and `getMeetingAttendance`**
  - **INPUT:** `backend/src/routes/hierarchicalMeetings.ts`, `backend/src/services/meetingInvitationService.ts`
  - **OUTPUT:**
    - Fix `/invitation-preview` SQL to query `members_consolidated` using PostgreSQL `$1..$N` placeholders and truncation-safe `LPAD(CAST(m.member_id AS TEXT), GREATEST(LENGTH(CAST(m.member_id AS TEXT)), 6), '0')`.
    - Enrich targets with `member_name` and `member_email` from `members_consolidated` when creating or updating `meeting_invitations` so `invitee_name` holds the member's full name (not the role string) and `invitee_email` holds their email; prevent duplicate `meeting_invitations` rows for `(meeting_id, invitee_id)`.
    - Fix `MeetingInvitationService.getMeetingAttendance` to join `users u ON mi.created_by = u.user_id` and return `phone_number`, `phone`, `member_name`, `email`, and `member_number`.
  - **VERIFY:** Unit tests and live preview query succeed with zero SQL errors.

- [x] **Task 4 (`T4` — `frontend-specialist`, P2, deps: `T3`): Fix `MeetingDetailPage` invitee display after meeting creation**
  - **INPUT:** `frontend/src/pages/meetings/MeetingDetailPage.tsx`
  - **OUTPUT:** Read `attendanceData?.summary` and `attendanceData?.attendance` (unwrapped by `apiGet`) with fallback to `attendanceData?.data`, and wire the `Invite Members` Quick Action to `/hierarchical-meetings/:id/send-invitations`.
  - **VERIFY:** `Set-Location frontend; npx tsc -b --noEmit` passes with zero errors.

- [x] **Task 5 (`T5` — `backend-specialist`, P3, deps: `T2`, `T3`, `T4`): Add unit tests & run full verification**
  - **INPUT:** `backend/src/models/__tests__/cctInvitations.test.ts`
  - **OUTPUT:** AAA-structured Jest tests verifying `cct_national` invites War Council + CCT01–CCT60 + National Executive heads + all Provincial Chairpersons/Secretaries, excludes Provincial Deputies (`PDCHAIR_*` / `PDSEC_*`), does not drop expired-membership active appointees, deduplicates multi-role members keeping highest priority, and populates `member_name` / `member_email`.
  - **VERIFY:** `npx jest` on new & existing meeting tests + `npx tsc --noEmit` (backend) + `npx tsc -b --noEmit` (frontend) + `npx vitest run` (frontend) all pass.

## Phase X: Verification Checklist
- [x] Backend TypeScript (`npx tsc --noEmit`) passes with 0 errors
- [x] Frontend TypeScript (`npx tsc -b --noEmit`) passes with 0 errors
- [x] Backend Jest unit tests (`cctInvitations.test.ts` & `meetings.deleteMeeting.test.ts`) pass (`9/9`)
- [x] Frontend Vitest unit tests (`MeetingsPage.delete.test.tsx`) pass (`2/2`)
- [x] Live read-only PostgreSQL verification of `HierarchicalMeetingService.generateAutoInvitations` for `cct_national` (`type_id = 21`) succeeds without SQL errors (`13` active leaders returned)
- [x] Security & Clean Code check (parameterized SQL queries only, no purple/template violations, Socratic Gate respected)

## ✅ PHASE X COMPLETE
- Lint / Type Check: ✅ Pass (`backend`: `npx tsc --noEmit` 0 errors; `frontend`: `npx tsc -b --noEmit` 0 errors)
- Security: ✅ No critical issues (parameterized PostgreSQL `$1..$N` queries throughout)
- Tests: ✅ `9/9` backend Jest tests passed (`cctInvitations.test.ts`, `meetings.deleteMeeting.test.ts`) + `2/2` frontend Vitest tests passed (`MeetingsPage.delete.test.tsx`)
- Live DB Verification: ✅ Verified against PostgreSQL (`cct_national` returned all 13 currently active War Council, CCT, and Provincial Chairperson/Secretary appointees with zero duplicates)
- Date: 2026-11-11

