-- =====================================================
-- Enhanced Financial Oversight System - Unified Financial Transactions View
-- Migration: 021_unified_financial_transactions_view_postgres.sql
-- Purpose: Create comprehensive view combining application payments and renewal payments
--          for Financial Reviewers to have unified oversight of all transactions
-- PostgreSQL Compatible Version
-- =====================================================

-- 1. Drop existing views if they exist
DROP VIEW IF EXISTS financial_audit_trail_view CASCADE;
DROP VIEW IF EXISTS pending_financial_reviews CASCADE;
DROP VIEW IF EXISTS financial_transactions_summary CASCADE;
DROP VIEW IF EXISTS unified_financial_transactions CASCADE;

-- 2. Create the main unified financial transactions view
CREATE VIEW unified_financial_transactions AS
-- Application Payments from membership_applications table
SELECT 
  CONCAT('APP_', ma.application_id) as transaction_id,
  'Application' as transaction_type,
  ma.application_id as source_id,
  ma.application_id,
  NULL::INTEGER as renewal_id,
  
  -- Member information
  ma.application_id as member_id,
  ma.first_name,
  ma.last_name,
  ma.email,
  ma.cell_number as phone,
  ma.id_number,
  
  -- Payment information
  ma.payment_amount as amount,
  ma.payment_method,
  ma.payment_reference,
  ma.last_payment_date as payment_date,
  'ZAR' as currency,
  
  -- Status from applications
  COALESCE(ma.payment_status, 'Pending') as payment_status,
  
  -- Financial review status (applications don't have financial review yet)
  'N/A' as financial_status,
  NULL::TIMESTAMP as financial_reviewed_at,
  NULL::INTEGER as financial_reviewed_by,
  NULL::TEXT as financial_rejection_reason,
  ma.payment_notes as financial_admin_notes,
  
  -- Timestamps
  ma.created_at,
  ma.updated_at,
  
  -- Additional context
  ma.status as source_status,
  'Membership Application Payment' as description,

  -- Verification information (placeholder - payment_transactions table doesn't exist yet)
  NULL::INTEGER as verified_by,
  NULL::TIMESTAMP as verified_at,
  NULL::TEXT as verification_notes,
  NULL::VARCHAR as receipt_number,
  NULL::VARCHAR as receipt_image_path

FROM membership_applications ma
WHERE ma.payment_amount IS NOT NULL AND ma.payment_amount > 0

UNION ALL

-- Renewal Payments from membership_renewals table
SELECT
  CONCAT('REN_', mr.renewal_id) as transaction_id,
  'Renewal' as transaction_type,
  mr.renewal_id as source_id,
  NULL::INTEGER as application_id,
  mr.renewal_id,

  -- Member information
  mr.member_id,
  m.firstname as first_name,
  m.surname as last_name,
  m.email,
  m.cell_number as phone,
  m.id_number,

  -- Payment information
  mr.renewal_amount as amount,
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
  NULL::VARCHAR as receipt_number,
  NULL::VARCHAR as receipt_image_path

FROM membership_renewals mr
LEFT JOIN members m ON mr.member_id = m.member_id
WHERE mr.renewal_amount IS NOT NULL AND mr.renewal_amount > 0;

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
  (CURRENT_DATE - COALESCE(payment_date, created_at::DATE))::INTEGER as days_pending
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
CREATE INDEX IF NOT EXISTS idx_renewals_payment_lookup ON membership_renewals(renewal_amount, payment_status, financial_status);

-- 7. Grant permissions to view
GRANT SELECT ON unified_financial_transactions TO eff_admin;
GRANT SELECT ON financial_transactions_summary TO eff_admin;
GRANT SELECT ON pending_financial_reviews TO eff_admin;
GRANT SELECT ON financial_audit_trail_view TO eff_admin;

-- Success message
SELECT 'Unified Financial Transactions View created successfully!' as status;

