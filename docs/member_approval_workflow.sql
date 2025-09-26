-- Member Approval Workflow Implementation
-- Database: membership_system_fresh

USE membership_system_fresh;

-- Update members table to support approval workflow
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS approval_status ENUM('pending', 'approved', 'rejected', 'under_review') DEFAULT 'pending' AFTER membership_status,
ADD COLUMN IF NOT EXISTS approved_by INT DEFAULT NULL AFTER approval_status,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL AFTER approved_by,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT NULL AFTER approved_at,
ADD COLUMN IF NOT EXISTS submitted_for_approval_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER rejection_reason,
ADD COLUMN IF NOT EXISTS verification_notes TEXT DEFAULT NULL AFTER submitted_for_approval_at,
ADD COLUMN IF NOT EXISTS requires_verification BOOLEAN DEFAULT TRUE AFTER verification_notes;

-- Add foreign key constraint for approved_by
ALTER TABLE members 
ADD CONSTRAINT fk_members_approved_by 
FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;

-- Create member approval history table
CREATE TABLE IF NOT EXISTS member_approval_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    action ENUM('submitted', 'approved', 'rejected', 'under_review', 'verification_requested') NOT NULL,
    performed_by INT,
    previous_status ENUM('pending', 'approved', 'rejected', 'under_review'),
    new_status ENUM('pending', 'approved', 'rejected', 'under_review'),
    notes TEXT,
    verification_details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_member_approval_history_member (member_id),
    INDEX idx_member_approval_history_action (action),
    INDEX idx_member_approval_history_date (created_at)
);

-- Create member verification checklist table
CREATE TABLE IF NOT EXISTS member_verification_checklist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    id_verification BOOLEAN DEFAULT FALSE,
    address_verification BOOLEAN DEFAULT FALSE,
    contact_verification BOOLEAN DEFAULT FALSE,
    employment_verification BOOLEAN DEFAULT FALSE,
    background_check BOOLEAN DEFAULT FALSE,
    payment_verification BOOLEAN DEFAULT FALSE,
    signature_verification BOOLEAN DEFAULT FALSE,
    declaration_verification BOOLEAN DEFAULT FALSE,
    verification_completed_by INT,
    verification_completed_at TIMESTAMP NULL,
    verification_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (verification_completed_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_member_verification (member_id)
);

-- Update existing active members to require approval
UPDATE members 
SET approval_status = 'pending',
    membership_status = 'pending_approval',
    requires_verification = TRUE,
    submitted_for_approval_at = NOW()
WHERE membership_status = 'active' 
AND approval_status IS NULL;

-- Create verification checklist entries for existing members
INSERT INTO member_verification_checklist (member_id, created_at)
SELECT id, NOW()
FROM members 
WHERE id NOT IN (SELECT member_id FROM member_verification_checklist);

-- Create approval history entries for existing members
INSERT INTO member_approval_history (member_id, action, previous_status, new_status, notes, created_at)
SELECT 
    id,
    'submitted',
    NULL,
    'pending',
    'Existing member moved to approval workflow',
    NOW()
FROM members 
WHERE approval_status = 'pending'
AND id NOT IN (SELECT member_id FROM member_approval_history WHERE action = 'submitted');

-- Create view for pending approvals with verification status
CREATE OR REPLACE VIEW pending_member_approvals AS
SELECT 
    m.id,
    m.membership_number,
    m.first_name,
    m.last_name,
    m.email,
    m.contact_number,
    m.id_number,
    m.date_of_birth,
    m.gender,
    m.nationality,
    m.employment_status,
    m.monthly_income,
    m.payment_method,
    m.payment_status,
    m.payment_amount,
    m.payment_date,
    m.approval_status,
    m.submitted_for_approval_at,
    m.verification_notes,
    m.requires_verification,
    p.name as province_name,
    r.name as region_name,
    mu.name as municipality_name,
    w.name as ward_name,
    mvc.id_verification,
    mvc.address_verification,
    mvc.contact_verification,
    mvc.employment_verification,
    mvc.background_check,
    mvc.payment_verification,
    mvc.signature_verification,
    mvc.declaration_verification,
    CASE 
        WHEN mvc.id_verification AND mvc.address_verification AND mvc.contact_verification 
             AND mvc.employment_verification AND mvc.background_check AND mvc.payment_verification 
             AND mvc.signature_verification AND mvc.declaration_verification 
        THEN TRUE 
        ELSE FALSE 
    END as verification_complete,
    ROUND(
        (CAST(mvc.id_verification AS UNSIGNED) + 
         CAST(mvc.address_verification AS UNSIGNED) + 
         CAST(mvc.contact_verification AS UNSIGNED) + 
         CAST(mvc.employment_verification AS UNSIGNED) + 
         CAST(mvc.background_check AS UNSIGNED) + 
         CAST(mvc.payment_verification AS UNSIGNED) + 
         CAST(mvc.signature_verification AS UNSIGNED) + 
         CAST(mvc.declaration_verification AS UNSIGNED)) / 8 * 100, 1
    ) as verification_percentage
FROM members m
LEFT JOIN provinces p ON m.province_id = p.id
LEFT JOIN regions r ON m.region_id = r.id
LEFT JOIN municipalities mu ON m.municipality_id = mu.id
LEFT JOIN wards w ON m.ward_id = w.id
LEFT JOIN member_verification_checklist mvc ON m.id = mvc.member_id
WHERE m.approval_status IN ('pending', 'under_review')
ORDER BY m.submitted_for_approval_at ASC;

-- Create view for approval statistics
CREATE OR REPLACE VIEW member_approval_statistics AS
SELECT 
    COUNT(*) as total_members,
    COUNT(CASE WHEN approval_status = 'pending' THEN 1 END) as pending_approvals,
    COUNT(CASE WHEN approval_status = 'under_review' THEN 1 END) as under_review,
    COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved_members,
    COUNT(CASE WHEN approval_status = 'rejected' THEN 1 END) as rejected_members,
    COUNT(CASE WHEN payment_status = 'paid' AND approval_status = 'pending' THEN 1 END) as paid_pending_approval,
    COUNT(CASE WHEN payment_status = 'pending' AND approval_status = 'pending' THEN 1 END) as unpaid_pending_approval,
    AVG(CASE WHEN approval_status = 'approved' AND approved_at IS NOT NULL 
             THEN TIMESTAMPDIFF(HOUR, submitted_for_approval_at, approved_at) 
             ELSE NULL END) as avg_approval_time_hours
FROM members;

-- Create view for admin workload
CREATE OR REPLACE VIEW admin_approval_workload AS
SELECT 
    u.id as admin_id,
    u.name as admin_name,
    u.email as admin_email,
    u.admin_level,
    COUNT(mah.id) as total_actions,
    COUNT(CASE WHEN mah.action = 'approved' THEN 1 END) as approvals_made,
    COUNT(CASE WHEN mah.action = 'rejected' THEN 1 END) as rejections_made,
    COUNT(CASE WHEN mah.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as actions_last_30_days,
    MAX(mah.created_at) as last_action_date
FROM users u
LEFT JOIN member_approval_history mah ON u.id = mah.performed_by
WHERE u.role = 'admin' AND u.admin_level IN ('national', 'provincial')
GROUP BY u.id, u.name, u.email, u.admin_level
ORDER BY u.admin_level, total_actions DESC;

-- Update payment transactions to link with member approval
ALTER TABLE payment_transactions 
ADD COLUMN IF NOT EXISTS approval_triggered BOOLEAN DEFAULT FALSE AFTER payment_date,
ADD COLUMN IF NOT EXISTS approval_notification_sent BOOLEAN DEFAULT FALSE AFTER approval_triggered;

-- Create trigger to automatically update verification checklist when payment is completed
DELIMITER //
CREATE TRIGGER IF NOT EXISTS update_payment_verification 
AFTER UPDATE ON payment_transactions
FOR EACH ROW
BEGIN
    IF NEW.payment_status = 'completed' AND OLD.payment_status != 'completed' THEN
        UPDATE member_verification_checklist 
        SET payment_verification = TRUE,
            updated_at = NOW()
        WHERE member_id = NEW.member_id;
        
        UPDATE payment_transactions 
        SET approval_triggered = TRUE
        WHERE id = NEW.id;
    END IF;
END//
DELIMITER ;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_members_approval_status ON members(approval_status);
CREATE INDEX IF NOT EXISTS idx_members_submitted_approval ON members(submitted_for_approval_at);
CREATE INDEX IF NOT EXISTS idx_members_requires_verification ON members(requires_verification);
CREATE INDEX IF NOT EXISTS idx_verification_checklist_completion ON member_verification_checklist(verification_completed_at);

-- Insert sample national admin if none exists
INSERT IGNORE INTO users (name, email, password, role, admin_level, is_active, created_at)
VALUES ('National Administrator', 'national.admin@eff.org.za', '$2b$10$example.hash.here', 'admin', 'national', TRUE, NOW());

-- Update system configuration for approval workflow
INSERT INTO system_config (config_key, config_value, is_encrypted, description) VALUES
('approval_workflow_enabled', 'true', FALSE, 'Enable member approval workflow'),
('approval_auto_approve_paid', 'false', FALSE, 'Automatically approve members who have paid'),
('approval_verification_required', 'true', FALSE, 'Require verification checklist completion'),
('approval_notification_enabled', 'true', FALSE, 'Send notifications for approval actions'),
('approval_escalation_days', '7', FALSE, 'Days before escalating pending approvals'),
('approval_reminder_days', '3', FALSE, 'Days between approval reminder notifications')
ON DUPLICATE KEY UPDATE 
config_value = VALUES(config_value),
description = VALUES(description);

-- Show summary of changes
SELECT 'MEMBER APPROVAL WORKFLOW SETUP SUMMARY' as summary_type;

SELECT 
    'Members requiring approval' as metric,
    COUNT(*) as count
FROM members 
WHERE approval_status = 'pending';

SELECT 
    'Verification checklists created' as metric,
    COUNT(*) as count
FROM member_verification_checklist;

SELECT 
    'Approval history entries' as metric,
    COUNT(*) as count
FROM member_approval_history;

SELECT 
    'Payment transactions' as metric,
    COUNT(*) as count
FROM payment_transactions;

-- Show pending approvals summary
SELECT 
    approval_status,
    payment_status,
    COUNT(*) as member_count
FROM members 
GROUP BY approval_status, payment_status
ORDER BY approval_status, payment_status;

COMMIT;
