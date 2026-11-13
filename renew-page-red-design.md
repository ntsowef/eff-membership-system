# `/renew` Red Outer Shell & `/apply` Visual Alignment

## Goal
Align `http://localhost:3000/renew` (`MemberRenewalPortal`) with the standalone red-and-green outer shell and inner wizard styling of `http://localhost:3000/apply` (`MembershipApplicationPage`) across all renewal steps and states while preserving 100% of existing renewal business logic.

## Design Commitment
- **Style Identity:** EFF Revolutionary Crimson Monumental Shell (matching `/apply`)
- **Topological Choice:** Full-bleed standalone `#E60000` crimson stage anchored by a `#006030` green base/footer, centered `100x100` black-and-gold (`#FFCE00`) EFF medallion, bold uppercase `#FFCE00` Poppins display typography, and a single elevated `900px` `#FFFFFF` `Paper` monolith housing the stepper and active step.
- **Cliché Liquidation:** Eliminated the generic 4-card glassmorphism hero grid (`backdropFilter: blur(10px)`), removed the nested `PublicLayout` dark `AppBar` and duplicate `#1a1a1a` footer, and removed double-nested floating stepper `Paper` wrappers.
- **Palette (Purple Ban Enforced ✅):** `#E60000` (outer stage), `#FFCE00` (display title & emblem border), `#DC143C` / `#8B0000` (active/completed stepper & primary CTA gradients), `#006030` (footer & root canvas), `#000000` / `#FFFFFF` (high-contrast surfaces). Zero purple/violet/indigo.

## File Dependency Map
- `frontend/src/routes/AppRoutes.tsx` — Moved `/renew` out of `PublicLayout` into Standalone Public Routes alongside `/apply`.
- `frontend/src/pages/public/MemberRenewalPortal.tsx` — Replaced dark gradient hero + `#FAFAFA` body + `#1a1a1a` footer with `/apply`'s `#E60000` outer section, `EFF_Reglogo.png` medallion, `#FFCE00` heading, `900px` `#FFFFFF` `Paper`, and `#006030` footer.
- `frontend/src/components/renewal/MemberSelfServicePortal.tsx` — Removed redundant outer `Container`/`Paper` wrapper and aligned `Stepper` (custom `32x32` circular step icons, `#DC143C` active, `#8B0000` completed) with `MembershipApplicationPage.tsx`.
- `frontend/src/components/renewal/renewalWizardStyles.ts` — Extracted shared DRY `SxProps<Theme>` tokens (`sectionCardSx`, `summaryBannerSx`, `backButtonSx`, `cancelButtonSx`, `primaryActionSx`, `finalSubmitActionSx`) with `prefers-reduced-motion` support.
- `frontend/src/components/renewal/steps/IdNumberEntryStep.tsx` — Aligned card border, headings, Back/Cancel/Retrieve buttons, and crimson gradient CTA with `/apply`.
- `frontend/src/components/renewal/steps/ReviewUpdateInfoStep.tsx` — Replaced low-contrast `error.light`/`success.light` card fill and `elevation={2}` inner papers with crisp `/apply`-aligned outlined cards and crimson Back/Cancel/Continue controls.
- `frontend/src/components/renewal/steps/PaymentInfoStep.tsx` — Replaced `primary.light` summary banner and `elevation={2}` inner papers with `/apply`-aligned crimson-tinted summary card, outlined section cards, and unified Back/Cancel/Next controls.
- `frontend/src/components/renewal/steps/ConfirmationStep.tsx` — Replaced `primary.light` summary banner and `elevation={2}` inner papers with `/apply`-aligned summary cards, crimson loading spinner, and unified Back/Cancel/Confirm controls.
- `frontend/src/pages/public/__tests__/MemberRenewalPortal.test.tsx` — Unit/integration tests verifying the standalone red shell, EFF logo, green footer, and persistence across renewal steps/states.

## Tasks
- [x] Task 1: Move `/renew` to Standalone Public Routes in `frontend/src/routes/AppRoutes.tsx` → Verified.
- [x] Task 2: Rebuild `frontend/src/pages/public/MemberRenewalPortal.tsx` with `/apply`'s `#E60000` outer canvas, `EFF_Reglogo.png` badge, `#FFCE00` uppercase title, `900px` `#FFFFFF` `Paper`, and `#006030` footer → Verified.
- [x] Task 3: Update `frontend/src/components/renewal/MemberSelfServicePortal.tsx` and the 4 step components (`IdNumberEntryStep`, `ReviewUpdateInfoStep`, `PaymentInfoStep`, `ConfirmationStep`) to match `/apply` visually while keeping all state/API/payment logic intact → Verified (`0` TS errors).
- [x] Task 4: Add unit tests in `frontend/src/pages/public/__tests__/MemberRenewalPortal.test.tsx` covering initial ID step, step transition (`review-info` -> `payment` -> `confirmation`), error state, and outer shell persistence → Verified (`3/3` passing).

## Phase X: Verification — ✅ PHASE X COMPLETE
- [x] `npx tsc -b --noEmit` in `frontend/` (`0` errors)
- [x] `npx vitest run src/pages/public/__tests__/MemberRenewalPortal.test.tsx` (`3/3` passing)
- [x] `ux_audit.py` & `accessibility_checker.py` executed and summarized
