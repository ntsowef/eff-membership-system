-- =====================================================
-- Migration: Create Materialized View for Hierarchical Dashboard
-- Purpose: Optimize hierarchical dashboard performance
-- Created: 2025-12-01
-- 
-- This materialized view pre-aggregates member statistics by ward
-- for fast hierarchical dashboard queries. Only counts ACTIVE members.
-- =====================================================

-- Drop existing view if it exists (for clean re-deployment)
DROP MATERIALIZED VIEW IF EXISTS mv_hierarchical_dashboard_stats CASCADE;

-- =====================================================
-- STEP 1: Create the Materialized View
-- =====================================================
CREATE MATERIALIZED VIEW mv_hierarchical_dashboard_stats AS
SELECT
  province_code,
  province_name,
  district_code,
  district_name,
  municipality_code,
  municipality_name,
  ward_code,
  ward_name,
  ward_number,
  COUNT(*) FILTER (WHERE membership_status = 'Active') as active_members,
  COUNT(*) FILTER (WHERE membership_status = 'Expired') as expired_members,
  COUNT(*) FILTER (WHERE membership_status = 'Active' AND voter_status = 'Registered') as registered_voters,
  COUNT(*) FILTER (WHERE membership_status = 'Active' AND gender_name = 'Male') as male_members,
  COUNT(*) FILTER (WHERE membership_status = 'Active' AND gender_name = 'Female') as female_members,
  AVG(age) FILTER (WHERE membership_status = 'Active') as average_age
FROM vw_member_details
GROUP BY 
  province_code, province_name,
  district_code, district_name,
  municipality_code, municipality_name,
  ward_code, ward_name, ward_number
WITH DATA;

-- =====================================================
-- STEP 2: Create Indexes for Fast Lookups
-- =====================================================

-- Unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_mv_hier_dashboard_unique 
  ON mv_hierarchical_dashboard_stats(ward_code);

-- Index for national-level aggregation (by province)
CREATE INDEX idx_mv_hier_dashboard_national 
  ON mv_hierarchical_dashboard_stats(province_code);

-- Index for province-level drill-down (province -> regions)
CREATE INDEX idx_mv_hier_dashboard_province 
  ON mv_hierarchical_dashboard_stats(province_code, district_code);

-- Index for region-level drill-down (region -> municipalities)
CREATE INDEX idx_mv_hier_dashboard_region 
  ON mv_hierarchical_dashboard_stats(district_code, municipality_code);

-- Index for municipality-level drill-down (municipality -> wards)
CREATE INDEX idx_mv_hier_dashboard_municipality 
  ON mv_hierarchical_dashboard_stats(municipality_code, ward_code);

-- Index for ward-level lookup
CREATE INDEX idx_mv_hier_dashboard_ward 
  ON mv_hierarchical_dashboard_stats(ward_code);

-- =====================================================
-- STEP 3: Add Comment for Documentation
-- =====================================================
COMMENT ON MATERIALIZED VIEW mv_hierarchical_dashboard_stats IS 
'Pre-aggregated member statistics by ward for hierarchical dashboard. 
Only counts ACTIVE members (excludes expired/inactive/grace period).
Refresh every 15 minutes via backend cron job.
Created: 2025-12-01';

-- =====================================================
-- STEP 4: Verify Creation
-- =====================================================
DO $$
DECLARE
  v_row_count INTEGER;
  v_province_count INTEGER;
  v_ward_count INTEGER;
  v_active_total BIGINT;
BEGIN
  SELECT COUNT(*), COUNT(DISTINCT province_code), COUNT(DISTINCT ward_code), SUM(active_members)
  INTO v_row_count, v_province_count, v_ward_count, v_active_total
  FROM mv_hierarchical_dashboard_stats;
  
  RAISE NOTICE '✅ Materialized view created successfully!';
  RAISE NOTICE '   Rows: %', v_row_count;
  RAISE NOTICE '   Provinces: %', v_province_count;
  RAISE NOTICE '   Wards: %', v_ward_count;
  RAISE NOTICE '   Total Active Members: %', v_active_total;
END $$;

-- =====================================================
-- MANUAL REFRESH COMMAND (run as needed)
-- =====================================================
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_hierarchical_dashboard_stats;

