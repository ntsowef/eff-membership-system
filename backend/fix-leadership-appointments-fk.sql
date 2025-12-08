-- ============================================================================
-- FIX LEADERSHIP_APPOINTMENTS FOREIGN KEY CONSTRAINTS
-- ============================================================================
-- Problem: The appointed_by and terminated_by columns incorrectly reference
-- members_consolidated(member_id) when they should reference users(user_id)
--
-- Root Cause: The migration script fix-foreign-keys-to-members-consolidated.sql
-- incorrectly changed these foreign keys. These columns store USER IDs, not
-- MEMBER IDs.
--
-- Solution: Drop the incorrect foreign keys and recreate them to reference
-- the users table instead.
-- ============================================================================

BEGIN;

-- 1. Drop the incorrect foreign key constraints
ALTER TABLE leadership_appointments 
  DROP CONSTRAINT IF EXISTS leadership_appointments_appointed_by_fkey;

ALTER TABLE leadership_appointments 
  DROP CONSTRAINT IF EXISTS leadership_appointments_terminated_by_fkey;

-- 2. Recreate the foreign keys to reference users table
-- appointed_by should reference users(user_id)
ALTER TABLE leadership_appointments 
  ADD CONSTRAINT leadership_appointments_appointed_by_fkey 
  FOREIGN KEY (appointed_by) REFERENCES users(user_id) ON DELETE SET NULL;

-- terminated_by should reference users(user_id)
ALTER TABLE leadership_appointments 
  ADD CONSTRAINT leadership_appointments_terminated_by_fkey 
  FOREIGN KEY (terminated_by) REFERENCES users(user_id) ON DELETE SET NULL;

-- 3. Verify the foreign key constraints
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'leadership_appointments'
  AND kcu.column_name IN ('appointed_by', 'terminated_by');

COMMIT;

-- Display success message
DO $$
BEGIN
  RAISE NOTICE '✅ Foreign key constraints fixed successfully!';
  RAISE NOTICE '   - appointed_by now references users(user_id)';
  RAISE NOTICE '   - terminated_by now references users(user_id)';
END $$;

