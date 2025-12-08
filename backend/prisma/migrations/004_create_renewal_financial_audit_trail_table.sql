-- Migration: Create renewal_financial_audit_trail table
-- Date: 2025-10-21
-- Purpose: Track financial review actions for renewals

CREATE TABLE IF NOT EXISTS renewal_financial_audit_trail (
    id SERIAL PRIMARY KEY,
    renewal_id INT NOT NULL REFERENCES membership_renewals(renewal_id) ON DELETE CASCADE,
    member_id INT NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    workflow_stage_before VARCHAR(50),
    workflow_stage_after VARCHAR(50),
    financial_status_before VARCHAR(50),
    financial_status_after VARCHAR(50),
    reviewed_by INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reviewer_role VARCHAR(50) NOT NULL,
    review_action VARCHAR(100) NOT NULL,
    amount_reviewed DECIMAL(10, 2),
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    approval_status VARCHAR(50),
    rejection_reason TEXT,
    reviewer_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_reviewer_role CHECK (reviewer_role IN ('financial_reviewer', 'membership_approver', 'admin', 'system')),
    CONSTRAINT chk_review_action CHECK (review_action IN (
        'review_started', 'payment_verified', 'payment_rejected',
        'approved', 'rejected', 'amount_adjusted', 'status_changed',
        'notes_added', 'document_verified'
    )),
    CONSTRAINT chk_approval_status CHECK (approval_status IN ('pending', 'approved', 'rejected', 'under_review'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_renewal_financial_audit_trail_renewal_id ON renewal_financial_audit_trail(renewal_id);
CREATE INDEX IF NOT EXISTS idx_renewal_financial_audit_trail_member_id ON renewal_financial_audit_trail(member_id);
CREATE INDEX IF NOT EXISTS idx_renewal_financial_audit_trail_reviewed_by ON renewal_financial_audit_trail(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_renewal_financial_audit_trail_review_action ON renewal_financial_audit_trail(review_action);
CREATE INDEX IF NOT EXISTS idx_renewal_financial_audit_trail_approval_status ON renewal_financial_audit_trail(approval_status);
CREATE INDEX IF NOT EXISTS idx_renewal_financial_audit_trail_created_at ON renewal_financial_audit_trail(created_at);

-- Add comments
COMMENT ON TABLE renewal_financial_audit_trail IS 'Audit trail for financial review actions on membership renewals';
COMMENT ON COLUMN renewal_financial_audit_trail.renewal_id IS 'Foreign key to membership_renewals';
COMMENT ON COLUMN renewal_financial_audit_trail.member_id IS 'Foreign key to members';
COMMENT ON COLUMN renewal_financial_audit_trail.workflow_stage_before IS 'Workflow stage before the action';
COMMENT ON COLUMN renewal_financial_audit_trail.workflow_stage_after IS 'Workflow stage after the action';
COMMENT ON COLUMN renewal_financial_audit_trail.financial_status_before IS 'Financial status before the action';
COMMENT ON COLUMN renewal_financial_audit_trail.financial_status_after IS 'Financial status after the action';
COMMENT ON COLUMN renewal_financial_audit_trail.reviewed_by IS 'User who performed the review';
COMMENT ON COLUMN renewal_financial_audit_trail.reviewer_role IS 'Role of the reviewer';
COMMENT ON COLUMN renewal_financial_audit_trail.review_action IS 'Action performed during review';
COMMENT ON COLUMN renewal_financial_audit_trail.amount_reviewed IS 'Amount reviewed/verified';
COMMENT ON COLUMN renewal_financial_audit_trail.payment_method IS 'Payment method used';
COMMENT ON COLUMN renewal_financial_audit_trail.payment_reference IS 'Payment reference number';
COMMENT ON COLUMN renewal_financial_audit_trail.approval_status IS 'Current approval status';
COMMENT ON COLUMN renewal_financial_audit_trail.rejection_reason IS 'Reason for rejection if applicable';
COMMENT ON COLUMN renewal_financial_audit_trail.reviewer_notes IS 'Notes from the reviewer';

