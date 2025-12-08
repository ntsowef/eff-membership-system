-- Migration: Add workflow fields to membership_applications table
-- Date: 2025-10-21
-- Purpose: Support two-tier approval workflow for membership applications

-- Add workflow fields to membership_applications table
ALTER TABLE membership_applications
ADD COLUMN IF NOT EXISTS workflow_stage VARCHAR(50) DEFAULT 'Submitted',
ADD COLUMN IF NOT EXISTS financial_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS financial_reviewed_by INT REFERENCES users(user_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS financial_reviewed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS financial_rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS financial_admin_notes TEXT,
ADD COLUMN IF NOT EXISTS final_reviewed_by INT REFERENCES users(user_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS final_reviewed_at TIMESTAMP;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_membership_applications_workflow_stage ON membership_applications(workflow_stage);
CREATE INDEX IF NOT EXISTS idx_membership_applications_financial_status ON membership_applications(financial_status);
CREATE INDEX IF NOT EXISTS idx_membership_applications_financial_reviewed_by ON membership_applications(financial_reviewed_by);
CREATE INDEX IF NOT EXISTS idx_membership_applications_final_reviewed_by ON membership_applications(final_reviewed_by);

-- Add comments
COMMENT ON COLUMN membership_applications.workflow_stage IS 'Current workflow stage: Submitted, Financial Review, Payment Approved, Final Review, Approved, Rejected';
COMMENT ON COLUMN membership_applications.financial_status IS 'Financial review status: Pending, Under Review, Approved, Rejected';
COMMENT ON COLUMN membership_applications.financial_reviewed_by IS 'User ID of financial reviewer';
COMMENT ON COLUMN membership_applications.financial_reviewed_at IS 'Timestamp when financial review was completed';
COMMENT ON COLUMN membership_applications.financial_rejection_reason IS 'Reason for financial rejection';
COMMENT ON COLUMN membership_applications.financial_admin_notes IS 'Notes from financial reviewer';
COMMENT ON COLUMN membership_applications.final_reviewed_by IS 'User ID of final reviewer';
COMMENT ON COLUMN membership_applications.final_reviewed_at IS 'Timestamp when final review was completed';

