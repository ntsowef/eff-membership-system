-- Migration: Create financial_operations_audit table
-- Date: 2025-10-21
-- Purpose: Track all financial operations for audit purposes

CREATE TABLE IF NOT EXISTS financial_operations_audit (
    id SERIAL PRIMARY KEY,
    operation_id VARCHAR(100) UNIQUE NOT NULL,
    operation_type VARCHAR(100) NOT NULL,
    application_id INT REFERENCES membership_applications(application_id) ON DELETE SET NULL,
    renewal_id INT REFERENCES membership_renewals(renewal_id) ON DELETE SET NULL,
    member_id INT REFERENCES members(member_id) ON DELETE SET NULL,
    transaction_reference VARCHAR(255),
    amount_before DECIMAL(10, 2),
    amount_after DECIMAL(10, 2),
    performed_by INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    performed_by_role VARCHAR(50) NOT NULL,
    operation_status VARCHAR(50) NOT NULL,
    operation_notes TEXT,
    system_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_operation_type CHECK (operation_type IN (
        'payment_received', 'payment_verified', 'payment_rejected',
        'refund_issued', 'amount_adjusted', 'fee_waived',
        'manual_override', 'system_correction', 'payment_reversal',
        'balance_update', 'credit_applied', 'debit_applied'
    )),
    CONSTRAINT chk_performed_by_role CHECK (performed_by_role IN (
        'financial_reviewer', 'membership_approver', 'admin', 'system', 'accountant'
    )),
    CONSTRAINT chk_operation_status CHECK (operation_status IN (
        'pending', 'completed', 'failed', 'reversed', 'cancelled'
    ))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_financial_operations_audit_operation_id ON financial_operations_audit(operation_id);
CREATE INDEX IF NOT EXISTS idx_financial_operations_audit_operation_type ON financial_operations_audit(operation_type);
CREATE INDEX IF NOT EXISTS idx_financial_operations_audit_application_id ON financial_operations_audit(application_id);
CREATE INDEX IF NOT EXISTS idx_financial_operations_audit_renewal_id ON financial_operations_audit(renewal_id);
CREATE INDEX IF NOT EXISTS idx_financial_operations_audit_member_id ON financial_operations_audit(member_id);
CREATE INDEX IF NOT EXISTS idx_financial_operations_audit_performed_by ON financial_operations_audit(performed_by);
CREATE INDEX IF NOT EXISTS idx_financial_operations_audit_operation_status ON financial_operations_audit(operation_status);
CREATE INDEX IF NOT EXISTS idx_financial_operations_audit_created_at ON financial_operations_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_financial_operations_audit_transaction_reference ON financial_operations_audit(transaction_reference);

-- Add comments
COMMENT ON TABLE financial_operations_audit IS 'Comprehensive audit trail for all financial operations';
COMMENT ON COLUMN financial_operations_audit.operation_id IS 'Unique identifier for the operation';
COMMENT ON COLUMN financial_operations_audit.operation_type IS 'Type of financial operation';
COMMENT ON COLUMN financial_operations_audit.application_id IS 'Related membership application (nullable)';
COMMENT ON COLUMN financial_operations_audit.renewal_id IS 'Related membership renewal (nullable)';
COMMENT ON COLUMN financial_operations_audit.member_id IS 'Related member (nullable)';
COMMENT ON COLUMN financial_operations_audit.transaction_reference IS 'External transaction reference';
COMMENT ON COLUMN financial_operations_audit.amount_before IS 'Amount before the operation';
COMMENT ON COLUMN financial_operations_audit.amount_after IS 'Amount after the operation';
COMMENT ON COLUMN financial_operations_audit.performed_by IS 'User who performed the operation';
COMMENT ON COLUMN financial_operations_audit.performed_by_role IS 'Role of the user who performed the operation';
COMMENT ON COLUMN financial_operations_audit.operation_status IS 'Status of the operation';
COMMENT ON COLUMN financial_operations_audit.operation_notes IS 'Notes about the operation';
COMMENT ON COLUMN financial_operations_audit.system_notes IS 'System-generated notes';

