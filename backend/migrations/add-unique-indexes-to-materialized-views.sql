-- =====================================================
-- Add Unique Indexes to Materialized Views
-- =====================================================
-- Purpose: Enable CONCURRENT refresh of materialized views
-- PostgreSQL requires a unique index without WHERE clause
-- for REFRESH MATERIALIZED VIEW CONCURRENTLY to work
-- =====================================================

-- =====================================================
-- 1. mv_membership_analytics_summary
-- =====================================================
-- Unique combination: province_code + municipality_code
-- This ensures each province/municipality combination appears only once

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_membership_analytics_unique
ON mv_membership_analytics_summary(province_code, municipality_code);

-- =====================================================
-- 2. mv_geographic_performance
-- =====================================================
-- Unique identifier: ward_code
-- Each ward appears only once in the view

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_geographic_performance_unique
ON mv_geographic_performance(ward_code);

-- =====================================================
-- 3. mv_membership_growth_monthly
-- =====================================================
-- Unique combination: month + province_code + municipality_code
-- Each month/province/municipality combination appears only once

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_membership_growth_unique
ON mv_membership_growth_monthly(month, province_code, municipality_code);

-- =====================================================
-- Test concurrent refresh
-- =====================================================
-- Now these should work without errors
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_membership_analytics_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_geographic_performance;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_membership_growth_monthly;

-- =====================================================
-- Success message
-- =====================================================
SELECT 'Unique indexes added successfully! Concurrent refresh now enabled.' as status;

