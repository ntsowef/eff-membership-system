-- =====================================================
-- Materialized Views for Analytics Performance Optimization
-- =====================================================
-- Purpose: Pre-calculate expensive analytics queries to improve performance
-- from ~10-15 seconds to <1 second
-- =====================================================

-- Drop existing materialized views if they exist
DROP MATERIALIZED VIEW IF EXISTS mv_membership_analytics_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_geographic_performance CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_membership_growth_monthly CASCADE;

-- =====================================================
-- 1. Membership Analytics Summary
-- =====================================================
-- Pre-calculates total members, age distribution, gender distribution
-- Refreshed every 15 minutes

CREATE MATERIALIZED VIEW mv_membership_analytics_summary AS
SELECT
  -- Total counts
  COUNT(*) as total_members,
  COUNT(*) as active_members,
  
  -- Age distribution
  COUNT(CASE WHEN age < 25 THEN 1 END) as age_18_24,
  COUNT(CASE WHEN age >= 25 AND age < 35 THEN 1 END) as age_25_34,
  COUNT(CASE WHEN age >= 35 AND age < 45 THEN 1 END) as age_35_44,
  COUNT(CASE WHEN age >= 45 AND age < 55 THEN 1 END) as age_45_54,
  COUNT(CASE WHEN age >= 55 AND age < 65 THEN 1 END) as age_55_64,
  COUNT(CASE WHEN age >= 65 THEN 1 END) as age_65_plus,
  
  -- Gender distribution
  COUNT(CASE WHEN gender_name = 'Male' THEN 1 END) as male_count,
  COUNT(CASE WHEN gender_name = 'Female' THEN 1 END) as female_count,
  COUNT(CASE WHEN gender_name NOT IN ('Male', 'Female') THEN 1 END) as other_gender_count,
  
  -- Province breakdown
  province_code,
  province_name,
  municipality_code,
  municipality_name
FROM vw_member_details
GROUP BY province_code, province_name, municipality_code, municipality_name;

CREATE INDEX idx_mv_membership_analytics_province ON mv_membership_analytics_summary(province_code);
CREATE INDEX idx_mv_membership_analytics_municipality ON mv_membership_analytics_summary(municipality_code);

-- =====================================================
-- 2. Geographic Performance Summary
-- =====================================================
-- Pre-calculates ward/municipality/district/province performance metrics
-- Refreshed every 15 minutes

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
  ward_code,
  ward_name,
  municipality_code,
  municipality_name,
  district_code,
  district_name,
  province_code,
  province_name,
  member_count,
  recent_members,
  older_members,
  performance_score,
  -- Calculate growth rate
  CASE
    WHEN older_members > 0 THEN
      ROUND(((recent_members::numeric / NULLIF(older_members, 0)) - 1) * 100, 1)
    ELSE 0
  END as growth_rate_3m
FROM ward_stats
WHERE member_count > 0;

CREATE INDEX idx_mv_geographic_performance_province ON mv_geographic_performance(province_code);
CREATE INDEX idx_mv_geographic_performance_municipality ON mv_geographic_performance(municipality_code);
CREATE INDEX idx_mv_geographic_performance_district ON mv_geographic_performance(district_code);
CREATE INDEX idx_mv_geographic_performance_member_count ON mv_geographic_performance(member_count DESC);
CREATE INDEX idx_mv_geographic_performance_growth ON mv_geographic_performance(growth_rate_3m DESC);

-- =====================================================
-- 3. Monthly Membership Growth
-- =====================================================
-- Pre-calculates monthly membership growth for last 12 months
-- Refreshed every 15 minutes

CREATE MATERIALIZED VIEW mv_membership_growth_monthly AS
SELECT
  TO_CHAR(member_created_at, 'YYYY-MM') as month,
  province_code,
  province_name,
  municipality_code,
  municipality_name,
  COUNT(*) as new_members,
  SUM(COUNT(*)) OVER (
    PARTITION BY province_code, municipality_code 
    ORDER BY TO_CHAR(member_created_at, 'YYYY-MM')
  ) as cumulative_members
FROM vw_member_details
WHERE member_created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY TO_CHAR(member_created_at, 'YYYY-MM'), province_code, province_name, 
         municipality_code, municipality_name
ORDER BY month;

CREATE INDEX idx_mv_membership_growth_month ON mv_membership_growth_monthly(month);
CREATE INDEX idx_mv_membership_growth_province ON mv_membership_growth_monthly(province_code);
CREATE INDEX idx_mv_membership_growth_municipality ON mv_membership_growth_monthly(municipality_code);

-- =====================================================
-- Grant permissions
-- =====================================================
GRANT SELECT ON mv_membership_analytics_summary TO eff_admin;
GRANT SELECT ON mv_geographic_performance TO eff_admin;
GRANT SELECT ON mv_membership_growth_monthly TO eff_admin;

-- =====================================================
-- Initial refresh
-- =====================================================
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_membership_analytics_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_geographic_performance;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_membership_growth_monthly;

-- =====================================================
-- Success message
-- =====================================================
SELECT 'Analytics materialized views created successfully!' as status;

