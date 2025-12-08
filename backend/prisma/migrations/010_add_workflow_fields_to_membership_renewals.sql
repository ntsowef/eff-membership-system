-- Migration: Add workflow fields to membership_renewals table
-- Date: 2025-10-21
-- Purpose: Add two-tier approval workflow fields to membership renewals

-- Add workflow fields to membership_renewals table
ALTER TABLE membership_renewals
ADD COLUMN IF NOT EXISTS workflow_stage VARCHAR(50) DEFAULT 'Submitted',
ADD COLUMN IF NOT EXISTS financial_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS financial_reviewed_by INT REFERENCES users(user_id),
ADD COLUMN IF NOT EXISTS financial_reviewed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS financial_rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS financial_admin_notes TEXT,
ADD COLUMN IF NOT EXISTS final_reviewed_by INT REFERENCES users(user_id),
ADD COLUMN IF NOT EXISTS final_reviewed_at TIMESTAMP;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_membership_renewals_workflow_stage ON membership_renewals(workflow_stage);
CREATE INDEX IF NOT EXISTS idx_membership_renewals_financial_status ON membership_renewals(financial_status);
CREATE INDEX IF NOT EXISTS idx_membership_renewals_financial_reviewed_by ON membership_renewals(financial_reviewed_by);
CREATE INDEX IF NOT EXISTS idx_membership_renewals_final_reviewed_by ON membership_renewals(final_reviewed_by);

-- Add comments
COMMENT ON COLUMN membership_renewals.workflow_stage IS 'Current workflow stage: Submitted, Financial Review, Payment Approved, Payment Rejected, Processing, Approved, Rejected';
COMMENT ON COLUMN membership_renewals.financial_status IS 'Financial review status: Approved, Rejected';
COMMENT ON COLUMN membership_renewals.financial_reviewed_by IS 'User ID of financial reviewer';
COMMENT ON COLUMN membership_renewals.financial_reviewed_at IS 'Timestamp of financial review completion';
COMMENT ON COLUMN membership_renewals.financial_rejection_reason IS 'Reason for financial rejection';
COMMENT ON COLUMN membership_renewals.financial_admin_notes IS 'Admin notes from financial review';
COMMENT ON COLUMN membership_renewals.final_reviewed_by IS 'User ID of final reviewer';
COMMENT ON COLUMN membership_renewals.final_reviewed_at IS 'Timestamp of final review completion';

