# Meeting Documents Module PostgreSQL & API Alignment

## Overview
Fix the `column t.id does not exist` error in `GET /api/v1/meeting-documents/meeting/:meetingId` and resolve all PostgreSQL schema, primary key, `RETURNING`, `DELETE`, and frontend `apiGet`/`apiPost` response-unwrapping mismatches across the Meeting Documents module.

## Project Type
**WEB** (Express + TypeScript + PostgreSQL backend, React + MUI + TanStack Query frontend)

## Success Criteria
- `GET /api/v1/meeting-documents/meeting/:meetingId` executes cleanly against PostgreSQL (`t.template_id`, `u.user_id`, `a.user_id`) and returns `id` aliases alongside `document_id`.
- Templates, single documents, document creation (`RETURNING document_id` + version auto-increment), document updates (`WHERE document_id = $N`), document deletion (`DELETE /api/v1/meeting-documents/:id`), action items (`action_item_id`), and meeting decisions (`decision_id`) all align with live PostgreSQL columns and foreign keys (`users.user_id`).
- Frontend pages (`MeetingDocumentsPage.tsx`, `DocumentEditorPage.tsx`, `DocumentViewerPage.tsx`) read unwrapped `apiGet` / `apiPost` payloads (`documentsData?.documents`, `response?.document_id`, `meeting?.meeting_title || meeting?.title`, etc.) while keeping `.data` fallbacks.
- Unit tests and live PostgreSQL smoke verification pass with 0 errors.

## Tech Stack
- **Backend:** Node.js, Express, TypeScript, PostgreSQL (`pg`)
- **Frontend:** React 18, TypeScript, Material UI, TanStack Query v5
- **Testing:** Jest (`ts-jest`), Vitest

## File Structure
```text
backend/
└── src/
    ├── models/
    │   ├── meetingDocuments.ts                      # PostgreSQL PKs, RETURNING, id aliases, safe JSON parsing, deleteDocument
    │   └── __tests__/
    │       └── meetingDocuments.test.ts             # Unit tests for all MeetingDocumentModel operations
    └── routes/
        └── meetingDocuments.ts                      # Prefer user_id FK, auto-stamp approved_by/approved_at, add DELETE /:id
frontend/
└── src/
    └── pages/
        └── meetings/
            ├── MeetingDocumentsPage.tsx             # Read unwrapped apiGet payloads & meeting_title fallback
            ├── DocumentEditorPage.tsx               # Read unwrapped templates/document/meeting & post-save document_id
            └── DocumentViewerPage.tsx               # Read unwrapped document/meeting & support approval status updates
```

## Task Breakdown

- [x] **Task 1 (`T1` — `backend-specialist`, P0, deps: none): Fix PostgreSQL queries, `id` aliases, `RETURNING`, and `deleteDocument` in `MeetingDocumentModel`**
  - **INPUT:** `backend/src/models/meetingDocuments.ts`
  - **OUTPUT:** Align `getTemplates`, `getTemplateById`, `createDocument` (with automatic `version_number` increment on conflict-prone `(meeting_id, document_type)` when omitted), `getDocumentById`, `getDocumentsByMeeting`, `updateDocument`, `deleteDocument`, `createActionItem`, `getActionItemsByMeeting`, `createDecision`, and `getDecisionsByMeeting` with PostgreSQL `template_id`, `document_id`, `action_item_id`, `decision_id`, and `users.user_id`, exposing `id` aliases (`d.document_id AS id`, `t.template_id AS id`, etc.) and `creator_name`/`approver_name`.
  - **VERIFY:** `Set-Location backend; npx tsc --noEmit` passes.

- [x] **Task 2 (`T2` — `backend-specialist`, P1, deps: `T1`): Update `routes/meetingDocuments.ts` (`user_id` FK, `DELETE /:id`, approval metadata)**
  - **INPUT:** `backend/src/routes/meetingDocuments.ts`
  - **OUTPUT:** Resolve `created_by` via `(req as any).user?.user_id || (req as any).user?.id || 1`, automatically populate `approved_by` / `approved_at` when `document_status === 'approved'`, and implement `DELETE /meeting-documents/:id`.
  - **VERIFY:** `Set-Location backend; npx tsc --noEmit` passes.

- [x] **Task 3 (`T3` — `frontend-specialist`, P2, deps: `T1`, `T2`): Align Meeting Documents frontend pages with unwrapped `api.ts` responses**
  - **INPUT:** `frontend/src/pages/meetings/MeetingDocumentsPage.tsx`, `frontend/src/pages/meetings/DocumentEditorPage.tsx`, `frontend/src/pages/meetings/DocumentViewerPage.tsx`
  - **OUTPUT:** Support both unwrapped (`documentsData?.documents`, `documentData?.document`, `templatesData?.templates`, `response?.document_id`) and `.data`-nested payloads, plus `meeting?.meeting_title || meeting?.title` and safe date formatting.
  - **VERIFY:** `Set-Location frontend; npx tsc -b --noEmit` passes.

- [x] **Task 4 (`T4` — `backend-specialist`, P3, deps: `T1`, `T2`, `T3`): Unit tests & live PostgreSQL verification**
  - **INPUT:** `backend/src/models/__tests__/meetingDocuments.test.ts`
  - **OUTPUT:** AAA-structured Jest tests covering `getTemplates`, `getTemplateById`, `createDocument`, `getDocumentById`, `getDocumentsByMeeting`, `updateDocument`, `deleteDocument`, `createActionItem`, `getActionItemsByMeeting`, `createDecision`, and `getDecisionsByMeeting`, plus read-only live PostgreSQL query execution for `getDocumentsByMeeting(134)`.
  - **VERIFY:** Jest tests, backend `tsc`, frontend `tsc`, and live PostgreSQL smoke check all pass with exit code 0.

## Phase X: Verification Checklist
- [x] Backend TypeScript (`npx tsc --noEmit`) passes with 0 errors
- [x] Frontend TypeScript (`npx tsc -b --noEmit`) passes with 0 errors
- [x] Backend Jest unit tests (`meetingDocuments.test.ts`) pass (`6/6`)
- [x] Live PostgreSQL read-only execution of `getDocumentsByMeeting(134)`, `getTemplates()`, `getActionItemsByMeeting(134)`, and `getDecisionsByMeeting(134)` succeeds with 0 SQL errors
- [x] Security & Clean Code check (parameterized SQL queries, strict column whitelist in `updateDocument`)

## ✅ PHASE X COMPLETE
- Lint / Type Check: ✅ Pass (`backend`: `npx tsc --noEmit` 0 errors; `frontend`: `npx tsc -b --noEmit` 0 errors)
- Security: ✅ Parameterized `$1..$N` queries and strict column whitelist (`ALLOWED_DOCUMENT_UPDATE_COLUMNS`)
- Tests: ✅ `6/6` Jest tests passed in `meetingDocuments.test.ts`
- Live DB Verification: ✅ Full create (v1 & v2 auto-versioning), read (`getDocumentById` & `getDocumentsByMeeting(134)`), approve/update (`updateDocument`), and cleanup delete (`deleteDocument`) verified against PostgreSQL with 0 errors
- Date: 2026-11-11

