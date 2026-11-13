# Simplify Public Portal Pages (`/`, `/apply`, `/renew`)

## Goal
Remove all static user-directing banners, instructional paragraphs, privacy/how-it-works callouts, and redundant helper blurbs across `/`, `/apply`, and `/renew` to make every screen plain and direct while preserving all live validation, verification, and error feedback alerts.

## Design Commitment: Stripped Neo-Brutalist Utility
- **Topological Choice:** Retain the asymmetric 58/42 portal ledger on `/` and standalone `#E60000` / `#006030` EFF shells on `/apply` and `/renew`, stripping every explanatory crutch so titles, inputs, and actions carry 100% of the visual hierarchy.
- **Cliché Liquidation:** Eliminate light-blue SaaS info callouts (`"Why do we verify your ID?"`, `"What happens next?"`, `"Privacy Notice"`, `"Note: Only fields marked..."`) and multi-sentence onboarding blurbs.
- **Feedback Preservation:** Keep all live dynamic states (`verified_registered`, `verified_not_registered`, `error`, `paymentError`, `paymentCompleted`, `fileError`, auto-fetch spinners, and field validation `errors`).

## Tasks
- [x] **Task 1 (`/` Hub):** Strip instructional masthead paragraph, category tag pills, card blurbs, and footer security strip from `frontend/src/pages/public/HomePage.tsx` → Verified: All 5 `portal-card-*` tiles and CTAs render cleanly without instructional copy.
- [x] **Task 2 (`/apply` Shell & Steps 1–3):** Remove hero subtitle in `MembershipApplicationPage.tsx`, `"Why do we verify your ID?"` box & intro text in `IdVerificationStep.tsx`, and instructional banners/helper blurbs in `IECPersonalInfoStep.tsx` and `ContactInfoStep.tsx` → Verified: Live IEC verification & validation alerts remain intact.
- [x] **Task 3 (`/apply` Steps 4–6):** Remove instructional paragraphs, signature instructions, fee/cash/no-method warning banners, and `"What happens next?"` box in `PartyDeclarationStep.tsx`, `PaymentStep.tsx`, and `ReviewStep.tsx` → Verified: Payment error/success alerts and field errors remain intact.
- [x] **Task 4 (`/renew` Shell & Steps 1–4):** Remove hero subtitle in `MemberRenewalPortal.tsx`, intro text, `"Formatted ID"`, and `"Privacy Notice"` in `IdNumberEntryStep.tsx`, `"Note: Only Editable..."` banner in `ReviewUpdateInfoStep.tsx`, Cash/EFT lecture alerts in `PaymentInfoStep.tsx`, and static payment notices in `ConfirmationStep.tsx` → Verified: Lookup errors, status banners, and payment alerts remain intact.
- [x] **Task 5 (Phase X Verification):** Added `IdVerificationStep.test.tsx` and updated `HomePage.test.tsx` & `MemberRenewalPortal.test.tsx`; verified `npx tsc -b --noEmit` (`0` errors) and `npx vitest run` (`9/9` tests passing).

## Status
✅ PHASE X COMPLETE
