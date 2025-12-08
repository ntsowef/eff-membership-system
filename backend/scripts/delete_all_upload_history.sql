-- =====================================================================================
-- DELETE ALL UPLOAD HISTORY
-- =====================================================================================
-- This script deletes all records from bulk upload history tables
-- WARNING: This action cannot be undone!
-- =====================================================================================

BEGIN;

-- Display current counts before deletion
SELECT 'BEFORE DELETION - Current Record Counts:' as status;

SELECT 
    'renewal_bulk_uploads' as table_name,
    COUNT(*) as record_count
FROM renewal_bulk_uploads
UNION ALL
SELECT 
    'renewal_bulk_upload_records' as table_name,
    COUNT(*) as record_count
FROM renewal_bulk_upload_records
UNION ALL
SELECT 
    'renewal_fraud_cases' as table_name,
    COUNT(*) as record_count
FROM renewal_fraud_cases
UNION ALL
SELECT 
    'member_application_bulk_uploads' as table_name,
    COUNT(*) as record_count
FROM member_application_bulk_uploads
UNION ALL
SELECT 
    'member_application_bulk_upload_records' as table_name,
    COUNT(*) as record_count
FROM member_application_bulk_upload_records
UNION ALL
SELECT 
    'uploaded_files' as table_name,
    COUNT(*) as record_count
FROM uploaded_files
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'uploaded_files');

-- =====================================================================================
-- DELETE OPERATIONS
-- =====================================================================================

-- 1. Delete renewal fraud cases (must be deleted first due to foreign key)
DELETE FROM renewal_fraud_cases;

-- 2. Delete renewal bulk upload records (must be deleted before parent table)
DELETE FROM renewal_bulk_upload_records;

-- 3. Delete renewal bulk uploads
DELETE FROM renewal_bulk_uploads;

-- 4. Delete member application bulk upload records (must be deleted before parent table)
DELETE FROM member_application_bulk_upload_records;

-- 5. Delete member application bulk uploads
DELETE FROM member_application_bulk_uploads;

-- 6. Delete uploaded files (if table exists)
DELETE FROM uploaded_files
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'uploaded_files');

-- =====================================================================================
-- RESET SEQUENCES
-- =====================================================================================

-- Reset auto-increment sequences to start from 1
ALTER SEQUENCE renewal_bulk_uploads_upload_id_seq RESTART WITH 1;
ALTER SEQUENCE renewal_bulk_upload_records_record_id_seq RESTART WITH 1;
ALTER SEQUENCE renewal_fraud_cases_case_id_seq RESTART WITH 1;
ALTER SEQUENCE member_application_bulk_uploads_upload_id_seq RESTART WITH 1;
ALTER SEQUENCE member_application_bulk_upload_records_record_id_seq RESTART WITH 1;

-- Reset uploaded_files sequence if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'uploaded_files') THEN
        ALTER SEQUENCE uploaded_files_file_id_seq RESTART WITH 1;
    END IF;
END $$;

-- =====================================================================================
-- VERIFY DELETION
-- =====================================================================================

SELECT 'AFTER DELETION - Verification:' as status;

SELECT 
    'renewal_bulk_uploads' as table_name,
    COUNT(*) as record_count
FROM renewal_bulk_uploads
UNION ALL
SELECT 
    'renewal_bulk_upload_records' as table_name,
    COUNT(*) as record_count
FROM renewal_bulk_upload_records
UNION ALL
SELECT 
    'renewal_fraud_cases' as table_name,
    COUNT(*) as record_count
FROM renewal_fraud_cases
UNION ALL
SELECT 
    'member_application_bulk_uploads' as table_name,
    COUNT(*) as record_count
FROM member_application_bulk_uploads
UNION ALL
SELECT 
    'member_application_bulk_upload_records' as table_name,
    COUNT(*) as record_count
FROM member_application_bulk_upload_records
UNION ALL
SELECT 
    'uploaded_files' as table_name,
    COUNT(*) as record_count
FROM uploaded_files
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'uploaded_files');

SELECT '✅ All upload history records have been deleted successfully!' as result;

COMMIT;

