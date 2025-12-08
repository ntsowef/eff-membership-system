-- =====================================================================================
-- Add report_file_path column to uploaded_files table
-- =====================================================================================
-- This migration adds a column to store the path of generated Excel reports

BEGIN;

-- Add report_file_path column
ALTER TABLE uploaded_files 
ADD COLUMN IF NOT EXISTS report_file_path VARCHAR(500) NULL;

-- Add comment
COMMENT ON COLUMN uploaded_files.report_file_path IS 'Path to the generated Excel report file';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_uploaded_files_report_path ON uploaded_files(report_file_path) 
WHERE report_file_path IS NOT NULL;

COMMIT;

-- Verify the column was added
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'uploaded_files' 
AND column_name = 'report_file_path';

SELECT '✅ Migration completed: report_file_path column added to uploaded_files table' as result;

