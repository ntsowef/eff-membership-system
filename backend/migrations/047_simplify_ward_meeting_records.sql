-- Migration: Simplify ward_meeting_records
-- Description: Converts presiding officer / secretary from member FK lookups to
--              free-text name fields, and removes the key_decisions and
--              action_items columns. Existing FK values are backfilled into the
--              new text columns before the old columns are dropped.
-- Idempotent: uses IF EXISTS / IF NOT EXISTS guards and runs in one transaction.

BEGIN;

-- 1. Add free-text name columns
ALTER TABLE ward_meeting_records ADD COLUMN IF NOT EXISTS presiding_officer_name VARCHAR(255);
ALTER TABLE ward_meeting_records ADD COLUMN IF NOT EXISTS secretary_name VARCHAR(255);

-- 2. Backfill names from existing member references (only if the old columns still exist)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ward_meeting_records' AND column_name = 'presiding_officer_id'
    ) THEN
        UPDATE ward_meeting_records wmr
        SET presiding_officer_name = NULLIF(TRIM(CONCAT(po.firstname, ' ', po.surname)), '')
        FROM members_consolidated po
        WHERE wmr.presiding_officer_id = po.member_id
          AND wmr.presiding_officer_name IS NULL;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ward_meeting_records' AND column_name = 'secretary_id'
    ) THEN
        UPDATE ward_meeting_records wmr
        SET secretary_name = NULLIF(TRIM(CONCAT(sec.firstname, ' ', sec.surname)), '')
        FROM members_consolidated sec
        WHERE wmr.secretary_id = sec.member_id
          AND wmr.secretary_name IS NULL;
    END IF;
END $$;

-- 3. Drop foreign key constraints to members_consolidated
ALTER TABLE ward_meeting_records DROP CONSTRAINT IF EXISTS fk_ward_meeting_presiding_officer;
ALTER TABLE ward_meeting_records DROP CONSTRAINT IF EXISTS fk_ward_meeting_secretary;

-- 4. Drop the now-unused columns
ALTER TABLE ward_meeting_records DROP COLUMN IF EXISTS presiding_officer_id;
ALTER TABLE ward_meeting_records DROP COLUMN IF EXISTS secretary_id;
ALTER TABLE ward_meeting_records DROP COLUMN IF EXISTS key_decisions;
ALTER TABLE ward_meeting_records DROP COLUMN IF EXISTS action_items;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'ward_meeting_records simplified: officer/secretary are now free-text; key_decisions and action_items removed.';
END $$;
