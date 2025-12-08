-- =====================================================
-- PRODUCTION DEPLOYMENT: All Materialized Views
-- =====================================================
-- Purpose: Deploy all materialized views required for optimal performance
-- Execute this script in the production database
-- Date: 2025-12-01
-- 
-- Views included:
--   1. mv_hierarchical_dashboard_stats - Hierarchical Dashboard
--   2. mv_membership_analytics_summary - Analytics Dashboard  
--   3. mv_geographic_performance - Geographic Performance
--   4. mv_membership_growth_monthly - Membership Growth
--   5. mv_voting_district_compliance - Ward Audit VD Compliance
--   6. mv_ward_compliance_summary - Ward Audit Summary
-- =====================================================

-- Start transaction for safe deployment
BEGIN;

-- =====================================================
-- SECTION 1: HIERARCHICAL DASHBOARD VIEW
-- =====================================================
\echo '>>> Creating mv_hierarchical_dashboard_stats...'

DROP MATERIALIZED VIEW IF EXISTS mv_hierarchical_dashboard_stats CASCADE;

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

-- Indexes for hierarchical dashboard
CREATE UNIQUE INDEX idx_mv_hier_dashboard_unique ON mv_hierarchical_dashboard_stats(ward_code);
CREATE INDEX idx_mv_hier_dashboard_national ON mv_hierarchical_dashboard_stats(province_code);
CREATE INDEX idx_mv_hier_dashboard_province ON mv_hierarchical_dashboard_stats(province_code, district_code);
CREATE INDEX idx_mv_hier_dashboard_region ON mv_hierarchical_dashboard_stats(district_code, municipality_code);
CREATE INDEX idx_mv_hier_dashboard_municipality ON mv_hierarchical_dashboard_stats(municipality_code, ward_code);
CREATE INDEX idx_mv_hier_dashboard_ward ON mv_hierarchical_dashboard_stats(ward_code);

\echo '>>> mv_hierarchical_dashboard_stats created successfully!'

-- =====================================================
-- SECTION 2: ANALYTICS VIEWS
-- =====================================================
\echo '>>> Creating mv_membership_analytics_summary...'

DROP MATERIALIZED VIEW IF EXISTS mv_membership_analytics_summary CASCADE;

CREATE MATERIALIZED VIEW mv_membership_analytics_summary AS
SELECT
  COUNT(*) as total_members,
  COUNT(*) as active_members,
  COUNT(CASE WHEN age < 25 THEN 1 END) as age_18_24,
  COUNT(CASE WHEN age >= 25 AND age < 35 THEN 1 END) as age_25_34,
  COUNT(CASE WHEN age >= 35 AND age < 45 THEN 1 END) as age_35_44,
  COUNT(CASE WHEN age >= 45 AND age < 55 THEN 1 END) as age_45_54,
  COUNT(CASE WHEN age >= 55 AND age < 65 THEN 1 END) as age_55_64,
  COUNT(CASE WHEN age >= 65 THEN 1 END) as age_65_plus,
  COUNT(CASE WHEN gender_name = 'Male' THEN 1 END) as male_count,
  COUNT(CASE WHEN gender_name = 'Female' THEN 1 END) as female_count,
  COUNT(CASE WHEN gender_name NOT IN ('Male', 'Female') THEN 1 END) as other_gender_count,
  province_code,
  province_name,
  municipality_code,
  municipality_name
FROM vw_member_details
GROUP BY province_code, province_name, municipality_code, municipality_name;

CREATE UNIQUE INDEX idx_mv_membership_analytics_unique ON mv_membership_analytics_summary(province_code, municipality_code);
CREATE INDEX idx_mv_membership_analytics_province ON mv_membership_analytics_summary(province_code);
CREATE INDEX idx_mv_membership_analytics_municipality ON mv_membership_analytics_summary(municipality_code);

\echo '>>> mv_membership_analytics_summary created successfully!'

-- =====================================================
-- SECTION 3: GEOGRAPHIC PERFORMANCE VIEW
-- =====================================================
\echo '>>> Creating mv_geographic_performance...'

DROP MATERIALIZED VIEW IF EXISTS mv_geographic_performance CASCADE;

CREATE MATERIALIZED VIEW mv_geographic_performance AS
WITH ward_stats AS (
  SELECT
    w.ward_code,
    w.ward_name,
    w.municipality_code,
    m.municipality_name,
    m.district_code,
    d.district_name,
    d.province_code,
    p.province_name,
    COUNT(mem.member_id) as member_count,
    COUNT(CASE WHEN mem.created_at >= CURRENT_DATE - INTERVAL '3 months' THEN 1 END) as recent_members,
    COUNT(CASE WHEN mem.created_at < CURRENT_DATE - INTERVAL '3 months' THEN 1 END) as older_members,
    ROUND((COUNT(mem.member_id) / 200.0) * 100, 1) as performance_score
  FROM wards w
  LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
  LEFT JOIN districts d ON m.district_code = d.district_code
  LEFT JOIN provinces p ON d.province_code = p.province_code
  LEFT JOIN members_consolidated mem ON w.ward_code = mem.ward_code
  GROUP BY w.ward_code, w.ward_name, w.municipality_code, m.municipality_name, 
           m.district_code, d.district_name, d.province_code, p.province_name
)
SELECT
  ward_code, ward_name, municipality_code, municipality_name,
  district_code, district_name, province_code, province_name,
  member_count, recent_members, older_members, performance_score,
  CASE
    WHEN older_members > 0 THEN ROUND(((recent_members::numeric / NULLIF(older_members, 0)) - 1) * 100, 1)
    ELSE 0
  END as growth_rate_3m
FROM ward_stats
WHERE member_count > 0;

CREATE UNIQUE INDEX idx_mv_geographic_performance_unique ON mv_geographic_performance(ward_code);
CREATE INDEX idx_mv_geographic_performance_province ON mv_geographic_performance(province_code);
CREATE INDEX idx_mv_geographic_performance_municipality ON mv_geographic_performance(municipality_code);
CREATE INDEX idx_mv_geographic_performance_district ON mv_geographic_performance(district_code);
CREATE INDEX idx_mv_geographic_performance_member_count ON mv_geographic_performance(member_count DESC);
CREATE INDEX idx_mv_geographic_performance_growth ON mv_geographic_performance(growth_rate_3m DESC);

\echo '>>> mv_geographic_performance created successfully!'

COMMIT;

\echo '>>> Part 1 complete. Run deploy-all-materialized-views-part2.sql next.'

