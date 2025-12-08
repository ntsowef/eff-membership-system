-- ============================================================================
-- One-Time Data Fix: Update Existing Membership Statuses
-- ============================================================================
-- Purpose: Fix the 5,946 members with incorrect membership statuses
-- Author: System
-- Date: 2025-11-20
-- 
-- This script should be run ONCE after the trigger is created to fix existing data.
-- After this, the trigger will maintain correct statuses automatically.
-- 
-- Expected Changes:
--   - ~4,047 members: Good Standing → Grace Period
--   - ~1,899 members: Good Standing → Expired
--   - ~146 members: (various) → Inactive (no expiry date)
-- ============================================================================

-- Start transaction
BEGIN;

-- Create a temporary table to track changes
CREATE TEMP TABLE membership_status_changes (
  member_id INT,
  old_status_id INT,
  new_status_id INT,
  old_status_name VARCHAR(50),
  new_status_name VARCHAR(50),
  expiry_date DATE,
  days_since_expiry INT
);

-- Log members that will be updated
INSERT INTO membership_status_changes (
  member_id,
  old_status_id,
  new_status_id,
  old_status_name,
  new_status_name,
  expiry_date,
  days_since_expiry
)
SELECT 
  m.member_id,
  m.membership_status_id as old_status_id,
  CASE
    WHEN m.expiry_date IS NULL THEN 6 -- Inactive
    WHEN m.expiry_date >= CURRENT_DATE THEN 8 -- Good Standing
    WHEN m.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 7 -- Grace Period
    ELSE 2 -- Expired
  END as new_status_id,
  ms_old.status_name as old_status_name,
  ms_new.status_name as new_status_name,
  m.expiry_date,
  CASE 
    WHEN m.expiry_date IS NOT NULL THEN (CURRENT_DATE - m.expiry_date)::INT
    ELSE NULL
  END as days_since_expiry
FROM members_consolidated m
LEFT JOIN membership_statuses ms_old ON m.membership_status_id = ms_old.status_id
LEFT JOIN membership_statuses ms_new ON (
  CASE
    WHEN m.expiry_date IS NULL THEN 6
    WHEN m.expiry_date >= CURRENT_DATE THEN 1
    WHEN m.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 7
    ELSE 2
  END
) = ms_new.status_id
WHERE
  m.membership_status_id NOT IN (3, 4, 5) -- Don't touch Suspended, Cancelled, Pending
  AND m.membership_status_id != CASE
    WHEN m.expiry_date IS NULL THEN 6
    WHEN m.expiry_date >= CURRENT_DATE THEN 1
    WHEN m.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 7
    ELSE 2
  END;

-- Display summary of changes
DO $$
DECLARE
  v_total_changes INT;
  v_to_grace INT;
  v_to_expired INT;
  v_to_inactive INT;
  v_to_active INT;
BEGIN
  SELECT COUNT(*) INTO v_total_changes FROM membership_status_changes;
  SELECT COUNT(*) INTO v_to_grace FROM membership_status_changes WHERE new_status_id = 7;
  SELECT COUNT(*) INTO v_to_expired FROM membership_status_changes WHERE new_status_id = 2;
  SELECT COUNT(*) INTO v_to_inactive FROM membership_status_changes WHERE new_status_id = 6;
  SELECT COUNT(*) INTO v_to_active FROM membership_status_changes WHERE new_status_id = 1;

  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'MEMBERSHIP STATUS FIX - SUMMARY';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Total members to be updated: %', v_total_changes;
  RAISE NOTICE '';
  RAISE NOTICE 'Breakdown by new status:';
  RAISE NOTICE '  → Active (1):         % members', v_to_active;
  RAISE NOTICE '  → Grace Period (7):   % members', v_to_grace;
  RAISE NOTICE '  → Expired (2):        % members', v_to_expired;
  RAISE NOTICE '  → Inactive (6):       % members', v_to_inactive;
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
END $$;

-- Show sample of changes (first 10)
SELECT 
  member_id,
  old_status_name || ' → ' || new_status_name as status_change,
  expiry_date,
  days_since_expiry
FROM membership_status_changes
ORDER BY days_since_expiry DESC NULLS LAST
LIMIT 10;

-- Prompt for confirmation
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Review the changes above before proceeding!';
  RAISE NOTICE '';
  RAISE NOTICE 'To apply these changes, run: COMMIT;';
  RAISE NOTICE 'To cancel these changes, run: ROLLBACK;';
  RAISE NOTICE '';
END $$;

-- Perform the actual updates
UPDATE members_consolidated m
SET
  membership_status_id = c.new_status_id,
  updated_at = CURRENT_TIMESTAMP
FROM membership_status_changes c
WHERE m.member_id = c.member_id;

-- Display final summary
DO $$
DECLARE
  v_updated_count INT;
BEGIN
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Update completed successfully!';
  RAISE NOTICE '   Total members updated: %', v_updated_count;
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next steps:';
  RAISE NOTICE '   1. Run COMMIT; to save changes (or ROLLBACK; to undo)';
  RAISE NOTICE '   2. Verify the changes with: SELECT * FROM membership_status_changes LIMIT 20;';
  RAISE NOTICE '   3. The trigger will now maintain statuses automatically';
  RAISE NOTICE '';
END $$;

-- Don't auto-commit - let the user review and commit manually
-- COMMIT;

