-- =====================================================
-- Enhanced Financial Oversight System - Renewals Table Extension
-- Migration: 020_extend_renewals_financial_review.sql
-- Purpose: Add financial review workflow columns to membership_renewals table
--          to support comprehensive financial oversight for renewal payments
-- =====================================================

-- 1. Check if membership_renewals table exists, create if not
CREATE TABLE IF NOT EXISTS membership_renewals (
  renewal_id INT AUTO_INCREMENT PRIMARY KEY,
  membership_id INT NOT NULL,
  member_id INT NOT NULL,
  renewal_year INT NOT NULL,
  renewal_type ENUM('Annual', 'Partial', 'Grace', 'Late') NOT NULL DEFAULT 'Annual',
  renewal_status ENUM('Pending', 'Processing', 'Completed', 'Failed', 'Cancelled', 'Expired') NOT NULL DEFAULT 'Pending',
  renewal_due_date DATE NOT NULL,
  renewal_requested_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  renewal_processed_date TIMESTAMP NULL,
  renewal_completed_date TIMESTAMP NULL,
  grace_period_end_date DATE NULL,
  renewal_amount DECIMAL(10,2) NOT NULL DEFAULT 50.00,
  late_fee DECIMAL(10,2) DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0.00,
  final_amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NULL,
  payment_reference VARCHAR(100) NULL,
  payment_date TIMESTAMP NULL,
  payment_status ENUM('Pending', 'Processing', 'Completed', 'Failed', 'Refunded') DEFAULT 'Pending',
  processed_by INT NULL,
  renewal_notes TEXT NULL,
  auto_renewal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (membership_id) REFERENCES memberships(membership_id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_renewal_member (member_id),
  INDEX idx_renewal_year (renewal_year),
  INDEX idx_renewal_status (renewal_status),
  INDEX idx_renewal_due_date (renewal_due_date),
  INDEX idx_payment_status (payment_status)
);

-- 2. Add financial review workflow columns to membership_renewals table
ALTER TABLE membership_renewals 
ADD COLUMN IF NOT EXISTS financial_status ENUM('Pending', 'Under Review', 'Approved', 'Rejected') DEFAULT 'Pending' AFTER payment_status,
ADD COLUMN IF NOT EXISTS financial_reviewed_at TIMESTAMP NULL AFTER financial_status,
ADD COLUMN IF NOT EXISTS financial_reviewed_by INT NULL AFTER financial_reviewed_at,
ADD COLUMN IF NOT EXISTS financial_rejection_reason TEXT NULL AFTER financial_reviewed_by,
ADD COLUMN IF NOT EXISTS financial_admin_notes TEXT NULL AFTER financial_rejection_reason,
ADD COLUMN IF NOT EXISTS workflow_stage ENUM('Submitted', 'Financial Review', 'Payment Approved', 'Processing', 'Completed', 'Rejected') DEFAULT 'Submitted' AFTER financial_admin_notes;

-- 3. Add foreign key constraint for financial reviewer
ALTER TABLE membership_renewals 
ADD CONSTRAINT IF NOT EXISTS fk_renewal_financial_reviewer 
FOREIGN KEY (financial_reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

-- 4. Create indexes for performance optimization on new columns
CREATE INDEX IF NOT EXISTS idx_renewals_financial_status ON membership_renewals(financial_status);
CREATE INDEX IF NOT EXISTS idx_renewals_workflow_stage ON membership_renewals(workflow_stage);
CREATE INDEX IF NOT EXISTS idx_renewals_financial_reviewed_by ON membership_renewals(financial_reviewed_by);
CREATE INDEX IF NOT EXISTS idx_renewals_financial_reviewed_at ON membership_renewals(financial_reviewed_at);

-- 5. Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_renewals_financial_workflow ON membership_renewals(financial_status, workflow_stage);
CREATE INDEX IF NOT EXISTS idx_renewals_member_financial ON membership_renewals(member_id, financial_status);
CREATE INDEX IF NOT EXISTS idx_renewals_year_financial ON membership_renewals(renewal_year, financial_status);

-- 6. Update existing renewals to have proper workflow stages based on current status
UPDATE membership_renewals 
SET workflow_stage = CASE 
  WHEN renewal_status = 'Pending' AND payment_status = 'Pending' THEN 'Submitted'
  WHEN renewal_status = 'Processing' AND payment_status = 'Processing' THEN 'Financial Review'
  WHEN renewal_status = 'Processing' AND payment_status = 'Completed' THEN 'Payment Approved'
  WHEN renewal_status = 'Completed' THEN 'Completed'
  WHEN renewal_status = 'Failed' OR renewal_status = 'Cancelled' THEN 'Rejected'
  ELSE 'Submitted'
END,
financial_status = CASE 
  WHEN payment_status = 'Completed' THEN 'Approved'
  WHEN payment_status = 'Failed' THEN 'Rejected'
  WHEN payment_status = 'Processing' THEN 'Under Review'
  ELSE 'Pending'
END
WHERE workflow_stage IS NULL OR workflow_stage = 'Submitted';

-- 7. Create trigger to automatically update workflow_stage when financial_status changes
DELIMITER //
CREATE TRIGGER IF NOT EXISTS tr_renewals_financial_status_update
AFTER UPDATE ON membership_renewals
FOR EACH ROW
BEGIN
  -- Update workflow_stage based on financial_status changes
  IF NEW.financial_status != OLD.financial_status THEN
    UPDATE membership_renewals 
    SET workflow_stage = CASE 
      WHEN NEW.financial_status = 'Under Review' THEN 'Financial Review'
      WHEN NEW.financial_status = 'Approved' THEN 'Payment Approved'
      WHEN NEW.financial_status = 'Rejected' THEN 'Rejected'
      ELSE workflow_stage
    END
    WHERE renewal_id = NEW.renewal_id;
  END IF;
END//
DELIMITER ;

-- 8. Create view for Financial Reviewers to easily access renewal financial data
CREATE OR REPLACE VIEW renewals_financial_review AS
SELECT 
  r.renewal_id,
  r.member_id,
  r.membership_id,
  r.renewal_year,
  r.renewal_type,
  r.renewal_amount,
  r.late_fee,
  r.total_amount,
  r.discount_amount,
  r.final_amount,
  r.payment_method,
  r.payment_reference,
  r.payment_date,
  r.payment_status,
  r.financial_status,
  r.financial_reviewed_at,
  r.financial_reviewed_by,
  r.financial_rejection_reason,
  r.financial_admin_notes,
  r.workflow_stage,
  r.renewal_due_date,
  r.renewal_requested_date,
  r.created_at,
  r.updated_at,
  
  -- Member information
  m.first_name,
  m.last_name,
  m.email,
  m.phone,
  m.id_number,
  
  -- Financial reviewer information
  fr.first_name as financial_reviewer_first_name,
  fr.last_name as financial_reviewer_last_name,
  
  -- Membership information
  ms.membership_number,
  ms.membership_type,
  ms.status as membership_status
  
FROM membership_renewals r
LEFT JOIN members m ON r.member_id = m.id
LEFT JOIN users fr ON r.financial_reviewed_by = fr.id
LEFT JOIN memberships ms ON r.membership_id = ms.membership_id
WHERE r.financial_status IN ('Pending', 'Under Review') 
   OR r.workflow_stage IN ('Submitted', 'Financial Review');

-- 9. Add audit trail entry for this migration
INSERT INTO approval_audit_trail (
  application_id, 
  user_id, 
  user_role, 
  action_type, 
  previous_status, 
  new_status, 
  notes, 
  metadata
) VALUES (
  NULL,
  1, -- System user
  'system',
  'status_change',
  'basic_renewals_table',
  'enhanced_renewals_financial_review',
  'Extended membership_renewals table with financial review workflow columns for comprehensive oversight',
  JSON_OBJECT(
    'migration', '020_extend_renewals_financial_review',
    'columns_added', 6,
    'indexes_created', 6,
    'views_created', 1,
    'triggers_created', 1,
    'timestamp', NOW()
  )
);

-- Migration completed successfully
SELECT 'Membership Renewals Financial Review Extension Completed' as status;
