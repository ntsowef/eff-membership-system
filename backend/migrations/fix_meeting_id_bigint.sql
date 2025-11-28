-- =====================================================
-- Fix meeting_id to BIGINT for JavaScript timestamps
-- =====================================================
-- Issue: meeting_id is INTEGER but JavaScript Date.now() 
--        returns timestamps larger than INTEGER max (2,147,483,647)
-- Solution: Change to BIGINT which can hold up to 9,223,372,036,854,775,807
-- =====================================================

-- Change meeting_id in ward_meeting_records to BIGINT
ALTER TABLE ward_meeting_records 
ALTER COLUMN meeting_id TYPE BIGINT;

-- Change last_meeting_id in ward_audit_status to BIGINT
ALTER TABLE ward_audit_status 
ALTER COLUMN last_meeting_id TYPE BIGINT;

-- Verify changes
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name IN ('ward_meeting_records', 'ward_audit_status') 
  AND column_name IN ('meeting_id', 'last_meeting_id');

