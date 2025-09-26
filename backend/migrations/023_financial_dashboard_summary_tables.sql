-- =====================================================
-- Enhanced Financial Oversight System - Financial Dashboard Summary Tables
-- Migration: 023_financial_dashboard_summary_tables.sql
-- Purpose: Create optimized summary tables for financial dashboard performance
--          including renewal metrics, refund tracking, and comprehensive financial statistics
-- =====================================================

-- 1. Create daily financial summary table for dashboard performance
CREATE TABLE IF NOT EXISTS daily_financial_summary (
  id INT AUTO_INCREMENT PRIMARY KEY,
  summary_date DATE NOT NULL UNIQUE,
  
  -- Application financial metrics
  applications_submitted INT DEFAULT 0,
  applications_with_payment INT DEFAULT 0,
  applications_payment_pending INT DEFAULT 0,
  applications_payment_completed INT DEFAULT 0,
  applications_payment_failed INT DEFAULT 0,
  applications_total_amount DECIMAL(12,2) DEFAULT 0.00,
  applications_avg_amount DECIMAL(10,2) DEFAULT 0.00,
  
  -- Renewal financial metrics
  renewals_submitted INT DEFAULT 0,
  renewals_with_payment INT DEFAULT 0,
  renewals_payment_pending INT DEFAULT 0,
  renewals_payment_completed INT DEFAULT 0,
  renewals_payment_failed INT DEFAULT 0,
  renewals_total_amount DECIMAL(12,2) DEFAULT 0.00,
  renewals_avg_amount DECIMAL(10,2) DEFAULT 0.00,
  
  -- Financial review metrics
  financial_reviews_started INT DEFAULT 0,
  financial_reviews_completed INT DEFAULT 0,
  financial_reviews_approved INT DEFAULT 0,
  financial_reviews_rejected INT DEFAULT 0,
  financial_reviews_pending INT DEFAULT 0,
  avg_review_time_hours DECIMAL(8,2) DEFAULT 0.00,
  
  -- Refund metrics (placeholder for future implementation)
  refunds_requested INT DEFAULT 0,
  refunds_approved INT DEFAULT 0,
  refunds_rejected INT DEFAULT 0,
  refunds_processed INT DEFAULT 0,
  refunds_total_amount DECIMAL(12,2) DEFAULT 0.00,
  
  -- Payment dispute metrics (placeholder for future implementation)
  disputes_created INT DEFAULT 0,
  disputes_resolved INT DEFAULT 0,
  disputes_pending INT DEFAULT 0,
  
  -- Overall financial metrics
  total_transactions INT DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0.00,
  total_pending_amount DECIMAL(12,2) DEFAULT 0.00,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_daily_summary_date (summary_date),
  INDEX idx_daily_summary_created (created_at)
);

-- 2. Create monthly financial summary table for trend analysis
CREATE TABLE IF NOT EXISTS monthly_financial_summary (
  id INT AUTO_INCREMENT PRIMARY KEY,
  summary_year YEAR NOT NULL,
  summary_month TINYINT NOT NULL,
  
  -- Application metrics
  applications_count INT DEFAULT 0,
  applications_revenue DECIMAL(12,2) DEFAULT 0.00,
  applications_avg_processing_days DECIMAL(6,2) DEFAULT 0.00,
  
  -- Renewal metrics
  renewals_count INT DEFAULT 0,
  renewals_revenue DECIMAL(12,2) DEFAULT 0.00,
  renewals_avg_processing_days DECIMAL(6,2) DEFAULT 0.00,
  
  -- Financial review performance
  reviews_completed INT DEFAULT 0,
  reviews_approval_rate DECIMAL(5,2) DEFAULT 0.00,
  reviews_avg_time_hours DECIMAL(8,2) DEFAULT 0.00,
  
  -- Revenue metrics
  total_revenue DECIMAL(12,2) DEFAULT 0.00,
  revenue_growth_percentage DECIMAL(6,2) DEFAULT 0.00,
  
  -- Quality metrics
  payment_success_rate DECIMAL(5,2) DEFAULT 0.00,
  dispute_rate DECIMAL(5,2) DEFAULT 0.00,
  refund_rate DECIMAL(5,2) DEFAULT 0.00,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Unique constraint and indexes
  UNIQUE KEY uk_monthly_summary (summary_year, summary_month),
  INDEX idx_monthly_summary_year (summary_year),
  INDEX idx_monthly_summary_revenue (total_revenue)
);

-- 3. Create financial reviewer performance summary table
CREATE TABLE IF NOT EXISTS financial_reviewer_performance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reviewer_id INT NOT NULL,
  summary_date DATE NOT NULL,
  
  -- Review volume metrics
  applications_reviewed INT DEFAULT 0,
  renewals_reviewed INT DEFAULT 0,
  total_reviews INT DEFAULT 0,
  
  -- Review outcome metrics
  reviews_approved INT DEFAULT 0,
  reviews_rejected INT DEFAULT 0,
  approval_rate DECIMAL(5,2) DEFAULT 0.00,
  
  -- Performance metrics
  avg_review_time_minutes DECIMAL(8,2) DEFAULT 0.00,
  reviews_completed_same_day INT DEFAULT 0,
  reviews_requiring_escalation INT DEFAULT 0,
  
  -- Quality metrics
  reviews_with_notes INT DEFAULT 0,
  reviews_requiring_clarification INT DEFAULT 0,
  
  -- Financial impact
  total_amount_reviewed DECIMAL(12,2) DEFAULT 0.00,
  total_amount_approved DECIMAL(12,2) DEFAULT 0.00,
  total_amount_rejected DECIMAL(12,2) DEFAULT 0.00,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Constraints and indexes
  UNIQUE KEY uk_reviewer_daily (reviewer_id, summary_date),
  INDEX idx_reviewer_performance_date (summary_date),
  INDEX idx_reviewer_performance_volume (total_reviews),
  INDEX idx_reviewer_performance_rate (approval_rate),
  
  -- Foreign key
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Create real-time financial dashboard cache table
CREATE TABLE IF NOT EXISTS financial_dashboard_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cache_key VARCHAR(100) NOT NULL UNIQUE,
  cache_data JSON NOT NULL,
  cache_type ENUM('daily_stats', 'monthly_trends', 'reviewer_performance', 'transaction_summary', 'pending_reviews') NOT NULL,
  
  -- Cache metadata
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  is_valid BOOLEAN DEFAULT TRUE,
  
  -- Performance tracking
  generation_time_ms INT DEFAULT 0,
  data_size_bytes INT DEFAULT 0,
  
  -- Indexes
  INDEX idx_dashboard_cache_key (cache_key),
  INDEX idx_dashboard_cache_type (cache_type),
  INDEX idx_dashboard_cache_expires (expires_at),
  INDEX idx_dashboard_cache_valid (is_valid)
);

-- 5. Create financial KPI tracking table
CREATE TABLE IF NOT EXISTS financial_kpi_tracking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kpi_name VARCHAR(100) NOT NULL,
  kpi_category ENUM('revenue', 'efficiency', 'quality', 'compliance', 'performance') NOT NULL,
  measurement_date DATE NOT NULL,
  
  -- KPI values
  current_value DECIMAL(12,4) NOT NULL,
  target_value DECIMAL(12,4) NULL,
  previous_value DECIMAL(12,4) NULL,
  
  -- Performance indicators
  variance_percentage DECIMAL(8,4) DEFAULT 0.0000,
  trend_direction ENUM('up', 'down', 'stable') NULL,
  performance_status ENUM('excellent', 'good', 'acceptable', 'needs_improvement', 'critical') NULL,
  
  -- Metadata
  measurement_unit VARCHAR(20) DEFAULT 'count',
  notes TEXT NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints and indexes
  UNIQUE KEY uk_kpi_daily (kpi_name, measurement_date),
  INDEX idx_kpi_category (kpi_category),
  INDEX idx_kpi_date (measurement_date),
  INDEX idx_kpi_performance (performance_status)
);

-- 6. Insert initial KPI definitions
INSERT IGNORE INTO financial_kpi_tracking (kpi_name, kpi_category, measurement_date, current_value, target_value, measurement_unit) VALUES
-- Revenue KPIs
('daily_application_revenue', 'revenue', CURDATE(), 0.00, 1000.00, 'ZAR'),
('daily_renewal_revenue', 'revenue', CURDATE(), 0.00, 2000.00, 'ZAR'),
('monthly_total_revenue', 'revenue', CURDATE(), 0.00, 50000.00, 'ZAR'),

-- Efficiency KPIs
('avg_financial_review_time', 'efficiency', CURDATE(), 0.00, 24.00, 'hours'),
('financial_review_completion_rate', 'efficiency', CURDATE(), 0.00, 95.00, 'percentage'),
('same_day_review_rate', 'efficiency', CURDATE(), 0.00, 80.00, 'percentage'),

-- Quality KPIs
('payment_success_rate', 'quality', CURDATE(), 0.00, 98.00, 'percentage'),
('financial_approval_rate', 'quality', CURDATE(), 0.00, 85.00, 'percentage'),
('review_accuracy_rate', 'quality', CURDATE(), 0.00, 95.00, 'percentage'),

-- Compliance KPIs
('audit_trail_completeness', 'compliance', CURDATE(), 0.00, 100.00, 'percentage'),
('regulatory_compliance_score', 'compliance', CURDATE(), 0.00, 100.00, 'score'),

-- Performance KPIs
('reviewer_productivity_score', 'performance', CURDATE(), 0.00, 85.00, 'score'),
('system_uptime_percentage', 'performance', CURDATE(), 0.00, 99.50, 'percentage');

-- 7. Create stored procedures for summary table updates

DELIMITER //

-- Procedure to update daily financial summary
CREATE PROCEDURE IF NOT EXISTS UpdateDailyFinancialSummary(IN target_date DATE)
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  INSERT INTO daily_financial_summary (
    summary_date,
    applications_submitted,
    applications_with_payment,
    applications_payment_completed,
    applications_total_amount,
    renewals_submitted,
    renewals_with_payment,
    renewals_payment_completed,
    renewals_total_amount,
    total_transactions,
    total_revenue
  )
  SELECT 
    target_date,
    -- Application metrics
    COUNT(CASE WHEN transaction_type = 'Application' THEN 1 END),
    COUNT(CASE WHEN transaction_type = 'Application' AND amount > 0 THEN 1 END),
    COUNT(CASE WHEN transaction_type = 'Application' AND payment_status = 'Completed' THEN 1 END),
    COALESCE(SUM(CASE WHEN transaction_type = 'Application' THEN amount END), 0),
    -- Renewal metrics
    COUNT(CASE WHEN transaction_type = 'Renewal' THEN 1 END),
    COUNT(CASE WHEN transaction_type = 'Renewal' AND amount > 0 THEN 1 END),
    COUNT(CASE WHEN transaction_type = 'Renewal' AND payment_status = 'Completed' THEN 1 END),
    COALESCE(SUM(CASE WHEN transaction_type = 'Renewal' THEN amount END), 0),
    -- Overall metrics
    COUNT(*),
    COALESCE(SUM(CASE WHEN payment_status = 'Completed' THEN amount END), 0)
  FROM unified_financial_transactions
  WHERE DATE(created_at) = target_date
  ON DUPLICATE KEY UPDATE
    applications_submitted = VALUES(applications_submitted),
    applications_with_payment = VALUES(applications_with_payment),
    applications_payment_completed = VALUES(applications_payment_completed),
    applications_total_amount = VALUES(applications_total_amount),
    renewals_submitted = VALUES(renewals_submitted),
    renewals_with_payment = VALUES(renewals_with_payment),
    renewals_payment_completed = VALUES(renewals_payment_completed),
    renewals_total_amount = VALUES(renewals_total_amount),
    total_transactions = VALUES(total_transactions),
    total_revenue = VALUES(total_revenue),
    updated_at = CURRENT_TIMESTAMP;

  COMMIT;
END//

DELIMITER ;

-- 8. Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_unified_transactions_date_type ON unified_financial_transactions(DATE(created_at), transaction_type);
CREATE INDEX IF NOT EXISTS idx_unified_transactions_status_amount ON unified_financial_transactions(payment_status, amount);

-- 9. Add audit trail entry for this migration
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
  'basic_financial_reporting',
  'enhanced_financial_dashboard_system',
  'Created optimized financial dashboard summary tables with KPI tracking and performance monitoring',
  JSON_OBJECT(
    'migration', '023_financial_dashboard_summary_tables',
    'tables_created', 5,
    'procedures_created', 1,
    'kpis_initialized', 12,
    'indexes_created', 2,
    'timestamp', NOW()
  )
);

-- Migration completed successfully
SELECT 'Financial Dashboard Summary Tables Migration Completed' as status;
