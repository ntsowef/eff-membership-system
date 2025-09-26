-- =====================================================
-- Enhanced Financial Oversight System - Permissions Schema
-- Migration: 019_enhanced_financial_oversight_permissions.sql
-- Purpose: Add comprehensive permissions for Financial Reviewers to handle
--          applications, renewals, refunds, and all financial transactions
-- =====================================================

-- 1. Add new permissions for comprehensive financial oversight
INSERT IGNORE INTO permissions (name, description, resource, action) VALUES
-- Renewal Financial Review Permissions
('renewals.financial_review', 'Review renewal payment information and verify transactions', 'renewals', 'financial_review'),
('renewals.payment_verify', 'Verify renewal payment transactions', 'renewals', 'payment_verify'),
('renewals.payment_approve', 'Approve renewal payment verification', 'renewals', 'payment_approve'),
('renewals.payment_reject', 'Reject renewal payment verification', 'renewals', 'payment_reject'),

-- Comprehensive Transaction Viewing Permissions
('transactions.view_all', 'View all financial transactions across applications and renewals', 'transactions', 'view_all'),
('transactions.view_history', 'View complete financial transaction history for members', 'transactions', 'view_history'),
('transactions.export', 'Export financial transaction reports', 'transactions', 'export'),

-- Refund Processing Permissions
('refunds.view', 'View refund requests and transactions', 'refunds', 'view'),
('refunds.process', 'Process refund requests', 'refunds', 'process'),
('refunds.approve', 'Approve refund requests', 'refunds', 'approve'),
('refunds.reject', 'Reject refund requests', 'refunds', 'reject'),

-- Payment Dispute Resolution Permissions
('disputes.view', 'View payment disputes and issues', 'disputes', 'view'),
('disputes.investigate', 'Investigate payment disputes', 'disputes', 'investigate'),
('disputes.resolve', 'Resolve payment disputes', 'disputes', 'resolve'),

-- Enhanced Financial Dashboard Permissions
('financial_dashboard.view_comprehensive', 'Access comprehensive financial monitoring dashboard', 'financial_dashboard', 'view_comprehensive'),
('financial_dashboard.view_renewals', 'View renewal financial metrics in dashboard', 'financial_dashboard', 'view_renewals'),
('financial_dashboard.view_refunds', 'View refund metrics in dashboard', 'financial_dashboard', 'view_refunds'),
('financial_dashboard.export_reports', 'Export comprehensive financial reports', 'financial_dashboard', 'export_reports'),

-- Financial Audit and Compliance Permissions
('financial_audit.view', 'View financial audit trails and logs', 'financial_audit', 'view'),
('financial_audit.export', 'Export financial audit reports', 'financial_audit', 'export'),

-- Member Financial History Permissions
('members.view_financial_history', 'View complete financial history for members', 'members', 'view_financial_history'),
('members.view_payment_status', 'View payment status across all member transactions', 'members', 'view_payment_status');

-- 2. Assign new permissions to Financial Reviewer role
-- Get the financial_reviewer role ID
SET @financial_reviewer_role_id = (SELECT id FROM roles WHERE name = 'financial_reviewer' LIMIT 1);

-- Assign renewal financial review permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT @financial_reviewer_role_id, id FROM permissions 
WHERE name IN (
    'renewals.financial_review',
    'renewals.payment_verify', 
    'renewals.payment_approve',
    'renewals.payment_reject'
);

-- Assign comprehensive transaction viewing permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT @financial_reviewer_role_id, id FROM permissions 
WHERE name IN (
    'transactions.view_all',
    'transactions.view_history',
    'transactions.export'
);

-- Assign refund processing permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT @financial_reviewer_role_id, id FROM permissions 
WHERE name IN (
    'refunds.view',
    'refunds.process',
    'refunds.approve',
    'refunds.reject'
);

-- Assign payment dispute resolution permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT @financial_reviewer_role_id, id FROM permissions 
WHERE name IN (
    'disputes.view',
    'disputes.investigate',
    'disputes.resolve'
);

-- Assign enhanced financial dashboard permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT @financial_reviewer_role_id, id FROM permissions 
WHERE name IN (
    'financial_dashboard.view_comprehensive',
    'financial_dashboard.view_renewals',
    'financial_dashboard.view_refunds',
    'financial_dashboard.export_reports'
);

-- Assign financial audit and compliance permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT @financial_reviewer_role_id, id FROM permissions 
WHERE name IN (
    'financial_audit.view',
    'financial_audit.export'
);

-- Assign member financial history permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT @financial_reviewer_role_id, id FROM permissions 
WHERE name IN (
    'members.view_financial_history',
    'members.view_payment_status'
);

-- 3. Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);
CREATE INDEX IF NOT EXISTS idx_role_permissions_lookup ON role_permissions(role_id, permission_id);

-- 4. Verification queries (for testing)
-- These will be commented out in production but useful for validation

/*
-- Verify new permissions were created
SELECT COUNT(*) as new_permissions_count 
FROM permissions 
WHERE name LIKE 'renewals.%' 
   OR name LIKE 'transactions.%' 
   OR name LIKE 'refunds.%' 
   OR name LIKE 'disputes.%' 
   OR name LIKE 'financial_dashboard.view_%' 
   OR name LIKE 'financial_audit.%' 
   OR name LIKE 'members.view_financial_%';

-- Verify permissions assigned to financial_reviewer role
SELECT p.name, p.description, p.resource, p.action
FROM permissions p
JOIN role_permissions rp ON p.id = rp.permission_id
JOIN roles r ON rp.role_id = r.id
WHERE r.name = 'financial_reviewer'
ORDER BY p.resource, p.action;

-- Count total permissions for financial_reviewer
SELECT COUNT(*) as total_permissions
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
WHERE r.name = 'financial_reviewer';
*/

-- 5. Add comments for documentation
ALTER TABLE permissions COMMENT = 'System permissions for role-based access control including comprehensive financial oversight';
ALTER TABLE role_permissions COMMENT = 'Junction table linking roles to their assigned permissions';

-- Migration completed successfully
-- Financial Reviewers now have comprehensive permissions for:
-- - Application payment review (existing)
-- - Renewal payment review (new)
-- - Refund processing (new)
-- - Payment dispute resolution (new)
-- - Comprehensive financial dashboard access (new)
-- - Complete transaction history viewing (new)
-- - Financial audit trail access (new)
