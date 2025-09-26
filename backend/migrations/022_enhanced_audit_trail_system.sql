-- =====================================================
-- Enhanced Financial Oversight System - Enhanced Audit Trail System
-- Migration: 022_enhanced_audit_trail_system.sql
-- Purpose: Extend audit trail system to support renewal financial review actions
--          and create comprehensive financial operation logging
-- =====================================================

-- 1. Extend approval_audit_trail table to support renewals and enhanced financial operations
ALTER TABLE approval_audit_trail 
ADD COLUMN IF NOT EXISTS renewal_id INT NULL AFTER application_id,
ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(50) NULL AFTER renewal_id,
ADD COLUMN IF NOT EXISTS entity_type ENUM('application', 'renewal', 'payment', 'refund', 'system') DEFAULT 'application' AFTER transaction_id,
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45) NULL AFTER metadata,
ADD COLUMN IF NOT EXISTS user_agent TEXT NULL AFTER ip_address;

-- Add foreign key constraint for renewal_id
ALTER TABLE approval_audit_trail 
ADD CONSTRAINT IF NOT EXISTS fk_audit_renewal 
FOREIGN KEY (renewal_id) REFERENCES membership_renewals(renewal_id) ON DELETE CASCADE;

-- Extend action_type enum to include renewal financial review actions
ALTER TABLE approval_audit_trail 
MODIFY COLUMN action_type ENUM(
  'financial_review_start', 'financial_approve', 'financial_reject', 
  'final_review_start', 'final_approve', 'final_reject', 'status_change',
  'renewal_financial_review_start', 'renewal_financial_approve', 'renewal_financial_reject',
  'renewal_payment_verify', 'renewal_payment_approve', 'renewal_payment_reject',
  'refund_request', 'refund_approve', 'refund_reject', 'refund_process',
  'payment_dispute_create', 'payment_dispute_investigate', 'payment_dispute_resolve',
  'financial_adjustment', 'manual_payment_entry', 'bulk_financial_operation'
) NOT NULL;

-- Make application_id nullable since we now support renewals and other entities
ALTER TABLE approval_audit_trail 
MODIFY COLUMN application_id INT NULL;

-- 2. Create comprehensive financial_operations_audit table
CREATE TABLE IF NOT EXISTS financial_operations_audit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  operation_id VARCHAR(100) NOT NULL COMMENT 'Unique identifier for the operation',
  operation_type ENUM(
    'payment_created', 'payment_verified', 'payment_approved', 'payment_rejected', 'payment_failed',
    'refund_requested', 'refund_approved', 'refund_rejected', 'refund_processed',
    'financial_review_started', 'financial_review_completed', 'financial_review_escalated',
    'payment_dispute_created', 'payment_dispute_resolved', 'payment_reconciliation',
    'manual_adjustment', 'bulk_operation', 'system_correction'
  ) NOT NULL,
  
  -- Entity references
  application_id INT NULL,
  renewal_id INT NULL,
  member_id INT NULL,
  transaction_reference VARCHAR(100) NULL,
  
  -- Financial details
  amount_before DECIMAL(10,2) NULL,
  amount_after DECIMAL(10,2) NULL,
  currency VARCHAR(3) DEFAULT 'ZAR',
  
  -- User and system information
  performed_by INT NOT NULL,
  performed_by_role VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  
  -- Operation details
  operation_status ENUM('initiated', 'in_progress', 'completed', 'failed', 'cancelled') DEFAULT 'initiated',
  previous_values JSON NULL,
  new_values JSON NULL,
  operation_notes TEXT NULL,
  system_notes TEXT NULL,
  
  -- Timestamps
  initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  
  -- Indexes
  INDEX idx_financial_audit_operation (operation_type),
  INDEX idx_financial_audit_application (application_id),
  INDEX idx_financial_audit_renewal (renewal_id),
  INDEX idx_financial_audit_member (member_id),
  INDEX idx_financial_audit_user (performed_by),
  INDEX idx_financial_audit_date (initiated_at),
  INDEX idx_financial_audit_status (operation_status),
  INDEX idx_financial_audit_transaction (transaction_reference),
  
  -- Foreign keys
  FOREIGN KEY (application_id) REFERENCES membership_applications(id) ON DELETE SET NULL,
  FOREIGN KEY (renewal_id) REFERENCES membership_renewals(renewal_id) ON DELETE SET NULL,
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE SET NULL,
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Create renewal_financial_audit_trail table for detailed renewal financial tracking
CREATE TABLE IF NOT EXISTS renewal_financial_audit_trail (
  id INT AUTO_INCREMENT PRIMARY KEY,
  renewal_id INT NOT NULL,
  member_id INT NOT NULL,
  
  -- Financial review workflow tracking
  workflow_stage_before VARCHAR(50) NULL,
  workflow_stage_after VARCHAR(50) NULL,
  financial_status_before VARCHAR(50) NULL,
  financial_status_after VARCHAR(50) NULL,
  
  -- Review details
  reviewed_by INT NOT NULL,
  reviewer_role VARCHAR(50) NOT NULL,
  review_action ENUM(
    'review_started', 'payment_verified', 'payment_approved', 'payment_rejected',
    'additional_info_requested', 'escalated_to_supervisor', 'review_completed'
  ) NOT NULL,
  
  -- Financial information
  amount_reviewed DECIMAL(10,2) NULL,
  payment_method VARCHAR(50) NULL,
  payment_reference VARCHAR(100) NULL,
  
  -- Review outcome
  approval_status ENUM('pending', 'approved', 'rejected', 'requires_clarification') NULL,
  rejection_reason TEXT NULL,
  reviewer_notes TEXT NULL,
  admin_notes TEXT NULL,
  
  -- System information
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  session_id VARCHAR(100) NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_renewal_audit_renewal (renewal_id),
  INDEX idx_renewal_audit_member (member_id),
  INDEX idx_renewal_audit_reviewer (reviewed_by),
  INDEX idx_renewal_audit_action (review_action),
  INDEX idx_renewal_audit_status (approval_status),
  INDEX idx_renewal_audit_date (created_at),
  
  -- Foreign keys
  FOREIGN KEY (renewal_id) REFERENCES membership_renewals(renewal_id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Create comprehensive audit trail view for Financial Reviewers
CREATE OR REPLACE VIEW comprehensive_audit_trail AS
SELECT 
  'approval' as audit_source,
  aat.id as audit_id,
  aat.application_id,
  aat.renewal_id,
  aat.entity_type,
  aat.user_id as performed_by,
  aat.user_role as performed_by_role,
  aat.action_type as operation_type,
  aat.previous_status,
  aat.new_status,
  aat.notes as operation_notes,
  aat.metadata,
  aat.ip_address,
  aat.user_agent,
  aat.created_at,
  NULL as completed_at,
  
  -- User information
  u.first_name as user_first_name,
  u.last_name as user_last_name,
  u.email as user_email,
  
  -- Entity information
  CASE 
    WHEN aat.application_id IS NOT NULL THEN CONCAT('Application #', aat.application_id)
    WHEN aat.renewal_id IS NOT NULL THEN CONCAT('Renewal #', aat.renewal_id)
    ELSE 'System Operation'
  END as entity_description

FROM approval_audit_trail aat
LEFT JOIN users u ON aat.user_id = u.id

UNION ALL

SELECT 
  'financial_operations' as audit_source,
  foa.id as audit_id,
  foa.application_id,
  foa.renewal_id,
  CASE 
    WHEN foa.application_id IS NOT NULL THEN 'application'
    WHEN foa.renewal_id IS NOT NULL THEN 'renewal'
    ELSE 'system'
  END as entity_type,
  foa.performed_by,
  foa.performed_by_role,
  foa.operation_type,
  NULL as previous_status,
  foa.operation_status as new_status,
  foa.operation_notes,
  JSON_OBJECT(
    'amount_before', foa.amount_before,
    'amount_after', foa.amount_after,
    'currency', foa.currency,
    'transaction_reference', foa.transaction_reference
  ) as metadata,
  foa.ip_address,
  foa.user_agent,
  foa.initiated_at as created_at,
  foa.completed_at,
  
  -- User information
  u.first_name as user_first_name,
  u.last_name as user_last_name,
  u.email as user_email,
  
  -- Entity information
  CASE 
    WHEN foa.application_id IS NOT NULL THEN CONCAT('Application #', foa.application_id)
    WHEN foa.renewal_id IS NOT NULL THEN CONCAT('Renewal #', foa.renewal_id)
    ELSE CONCAT('Financial Operation: ', foa.operation_id)
  END as entity_description

FROM financial_operations_audit foa
LEFT JOIN users u ON foa.performed_by = u.id

UNION ALL

SELECT 
  'renewal_financial' as audit_source,
  rfat.id as audit_id,
  NULL as application_id,
  rfat.renewal_id,
  'renewal' as entity_type,
  rfat.reviewed_by as performed_by,
  rfat.reviewer_role as performed_by_role,
  rfat.review_action as operation_type,
  rfat.financial_status_before as previous_status,
  rfat.financial_status_after as new_status,
  rfat.reviewer_notes as operation_notes,
  JSON_OBJECT(
    'amount_reviewed', rfat.amount_reviewed,
    'payment_method', rfat.payment_method,
    'payment_reference', rfat.payment_reference,
    'approval_status', rfat.approval_status
  ) as metadata,
  rfat.ip_address,
  rfat.user_agent,
  rfat.created_at,
  NULL as completed_at,
  
  -- User information
  u.first_name as user_first_name,
  u.last_name as user_last_name,
  u.email as user_email,
  
  -- Entity information
  CONCAT('Renewal Financial Review #', rfat.renewal_id) as entity_description

FROM renewal_financial_audit_trail rfat
LEFT JOIN users u ON rfat.reviewed_by = u.id

ORDER BY created_at DESC;

-- 5. Create indexes on existing tables for better audit performance
CREATE INDEX IF NOT EXISTS idx_approval_audit_entity ON approval_audit_trail(entity_type, application_id, renewal_id);
CREATE INDEX IF NOT EXISTS idx_approval_audit_user_action ON approval_audit_trail(user_id, action_type);
CREATE INDEX IF NOT EXISTS idx_approval_audit_date_range ON approval_audit_trail(created_at, entity_type);

-- 6. Add audit trail entry for this migration
INSERT INTO approval_audit_trail (
  application_id, 
  renewal_id,
  user_id, 
  user_role, 
  action_type, 
  entity_type,
  previous_status, 
  new_status, 
  notes, 
  metadata
) VALUES (
  NULL,
  NULL,
  1, -- System user
  'system',
  'status_change',
  'system',
  'basic_audit_trail',
  'enhanced_audit_trail_system',
  'Enhanced audit trail system with renewal financial review tracking and comprehensive financial operations logging',
  JSON_OBJECT(
    'migration', '022_enhanced_audit_trail_system',
    'tables_modified', 1,
    'tables_created', 2,
    'views_created', 1,
    'indexes_created', 6,
    'timestamp', NOW()
  )
);

-- Migration completed successfully
SELECT 'Enhanced Audit Trail System Migration Completed' as status;
