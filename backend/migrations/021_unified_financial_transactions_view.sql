-- =====================================================
-- Enhanced Financial Oversight System - Unified Financial Transactions View
-- Migration: 021_unified_financial_transactions_view.sql
-- Purpose: Create comprehensive view combining application payments and renewal payments
--          for Financial Reviewers to have unified oversight of all transactions
-- =====================================================

-- 1. Drop existing views if they exist
DROP VIEW IF EXISTS unified_financial_transactions;
DROP VIEW IF EXISTS financial_transactions_summary;

-- 2. Create the main unified financial transactions view
CREATE VIEW unified_financial_transactions AS
-- Application Payments from membership_applications table
SELECT 
  CONCAT('APP_', ma.id) as transaction_id,
  'Application' as transaction_type,
  ma.id as source_id,
  ma.id as application_id,
  NULL as renewal_id,
  
  -- Member information
  ma.id as member_id,
  ma.firstname as first_name,
  ma.surname as last_name,
  ma.email,
  ma.cell_number as phone,
  ma.id_number,
  
  -- Payment information
  ma.payment_amount as amount,
  ma.payment_method,
  ma.payment_reference,
  ma.last_payment_date as payment_date,
  'ZAR' as currency,
  
  -- Status mapping for applications
  CASE 
    WHEN ma.payment_amount IS NULL OR ma.payment_amount = 0 THEN 'Pending'
    WHEN ma.payment_method IS NOT NULL AND ma.payment_reference IS NOT NULL THEN 'Completed'
    ELSE 'Pending'
  END as payment_status,
  
  -- Financial review status (applications don't have financial review yet)
  'N/A' as financial_status,
  NULL as financial_reviewed_at,
  NULL as financial_reviewed_by,
  NULL as financial_rejection_reason,
  ma.payment_notes as financial_admin_notes,
  
  -- Timestamps
  ma.created_at,
  ma.updated_at,
  
  -- Additional context
  ma.status as source_status,
  'Membership Application Payment' as description,
  
  -- Verification information (from payment_transactions if exists)
  pt.verified_by,
  pt.verified_at,
  pt.verification_notes,
  pt.receipt_number,
  pt.receipt_image_path

FROM membership_applications ma
LEFT JOIN payment_transactions pt ON ma.id = pt.application_id
WHERE ma.payment_amount IS NOT NULL AND ma.payment_amount > 0

UNION ALL

-- Renewal Payments from membership_renewals table
SELECT 
  CONCAT('REN_', mr.renewal_id) as transaction_id,
  'Renewal' as transaction_type,
  mr.renewal_id as source_id,
  NULL as application_id,
  mr.renewal_id,
  
  -- Member information
  mr.member_id,
  m.firstname as first_name,
  m.surname as last_name,
  m.email,
  m.cell_number as phone,
  m.id_number,
  
  -- Payment information
  mr.final_amount as amount,
  mr.payment_method,
  mr.payment_reference,
  mr.payment_date,
  'ZAR' as currency,
  
  -- Status from renewals
  COALESCE(mr.payment_status, 'Pending') as payment_status,
  
  -- Financial review status
  COALESCE(mr.financial_status, 'Pending') as financial_status,
  mr.financial_reviewed_at,
  mr.financial_reviewed_by,
  mr.financial_rejection_reason,
  mr.financial_admin_notes,
  
  -- Timestamps
  mr.created_at,
  mr.updated_at,
  
  -- Additional context
  mr.renewal_status as source_status,
  CONCAT('Membership Renewal Payment - ', mr.renewal_year) as description,
  
  -- Verification information (renewals don't use payment_transactions table)
  mr.financial_reviewed_by as verified_by,
  mr.financial_reviewed_at as verified_at,
  mr.financial_admin_notes as verification_notes,
  NULL as receipt_number,
  NULL as receipt_image_path

FROM membership_renewals mr
LEFT JOIN members m ON mr.member_id = m.member_id
WHERE mr.final_amount IS NOT NULL AND mr.final_amount > 0

UNION ALL

-- Detailed Renewal Payments from renewal_payments table (if any exist)
SELECT 
  CONCAT('RENP_', rp.payment_id) as transaction_id,
  'Renewal Payment' as transaction_type,
  rp.payment_id as source_id,
  NULL as application_id,
  rp.renewal_id,
  
  -- Member information
  rp.member_id,
  m.firstname as first_name,
  m.surname as last_name,
  m.email,
  m.cell_number as phone,
  m.id_number,
  
  -- Payment information
  rp.payment_amount as amount,
  rp.payment_method,
  rp.payment_reference,
  rp.payment_date,
  'ZAR' as currency,
  
  -- Status from renewal payments
  rp.payment_status,
  
  -- Financial review status (renewal_payments don't have financial review fields)
  CASE 
    WHEN rp.reconciled = 1 THEN 'Approved'
    WHEN rp.payment_status = 'Completed' THEN 'Approved'
    WHEN rp.payment_status = 'Failed' THEN 'Rejected'
    ELSE 'Pending'
  END as financial_status,
  rp.reconciled_date as financial_reviewed_at,
  rp.reconciled_by as financial_reviewed_by,
  NULL as financial_rejection_reason,
  rp.payment_notes as financial_admin_notes,
  
  -- Timestamps
  rp.created_at,
  rp.updated_at,
  
  -- Additional context
  rp.payment_status as source_status,
  'Detailed Renewal Payment Record' as description,
  
  -- Verification information
  rp.processed_by as verified_by,
  rp.payment_date as verified_at,
  rp.payment_notes as verification_notes,
  NULL as receipt_number,
  NULL as receipt_image_path

FROM renewal_payments rp
LEFT JOIN members m ON rp.member_id = m.member_id
WHERE rp.payment_amount IS NOT NULL AND rp.payment_amount > 0;

-- 3. Create a summary view for Financial Reviewers dashboard
CREATE VIEW financial_transactions_summary AS
SELECT 
  transaction_type,
  payment_status,
  financial_status,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount,
  AVG(amount) as average_amount,
  MIN(payment_date) as earliest_payment,
  MAX(payment_date) as latest_payment,
  COUNT(CASE WHEN financial_reviewed_by IS NOT NULL THEN 1 END) as reviewed_count,
  COUNT(CASE WHEN financial_status = 'Pending' THEN 1 END) as pending_review_count
FROM unified_financial_transactions
GROUP BY transaction_type, payment_status, financial_status
ORDER BY transaction_type, payment_status, financial_status;

-- 4. Create view for pending financial reviews
CREATE VIEW pending_financial_reviews AS
SELECT 
  transaction_id,
  transaction_type,
  first_name,
  last_name,
  email,
  amount,
  payment_method,
  payment_reference,
  payment_date,
  payment_status,
  financial_status,
  description,
  created_at,
  DATEDIFF(CURRENT_DATE, DATE(COALESCE(payment_date, created_at))) as days_pending
FROM unified_financial_transactions
WHERE financial_status IN ('Pending', 'Under Review')
   OR (financial_status = 'N/A' AND payment_status = 'Completed' AND transaction_type = 'Application')
ORDER BY days_pending DESC, amount DESC;

-- 5. Create view for financial audit trail
CREATE VIEW financial_audit_trail_view AS
SELECT 
  transaction_id,
  transaction_type,
  first_name,
  last_name,
  amount,
  payment_method,
  payment_status,
  financial_status,
  financial_reviewed_by,
  financial_reviewed_at,
  financial_rejection_reason,
  verified_by,
  verified_at,
  verification_notes,
  created_at,
  updated_at
FROM unified_financial_transactions
WHERE financial_reviewed_by IS NOT NULL 
   OR verified_by IS NOT NULL
ORDER BY COALESCE(financial_reviewed_at, verified_at) DESC;

-- 6. Create indexes on the underlying tables for better view performance
CREATE INDEX IF NOT EXISTS idx_applications_payment_lookup ON membership_applications(payment_amount, payment_method, last_payment_date);
CREATE INDEX IF NOT EXISTS idx_renewals_payment_lookup ON membership_renewals(final_amount, payment_status, financial_status);
CREATE INDEX IF NOT EXISTS idx_renewal_payments_lookup ON renewal_payments(payment_amount, payment_status, payment_date);

-- 7. Add audit trail entry for this migration
INSERT INTO approval_audit_trail (
  application_id, 
  user_id, 
  user_role, 
  action_type, 
  previous_status, 
  new_status, 
  notes, 
  metadata
) VALUES (
  NULL,
  1, -- System user
  'system',
  'status_change',
  'separate_payment_tracking',
  'unified_financial_transactions_view',
  'Created unified financial transactions view combining application and renewal payments for comprehensive financial oversight',
  JSON_OBJECT(
    'migration', '021_unified_financial_transactions_view',
    'views_created', 4,
    'indexes_created', 3,
    'data_sources', JSON_ARRAY('membership_applications', 'membership_renewals', 'renewal_payments', 'payment_transactions'),
    'timestamp', NOW()
  )
);

-- Migration completed successfully
SELECT 'Unified Financial Transactions View Migration Completed' as status;
