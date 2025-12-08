-- Migration: Create approval_audit_trail table
-- Date: 2025-10-21
-- Purpose: Track all workflow actions for applications and renewals

CREATE TABLE IF NOT EXISTS approval_audit_trail (
    id SERIAL PRIMARY KEY,
    application_id INT REFERENCES membership_applications(application_id) ON DELETE CASCADE,
    renewal_id INT REFERENCES membership_renewals(renewal_id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    user_role VARCHAR(50) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(20) NOT NULL,
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_entity_type CHECK (entity_type IN ('application', 'renewal')),
    CONSTRAINT chk_user_role CHECK (user_role IN ('financial_reviewer', 'membership_approver', 'system', 'admin')),
    CONSTRAINT chk_action_type CHECK (action_type IN (
        'financial_review_start', 'financial_approve', 'financial_reject',
        'final_review_start', 'final_approve', 'final_reject',
        'status_change', 'payment_verified', 'document_uploaded',
        'notes_added', 'workflow_transition', 'system_action'
    )),
    -- At least one of application_id or renewal_id must be set
    CONSTRAINT chk_entity_id CHECK (
        (application_id IS NOT NULL AND renewal_id IS NULL) OR
        (application_id IS NULL AND renewal_id IS NOT NULL)
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_approval_audit_trail_application_id ON approval_audit_trail(application_id);
CREATE INDEX IF NOT EXISTS idx_approval_audit_trail_renewal_id ON approval_audit_trail(renewal_id);
CREATE INDEX IF NOT EXISTS idx_approval_audit_trail_user_id ON approval_audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_approval_audit_trail_action_type ON approval_audit_trail(action_type);
CREATE INDEX IF NOT EXISTS idx_approval_audit_trail_entity_type ON approval_audit_trail(entity_type);
CREATE INDEX IF NOT EXISTS idx_approval_audit_trail_created_at ON approval_audit_trail(created_at);

-- Add comments
COMMENT ON TABLE approval_audit_trail IS 'Audit trail for all workflow actions on applications and renewals';
COMMENT ON COLUMN approval_audit_trail.application_id IS 'Foreign key to membership_applications (nullable)';
COMMENT ON COLUMN approval_audit_trail.renewal_id IS 'Foreign key to membership_renewals (nullable)';
COMMENT ON COLUMN approval_audit_trail.user_id IS 'User who performed the action';
COMMENT ON COLUMN approval_audit_trail.user_role IS 'Role of the user: financial_reviewer, membership_approver, system, admin';
COMMENT ON COLUMN approval_audit_trail.action_type IS 'Type of action performed';
COMMENT ON COLUMN approval_audit_trail.entity_type IS 'Type of entity: application or renewal';
COMMENT ON COLUMN approval_audit_trail.notes IS 'Additional notes about the action';
COMMENT ON COLUMN approval_audit_trail.metadata IS 'Additional metadata in JSON format';

