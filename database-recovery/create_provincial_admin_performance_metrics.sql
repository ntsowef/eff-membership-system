-- Migration: Create provincial_admin_performance_metrics table
-- Date: 2026-02-22
-- Purpose: Track provincial admin performance for national admin leaderboard monitoring
-- Metrics: New registrations, renewals processed, total members managed, processing efficiency

BEGIN;

-- Create the provincial_admin_performance_metrics table
CREATE TABLE IF NOT EXISTS provincial_admin_performance_metrics (
    metric_id SERIAL PRIMARY KEY,
    
    -- Admin reference
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Geographic scope
    province_code VARCHAR(10) NOT NULL,
    province_name VARCHAR(100),
    
    -- Time period
    metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
    metric_period VARCHAR(20) NOT NULL DEFAULT 'daily' CHECK (metric_period IN ('daily', 'weekly', 'monthly')),
    
    -- Registration metrics
    new_registrations_count INTEGER DEFAULT 0,
    registrations_approved INTEGER DEFAULT 0,
    registrations_rejected INTEGER DEFAULT 0,
    registrations_pending INTEGER DEFAULT 0,
    
    -- Renewal metrics
    renewals_processed INTEGER DEFAULT 0,
    renewals_completed INTEGER DEFAULT 0,
    renewals_failed INTEGER DEFAULT 0,
    renewal_revenue DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Member management metrics
    total_members_managed INTEGER DEFAULT 0,
    active_members_count INTEGER DEFAULT 0,
    expired_members_count INTEGER DEFAULT 0,
    
    -- Processing efficiency
    avg_processing_time_minutes DECIMAL(8, 2),
    total_actions_count INTEGER DEFAULT 0,
    login_count INTEGER DEFAULT 0,
    
    -- Audit timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_perf_metrics_user ON provincial_admin_performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_province ON provincial_admin_performance_metrics(province_code);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_date ON provincial_admin_performance_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_period ON provincial_admin_performance_metrics(metric_period);

-- Composite indexes for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_perf_metrics_province_date ON provincial_admin_performance_metrics(province_code, metric_date);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_user_date ON provincial_admin_performance_metrics(user_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_period_date ON provincial_admin_performance_metrics(metric_period, metric_date);

-- Unique constraint to prevent duplicate entries per user/date/period
CREATE UNIQUE INDEX IF NOT EXISTS idx_perf_metrics_unique ON provincial_admin_performance_metrics(user_id, metric_date, metric_period);

-- Add comments
COMMENT ON TABLE provincial_admin_performance_metrics IS 'Tracks provincial admin performance metrics for national admin leaderboard monitoring';
COMMENT ON COLUMN provincial_admin_performance_metrics.metric_period IS 'Aggregation period: daily, weekly, or monthly';
COMMENT ON COLUMN provincial_admin_performance_metrics.avg_processing_time_minutes IS 'Average time to process member registrations/renewals in minutes';

COMMIT;

