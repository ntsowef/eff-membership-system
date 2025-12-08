-- Create Membership Growth Monthly Materialized View
DROP MATERIALIZED VIEW IF EXISTS mv_membership_growth_monthly CASCADE;

CREATE MATERIALIZED VIEW mv_membership_growth_monthly AS
WITH monthly_growth AS (
  SELECT
    TO_CHAR(date_joined, 'YYYY-MM') as month,
    province_code,
    province_name,
    municipality_code,
    municipality_name,
    COUNT(*) as new_members
  FROM vw_member_details
  WHERE date_joined >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY TO_CHAR(date_joined, 'YYYY-MM'), province_code, province_name, municipality_code, municipality_name
)
SELECT
  month,
  province_code,
  province_name,
  municipality_code,
  municipality_name,
  new_members,
  SUM(new_members) OVER (
    PARTITION BY province_code, municipality_code 
    ORDER BY month 
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) as cumulative_members
FROM monthly_growth
ORDER BY month;

CREATE INDEX idx_mv_membership_growth_month ON mv_membership_growth_monthly(month);
CREATE INDEX idx_mv_membership_growth_province ON mv_membership_growth_monthly(province_code);
CREATE INDEX idx_mv_membership_growth_municipality ON mv_membership_growth_monthly(municipality_code);

GRANT SELECT ON mv_membership_growth_monthly TO eff_admin;

