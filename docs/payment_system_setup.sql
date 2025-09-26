-- Payment System Setup for Membership System
-- Database: membership_system_fresh

USE membership_system_fresh;

-- Create system configuration table for payment settings
CREATE TABLE IF NOT EXISTS system_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT,
    is_encrypted BOOLEAN DEFAULT FALSE,
    description TEXT,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_config_key (config_key),
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create payment transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    transaction_reference VARCHAR(100) UNIQUE NOT NULL,
    peach_checkout_id VARCHAR(100),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ZAR',
    payment_method VARCHAR(50),
    payment_status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded') DEFAULT 'pending',
    peach_response_code VARCHAR(20),
    peach_response_message TEXT,
    payment_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    INDEX idx_member_payment (member_id),
    INDEX idx_transaction_ref (transaction_reference),
    INDEX idx_payment_status (payment_status),
    INDEX idx_payment_date (payment_date)
);

-- Add payment-related fields to members table
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS payment_status ENUM('pending', 'paid', 'failed', 'exempt') DEFAULT 'pending' AFTER membership_status,
ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100) DEFAULT NULL AFTER payment_status,
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2) DEFAULT NULL AFTER payment_reference,
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP NULL AFTER payment_amount;

-- Create email notifications table
CREATE TABLE IF NOT EXISTS email_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    body_text TEXT,
    body_html TEXT,
    notification_type ENUM('member_registration', 'payment_confirmation', 'approval_notification', 'rejection_notification', 'welcome_email') NOT NULL,
    related_member_id INT,
    related_transaction_id INT,
    status ENUM('pending', 'sent', 'failed', 'bounced') DEFAULT 'pending',
    sent_at TIMESTAMP NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (related_member_id) REFERENCES members(id) ON DELETE SET NULL,
    FOREIGN KEY (related_transaction_id) REFERENCES payment_transactions(id) ON DELETE SET NULL,
    INDEX idx_notification_status (status),
    INDEX idx_notification_type (notification_type),
    INDEX idx_recipient_email (recipient_email),
    INDEX idx_created_at (created_at)
);

-- Insert default payment configuration
INSERT INTO system_config (config_key, config_value, is_encrypted, description) VALUES
('payment_peach_api_key', '', TRUE, 'Peach Payments API Key'),
('payment_peach_entity_id', '', FALSE, 'Peach Payments Entity ID'),
('payment_peach_test_mode', 'true', FALSE, 'Enable test mode for Peach Payments'),
('payment_membership_fee', '50.00', FALSE, 'Default membership fee amount in ZAR'),
('payment_description', 'EFF Membership Fee', FALSE, 'Payment description for transactions'),
('payment_currency', 'ZAR', FALSE, 'Payment currency'),
('payment_enabled', 'true', FALSE, 'Enable/disable payment processing'),
('email_smtp_host', '', FALSE, 'SMTP server host for email notifications'),
('email_smtp_port', '587', FALSE, 'SMTP server port'),
('email_smtp_user', '', FALSE, 'SMTP username'),
('email_smtp_password', '', TRUE, 'SMTP password'),
('email_from_address', 'noreply@eff.org.za', FALSE, 'From email address'),
('email_from_name', 'Economic Freedom Fighters', FALSE, 'From name for emails'),
('notification_national_admin_email', '', FALSE, 'National admin email for notifications')
ON DUPLICATE KEY UPDATE 
config_value = VALUES(config_value),
description = VALUES(description);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_members_payment_status ON members(payment_status);
CREATE INDEX IF NOT EXISTS idx_members_payment_reference ON members(payment_reference);
CREATE INDEX IF NOT EXISTS idx_members_membership_status ON members(membership_status);

-- Create view for payment dashboard
CREATE OR REPLACE VIEW payment_dashboard_view AS
SELECT 
    DATE(pt.created_at) as payment_date,
    COUNT(*) as total_transactions,
    COUNT(CASE WHEN pt.payment_status = 'completed' THEN 1 END) as successful_payments,
    COUNT(CASE WHEN pt.payment_status = 'failed' THEN 1 END) as failed_payments,
    COUNT(CASE WHEN pt.payment_status = 'pending' THEN 1 END) as pending_payments,
    SUM(CASE WHEN pt.payment_status = 'completed' THEN pt.amount ELSE 0 END) as total_revenue,
    AVG(CASE WHEN pt.payment_status = 'completed' THEN pt.amount ELSE NULL END) as average_payment
FROM payment_transactions pt
WHERE pt.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(pt.created_at)
ORDER BY payment_date DESC;

-- Create view for member payment status
CREATE OR REPLACE VIEW member_payment_status_view AS
SELECT 
    m.id,
    m.first_name,
    m.last_name,
    m.email,
    m.membership_number,
    m.membership_status,
    m.payment_status,
    m.payment_amount,
    m.payment_date,
    pt.transaction_reference,
    pt.payment_method,
    pt.peach_response_code,
    p.name as province_name,
    r.name as region_name,
    mu.name as municipality_name,
    w.name as ward_name
FROM members m
LEFT JOIN payment_transactions pt ON m.id = pt.member_id AND pt.payment_status = 'completed'
LEFT JOIN provinces p ON m.province_id = p.id
LEFT JOIN regions r ON m.region_id = r.id
LEFT JOIN municipalities mu ON m.municipality_id = mu.id
LEFT JOIN wards w ON m.ward_id = w.id
ORDER BY m.created_at DESC;

-- Create notification statistics view
CREATE OR REPLACE VIEW notification_statistics_view AS
SELECT 
    notification_type,
    COUNT(*) as total_notifications,
    COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_notifications,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_notifications,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_notifications,
    MAX(sent_at) as last_sent_at
FROM email_notifications
GROUP BY notification_type;

-- Sample data for testing (remove in production)
-- Insert a test national admin if none exists
INSERT IGNORE INTO users (name, email, password, role, admin_level, is_active, created_at)
VALUES ('National Admin', 'admin@eff.org.za', '$2b$10$example.hash.here', 'admin', 'national', TRUE, NOW());

-- Update existing members to have payment status
UPDATE members 
SET payment_status = 'pending', 
    payment_amount =10.00
WHERE payment_status IS NULL;

-- Show configuration summary
SELECT 'PAYMENT SYSTEM SETUP SUMMARY' as summary_type;

SELECT 
    'System Configuration' as component,
    COUNT(*) as records_created
FROM system_config
WHERE config_key LIKE 'payment_%' OR config_key LIKE 'email_%';

SELECT 
    'Payment Transactions Table' as component,
    COUNT(*) as records_created
FROM payment_transactions;

SELECT 
    'Email Notifications Table' as component,
    COUNT(*) as records_created
FROM email_notifications;

SELECT 
    'Members with Payment Status' as component,
    COUNT(*) as records_updated
FROM members
WHERE payment_status IS NOT NULL;

-- Show payment configuration
SELECT 
    'PAYMENT CONFIGURATION' as config_type,
    config_key,
    CASE 
        WHEN is_encrypted = TRUE THEN '***ENCRYPTED***'
        ELSE config_value
    END as config_value,
    description
FROM system_config
WHERE config_key LIKE 'payment_%'
ORDER BY config_key;

COMMIT;
