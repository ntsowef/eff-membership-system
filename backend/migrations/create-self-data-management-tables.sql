-- =====================================================
-- Self Data Management Tables
-- =====================================================
-- Purpose: Support bulk file upload and member manipulation features
-- Created: 2025-11-09
-- =====================================================

BEGIN;

-- =====================================================
-- 1. Uploaded Files Table
-- =====================================================
-- Tracks all uploaded Excel files for bulk amendments
CREATE TABLE IF NOT EXISTS uploaded_files (
    file_id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    upload_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by_user_id INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    progress_percentage INTEGER DEFAULT 0,
    error_message TEXT,
    rows_processed INTEGER DEFAULT 0,
    rows_total INTEGER DEFAULT 0,
    rows_success INTEGER DEFAULT 0,
    rows_failed INTEGER DEFAULT 0,
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    CONSTRAINT chk_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    CONSTRAINT fk_uploaded_by_user FOREIGN KEY (uploaded_by_user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Indexes for uploaded_files
CREATE INDEX idx_uploaded_files_status ON uploaded_files(status);
CREATE INDEX idx_uploaded_files_uploaded_by ON uploaded_files(uploaded_by_user_id);
CREATE INDEX idx_uploaded_files_upload_timestamp ON uploaded_files(upload_timestamp DESC);
CREATE INDEX idx_uploaded_files_filename ON uploaded_files(filename);

-- =====================================================
-- 2. File Processing Errors Table
-- =====================================================
-- Detailed error logs for each file processing
CREATE TABLE IF NOT EXISTS file_processing_errors (
    error_id SERIAL PRIMARY KEY,
    file_id INTEGER NOT NULL,
    row_number INTEGER,
    error_type VARCHAR(50),
    error_message TEXT,
    error_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_file_processing_errors_file FOREIGN KEY (file_id) REFERENCES uploaded_files(file_id) ON DELETE CASCADE
);

-- Indexes for file_processing_errors
CREATE INDEX idx_file_processing_errors_file_id ON file_processing_errors(file_id);
CREATE INDEX idx_file_processing_errors_type ON file_processing_errors(error_type);

-- =====================================================
-- 3. Bulk Operations Log Table
-- =====================================================
-- Tracks bulk member manipulation operations
CREATE TABLE IF NOT EXISTS bulk_operations_log (
    operation_id SERIAL PRIMARY KEY,
    operation_type VARCHAR(50) NOT NULL,
    performed_by_user_id INTEGER NOT NULL,
    member_ids INTEGER[],
    total_members INTEGER NOT NULL,
    successful_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    operation_details JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_operation_type CHECK (operation_type IN ('status_update', 'bulk_delete', 'bulk_update')),
    CONSTRAINT chk_operation_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
    CONSTRAINT fk_bulk_operations_user FOREIGN KEY (performed_by_user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Indexes for bulk_operations_log
CREATE INDEX IF NOT EXISTS idx_bulk_operations_type ON bulk_operations_log(operation_type);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_user ON bulk_operations_log(performed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_started_at ON bulk_operations_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_status ON bulk_operations_log(status);

-- =====================================================
-- 4. Update Trigger for updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_uploaded_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_uploaded_files_updated_at
    BEFORE UPDATE ON uploaded_files
    FOR EACH ROW
    EXECUTE FUNCTION update_uploaded_files_updated_at();

-- =====================================================
-- 5. Grant Permissions
-- =====================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON uploaded_files TO eff_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON file_processing_errors TO eff_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON bulk_operations_log TO eff_admin;
GRANT USAGE, SELECT ON SEQUENCE uploaded_files_file_id_seq TO eff_admin;
GRANT USAGE, SELECT ON SEQUENCE file_processing_errors_error_id_seq TO eff_admin;
GRANT USAGE, SELECT ON SEQUENCE bulk_operations_log_operation_id_seq TO eff_admin;

COMMIT;

-- =====================================================
-- Success Message
-- =====================================================
SELECT 'Self Data Management tables created successfully!' as status;

