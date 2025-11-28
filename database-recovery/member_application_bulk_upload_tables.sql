-- Member Application Bulk Upload Tables for EFF Membership Management System
-- PostgreSQL Version
-- Created: 2025-10-02
-- Purpose: Bulk upload of member applications via spreadsheet

-- Start transaction
BEGIN;

-- =====================================================================================
-- 1. BULK UPLOADS TABLE
-- =====================================================================================

CREATE TABLE IF NOT EXISTS member_application_bulk_uploads (
    upload_id SERIAL PRIMARY KEY,
    upload_uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    
    -- File information
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(20) CHECK (file_type IN ('Excel', 'CSV')) NOT NULL,
    file_size BIGINT NOT NULL,
    
    -- Upload metadata
    uploaded_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Processing statistics
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    duplicate_records INTEGER DEFAULT 0,
    
    -- Status tracking
    status VARCHAR(20) CHECK (status IN ('Pending', 'Processing', 'Completed', 'Failed', 'Cancelled')) DEFAULT 'Pending',
    
    -- Timestamps
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_member_app_bulk_uploads_uuid ON member_application_bulk_uploads(upload_uuid);
CREATE INDEX IF NOT EXISTS idx_member_app_bulk_uploads_user ON member_application_bulk_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_member_app_bulk_uploads_status ON member_application_bulk_uploads(status);
CREATE INDEX IF NOT EXISTS idx_member_app_bulk_uploads_created ON member_application_bulk_uploads(created_at);

-- =====================================================================================
-- 2. BULK UPLOAD RECORDS TABLE
-- =====================================================================================

CREATE TABLE IF NOT EXISTS member_application_bulk_upload_records (
    record_id SERIAL PRIMARY KEY,
    upload_id INTEGER NOT NULL REFERENCES member_application_bulk_uploads(upload_id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    
    -- Application data from spreadsheet
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    id_number VARCHAR(13) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(50),
    email VARCHAR(255),
    cell_number VARCHAR(20),
    residential_address TEXT,
    ward_code VARCHAR(20),
    province_code VARCHAR(10),
    district_code VARCHAR(20),
    municipal_code VARCHAR(20),
    application_type VARCHAR(20) DEFAULT 'New',
    
    -- Payment information
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    payment_amount DECIMAL(10,2),
    
    -- Processing status
    record_status VARCHAR(20) CHECK (record_status IN ('Success', 'Failed', 'Duplicate', 'Pending')) DEFAULT 'Pending',
    error_message TEXT,
    
    -- Created application reference
    application_id INTEGER REFERENCES membership_applications(application_id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_member_app_bulk_records_upload ON member_application_bulk_upload_records(upload_id);
CREATE INDEX IF NOT EXISTS idx_member_app_bulk_records_status ON member_application_bulk_upload_records(record_status);
CREATE INDEX IF NOT EXISTS idx_member_app_bulk_records_id_number ON member_application_bulk_upload_records(id_number);
CREATE INDEX IF NOT EXISTS idx_member_app_bulk_records_application ON member_application_bulk_upload_records(application_id);

-- =====================================================================================
-- 3. TRIGGERS
-- =====================================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_member_app_bulk_upload_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_member_app_bulk_upload_timestamp
    BEFORE UPDATE ON member_application_bulk_uploads
    FOR EACH ROW
    EXECUTE FUNCTION update_member_app_bulk_upload_timestamp();

-- =====================================================================================
-- 4. COMMENTS
-- =====================================================================================

COMMENT ON TABLE member_application_bulk_uploads IS 'Tracks bulk uploads of member applications via spreadsheet';
COMMENT ON TABLE member_application_bulk_upload_records IS 'Individual records from bulk application uploads';

COMMENT ON COLUMN member_application_bulk_uploads.upload_uuid IS 'Unique identifier for the upload';
COMMENT ON COLUMN member_application_bulk_uploads.file_type IS 'Type of uploaded file (Excel or CSV)';
COMMENT ON COLUMN member_application_bulk_uploads.status IS 'Current processing status of the upload';
COMMENT ON COLUMN member_application_bulk_uploads.total_records IS 'Total number of records in the file';
COMMENT ON COLUMN member_application_bulk_uploads.successful_records IS 'Number of successfully processed records';
COMMENT ON COLUMN member_application_bulk_uploads.failed_records IS 'Number of failed records';
COMMENT ON COLUMN member_application_bulk_uploads.duplicate_records IS 'Number of duplicate records detected';

COMMENT ON COLUMN member_application_bulk_upload_records.record_status IS 'Processing status of individual record';
COMMENT ON COLUMN member_application_bulk_upload_records.error_message IS 'Error message if processing failed';
COMMENT ON COLUMN member_application_bulk_upload_records.application_id IS 'Reference to created application if successful';

-- Commit transaction
COMMIT;

-- =====================================================================================
-- 5. VERIFICATION QUERIES
-- =====================================================================================

-- Verify tables were created
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('member_application_bulk_uploads', 'member_application_bulk_upload_records')
ORDER BY table_name;

-- Verify indexes were created
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('member_application_bulk_uploads', 'member_application_bulk_upload_records')
ORDER BY tablename, indexname;

-- Verify triggers were created
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table IN ('member_application_bulk_uploads', 'member_application_bulk_upload_records')
ORDER BY event_object_table, trigger_name;

