-- =====================================================================================
-- PostgreSQL Migration: Create Payment Transactions and Related Tables
-- Created: 2025-10-28
-- Description: Creates payment_transactions and all related payment system tables
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- 1. Payment Transactions Table
-- =====================================================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL,
  transaction_id VARCHAR(100) NULL,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('card', 'cash', 'bank_transfer', 'eft', 'mobile_payment')),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'ZAR',
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'verification_required')),
  gateway_response TEXT NULL,
  receipt_number VARCHAR(50) NULL,
  receipt_image_path VARCHAR(255) NULL,
  verified_by INTEGER NULL,
  verified_at TIMESTAMP NULL,
  verification_notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_payment_application FOREIGN KEY (application_id)
    REFERENCES membership_applications(application_id) ON DELETE CASCADE
);

-- Create indexes for payment_transactions
CREATE INDEX IF NOT EXISTS idx_payment_application ON payment_transactions(application_id);
CREATE INDEX IF NOT EXISTS idx_payment_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_method ON payment_transactions(payment_method);
CREATE INDEX IF NOT EXISTS idx_payment_created ON payment_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_verification ON payment_transactions(status, payment_method, verified_at);

COMMENT ON TABLE payment_transactions IS 'Stores all payment transactions for membership applications';
COMMENT ON COLUMN payment_transactions.transaction_id IS 'Gateway transaction ID';
COMMENT ON COLUMN payment_transactions.gateway_response IS 'JSON response from payment gateway';
COMMENT ON COLUMN payment_transactions.receipt_number IS 'Cash receipt number';
COMMENT ON COLUMN payment_transactions.receipt_image_path IS 'Path to uploaded receipt image';
COMMENT ON COLUMN payment_transactions.verified_by IS 'Admin user who verified the payment';

-- =====================================================================================
-- 2. Cash Payment Verifications Table
-- =====================================================================================
CREATE TABLE IF NOT EXISTS cash_payment_verifications (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER NOT NULL,
  amount_verified DECIMAL(10,2) NOT NULL,
  verified_by INTEGER NOT NULL,
  verification_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  verification_notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_cash_verification_transaction FOREIGN KEY (transaction_id) 
    REFERENCES payment_transactions(id) ON DELETE CASCADE
);

-- Create indexes for cash_payment_verifications
CREATE INDEX IF NOT EXISTS idx_cash_verification_transaction ON cash_payment_verifications(transaction_id);
CREATE INDEX IF NOT EXISTS idx_cash_verification_status ON cash_payment_verifications(verification_status);
CREATE INDEX IF NOT EXISTS idx_cash_verification_verifier ON cash_payment_verifications(verified_by);

COMMENT ON TABLE cash_payment_verifications IS 'Tracks verification process for cash payments';

-- =====================================================================================
-- 3. Admin Notifications Table
-- =====================================================================================
CREATE TABLE IF NOT EXISTS admin_notifications (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL CHECK (type IN ('payment_verification', 'approval_ready', 'system_alert', 'financial_report')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  application_id INTEGER NULL,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  is_read BOOLEAN DEFAULT FALSE,
  read_by INTEGER NULL,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_notification_application FOREIGN KEY (application_id)
    REFERENCES membership_applications(application_id) ON DELETE SET NULL
);

-- Create indexes for admin_notifications
CREATE INDEX IF NOT EXISTS idx_notification_type ON admin_notifications(type);
CREATE INDEX IF NOT EXISTS idx_notification_read ON admin_notifications(is_read, created_at);
CREATE INDEX IF NOT EXISTS idx_notification_priority ON admin_notifications(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_notification_application ON admin_notifications(application_id);

COMMENT ON TABLE admin_notifications IS 'Stores notifications for admin users about payments and approvals';

-- =====================================================================================
-- 4. Financial Monitoring Summary Table
-- =====================================================================================
CREATE TABLE IF NOT EXISTS financial_monitoring_summary (
  id SERIAL PRIMARY KEY,
  summary_date DATE NOT NULL UNIQUE,
  total_applications INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0.00,
  card_revenue DECIMAL(12,2) DEFAULT 0.00,
  cash_revenue DECIMAL(12,2) DEFAULT 0.00,
  pending_verifications INTEGER DEFAULT 0,
  failed_transactions INTEGER DEFAULT 0,
  approved_applications INTEGER DEFAULT 0,
  rejected_applications INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for financial_monitoring_summary
CREATE INDEX IF NOT EXISTS idx_financial_summary_date ON financial_monitoring_summary(summary_date);
CREATE INDEX IF NOT EXISTS idx_financial_summary_created ON financial_monitoring_summary(created_at);

COMMENT ON TABLE financial_monitoring_summary IS 'Daily summary of financial metrics for dashboard performance';

-- =====================================================================================
-- 5. Payment Gateway Configurations Table
-- =====================================================================================
CREATE TABLE IF NOT EXISTS payment_gateway_configs (
  id SERIAL PRIMARY KEY,
  gateway_name VARCHAR(50) NOT NULL UNIQUE,
  entity_id VARCHAR(100) NULL,
  access_token VARCHAR(255) NULL,
  secret_key VARCHAR(255) NULL,
  base_url VARCHAR(255) NULL,
  test_mode BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  configuration JSONB NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for payment_gateway_configs
CREATE INDEX IF NOT EXISTS idx_gateway_active ON payment_gateway_configs(is_active);

COMMENT ON TABLE payment_gateway_configs IS 'Stores payment gateway configurations';
COMMENT ON COLUMN payment_gateway_configs.configuration IS 'Additional gateway-specific settings in JSON format';

-- Insert default Peach Payment configuration
INSERT INTO payment_gateway_configs (
  gateway_name, entity_id, base_url, test_mode, is_active, configuration
) VALUES (
  'peach_payments', 
  '', 
  'https://test.oppwa.com',
  TRUE,
  TRUE,
  '{"supported_cards": ["VISA", "MASTER", "AMEX"], "currency": "ZAR", "payment_types": ["DB", "PA"], "webhook_enabled": false}'::jsonb
) ON CONFLICT (gateway_name) DO UPDATE SET updated_at = CURRENT_TIMESTAMP;

-- =====================================================================================
-- 6. Application Workflow Status Table
-- =====================================================================================
CREATE TABLE IF NOT EXISTS application_workflow_status (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL UNIQUE,
  payment_status VARCHAR(20) DEFAULT 'none' CHECK (payment_status IN ('none', 'pending', 'verified', 'failed')),
  document_status VARCHAR(20) DEFAULT 'none' CHECK (document_status IN ('none', 'uploaded', 'verified', 'rejected')),
  approval_status VARCHAR(30) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'ready_for_approval', 'approved', 'rejected')),
  blocking_issues JSONB NULL,
  last_checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_workflow_application FOREIGN KEY (application_id)
    REFERENCES membership_applications(application_id) ON DELETE CASCADE
);

-- Create indexes for application_workflow_status
CREATE INDEX IF NOT EXISTS idx_workflow_payment_status ON application_workflow_status(payment_status);
CREATE INDEX IF NOT EXISTS idx_workflow_approval_status ON application_workflow_status(approval_status);
CREATE INDEX IF NOT EXISTS idx_workflow_ready ON application_workflow_status(approval_status, payment_status);
CREATE INDEX IF NOT EXISTS idx_workflow_updated ON application_workflow_status(updated_at);

COMMENT ON TABLE application_workflow_status IS 'Tracks workflow status for membership applications';
COMMENT ON COLUMN application_workflow_status.blocking_issues IS 'Array of issues preventing approval in JSON format';

-- =====================================================================================
-- 7. Receipt Uploads Table
-- =====================================================================================
CREATE TABLE IF NOT EXISTS receipt_uploads (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  uploaded_by INTEGER NULL,
  upload_source VARCHAR(30) DEFAULT 'application_form' CHECK (upload_source IN ('application_form', 'admin_panel', 'mobile_app')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_receipt_transaction FOREIGN KEY (transaction_id) 
    REFERENCES payment_transactions(id) ON DELETE CASCADE
);

-- Create indexes for receipt_uploads
CREATE INDEX IF NOT EXISTS idx_receipt_transaction ON receipt_uploads(transaction_id);
CREATE INDEX IF NOT EXISTS idx_receipt_uploaded ON receipt_uploads(created_at);
CREATE INDEX IF NOT EXISTS idx_receipt_source ON receipt_uploads(upload_source);

COMMENT ON TABLE receipt_uploads IS 'Stores uploaded receipt files for cash payments';
COMMENT ON COLUMN receipt_uploads.uploaded_by IS 'User who uploaded (if from admin panel)';

-- =====================================================================================
-- 8. Financial Audit Trail Table
-- =====================================================================================
CREATE TABLE IF NOT EXISTS financial_audit_trail (
  id SERIAL PRIMARY KEY,
  operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN ('payment_created', 'payment_verified', 'payment_failed', 'refund_issued', 'manual_adjustment')),
  transaction_id INTEGER NULL,
  application_id INTEGER NULL,
  performed_by INTEGER NOT NULL,
  old_values JSONB NULL,
  new_values JSONB NULL,
  notes TEXT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_audit_transaction FOREIGN KEY (transaction_id)
    REFERENCES payment_transactions(id) ON DELETE SET NULL,
  CONSTRAINT fk_audit_application FOREIGN KEY (application_id)
    REFERENCES membership_applications(application_id) ON DELETE SET NULL
);

-- Create indexes for financial_audit_trail
CREATE INDEX IF NOT EXISTS idx_audit_operation ON financial_audit_trail(operation_type);
CREATE INDEX IF NOT EXISTS idx_audit_transaction ON financial_audit_trail(transaction_id);
CREATE INDEX IF NOT EXISTS idx_audit_application ON financial_audit_trail(application_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON financial_audit_trail(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_created ON financial_audit_trail(created_at);

COMMENT ON TABLE financial_audit_trail IS 'Audit trail for all financial operations';

-- =====================================================================================
-- 9. Create Triggers for Workflow Status Updates
-- =====================================================================================

-- Function to update workflow status after payment insert
CREATE OR REPLACE FUNCTION update_workflow_status_after_payment_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO application_workflow_status (application_id, payment_status, last_checked_at)
  VALUES (
    NEW.application_id,
    CASE 
      WHEN NEW.status = 'completed' THEN 'verified'
      WHEN NEW.status = 'verification_required' THEN 'pending'
      WHEN NEW.status = 'failed' THEN 'failed'
      ELSE 'pending'
    END,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (application_id) DO UPDATE SET
    payment_status = CASE 
      WHEN NEW.status = 'completed' THEN 'verified'
      WHEN NEW.status = 'verification_required' THEN 'pending'
      WHEN NEW.status = 'failed' THEN 'failed'
      ELSE 'pending'
    END,
    last_checked_at = CURRENT_TIMESTAMP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment insert
DROP TRIGGER IF EXISTS trg_update_workflow_status_after_payment_insert ON payment_transactions;
CREATE TRIGGER trg_update_workflow_status_after_payment_insert
AFTER INSERT ON payment_transactions
FOR EACH ROW
EXECUTE FUNCTION update_workflow_status_after_payment_insert();

-- Function to update workflow status after payment update
CREATE OR REPLACE FUNCTION update_workflow_status_after_payment_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE application_workflow_status 
  SET 
    payment_status = CASE 
      WHEN NEW.status = 'completed' THEN 'verified'
      WHEN NEW.status = 'verification_required' THEN 'pending'
      WHEN NEW.status = 'failed' THEN 'failed'
      ELSE 'pending'
    END,
    last_checked_at = CURRENT_TIMESTAMP
  WHERE application_id = NEW.application_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment update
DROP TRIGGER IF EXISTS trg_update_workflow_status_after_payment_update ON payment_transactions;
CREATE TRIGGER trg_update_workflow_status_after_payment_update
AFTER UPDATE ON payment_transactions
FOR EACH ROW
EXECUTE FUNCTION update_workflow_status_after_payment_update();

-- =====================================================================================
-- 10. Insert Sample Financial Monitoring Data
-- =====================================================================================
INSERT INTO financial_monitoring_summary (summary_date, total_applications, total_revenue, card_revenue, cash_revenue)
VALUES 
  (CURRENT_DATE, 0, 0.00, 0.00, 0.00),
  (CURRENT_DATE - INTERVAL '1 day', 0, 0.00, 0.00, 0.00)
ON CONFLICT (summary_date) DO UPDATE SET updated_at = CURRENT_TIMESTAMP;

COMMIT;

-- =====================================================================================
-- Verification Queries
-- =====================================================================================
-- Run these to verify the tables were created successfully:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%payment%' ORDER BY tablename;
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('cash_payment_verifications', 'admin_notifications', 'financial_monitoring_summary', 'payment_gateway_configs', 'application_workflow_status', 'receipt_uploads', 'financial_audit_trail') ORDER BY tablename;

