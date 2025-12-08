-- Add Renewal Approval Workflow Fields
-- This migration adds fields to support the approval workflow for membership renewals

START TRANSACTION;

-- Add approval tracking fields to membership_renewals table
ALTER TABLE membership_renewals
ADD COLUMN IF NOT EXISTS approved_by INT NULL COMMENT 'User ID of admin who approved the renewal',
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL COMMENT 'Timestamp when renewal was approved',
ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL COMMENT 'Reason for rejection if renewal was rejected',
ADD COLUMN IF NOT EXISTS rejected_by INT NULL COMMENT 'User ID of admin who rejected the renewal',
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP NULL COMMENT 'Timestamp when renewal was rejected';

-- Add foreign key constraints for approval tracking
ALTER TABLE membership_renewals
ADD CONSTRAINT fk_renewal_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_renewal_rejected_by FOREIGN KEY (rejected_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_renewal_approved_by ON membership_renewals(approved_by);
CREATE INDEX IF NOT EXISTS idx_renewal_rejected_by ON membership_renewals(rejected_by);
CREATE INDEX IF NOT EXISTS idx_renewal_approved_at ON membership_renewals(approved_at);

-- Add previous and new expiry date fields if they don't exist
ALTER TABLE membership_renewals
ADD COLUMN IF NOT EXISTS previous_expiry_date DATE NULL COMMENT 'Membership expiry date before renewal',
ADD COLUMN IF NOT EXISTS new_expiry_date DATE NULL COMMENT 'New membership expiry date after renewal';

COMMIT;

-- Rollback script (for reference, not executed)
-- ALTER TABLE membership_renewals
-- DROP FOREIGN KEY IF EXISTS fk_renewal_approved_by,
-- DROP FOREIGN KEY IF EXISTS fk_renewal_rejected_by,
-- DROP INDEX IF EXISTS idx_renewal_approved_by,
-- DROP INDEX IF EXISTS idx_renewal_rejected_by,
-- DROP INDEX IF EXISTS idx_renewal_approved_at,
-- DROP COLUMN IF EXISTS approved_by,
-- DROP COLUMN IF EXISTS approved_at,
-- DROP COLUMN IF EXISTS rejection_reason,
-- DROP COLUMN IF EXISTS rejected_by,
-- DROP COLUMN IF EXISTS rejected_at,
-- DROP COLUMN IF EXISTS previous_expiry_date,
-- DROP COLUMN IF EXISTS new_expiry_date;

