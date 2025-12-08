-- =====================================================================================
-- Add 'rate_limited' status to uploaded_files table
-- =====================================================================================
-- This migration adds support for IEC API rate limit status

BEGIN;

-- Drop existing constraint
ALTER TABLE uploaded_files 
DROP CONSTRAINT IF EXISTS chk_status;

-- Add new constraint with 'rate_limited' status
ALTER TABLE uploaded_files 
ADD CONSTRAINT chk_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'rate_limited'));

-- Add comment
COMMENT ON CONSTRAINT chk_status ON uploaded_files IS 'Valid status values including rate_limited for IEC API rate limit exceeded';

COMMIT;

-- Verify the constraint was updated
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'chk_status'
AND conrelid = 'uploaded_files'::regclass;

SELECT '✅ Migration completed: rate_limited status added to uploaded_files table' as result;

