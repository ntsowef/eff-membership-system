-- Migration: Add provincial -> national escalation workflow to membership_applications
-- Description: Adds columns that let a provincial admin flag an application for
--              "National Review". escalation_level defaults to 'Provincial' and is
--              set to 'National' when escalated, making the application visible to
--              national (super) admins for final processing. escalated_by /
--              escalated_at / escalation_reason capture the audit context.
-- Idempotent: uses ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS and runs
--             in a single transaction.

BEGIN;

-- 1. Escalation columns
ALTER TABLE membership_applications ADD COLUMN IF NOT EXISTS escalation_level VARCHAR(20) DEFAULT 'Provincial';
ALTER TABLE membership_applications ADD COLUMN IF NOT EXISTS escalated_by INTEGER;
ALTER TABLE membership_applications ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP;
ALTER TABLE membership_applications ADD COLUMN IF NOT EXISTS escalation_reason TEXT;

-- 2. Backfill any existing NULLs to the default so filtering is predictable
UPDATE membership_applications
SET escalation_level = 'Provincial'
WHERE escalation_level IS NULL;

-- 3. Index to support filtering escalated applications for national review
CREATE INDEX IF NOT EXISTS idx_membership_applications_escalation_level
  ON membership_applications (escalation_level);

COMMIT;
