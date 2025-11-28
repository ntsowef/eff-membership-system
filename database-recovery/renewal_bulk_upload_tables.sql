-- =====================================================================================
-- RENEWAL BULK UPLOAD SYSTEM - DATABASE TABLES
-- =====================================================================================
-- Purpose: Support bulk upload of membership renewals with fraud detection
-- =====================================================================================

-- =====================================================================================
-- 1. BULK UPLOAD TRACKING TABLE
-- =====================================================================================

CREATE TABLE IF NOT EXISTS renewal_bulk_uploads (
    upload_id SERIAL PRIMARY KEY,
    upload_uuid VARCHAR(100) UNIQUE NOT NULL,
    
    -- File details
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(10) CHECK (file_type IN ('Excel', 'CSV')) NOT NULL,
    file_size BIGINT NOT NULL,
    
    -- Upload context
    uploaded_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    user_role VARCHAR(50),
    province_code VARCHAR(10),
    
    -- Processing status
    upload_status VARCHAR(20) CHECK (upload_status IN ('Uploaded', 'Validating', 'Processing', 'Completed', 'Failed', 'Cancelled')) DEFAULT 'Uploaded',
    
    -- Statistics
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    successful_renewals INTEGER DEFAULT 0,
    failed_validations INTEGER DEFAULT 0,
    fraud_detected INTEGER DEFAULT 0,
    early_renewals INTEGER DEFAULT 0,
    inactive_renewals INTEGER DEFAULT 0,
    
    -- Progress
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    current_row INTEGER DEFAULT 0,
    
    -- Results
    validation_errors JSONB,
    fraud_cases JSONB,
    processing_summary JSONB,
    
    -- Timestamps
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    validation_started_at TIMESTAMP,
    validation_completed_at TIMESTAMP,
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bulk_uploads_uuid ON renewal_bulk_uploads(upload_uuid);
CREATE INDEX IF NOT EXISTS idx_bulk_uploads_status ON renewal_bulk_uploads(upload_status);
CREATE INDEX IF NOT EXISTS idx_bulk_uploads_user ON renewal_bulk_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_bulk_uploads_province ON renewal_bulk_uploads(province_code);
CREATE INDEX IF NOT EXISTS idx_bulk_uploads_created ON renewal_bulk_uploads(created_at);

-- =====================================================================================
-- 2. BULK UPLOAD RECORDS TABLE
-- =====================================================================================

CREATE TABLE IF NOT EXISTS renewal_bulk_upload_records (
    record_id SERIAL PRIMARY KEY,
    upload_id INTEGER NOT NULL REFERENCES renewal_bulk_uploads(upload_id) ON DELETE CASCADE,
    
    -- Row information
    row_number INTEGER NOT NULL,
    
    -- Member information from spreadsheet
    member_id_number VARCHAR(20),
    member_firstname VARCHAR(100),
    member_surname VARCHAR(100),
    member_email VARCHAR(255),
    member_phone VARCHAR(20),
    
    -- Renewal information from spreadsheet
    renewal_ward_code VARCHAR(20),
    renewal_ward_name VARCHAR(255),
    renewal_amount DECIMAL(10,2),
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    payment_date DATE,
    
    -- Processing status
    record_status VARCHAR(20) CHECK (record_status IN ('Pending', 'Validating', 'Valid', 'Invalid', 'Fraud', 'Processed', 'Failed')) DEFAULT 'Pending',
    
    -- Validation results
    validation_passed BOOLEAN DEFAULT FALSE,
    validation_errors JSONB,
    
    -- Fraud detection
    fraud_detected BOOLEAN DEFAULT FALSE,
    fraud_type VARCHAR(50),
    fraud_details JSONB,
    
    -- Member lookup results
    found_member_id INTEGER,
    found_member_name VARCHAR(255),
    current_ward_code VARCHAR(20),
    current_ward_name VARCHAR(255),
    current_membership_status VARCHAR(50),
    membership_expiry_date DATE,
    
    -- Renewal categorization
    renewal_type VARCHAR(20) CHECK (renewal_type IN ('Early', 'Inactive', 'New')) DEFAULT NULL,
    
    -- Processing results
    created_renewal_id INTEGER,
    processing_error TEXT,
    
    -- Timestamps
    validated_at TIMESTAMP,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_upload_records_upload ON renewal_bulk_upload_records(upload_id);
CREATE INDEX IF NOT EXISTS idx_upload_records_status ON renewal_bulk_upload_records(record_status);
CREATE INDEX IF NOT EXISTS idx_upload_records_fraud ON renewal_bulk_upload_records(fraud_detected);
CREATE INDEX IF NOT EXISTS idx_upload_records_member ON renewal_bulk_upload_records(found_member_id);
CREATE INDEX IF NOT EXISTS idx_upload_records_row ON renewal_bulk_upload_records(upload_id, row_number);

-- =====================================================================================
-- 3. FRAUD DETECTION CASES TABLE
-- =====================================================================================

CREATE TABLE IF NOT EXISTS renewal_fraud_cases (
    fraud_case_id SERIAL PRIMARY KEY,
    upload_id INTEGER NOT NULL REFERENCES renewal_bulk_uploads(upload_id) ON DELETE CASCADE,
    record_id INTEGER NOT NULL REFERENCES renewal_bulk_upload_records(record_id) ON DELETE CASCADE,
    
    -- Fraud details
    fraud_type VARCHAR(50) CHECK (fraud_type IN ('Ward Mismatch', 'Duplicate Renewal', 'Invalid Member', 'Payment Mismatch', 'Other')) NOT NULL,
    fraud_severity VARCHAR(20) CHECK (fraud_severity IN ('Low', 'Medium', 'High', 'Critical')) DEFAULT 'Medium',
    
    -- Member information
    member_id INTEGER,
    member_id_number VARCHAR(20),
    member_name VARCHAR(255),
    
    -- Ward mismatch details
    current_ward_code VARCHAR(20),
    current_ward_name VARCHAR(255),
    attempted_ward_code VARCHAR(20),
    attempted_ward_name VARCHAR(255),
    
    -- Additional details
    fraud_description TEXT NOT NULL,
    fraud_evidence JSONB,
    
    -- Status
    case_status VARCHAR(20) CHECK (case_status IN ('Detected', 'Under Review', 'Confirmed', 'False Positive', 'Resolved')) DEFAULT 'Detected',
    
    -- Review
    reviewed_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    
    -- Resolution
    resolution_action VARCHAR(50),
    resolved_at TIMESTAMP,
    
    -- Timestamps
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fraud_cases_upload ON renewal_fraud_cases(upload_id);
CREATE INDEX IF NOT EXISTS idx_fraud_cases_record ON renewal_fraud_cases(record_id);
CREATE INDEX IF NOT EXISTS idx_fraud_cases_type ON renewal_fraud_cases(fraud_type);
CREATE INDEX IF NOT EXISTS idx_fraud_cases_severity ON renewal_fraud_cases(fraud_severity);
CREATE INDEX IF NOT EXISTS idx_fraud_cases_status ON renewal_fraud_cases(case_status);
CREATE INDEX IF NOT EXISTS idx_fraud_cases_member ON renewal_fraud_cases(member_id);
CREATE INDEX IF NOT EXISTS idx_fraud_cases_detected ON renewal_fraud_cases(detected_at);

-- =====================================================================================
-- 4. UPLOAD VALIDATION RULES TABLE
-- =====================================================================================

CREATE TABLE IF NOT EXISTS renewal_upload_validation_rules (
    rule_id SERIAL PRIMARY KEY,
    rule_name VARCHAR(100) UNIQUE NOT NULL,
    rule_type VARCHAR(50) CHECK (rule_type IN ('Required Field', 'Format', 'Business Logic', 'Fraud Detection')) NOT NULL,
    rule_description TEXT NOT NULL,
    
    -- Rule configuration
    is_active BOOLEAN DEFAULT TRUE,
    severity VARCHAR(20) CHECK (severity IN ('Error', 'Warning', 'Info')) DEFAULT 'Error',
    rule_config JSONB,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default validation rules
INSERT INTO renewal_upload_validation_rules (rule_name, rule_type, rule_description, severity, rule_config) VALUES
('member_id_required', 'Required Field', 'Member ID number is required', 'Error', '{"field": "member_id_number"}'),
('ward_code_required', 'Required Field', 'Ward code is required', 'Error', '{"field": "renewal_ward_code"}'),
('payment_amount_required', 'Required Field', 'Payment amount is required', 'Error', '{"field": "renewal_amount"}'),
('member_exists', 'Business Logic', 'Member must exist in database', 'Error', '{"check": "member_lookup"}'),
('ward_mismatch_detection', 'Fraud Detection', 'Detect ward mismatch fraud', 'Error', '{"check": "ward_comparison"}'),
('duplicate_renewal', 'Fraud Detection', 'Detect duplicate renewal attempts', 'Error', '{"check": "duplicate_check"}'),
('payment_amount_valid', 'Business Logic', 'Payment amount must match renewal fee', 'Warning', '{"check": "amount_validation"}')
ON CONFLICT (rule_name) DO NOTHING;

-- =====================================================================================
-- 5. TRIGGERS
-- =====================================================================================

CREATE TRIGGER update_renewal_bulk_uploads_updated_at 
    BEFORE UPDATE ON renewal_bulk_uploads 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_renewal_fraud_cases_updated_at 
    BEFORE UPDATE ON renewal_fraud_cases 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_renewal_upload_validation_rules_updated_at 
    BEFORE UPDATE ON renewal_upload_validation_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- 6. USEFUL VIEWS
-- =====================================================================================

-- View: Fraud Cases Summary
CREATE OR REPLACE VIEW vw_fraud_cases_summary AS
SELECT 
    rfc.fraud_case_id,
    rfc.fraud_type,
    rfc.fraud_severity,
    rfc.case_status,
    rfc.member_id_number,
    rfc.member_name,
    rfc.current_ward_code,
    rfc.current_ward_name,
    rfc.attempted_ward_code,
    rfc.attempted_ward_name,
    rfc.fraud_description,
    rfc.detected_at,
    rbu.upload_uuid,
    rbu.file_name,
    rbu.uploaded_by,
    u.name as uploaded_by_name,
    rfc.reviewed_by,
    reviewer.name as reviewed_by_name
FROM renewal_fraud_cases rfc
JOIN renewal_bulk_uploads rbu ON rfc.upload_id = rbu.upload_id
LEFT JOIN users u ON rbu.uploaded_by = u.user_id
LEFT JOIN users reviewer ON rfc.reviewed_by = reviewer.user_id
ORDER BY rfc.detected_at DESC;

-- View: Upload Progress Summary
CREATE OR REPLACE VIEW vw_upload_progress_summary AS
SELECT 
    rbu.upload_id,
    rbu.upload_uuid,
    rbu.file_name,
    rbu.upload_status,
    rbu.total_records,
    rbu.processed_records,
    rbu.successful_renewals,
    rbu.failed_validations,
    rbu.fraud_detected,
    rbu.early_renewals,
    rbu.inactive_renewals,
    rbu.progress_percentage,
    rbu.uploaded_at,
    rbu.processing_completed_at,
    u.name as uploaded_by_name,
    u.email as uploaded_by_email,
    EXTRACT(EPOCH FROM (COALESCE(rbu.processing_completed_at, CURRENT_TIMESTAMP) - rbu.uploaded_at)) as processing_time_seconds
FROM renewal_bulk_uploads rbu
LEFT JOIN users u ON rbu.uploaded_by = u.user_id
ORDER BY rbu.uploaded_at DESC;

SELECT 'Renewal Bulk Upload Tables Created Successfully!' as result;

