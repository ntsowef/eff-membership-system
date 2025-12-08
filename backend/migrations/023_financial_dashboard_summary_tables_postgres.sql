-- =====================================================
-- Enhanced Financial Oversight System - Financial Dashboard Summary Tables
-- Migration: 023_financial_dashboard_summary_tables_postgres.sql
-- Purpose: Create optimized summary tables for financial dashboard performance
--          including renewal metrics, refund tracking, and comprehensive financial statistics
-- PostgreSQL Version
-- =====================================================

\echo 'Starting Financial Dashboard Summary Tables Migration...'
\echo ''

-- 1. Create daily financial summary table for dashboard performance
\echo 'Creating daily_financial_summary table...'
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

\echo 'daily_financial_summary table created.'
\echo ''

-- 2. Create monthly financial summary table for trend analysis
\echo 'Creating monthly_financial_summary table...'
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

\echo 'monthly_financial_summary table created.'
\echo ''

-- 3. Create financial reviewer performance summary table
\echo 'Creating financial_reviewer_performance table...'
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
  UNIQUE (reviewer_id, summary_date),
  
  -- Foreign key
  FOREIGN KEY (reviewer_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reviewer_performance_date ON financial_reviewer_performance(summary_date);
CREATE INDEX IF NOT EXISTS idx_reviewer_performance_volume ON financial_reviewer_performance(total_reviews);
CREATE INDEX IF NOT EXISTS idx_reviewer_performance_rate ON financial_reviewer_performance(approval_rate);

\echo 'financial_reviewer_performance table created.'
\echo ''

-- 4. Create real-time financial dashboard cache table
\echo 'Creating financial_dashboard_cache table...'
CREATE TABLE IF NOT EXISTS financial_dashboard_cache (
  id SERIAL PRIMARY KEY,
  cache_key VARCHAR(100) NOT NULL UNIQUE,
  cache_data JSONB NOT NULL,
  cache_type VARCHAR(50) NOT NULL CHECK (cache_type IN ('daily_stats', 'monthly_trends', 'reviewer_performance', 'transaction_summary', 'pending_reviews')),
  
  -- Cache metadata
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  is_valid BOOLEAN DEFAULT TRUE,
  
  -- Performance tracking
  generation_time_ms INT DEFAULT 0,
  data_size_bytes INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_dashboard_cache_key ON financial_dashboard_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_dashboard_cache_type ON financial_dashboard_cache(cache_type);
CREATE INDEX IF NOT EXISTS idx_dashboard_cache_expires ON financial_dashboard_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_dashboard_cache_valid ON financial_dashboard_cache(is_valid);

\echo 'financial_dashboard_cache table created.'
\echo ''

-- 5. Create financial KPI tracking table
\echo 'Creating financial_kpi_tracking table...'
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
  
  -- Unique constraint
  UNIQUE (kpi_name, measurement_date)
);

CREATE INDEX IF NOT EXISTS idx_kpi_category ON financial_kpi_tracking(kpi_category);
CREATE INDEX IF NOT EXISTS idx_kpi_date ON financial_kpi_tracking(measurement_date);
CREATE INDEX IF NOT EXISTS idx_kpi_performance ON financial_kpi_tracking(performance_status);

\echo 'financial_kpi_tracking table created.'
\echo ''

-- 6. Insert initial KPI definitions
\echo 'Inserting initial KPI definitions...'
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
('financial_approval_rate', 'quality', CURRENT_DATE, 0.00, 85.00, 'percentage'),
('review_accuracy_rate', 'quality', CURRENT_DATE, 0.00, 95.00, 'percentage'),

-- Compliance KPIs
('audit_trail_completeness', 'compliance', CURRENT_DATE, 0.00, 100.00, 'percentage'),
('regulatory_compliance_score', 'compliance', CURRENT_DATE, 0.00, 100.00, 'score'),

-- Performance KPIs
('reviewer_productivity_score', 'performance', CURRENT_DATE, 0.00, 85.00, 'score'),
('system_uptime_percentage', 'performance', CURRENT_DATE, 0.00, 99.50, 'percentage')
ON CONFLICT (kpi_name, measurement_date) DO NOTHING;

\echo 'Initial KPI definitions inserted.'
\echo ''

-- 7. Create indexes for performance optimization on unified_financial_transactions
\echo 'Creating performance indexes...'
CREATE INDEX IF NOT EXISTS idx_unified_transactions_date_type ON unified_financial_transactions(DATE(created_at), transaction_type);
CREATE INDEX IF NOT EXISTS idx_unified_transactions_status_amount ON unified_financial_transactions(payment_status, amount);

\echo 'Performance indexes created.'
\echo ''

\echo '========================================='
\echo 'Financial Dashboard Summary Tables Migration Completed Successfully!'
\echo '========================================='
\echo ''
\echo 'Tables created:'
\echo '  ✓ daily_financial_summary'
\echo '  ✓ monthly_financial_summary'
\echo '  ✓ financial_reviewer_performance'
\echo '  ✓ financial_dashboard_cache'
\echo '  ✓ financial_kpi_tracking'
\echo ''
\echo 'Initial KPIs: 12 KPIs initialized'
\echo ''

