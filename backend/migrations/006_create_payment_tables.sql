-- Migration: Create payment and financial monitoring tables
-- Created: 2025-01-20

-- Payment transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  transaction_id VARCHAR(100) NULL COMMENT 'Gateway transaction ID',
  payment_method ENUM('card', 'cash', 'bank_transfer', 'eft', 'mobile_payment') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'ZAR',
  status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'verification_required') NOT NULL DEFAULT 'pending',
  gateway_response TEXT NULL COMMENT 'JSON response from payment gateway',
  receipt_number VARCHAR(50) NULL COMMENT 'Cash receipt number',
  receipt_image_path VARCHAR(255) NULL COMMENT 'Path to uploaded receipt image',
  verified_by INT NULL COMMENT 'Admin user who verified the payment',
  verified_at TIMESTAMP NULL,
  verification_notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (application_id) REFERENCES membership_applications(id) ON DELETE CASCADE,
  INDEX idx_payment_application (application_id),
  INDEX idx_payment_status (status),
  INDEX idx_payment_method (payment_method),
  INDEX idx_payment_created (created_at),
  INDEX idx_payment_verification (status, payment_method, verified_at)
);

-- Cash payment verifications table
CREATE TABLE IF NOT EXISTS cash_payment_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT NOT NULL,
  amount_verified DECIMAL(10,2) NOT NULL,
  verified_by INT NOT NULL,
  verification_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  verification_notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (transaction_id) REFERENCES payment_transactions(id) ON DELETE CASCADE,
  INDEX idx_cash_verification_transaction (transaction_id),
  INDEX idx_cash_verification_status (verification_status),
  INDEX idx_cash_verification_verifier (verified_by)
);

-- Admin notifications table for payment alerts
CREATE TABLE IF NOT EXISTS admin_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('payment_verification', 'approval_ready', 'system_alert', 'financial_report') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  application_id INT NULL,
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  is_read BOOLEAN DEFAULT FALSE,
  read_by INT NULL,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (application_id) REFERENCES membership_applications(id) ON DELETE SET NULL,
  INDEX idx_notification_type (type),
  INDEX idx_notification_read (is_read, created_at),
  INDEX idx_notification_priority (priority, created_at),
  INDEX idx_notification_application (application_id)
);

-- Financial monitoring summary table (for dashboard performance)
CREATE TABLE IF NOT EXISTS financial_monitoring_summary (
  id INT AUTO_INCREMENT PRIMARY KEY,
  summary_date DATE NOT NULL UNIQUE,
  total_applications INT DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0.00,
  card_revenue DECIMAL(12,2) DEFAULT 0.00,
  cash_revenue DECIMAL(12,2) DEFAULT 0.00,
  pending_verifications INT DEFAULT 0,
  failed_transactions INT DEFAULT 0,
  approved_applications INT DEFAULT 0,
  rejected_applications INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_financial_summary_date (summary_date),
  INDEX idx_financial_summary_created (created_at)
);

-- Payment gateway configurations table
CREATE TABLE IF NOT EXISTS payment_gateway_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gateway_name VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100) NULL,
  access_token VARCHAR(255) NULL,
  secret_key VARCHAR(255) NULL,
  base_url VARCHAR(255) NULL,
  test_mode BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  configuration JSON NULL COMMENT 'Additional gateway-specific settings',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_gateway_name (gateway_name),
  INDEX idx_gateway_active (is_active)
);

-- Insert default Peach Payment configuration
INSERT INTO payment_gateway_configs (
  gateway_name, entity_id, base_url, test_mode, is_active, configuration
) VALUES (
  'peach_payments', 
  '', -- Will be set via environment variables
  'https://test.oppwa.com',
  TRUE,
  TRUE,
  JSON_OBJECT(
    'supported_cards', JSON_ARRAY('VISA', 'MASTER', 'AMEX'),
    'currency', 'ZAR',
    'payment_types', JSON_ARRAY('DB', 'PA'),
    'webhook_enabled', false
  )
) ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Application workflow status tracking
CREATE TABLE IF NOT EXISTS application_workflow_status (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL UNIQUE,
  payment_status ENUM('none', 'pending', 'verified', 'failed') DEFAULT 'none',
  document_status ENUM('none', 'uploaded', 'verified', 'rejected') DEFAULT 'none',
  approval_status ENUM('pending', 'ready_for_approval', 'approved', 'rejected') DEFAULT 'pending',
  blocking_issues JSON NULL COMMENT 'Array of issues preventing approval',
  last_checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (application_id) REFERENCES membership_applications(id) ON DELETE CASCADE,
  INDEX idx_workflow_payment_status (payment_status),
  INDEX idx_workflow_approval_status (approval_status),
  INDEX idx_workflow_ready (approval_status, payment_status),
  INDEX idx_workflow_updated (updated_at)
);

-- Receipt uploads table for cash payments
CREATE TABLE IF NOT EXISTS receipt_uploads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  uploaded_by INT NULL COMMENT 'User who uploaded (if from admin panel)',
  upload_source ENUM('application_form', 'admin_panel', 'mobile_app') DEFAULT 'application_form',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (transaction_id) REFERENCES payment_transactions(id) ON DELETE CASCADE,
  INDEX idx_receipt_transaction (transaction_id),
  INDEX idx_receipt_uploaded (created_at),
  INDEX idx_receipt_source (upload_source)
);

-- Audit trail for financial operations
CREATE TABLE IF NOT EXISTS financial_audit_trail (
  id INT AUTO_INCREMENT PRIMARY KEY,
  operation_type ENUM('payment_created', 'payment_verified', 'payment_failed', 'refund_issued', 'manual_adjustment') NOT NULL,
  transaction_id INT NULL,
  application_id INT NULL,
  performed_by INT NOT NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  notes TEXT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (transaction_id) REFERENCES payment_transactions(id) ON DELETE SET NULL,
  FOREIGN KEY (application_id) REFERENCES membership_applications(id) ON DELETE SET NULL,
  INDEX idx_audit_operation (operation_type),
  INDEX idx_audit_transaction (transaction_id),
  INDEX idx_audit_application (application_id),
  INDEX idx_audit_user (performed_by),
  INDEX idx_audit_created (created_at)
);

-- Create triggers to maintain workflow status
DELIMITER //

CREATE TRIGGER update_workflow_status_after_payment
AFTER INSERT ON payment_transactions
FOR EACH ROW
BEGIN
  INSERT INTO application_workflow_status (application_id, payment_status, last_checked_at)
  VALUES (NEW.application_id, 
    CASE 
      WHEN NEW.status = 'completed' THEN 'verified'
      WHEN NEW.status = 'verification_required' THEN 'pending'
      WHEN NEW.status = 'failed' THEN 'failed'
      ELSE 'pending'
    END,
    NOW()
  )
  ON DUPLICATE KEY UPDATE 
    payment_status = CASE 
      WHEN NEW.status = 'completed' THEN 'verified'
      WHEN NEW.status = 'verification_required' THEN 'pending'
      WHEN NEW.status = 'failed' THEN 'failed'
      ELSE 'pending'
    END,
    last_checked_at = NOW();
END//

CREATE TRIGGER update_workflow_status_after_payment_update
AFTER UPDATE ON payment_transactions
FOR EACH ROW
BEGIN
  UPDATE application_workflow_status 
  SET payment_status = CASE 
      WHEN NEW.status = 'completed' THEN 'verified'
      WHEN NEW.status = 'verification_required' THEN 'pending'
      WHEN NEW.status = 'failed' THEN 'failed'
      ELSE 'pending'
    END,
    last_checked_at = NOW()
  WHERE application_id = NEW.application_id;
END//

DELIMITER ;

-- Insert sample financial monitoring data for testing
INSERT INTO financial_monitoring_summary (summary_date, total_applications, total_revenue, card_revenue, cash_revenue)
VALUES 
  (CURDATE(), 0, 0.00, 0.00, 0.00),
  (DATE_SUB(CURDATE(), INTERVAL 1 DAY), 0, 0.00, 0.00, 0.00)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;
