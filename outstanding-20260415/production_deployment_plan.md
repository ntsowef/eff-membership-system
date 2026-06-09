# Production Deployment: Duplicate Phone Flagging

This plan outlines the steps to safely apply the `is_duplicate` field and phone normalization to the **Production Database** (69.164.245.173).

## User Review Required

> [!CAUTION]
> - These changes will affect **1.25 million+ production records**.
> - I will use the credentials from `.env.production`.
> - The primary table `members_consolidated` will be updated.

## Proposed Changes

### Configuration

#### [MODIFY] [scripts/prod-flag-duplicates.ts](file:///c:/Development/NewProj/Membership-newV2/backend/scripts/prod-flag-duplicates.ts)
I will create a production-specific version of our successful script that:
1.  Explicitly loads `.env.production` to avoid any environment confusion.
2.  Performs a **Dry Run** by default (logging how many records *would* be updated).

### Execution Phases

#### Phase 1: Schema Update (Production)
- Run a specialized script to add the `is_duplicate` column and `idx_members_consolidated_is_duplicate` index to the production database using raw SQL for maximum safety.

#### Phase 2: Normalization & Flagging (Production)
- Run the normalization script to clean `cell_number` and flag duplicates.
- The script will process in the same high-performance SQL manner used in the dev environment.

## Verification Plan

### Manual Verification (Pre-Commit)
- Run a query to count current duplicates on production before applying the new flag.
- Compare counts with the script's dry-run results.

### Automated Verification (Post-Commit)
- Run the `verify-results.ts` script against the production database to ensure zero false positives and proper prefixing.
