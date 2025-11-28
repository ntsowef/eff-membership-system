-- =====================================================================================
-- RENEWAL ADMINISTRATIVE TOOLS - DATABASE TABLES
-- =====================================================================================
-- Purpose: Create tables for renewal administrative tools including:
--   - Manual renewal processing
--   - Approval workflow management
--   - Audit trail and history tracking
--   - Bulk operations and exports
-- =====================================================================================

-- =====================================================================================
-- 1. RENEWAL APPROVAL WORKFLOW TABLES
-- =====================================================================================

-- Renewal Approvals Table (for manual approval workflow)
CREATE TABLE IF NOT EXISTS renewal_approvals (
    approval_id SERIAL PRIMARY KEY,
    renewal_id INTEGER NOT NULL REFERENCES membership_renewals(renewal_id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    
    -- Approval workflow
    approval_status VARCHAR(20) CHECK (approval_status IN ('Pending', 'Under Review', 'Approved', 'Rejected', 'Escalated')) NOT NULL DEFAULT 'Pending',
    approval_level VARCHAR(20) CHECK (approval_level IN ('Level 1', 'Level 2', 'Supervisor', 'Manager')) NOT NULL DEFAULT 'Level 1',
    
    -- Review details
    requires_manual_review BOOLEAN DEFAULT FALSE,
    review_reason TEXT,
    review_priority VARCHAR(20) CHECK (review_priority IN ('Low', 'Normal', 'High', 'Urgent')) DEFAULT 'Normal',
    
    -- Reviewer information
    assigned_to INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    reviewed_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    approved_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    rejected_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    
    -- Decision details
    approval_notes TEXT,
    rejection_reason TEXT,
    admin_comments TEXT,
    
    -- Timestamps
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_at TIMESTAMP,
    reviewed_at TIMESTAMP,
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(renewal_id)
);

-- Create indexes for renewal approvals
CREATE INDEX IF NOT EXISTS idx_renewal_approvals_status ON renewal_approvals(approval_status);
CREATE INDEX IF NOT EXISTS idx_renewal_approvals_level ON renewal_approvals(approval_level);
CREATE INDEX IF NOT EXISTS idx_renewal_approvals_priority ON renewal_approvals(review_priority);
CREATE INDEX IF NOT EXISTS idx_renewal_approvals_assigned ON renewal_approvals(assigned_to);
CREATE INDEX IF NOT EXISTS idx_renewal_approvals_reviewed ON renewal_approvals(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_renewal_approvals_submitted ON renewal_approvals(submitted_at);

-- =====================================================================================
-- 2. RENEWAL AUDIT TRAIL TABLES
-- =====================================================================================

-- Comprehensive Renewal Audit Trail Table
CREATE TABLE IF NOT EXISTS renewal_audit_trail (
    audit_id SERIAL PRIMARY KEY,
    renewal_id INTEGER NOT NULL REFERENCES membership_renewals(renewal_id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    
    -- Action details
    action_type VARCHAR(50) NOT NULL,
    action_category VARCHAR(30) CHECK (action_category IN ('Status Change', 'Payment', 'Approval', 'Manual Processing', 'System', 'Bulk Operation', 'Export')) NOT NULL,
    action_description TEXT NOT NULL,
    
    -- State changes
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    previous_payment_status VARCHAR(50),
    new_payment_status VARCHAR(50),
    
    -- Financial changes
    previous_amount DECIMAL(10,2),
    new_amount DECIMAL(10,2),
    amount_difference DECIMAL(10,2),
    
    -- User context
    performed_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    user_role VARCHAR(50),
    user_email VARCHAR(255),
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    
    -- Additional data
    metadata JSONB,
    old_values JSONB,
    new_values JSONB,
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for renewal audit trail
CREATE INDEX IF NOT EXISTS idx_renewal_audit_renewal ON renewal_audit_trail(renewal_id);
CREATE INDEX IF NOT EXISTS idx_renewal_audit_member ON renewal_audit_trail(member_id);
CREATE INDEX IF NOT EXISTS idx_renewal_audit_action ON renewal_audit_trail(action_type);
CREATE INDEX IF NOT EXISTS idx_renewal_audit_category ON renewal_audit_trail(action_category);
CREATE INDEX IF NOT EXISTS idx_renewal_audit_user ON renewal_audit_trail(performed_by);
CREATE INDEX IF NOT EXISTS idx_renewal_audit_created ON renewal_audit_trail(created_at);
CREATE INDEX IF NOT EXISTS idx_renewal_audit_session ON renewal_audit_trail(session_id);

-- =====================================================================================
-- 3. BULK OPERATIONS TRACKING TABLES
-- =====================================================================================

-- Bulk Operations Table
CREATE TABLE IF NOT EXISTS renewal_bulk_operations (
    operation_id SERIAL PRIMARY KEY,
    operation_uuid VARCHAR(100) UNIQUE NOT NULL,
    
    -- Operation details
    operation_type VARCHAR(50) CHECK (operation_type IN ('Bulk Approve', 'Bulk Reject', 'Bulk Process', 'Bulk Export', 'Bulk Update', 'Bulk Delete', 'Bulk Reminder')) NOT NULL,
    operation_status VARCHAR(20) CHECK (operation_status IN ('Queued', 'Processing', 'Completed', 'Failed', 'Cancelled', 'Partial')) DEFAULT 'Queued',
    
    -- Scope
    total_items INTEGER NOT NULL DEFAULT 0,
    processed_items INTEGER NOT NULL DEFAULT 0,
    successful_items INTEGER NOT NULL DEFAULT 0,
    failed_items INTEGER NOT NULL DEFAULT 0,
    
    -- Progress
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    current_item INTEGER DEFAULT 0,
    
    -- Filters applied
    filter_criteria JSONB,
    selected_renewal_ids JSONB, -- Array of renewal IDs
    
    -- Results
    operation_result JSONB,
    error_log JSONB,
    success_log JSONB,
    
    -- User context
    initiated_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    user_role VARCHAR(50),
    
    -- Timestamps
    queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for bulk operations
CREATE INDEX IF NOT EXISTS idx_bulk_ops_uuid ON renewal_bulk_operations(operation_uuid);
CREATE INDEX IF NOT EXISTS idx_bulk_ops_type ON renewal_bulk_operations(operation_type);
CREATE INDEX IF NOT EXISTS idx_bulk_ops_status ON renewal_bulk_operations(operation_status);
CREATE INDEX IF NOT EXISTS idx_bulk_ops_user ON renewal_bulk_operations(initiated_by);
CREATE INDEX IF NOT EXISTS idx_bulk_ops_created ON renewal_bulk_operations(created_at);

-- Bulk Operation Items Table (detailed tracking)
CREATE TABLE IF NOT EXISTS renewal_bulk_operation_items (
    item_id SERIAL PRIMARY KEY,
    operation_id INTEGER NOT NULL REFERENCES renewal_bulk_operations(operation_id) ON DELETE CASCADE,
    renewal_id INTEGER NOT NULL REFERENCES membership_renewals(renewal_id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    
    -- Item status
    item_status VARCHAR(20) CHECK (item_status IN ('Pending', 'Processing', 'Success', 'Failed', 'Skipped')) DEFAULT 'Pending',
    
    -- Processing details
    processing_order INTEGER,
    error_message TEXT,
    success_message TEXT,
    
    -- State before operation
    previous_state JSONB,
    new_state JSONB,
    
    -- Timestamps
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for bulk operation items
CREATE INDEX IF NOT EXISTS idx_bulk_items_operation ON renewal_bulk_operation_items(operation_id);
CREATE INDEX IF NOT EXISTS idx_bulk_items_renewal ON renewal_bulk_operation_items(renewal_id);
CREATE INDEX IF NOT EXISTS idx_bulk_items_status ON renewal_bulk_operation_items(item_status);
CREATE INDEX IF NOT EXISTS idx_bulk_items_order ON renewal_bulk_operation_items(operation_id, processing_order);

-- =====================================================================================
-- 4. EXPORT TRACKING TABLES
-- =====================================================================================

-- Export Jobs Table
CREATE TABLE IF NOT EXISTS renewal_export_jobs (
    export_id SERIAL PRIMARY KEY,
    export_uuid VARCHAR(100) UNIQUE NOT NULL,
    
    -- Export details
    export_type VARCHAR(50) CHECK (export_type IN ('Excel', 'CSV', 'PDF', 'JSON', 'ZIP')) NOT NULL,
    export_format VARCHAR(20) CHECK (export_format IN ('Standard', 'Detailed', 'Summary', 'Audit', 'Financial')) NOT NULL DEFAULT 'Standard',
    export_status VARCHAR(20) CHECK (export_status IN ('Queued', 'Processing', 'Completed', 'Failed', 'Expired')) DEFAULT 'Queued',
    
    -- Scope
    filter_criteria JSONB,
    total_records INTEGER DEFAULT 0,
    
    -- File details
    file_name VARCHAR(255),
    file_path TEXT,
    file_size BIGINT,
    download_url TEXT,
    
    -- Expiration
    expires_at TIMESTAMP,
    downloaded_at TIMESTAMP,
    download_count INTEGER DEFAULT 0,
    
    -- User context
    requested_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    user_role VARCHAR(50),
    
    -- Processing
    processing_time_ms INTEGER,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for export jobs
CREATE INDEX IF NOT EXISTS idx_export_uuid ON renewal_export_jobs(export_uuid);
CREATE INDEX IF NOT EXISTS idx_export_status ON renewal_export_jobs(export_status);
CREATE INDEX IF NOT EXISTS idx_export_user ON renewal_export_jobs(requested_by);
CREATE INDEX IF NOT EXISTS idx_export_created ON renewal_export_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_export_expires ON renewal_export_jobs(expires_at);

-- =====================================================================================
-- 5. MANUAL PROCESSING NOTES TABLE
-- =====================================================================================

-- Manual Processing Notes Table
CREATE TABLE IF NOT EXISTS renewal_manual_notes (
    note_id SERIAL PRIMARY KEY,
    renewal_id INTEGER NOT NULL REFERENCES membership_renewals(renewal_id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    
    -- Note details
    note_type VARCHAR(30) CHECK (note_type IN ('General', 'Issue', 'Resolution', 'Follow-up', 'Escalation', 'Admin')) NOT NULL DEFAULT 'General',
    note_priority VARCHAR(20) CHECK (note_priority IN ('Low', 'Normal', 'High', 'Critical')) DEFAULT 'Normal',
    note_content TEXT NOT NULL,
    
    -- Visibility
    is_internal BOOLEAN DEFAULT TRUE,
    is_visible_to_member BOOLEAN DEFAULT FALSE,
    
    -- Follow-up
    requires_follow_up BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    follow_up_completed BOOLEAN DEFAULT FALSE,
    follow_up_completed_at TIMESTAMP,
    
    -- User context
    created_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    user_role VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for manual notes
CREATE INDEX IF NOT EXISTS idx_manual_notes_renewal ON renewal_manual_notes(renewal_id);
CREATE INDEX IF NOT EXISTS idx_manual_notes_member ON renewal_manual_notes(member_id);
CREATE INDEX IF NOT EXISTS idx_manual_notes_type ON renewal_manual_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_manual_notes_priority ON renewal_manual_notes(note_priority);
CREATE INDEX IF NOT EXISTS idx_manual_notes_follow_up ON renewal_manual_notes(requires_follow_up, follow_up_completed);
CREATE INDEX IF NOT EXISTS idx_manual_notes_created ON renewal_manual_notes(created_at);

-- =====================================================================================
-- 6. TRIGGERS FOR UPDATED_AT COLUMNS
-- =====================================================================================

-- Apply triggers to all new tables
CREATE TRIGGER update_renewal_approvals_updated_at 
    BEFORE UPDATE ON renewal_approvals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_renewal_bulk_operations_updated_at 
    BEFORE UPDATE ON renewal_bulk_operations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_renewal_export_jobs_updated_at 
    BEFORE UPDATE ON renewal_export_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_renewal_manual_notes_updated_at 
    BEFORE UPDATE ON renewal_manual_notes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- 7. USEFUL VIEWS FOR ADMINISTRATIVE TOOLS
-- =====================================================================================

-- View: Renewals Pending Approval
CREATE OR REPLACE VIEW vw_renewals_pending_approval AS
SELECT 
    ra.approval_id,
    ra.renewal_id,
    ra.member_id,
    ra.approval_status,
    ra.approval_level,
    ra.review_priority,
    ra.submitted_at,
    ra.assigned_to,
    mr.renewal_year,
    mr.renewal_status,
    mr.payment_status,
    mr.renewal_amount,
    CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as member_name,
    m.email_address as member_email,
    m.cell_number as member_phone,
    u.name as assigned_to_name,
    EXTRACT(DAY FROM (CURRENT_TIMESTAMP - ra.submitted_at)) as days_pending
FROM renewal_approvals ra
JOIN membership_renewals mr ON ra.renewal_id = mr.renewal_id
JOIN members m ON ra.member_id = m.member_id
LEFT JOIN users u ON ra.assigned_to = u.user_id
WHERE ra.approval_status IN ('Pending', 'Under Review')
ORDER BY ra.review_priority DESC, ra.submitted_at ASC;

SELECT 'Renewal Administrative Tools Tables Created Successfully!' as result;

