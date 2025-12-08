-- =====================================================
-- Enhanced Financial Oversight System - Financial Dashboard Summary Tables
-- Migration: 023_financial_dashboard_summary_tables_corrected.sql
-- Purpose: Create optimized summary tables for financial dashboard performance
--          including renewal metrics, refund tracking, and comprehensive financial statistics
-- PostgreSQL Version - Corrected (no indexes on views)
-- =====================================================

-- 1. Create daily financial summary table for dashboard performance
CREATE TABLE IF NOT EXISTS daily_financial_summary (
  id SERIAL PRIMARY KEY,
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daily_summary_date ON daily_financial_summary(summary_date);
CREATE INDEX IF NOT EXISTS idx_daily_summary_created ON daily_financial_summary(created_at);

-- 2. Create monthly financial summary table for trend analysis
CREATE TABLE IF NOT EXISTS monthly_financial_summary (
  id SERIAL PRIMARY KEY,
  summary_year INT NOT NULL,
  summary_month SMALLINT NOT NULL,
  
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique constraint
  UNIQUE (summary_year, summary_month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_summary_year ON monthly_financial_summary(summary_year);
CREATE INDEX IF NOT EXISTS idx_monthly_summary_revenue ON monthly_financial_summary(total_revenue);

-- 3. Create financial reviewer performance summary table
CREATE TABLE IF NOT EXISTS financial_reviewer_performance (
  id SERIAL PRIMARY KEY,
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique constraint
  UNIQUE (reviewer_id, summary_date)
);

CREATE INDEX IF NOT EXISTS idx_reviewer_performance_date ON financial_reviewer_performance(summary_date);
CREATE INDEX IF NOT EXISTS idx_reviewer_performance_volume ON financial_reviewer_performance(total_reviews);
CREATE INDEX IF NOT EXISTS idx_reviewer_performance_rate ON financial_reviewer_performance(approval_rate);

-- 4. Create payment method summary table
CREATE TABLE IF NOT EXISTS payment_method_summary (
  id SERIAL PRIMARY KEY,
  summary_date DATE NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  
  -- Transaction metrics
  transaction_count INT DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0.00,
  avg_amount DECIMAL(10,2) DEFAULT 0.00,
  
  -- Success metrics
  successful_transactions INT DEFAULT 0,
  failed_transactions INT DEFAULT 0,
  pending_transactions INT DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0.00,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique constraint
  UNIQUE (summary_date, payment_method)
);

CREATE INDEX IF NOT EXISTS idx_payment_method_date ON payment_method_summary(summary_date);
CREATE INDEX IF NOT EXISTS idx_payment_method_type ON payment_method_summary(payment_method);

-- 5. Create financial KPI tracking table
CREATE TABLE IF NOT EXISTS financial_kpi_tracking (
  id SERIAL PRIMARY KEY,
  kpi_name VARCHAR(100) NOT NULL,
  kpi_category VARCHAR(50) NOT NULL CHECK (kpi_category IN ('revenue', 'efficiency', 'quality', 'compliance', 'performance')),
  measurement_date DATE NOT NULL,
  
  -- KPI values
  current_value DECIMAL(12,4) NOT NULL,
  target_value DECIMAL(12,4) NULL,
  previous_value DECIMAL(12,4) NULL,
  
  -- Performance indicators
  variance_percentage DECIMAL(8,4) DEFAULT 0.0000,
  trend_direction VARCHAR(20) NULL CHECK (trend_direction IN ('up', 'down', 'stable')),
  performance_status VARCHAR(50) NULL CHECK (performance_status IN ('excellent', 'good', 'acceptable', 'needs_improvement', 'critical')),
  
  -- Metadata
  measurement_unit VARCHAR(20) DEFAULT 'count',
  notes TEXT NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique constraint
  UNIQUE (kpi_name, measurement_date)
);

CREATE INDEX IF NOT EXISTS idx_kpi_category ON financial_kpi_tracking(kpi_category);
CREATE INDEX IF NOT EXISTS idx_kpi_date ON financial_kpi_tracking(measurement_date);
CREATE INDEX IF NOT EXISTS idx_kpi_performance ON financial_kpi_tracking(performance_status);

-- 6. Insert initial KPI definitions
INSERT INTO financial_kpi_tracking (kpi_name, kpi_category, measurement_date, current_value, target_value, measurement_unit) VALUES
-- Revenue KPIs
('daily_application_revenue', 'revenue', CURRENT_DATE, 0.00, 1000.00, 'ZAR'),
('daily_renewal_revenue', 'revenue', CURRENT_DATE, 0.00, 2000.00, 'ZAR'),
('monthly_total_revenue', 'revenue', CURRENT_DATE, 0.00, 50000.00, 'ZAR'),

-- Efficiency KPIs
('avg_financial_review_time', 'efficiency', CURRENT_DATE, 0.00, 24.00, 'hours'),
('financial_review_completion_rate', 'efficiency', CURRENT_DATE, 0.00, 95.00, 'percentage'),
('same_day_review_rate', 'efficiency', CURRENT_DATE, 0.00, 80.00, 'percentage'),

-- Quality KPIs
('payment_success_rate', 'quality', CURRENT_DATE, 0.00, 98.00, 'percentage'),
('financial_approval_rate', 'quality', CURRENT_DATE, 0.00, 90.00, 'percentage'),
('dispute_resolution_rate', 'quality', CURRENT_DATE, 0.00, 95.00, 'percentage'),

-- Compliance KPIs
('pending_reviews_over_48h', 'compliance', CURRENT_DATE, 0.00, 5.00, 'count'),

-- Performance KPIs
('reviewer_productivity_score', 'performance', CURRENT_DATE, 0.00, 85.00, 'score'),
('system_uptime_percentage', 'performance', CURRENT_DATE, 0.00, 99.50, 'percentage')
ON CONFLICT (kpi_name, measurement_date) DO NOTHING;

-- Note: Indexes on views (unified_financial_transactions) are not created as they are not supported
-- The underlying tables (membership_applications, membership_renewals) already have appropriate indexes

-- Success message
SELECT 'Financial Dashboard Summary Tables created successfully!' as status;

