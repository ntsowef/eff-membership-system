-- Two-Tier Approval System Migration
-- Implements Financial Reviewer and Membership Approver roles with enhanced workflow

-- Enable foreign key constraints
SET FOREIGN_KEY_CHECKS = 1;

-- Start transaction
START TRANSACTION;

-- 1. Add new roles for two-tier approval system
INSERT IGNORE INTO roles (name, description) VALUES
('financial_reviewer', 'Financial Reviewer - Can verify payments and approve applications financially'),
('membership_approver', 'Membership Approver - Can make final membership decisions on financially approved applications');

-- 2. Create permissions for the new roles
INSERT IGNORE INTO permissions (name, description, resource, action) VALUES
-- Financial Reviewer permissions
('applications.financial_review', 'Review application payment information', 'applications', 'financial_review'),
('payments.verify', 'Verify payment transactions', 'payments', 'verify'),
('payments.approve', 'Approve payment verification', 'payments', 'approve'),
('payments.reject', 'Reject payment verification', 'payments', 'reject'),
('financial_dashboard.read', 'Access financial monitoring dashboard', 'financial_dashboard', 'read'),

-- Membership Approver permissions
('applications.final_review', 'Perform final review of applications', 'applications', 'final_review'),
('applications.approve', 'Approve membership applications', 'applications', 'approve'),
('applications.reject', 'Reject membership applications', 'applications', 'reject'),
('memberships.create', 'Create new memberships from approved applications', 'memberships', 'create'),
('applications.view_all', 'View all application details', 'applications', 'view_all');

-- 3. Get role IDs for permission assignment
SET @financial_reviewer_role_id = (SELECT id FROM roles WHERE name = 'financial_reviewer');
SET @membership_approver_role_id = (SELECT id FROM roles WHERE name = 'membership_approver');

-- 4. Assign permissions to Financial Reviewer role
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT @financial_reviewer_role_id, id FROM permissions WHERE name IN (
  'applications.financial_review',
  'payments.verify',
  'payments.approve',
  'payments.reject',
  'financial_dashboard.read',
  'applications.read'  -- Basic read access to applications
);

-- 5. Assign permissions to Membership Approver role
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT @membership_approver_role_id, id FROM permissions WHERE name IN (
  'applications.final_review',
  'applications.approve',
  'applications.reject',
  'memberships.create',
  'applications.view_all',
  'applications.read'  -- Basic read access to applications
);

-- 6. Extend membership_applications table for two-tier approval workflow
ALTER TABLE membership_applications 
ADD COLUMN IF NOT EXISTS financial_status ENUM('Pending', 'Under Review', 'Approved', 'Rejected') DEFAULT 'Pending' AFTER status,
ADD COLUMN IF NOT EXISTS financial_reviewed_at TIMESTAMP NULL AFTER reviewed_at,
ADD COLUMN IF NOT EXISTS financial_reviewed_by INT NULL AFTER reviewed_by,
ADD COLUMN IF NOT EXISTS financial_rejection_reason TEXT NULL AFTER rejection_reason,
ADD COLUMN IF NOT EXISTS financial_admin_notes TEXT NULL AFTER admin_notes,
ADD COLUMN IF NOT EXISTS final_reviewed_at TIMESTAMP NULL AFTER financial_admin_notes,
ADD COLUMN IF NOT EXISTS final_reviewed_by INT NULL AFTER final_reviewed_at,
ADD COLUMN IF NOT EXISTS workflow_stage ENUM('Submitted', 'Financial Review', 'Payment Approved', 'Final Review', 'Approved', 'Rejected') DEFAULT 'Submitted' AFTER financial_status;

-- 7. Add foreign key constraints for the new reviewer fields
ALTER TABLE membership_applications 
ADD CONSTRAINT fk_financial_reviewer FOREIGN KEY (financial_reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_final_reviewer FOREIGN KEY (final_reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

-- 8. Update existing applications to have proper workflow stage
UPDATE membership_applications 
SET workflow_stage = CASE 
  WHEN status = 'Submitted' THEN 'Submitted'
  WHEN status = 'Under Review' THEN 'Final Review'
  WHEN status = 'Approved' THEN 'Approved'
  WHEN status = 'Rejected' THEN 'Rejected'
  ELSE 'Submitted'
END
WHERE workflow_stage IS NULL OR workflow_stage = 'Submitted';

-- 9. Create approval_audit_trail table for tracking all approval actions
CREATE TABLE IF NOT EXISTS approval_audit_trail (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  user_id INT NOT NULL,
  user_role VARCHAR(50) NOT NULL,
  action_type ENUM('financial_review_start', 'financial_approve', 'financial_reject', 'final_review_start', 'final_approve', 'final_reject', 'status_change') NOT NULL,
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  previous_workflow_stage VARCHAR(50),
  new_workflow_stage VARCHAR(50),
  notes TEXT,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (application_id) REFERENCES membership_applications(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_audit_application (application_id),
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_action (action_type),
  INDEX idx_audit_created (created_at)
);

-- 10. Create workflow_notifications table for inter-role notifications
CREATE TABLE IF NOT EXISTS workflow_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  from_user_id INT NOT NULL,
  to_role VARCHAR(50) NOT NULL,
  notification_type ENUM('financial_review_complete', 'ready_for_final_review', 'application_approved', 'application_rejected') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (application_id) REFERENCES membership_applications(id) ON DELETE CASCADE,
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_notification_application (application_id),
  INDEX idx_notification_role (to_role),
  INDEX idx_notification_read (is_read),
  INDEX idx_notification_created (created_at)
);

-- 11. Add indexes for performance optimization
ALTER TABLE membership_applications 
ADD INDEX idx_financial_status (financial_status),
ADD INDEX idx_workflow_stage (workflow_stage),
ADD INDEX idx_financial_reviewed_by (financial_reviewed_by),
ADD INDEX idx_final_reviewed_by (final_reviewed_by),
ADD INDEX idx_financial_reviewed_at (financial_reviewed_at),
ADD INDEX idx_final_reviewed_at (final_reviewed_at);

-- 12. Create view for application workflow summary
CREATE OR REPLACE VIEW application_workflow_summary AS
SELECT 
  ma.id,
  ma.application_number,
  ma.first_name,
  ma.last_name,
  ma.status,
  ma.financial_status,
  ma.workflow_stage,
  ma.created_at,
  ma.submitted_at,
  ma.financial_reviewed_at,
  ma.final_reviewed_at,
  fr.name as financial_reviewer_name,
  fr.email as financial_reviewer_email,
  mr.name as final_reviewer_name,
  mr.email as final_reviewer_email,
  CASE 
    WHEN ma.workflow_stage = 'Submitted' THEN 'Waiting for Financial Review'
    WHEN ma.workflow_stage = 'Financial Review' THEN 'Under Financial Review'
    WHEN ma.workflow_stage = 'Payment Approved' THEN 'Waiting for Final Review'
    WHEN ma.workflow_stage = 'Final Review' THEN 'Under Final Review'
    WHEN ma.workflow_stage = 'Approved' THEN 'Application Approved'
    WHEN ma.workflow_stage = 'Rejected' THEN 'Application Rejected'
    ELSE 'Unknown Status'
  END as workflow_description
FROM membership_applications ma
LEFT JOIN users fr ON ma.financial_reviewed_by = fr.id
LEFT JOIN users mr ON ma.final_reviewed_by = mr.id;

-- Commit transaction
COMMIT;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
