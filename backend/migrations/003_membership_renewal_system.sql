-- Membership Renewal System Migration
-- This migration creates the comprehensive renewal system

START TRANSACTION;

-- 1. Create membership_renewals table
CREATE TABLE IF NOT EXISTS membership_renewals (
  renewal_id INT AUTO_INCREMENT PRIMARY KEY,
  membership_id INT NOT NULL,
  member_id INT NOT NULL,
  renewal_year YEAR NOT NULL,
  renewal_type ENUM('Annual', 'Partial', 'Grace', 'Late') NOT NULL DEFAULT 'Annual',
  renewal_status ENUM('Pending', 'Processing', 'Completed', 'Failed', 'Cancelled', 'Expired') NOT NULL DEFAULT 'Pending',
  
  -- Dates
  renewal_due_date DATE NOT NULL,
  renewal_requested_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  renewal_processed_date TIMESTAMP NULL,
  renewal_completed_date TIMESTAMP NULL,
  grace_period_end_date DATE NULL,
  
  -- Financial information
  renewal_amount DECIMAL(10,2) NOT NULL DEFAULT 10.00,
  late_fee DECIMAL(10,2) DEFAULT 0.00,
  total_amount DECIMAL(10,2) GENERATED ALWAYS AS (renewal_amount + COALESCE(late_fee, 0)) STORED,
  discount_amount DECIMAL(10,2) DEFAULT 0.00,
  final_amount DECIMAL(10,2) GENERATED ALWAYS AS (renewal_amount + COALESCE(late_fee, 0) - COALESCE(discount_amount, 0)) STORED,
  
  -- Payment information
  payment_method VARCHAR(50) NULL,
  payment_reference VARCHAR(100) NULL,
  payment_date TIMESTAMP NULL,
  payment_status ENUM('Pending', 'Processing', 'Completed', 'Failed', 'Refunded') DEFAULT 'Pending',
  
  -- Administrative
  processed_by INT NULL,
  renewal_notes TEXT NULL,
  auto_renewal BOOLEAN DEFAULT FALSE,
  reminder_sent_count INT DEFAULT 0,
  last_reminder_sent TIMESTAMP NULL,
  
  -- Audit fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (membership_id) REFERENCES memberships(membership_id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_renewal_member (member_id),
  INDEX idx_renewal_membership (membership_id),
  INDEX idx_renewal_year (renewal_year),
  INDEX idx_renewal_status (renewal_status),
  INDEX idx_renewal_due_date (renewal_due_date),
  INDEX idx_renewal_payment_status (payment_status),
  INDEX idx_renewal_processed_by (processed_by),
  
  -- Unique constraint to prevent duplicate renewals for same membership/year
  UNIQUE KEY uk_membership_year (membership_id, renewal_year)
);

-- 2. Create renewal_reminders table
CREATE TABLE IF NOT EXISTS renewal_reminders (
  reminder_id INT AUTO_INCREMENT PRIMARY KEY,
  renewal_id INT NOT NULL,
  member_id INT NOT NULL,
  reminder_type ENUM('Email', 'SMS', 'Letter', 'Phone') NOT NULL DEFAULT 'Email',
  reminder_stage ENUM('Early', 'Due', 'Overdue', 'Final', 'Grace') NOT NULL,
  
  -- Reminder scheduling
  scheduled_date DATE NOT NULL,
  sent_date TIMESTAMP NULL,
  delivery_status ENUM('Scheduled', 'Sent', 'Delivered', 'Failed', 'Bounced') DEFAULT 'Scheduled',
  
  -- Content
  subject VARCHAR(255) NULL,
  message TEXT NULL,
  template_used VARCHAR(100) NULL,
  
  -- Delivery details
  delivery_channel VARCHAR(50) NULL, -- email address, phone number, etc.
  delivery_response TEXT NULL,
  delivery_attempts INT DEFAULT 0,
  
  -- Administrative
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (renewal_id) REFERENCES membership_renewals(renewal_id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_reminder_renewal (renewal_id),
  INDEX idx_reminder_member (member_id),
  INDEX idx_reminder_scheduled (scheduled_date),
  INDEX idx_reminder_status (delivery_status),
  INDEX idx_reminder_stage (reminder_stage)
);

-- 3. Create renewal_payments table for detailed payment tracking
CREATE TABLE IF NOT EXISTS renewal_payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  renewal_id INT NOT NULL,
  member_id INT NOT NULL,
  
  -- Payment details
  payment_amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_reference VARCHAR(100) NULL,
  payment_date TIMESTAMP NOT NULL,
  payment_status ENUM('Pending', 'Processing', 'Completed', 'Failed', 'Cancelled', 'Refunded') NOT NULL,
  
  -- External payment system details
  external_payment_id VARCHAR(100) NULL,
  gateway_response TEXT NULL,
  transaction_fee DECIMAL(10,2) DEFAULT 0.00,
  
  -- Reconciliation
  reconciled BOOLEAN DEFAULT FALSE,
  reconciled_date TIMESTAMP NULL,
  reconciled_by INT NULL,
  
  -- Administrative
  processed_by INT NULL,
  payment_notes TEXT NULL,
  
  -- Audit fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (renewal_id) REFERENCES membership_renewals(renewal_id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (reconciled_by) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_payment_renewal (renewal_id),
  INDEX idx_payment_member (member_id),
  INDEX idx_payment_date (payment_date),
  INDEX idx_payment_status (payment_status),
  INDEX idx_payment_method (payment_method),
  INDEX idx_payment_reference (payment_reference)
);

-- 4. Create renewal_history table for tracking all renewal-related activities
CREATE TABLE IF NOT EXISTS renewal_history (
  history_id INT AUTO_INCREMENT PRIMARY KEY,
  renewal_id INT NOT NULL,
  member_id INT NOT NULL,
  
  -- Activity details
  activity_type ENUM('Created', 'Updated', 'Payment_Received', 'Payment_Failed', 'Reminder_Sent', 'Completed', 'Cancelled', 'Expired') NOT NULL,
  activity_description TEXT NOT NULL,
  
  -- Context
  old_status VARCHAR(50) NULL,
  new_status VARCHAR(50) NULL,
  activity_data JSON NULL,
  
  -- Administrative
  performed_by INT NULL,
  activity_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (renewal_id) REFERENCES membership_renewals(renewal_id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_history_renewal (renewal_id),
  INDEX idx_history_member (member_id),
  INDEX idx_history_activity_type (activity_type),
  INDEX idx_history_timestamp (activity_timestamp)
);

-- 5. Create renewal_settings table for system configuration
CREATE TABLE IF NOT EXISTS renewal_settings (
  setting_id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  setting_type ENUM('string', 'number', 'boolean', 'json') NOT NULL DEFAULT 'string',
  description TEXT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Administrative
  created_by INT NULL,
  updated_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_setting_key (setting_key),
  INDEX idx_setting_active (is_active)
);

-- 6. Insert default renewal settings
INSERT INTO renewal_settings (setting_key, setting_value, setting_type, description) VALUES
('renewal_fee_amount', '10.00', 'number', 'Default annual renewal fee amount'),
('grace_period_days', '30', 'number', 'Number of days for grace period after expiry'),
('late_fee_amount', '5.00', 'number', 'Late fee charged after grace period'),
('early_reminder_days', '60', 'number', 'Days before expiry to send early reminder'),
('due_reminder_days', '30', 'number', 'Days before expiry to send due reminder'),
('overdue_reminder_days', '7', 'number', 'Days after expiry to send overdue reminder'),
('final_reminder_days', '21', 'number', 'Days after expiry to send final reminder'),
('auto_renewal_enabled', 'false', 'boolean', 'Enable automatic renewal processing'),
('payment_methods', '["Cash", "Bank Transfer", "Credit Card", "Debit Order", "Mobile Payment"]', 'json', 'Available payment methods'),
('renewal_notification_channels', '["Email", "SMS"]', 'json', 'Available notification channels for renewals');

-- 7. Add renewal-related status if not exists
INSERT IGNORE INTO membership_statuses (status_id, status_name, is_active) VALUES
(6, 'Renewal Due', 1),
(7, 'Grace Period', 1),
(8, 'Overdue', 0);

-- 8. Create views for renewal reporting
CREATE OR REPLACE VIEW vw_renewal_dashboard AS
SELECT 
  r.renewal_id,
  r.member_id,
  CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as member_name,
  m.id_number,
  r.renewal_year,
  r.renewal_type,
  r.renewal_status,
  r.payment_status,
  r.renewal_due_date,
  r.final_amount,
  r.grace_period_end_date,
  r.reminder_sent_count,
  r.last_reminder_sent,
  CASE 
    WHEN r.renewal_due_date > CURDATE() THEN 'Not Due'
    WHEN r.renewal_due_date = CURDATE() THEN 'Due Today'
    WHEN r.renewal_due_date < CURDATE() AND (r.grace_period_end_date IS NULL OR r.grace_period_end_date >= CURDATE()) THEN 'Overdue'
    WHEN r.grace_period_end_date < CURDATE() THEN 'Expired'
    ELSE 'Unknown'
  END as renewal_urgency,
  DATEDIFF(CURDATE(), r.renewal_due_date) as days_overdue,
  w.ward_name,
  mu.municipality_name,
  d.district_name,
  p.province_name
FROM membership_renewals r
LEFT JOIN members m ON r.member_id = m.member_id
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON w.district_code = d.district_code
LEFT JOIN provinces p ON w.province_code = p.province_code;

-- 9. Create view for renewal statistics
CREATE OR REPLACE VIEW vw_renewal_statistics AS
SELECT 
  renewal_year,
  COUNT(*) as total_renewals,
  COUNT(CASE WHEN renewal_status = 'Completed' THEN 1 END) as completed_renewals,
  COUNT(CASE WHEN renewal_status = 'Pending' THEN 1 END) as pending_renewals,
  COUNT(CASE WHEN renewal_status = 'Failed' THEN 1 END) as failed_renewals,
  COUNT(CASE WHEN renewal_status = 'Expired' THEN 1 END) as expired_renewals,
  SUM(final_amount) as total_revenue,
  SUM(CASE WHEN renewal_status = 'Completed' THEN final_amount ELSE 0 END) as collected_revenue,
  AVG(final_amount) as average_renewal_amount,
  COUNT(CASE WHEN payment_status = 'Completed' THEN 1 END) as paid_renewals,
  ROUND((COUNT(CASE WHEN renewal_status = 'Completed' THEN 1 END) / COUNT(*)) * 100, 2) as completion_rate
FROM membership_renewals
GROUP BY renewal_year;

COMMIT;
