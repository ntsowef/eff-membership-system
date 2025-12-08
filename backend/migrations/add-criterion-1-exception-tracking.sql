-- =====================================================
-- Add Criterion 1 Exception Tracking
-- =====================================================
-- This migration adds fields to track exceptions for Criterion 1
-- based on the new VD compliance rules and membership thresholds
-- =====================================================

-- =====================================================
-- STEP 1: Add exception tracking fields to wards table
-- =====================================================
ALTER TABLE wards 
ADD COLUMN IF NOT EXISTS criterion_1_exception_granted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS criterion_1_exception_reason TEXT,
ADD COLUMN IF NOT EXISTS criterion_1_exception_granted_by INTEGER,
ADD COLUMN IF NOT EXISTS criterion_1_exception_granted_at TIMESTAMP;

-- Add foreign key for exception granter
ALTER TABLE wards
ADD CONSTRAINT fk_wards_criterion_1_exception_granter
FOREIGN KEY (criterion_1_exception_granted_by)
REFERENCES users(user_id)
ON DELETE SET NULL;

-- Add index for exception queries
CREATE INDEX IF NOT EXISTS idx_wards_criterion_1_exception ON wards(criterion_1_exception_granted);

-- =====================================================
-- STEP 2: Add exception tracking to ward_compliance_audit_log
-- =====================================================
ALTER TABLE ward_compliance_audit_log
ADD COLUMN IF NOT EXISTS criterion_1_exception_granted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS criterion_1_exception_reason TEXT;

-- =====================================================
-- STEP 3: Add comments for documentation
-- =====================================================
COMMENT ON COLUMN wards.criterion_1_exception_granted IS 'Whether an exception was granted for Criterion 1 compliance';
COMMENT ON COLUMN wards.criterion_1_exception_reason IS 'Reason for granting Criterion 1 exception';
COMMENT ON COLUMN wards.criterion_1_exception_granted_by IS 'User ID who granted the exception';
COMMENT ON COLUMN wards.criterion_1_exception_granted_at IS 'Timestamp when exception was granted';

-- =====================================================
-- STEP 4: Verify migration
-- =====================================================
SELECT 'Criterion 1 exception tracking fields added successfully' as status;

