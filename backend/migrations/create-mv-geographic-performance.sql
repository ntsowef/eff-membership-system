-- Create Geographic Performance Materialized View
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

GRANT SELECT ON mv_geographic_performance TO eff_admin;

