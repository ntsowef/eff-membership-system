-- Master Migration Script
-- Date: 2025-10-21
-- Purpose: Run all migrations to create missing tables for blocked services
-- 
-- This script will:
-- 1. Add workflow fields to membership_applications table
-- 2. Create approval_audit_trail table
-- 3. Create workflow_notifications table
-- 4. Create renewal_financial_audit_trail table
-- 5. Create financial_operations_audit table
-- 6. Create iec_province_mappings table (with default data)
-- 7. Create iec_municipality_mappings table
-- 8. Create iec_ward_mappings table
-- 9. Create iec_lge_ballot_results table
--
-- Usage:
--   psql -h localhost -U eff_admin -d eff_membership_db -f run_all_migrations.sql
--
-- Or from within psql:
--   \i backend/prisma/migrations/run_all_migrations.sql

BEGIN;

-- ============================================================================
-- MIGRATION 001: Add workflow fields to membership_applications
-- ============================================================================
\echo '>>> Running Migration 001: Add workflow fields to membership_applications'

ALTER TABLE membership_applications
ADD COLUMN IF NOT EXISTS workflow_stage VARCHAR(50) DEFAULT 'Submitted',
ADD COLUMN IF NOT EXISTS financial_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS financial_reviewed_by INT REFERENCES users(user_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS financial_reviewed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS financial_rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS financial_admin_notes TEXT,
ADD COLUMN IF NOT EXISTS final_reviewed_by INT REFERENCES users(user_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS final_reviewed_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_membership_applications_workflow_stage ON membership_applications(workflow_stage);
CREATE INDEX IF NOT EXISTS idx_membership_applications_financial_status ON membership_applications(financial_status);
CREATE INDEX IF NOT EXISTS idx_membership_applications_financial_reviewed_by ON membership_applications(financial_reviewed_by);
CREATE INDEX IF NOT EXISTS idx_membership_applications_final_reviewed_by ON membership_applications(final_reviewed_by);

\echo '>>> Migration 001 completed'

-- ============================================================================
-- MIGRATION 002: Create approval_audit_trail table
-- ============================================================================
\echo '>>> Running Migration 002: Create approval_audit_trail table'

CREATE TABLE IF NOT EXISTS approval_audit_trail (
    id SERIAL PRIMARY KEY,
    application_id INT REFERENCES membership_applications(application_id) ON DELETE CASCADE,
    renewal_id INT REFERENCES membership_renewals(renewal_id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    user_role VARCHAR(50) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(20) NOT NULL,
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_entity_type CHECK (entity_type IN ('application', 'renewal')),
    CONSTRAINT chk_user_role CHECK (user_role IN ('financial_reviewer', 'membership_approver', 'system', 'admin')),
    CONSTRAINT chk_action_type CHECK (action_type IN (
        'financial_review_start', 'financial_approve', 'financial_reject',
        'final_review_start', 'final_approve', 'final_reject',
        'status_change', 'payment_verified', 'document_uploaded',
        'notes_added', 'workflow_transition', 'system_action'
    )),
    CONSTRAINT chk_entity_id CHECK (
        (application_id IS NOT NULL AND renewal_id IS NULL) OR
        (application_id IS NULL AND renewal_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_approval_audit_trail_application_id ON approval_audit_trail(application_id);
CREATE INDEX IF NOT EXISTS idx_approval_audit_trail_renewal_id ON approval_audit_trail(renewal_id);
CREATE INDEX IF NOT EXISTS idx_approval_audit_trail_user_id ON approval_audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_approval_audit_trail_action_type ON approval_audit_trail(action_type);
CREATE INDEX IF NOT EXISTS idx_approval_audit_trail_entity_type ON approval_audit_trail(entity_type);
CREATE INDEX IF NOT EXISTS idx_approval_audit_trail_created_at ON approval_audit_trail(created_at);

\echo '>>> Migration 002 completed'

-- ============================================================================
-- MIGRATION 003: Create workflow_notifications table
-- ============================================================================
\echo '>>> Running Migration 003: Create workflow_notifications table'

CREATE TABLE IF NOT EXISTS workflow_notifications (
    id SERIAL PRIMARY KEY,
    application_id INT REFERENCES membership_applications(application_id) ON DELETE CASCADE,
    renewal_id INT REFERENCES membership_renewals(renewal_id) ON DELETE CASCADE,
    from_user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    to_role VARCHAR(50) NOT NULL,
    notification_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_to_role CHECK (to_role IN ('financial_reviewer', 'membership_approver', 'system', 'admin', 'member')),
    CONSTRAINT chk_notification_type CHECK (notification_type IN (
        'financial_review_required', 'financial_approved', 'financial_rejected',
        'final_review_required', 'final_approved', 'final_rejected',
        'payment_received', 'document_required', 'status_update',
        'workflow_transition', 'system_notification'
    )),
    CONSTRAINT chk_notification_entity_id CHECK (
        (application_id IS NOT NULL AND renewal_id IS NULL) OR
        (application_id IS NULL AND renewal_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_workflow_notifications_application_id ON workflow_notifications(application_id);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_renewal_id ON workflow_notifications(renewal_id);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_from_user_id ON workflow_notifications(from_user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_to_role ON workflow_notifications(to_role);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_is_read ON workflow_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_created_at ON workflow_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_notification_type ON workflow_notifications(notification_type);

\echo '>>> Migration 003 completed'

-- ============================================================================
-- MIGRATION 004: Create renewal_financial_audit_trail table
-- ============================================================================
\echo '>>> Running Migration 004: Create renewal_financial_audit_trail table'

CREATE TABLE IF NOT EXISTS renewal_financial_audit_trail (
    id SERIAL PRIMARY KEY,
    renewal_id INT NOT NULL REFERENCES membership_renewals(renewal_id) ON DELETE CASCADE,
    member_id INT NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    workflow_stage_before VARCHAR(50),
    workflow_stage_after VARCHAR(50),
    financial_status_before VARCHAR(50),
    financial_status_after VARCHAR(50),
    reviewed_by INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reviewer_role VARCHAR(50) NOT NULL,
    review_action VARCHAR(100) NOT NULL,
    amount_reviewed DECIMAL(10, 2),
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    approval_status VARCHAR(50),
    rejection_reason TEXT,
    reviewer_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_reviewer_role CHECK (reviewer_role IN ('financial_reviewer', 'membership_approver', 'admin', 'system')),
    CONSTRAINT chk_review_action CHECK (review_action IN (
        'review_started', 'payment_verified', 'payment_rejected',
        'approved', 'rejected', 'amount_adjusted', 'status_changed',
        'notes_added', 'document_verified'
    )),
    CONSTRAINT chk_approval_status CHECK (approval_status IN ('pending', 'approved', 'rejected', 'under_review'))
);

CREATE INDEX IF NOT EXISTS idx_renewal_financial_audit_trail_renewal_id ON renewal_financial_audit_trail(renewal_id);
CREATE INDEX IF NOT EXISTS idx_renewal_financial_audit_trail_member_id ON renewal_financial_audit_trail(member_id);
CREATE INDEX IF NOT EXISTS idx_renewal_financial_audit_trail_reviewed_by ON renewal_financial_audit_trail(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_renewal_financial_audit_trail_review_action ON renewal_financial_audit_trail(review_action);
CREATE INDEX IF NOT EXISTS idx_renewal_financial_audit_trail_approval_status ON renewal_financial_audit_trail(approval_status);
CREATE INDEX IF NOT EXISTS idx_renewal_financial_audit_trail_created_at ON renewal_financial_audit_trail(created_at);

\echo '>>> Migration 004 completed'

-- ============================================================================
-- MIGRATION 005: Create financial_operations_audit table
-- ============================================================================
\echo '>>> Running Migration 005: Create financial_operations_audit table'

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

CREATE INDEX IF NOT EXISTS idx_financial_operations_audit_operation_id ON financial_operations_audit(operation_id);
CREATE INDEX IF NOT EXISTS idx_financial_operations_audit_operation_type ON financial_operations_audit(operation_type);
CREATE INDEX IF NOT EXISTS idx_financial_operations_audit_application_id ON financial_operations_audit(application_id);
CREATE INDEX IF NOT EXISTS idx_financial_operations_audit_renewal_id ON financial_operations_audit(renewal_id);
CREATE INDEX IF NOT EXISTS idx_financial_operations_audit_member_id ON financial_operations_audit(member_id);
CREATE INDEX IF NOT EXISTS idx_financial_operations_audit_performed_by ON financial_operations_audit(performed_by);
CREATE INDEX IF NOT EXISTS idx_financial_operations_audit_operation_status ON financial_operations_audit(operation_status);
CREATE INDEX IF NOT EXISTS idx_financial_operations_audit_created_at ON financial_operations_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_financial_operations_audit_transaction_reference ON financial_operations_audit(transaction_reference);

\echo '>>> Migration 005 completed'

COMMIT;

\echo '>>> All migrations completed successfully!'
\echo '>>> Next steps:'
\echo '>>>   1. Run migrations 006-009 for IEC mapping tables'
\echo '>>>   2. Update Prisma schema with new models'
\echo '>>>   3. Run: npx prisma db pull'
\echo '>>>   4. Run: npx prisma generate'

