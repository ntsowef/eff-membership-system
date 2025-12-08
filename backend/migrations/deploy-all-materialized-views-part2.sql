-- =====================================================
-- PRODUCTION DEPLOYMENT: All Materialized Views (Part 2)
-- =====================================================
-- Continue from Part 1
-- Date: 2025-12-01
-- =====================================================

BEGIN;

-- =====================================================
-- SECTION 4: MEMBERSHIP GROWTH MONTHLY VIEW
-- =====================================================
\echo '>>> Creating mv_membership_growth_monthly...'

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

CREATE UNIQUE INDEX idx_mv_membership_growth_unique ON mv_membership_growth_monthly(month, province_code, municipality_code);
CREATE INDEX idx_mv_membership_growth_month ON mv_membership_growth_monthly(month);
CREATE INDEX idx_mv_membership_growth_province ON mv_membership_growth_monthly(province_code);
CREATE INDEX idx_mv_membership_growth_municipality ON mv_membership_growth_monthly(municipality_code);

\echo '>>> mv_membership_growth_monthly created successfully!'

-- =====================================================
-- SECTION 5: VOTING DISTRICT COMPLIANCE VIEW
-- =====================================================
\echo '>>> Creating mv_voting_district_compliance...'

DROP MATERIALIZED VIEW IF EXISTS mv_ward_compliance_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_voting_district_compliance CASCADE;

CREATE MATERIALIZED VIEW mv_voting_district_compliance AS
SELECT 
    vd.voting_district_code,
    vd.voting_district_name,
    vd.ward_code,
    w.ward_name,
    w.municipality_code,
    COUNT(DISTINCT m.member_id) AS member_count,
    CASE WHEN COUNT(DISTINCT m.member_id) >= 5 THEN TRUE ELSE FALSE END AS is_compliant,
    CASE 
        WHEN COUNT(DISTINCT m.member_id) >= 5 THEN 'Compliant'
        WHEN COUNT(DISTINCT m.member_id) > 0 THEN 'Non-Compliant'
        ELSE 'No Members'
    END AS compliance_status,
    NOW() as last_refreshed
FROM voting_districts vd
LEFT JOIN wards w ON vd.ward_code = w.ward_code
LEFT JOIN members_consolidated m ON vd.voting_district_code = m.voting_district_code
WHERE vd.voting_district_code NOT IN ('99999999', '33333333', '22222222', '11111111')
GROUP BY vd.voting_district_code, vd.voting_district_name, vd.ward_code, w.ward_name, w.municipality_code;

CREATE UNIQUE INDEX idx_mv_vdc_unique ON mv_voting_district_compliance(voting_district_code);
CREATE INDEX idx_mv_vdc_ward_code ON mv_voting_district_compliance(ward_code);
CREATE INDEX idx_mv_vdc_municipality ON mv_voting_district_compliance(municipality_code);
CREATE INDEX idx_mv_vdc_compliant ON mv_voting_district_compliance(is_compliant);

\echo '>>> mv_voting_district_compliance created successfully!'

-- =====================================================
-- SECTION 6: WARD COMPLIANCE SUMMARY VIEW
-- =====================================================
\echo '>>> Creating mv_ward_compliance_summary...'

CREATE MATERIALIZED VIEW mv_ward_compliance_summary AS
SELECT 
    w.ward_code,
    w.ward_name,
    w.ward_number,
    w.municipality_code,
    m.municipality_name,
    COALESCE(m.district_code, pm.district_code) as district_code,
    COALESCE(d.province_code, pd.province_code) as province_code,
    COUNT(DISTINCT mem.member_id) as total_members,
    CASE WHEN COUNT(DISTINCT mem.member_id) >= 200 THEN TRUE ELSE FALSE END as meets_member_threshold,
    COUNT(DISTINCT vdc.voting_district_code) as total_voting_districts,
    COUNT(DISTINCT CASE WHEN vdc.is_compliant THEN vdc.voting_district_code END) as compliant_voting_districts,
    CASE 
        WHEN COUNT(DISTINCT vdc.voting_district_code) > 0 
        AND COUNT(DISTINCT vdc.voting_district_code) = COUNT(DISTINCT CASE WHEN vdc.is_compliant THEN vdc.voting_district_code END)
        THEN TRUE ELSE FALSE 
    END as all_vds_compliant,
    -- Criterion 1 logic
    CASE
        WHEN COUNT(DISTINCT vdc.voting_district_code) <= 3 THEN
            CASE WHEN COUNT(DISTINCT vdc.voting_district_code) > 0
                AND COUNT(DISTINCT vdc.voting_district_code) = COUNT(DISTINCT CASE WHEN vdc.is_compliant THEN vdc.voting_district_code END)
                THEN TRUE ELSE FALSE END
        WHEN COUNT(DISTINCT vdc.voting_district_code) >= 4 THEN
            CASE WHEN COUNT(DISTINCT mem.member_id) >= 200 THEN TRUE
                WHEN COUNT(DISTINCT mem.member_id) >= 190 AND COUNT(DISTINCT mem.member_id) < 200
                AND COUNT(DISTINCT vdc.voting_district_code) = COUNT(DISTINCT CASE WHEN vdc.is_compliant THEN vdc.voting_district_code END)
                THEN TRUE ELSE FALSE END
        ELSE FALSE
    END as criterion_1_compliant,
    w.is_compliant,
    w.compliance_approved_at,
    w.compliance_approved_by,
    w.last_audit_date,
    w.created_at,
    w.updated_at,
    NOW() as last_refreshed
FROM wards w
LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
LEFT JOIN municipalities pm ON m.parent_municipality_id = pm.municipality_id
LEFT JOIN districts d ON m.district_code = d.district_code
LEFT JOIN districts pd ON pm.district_code = pd.district_code
LEFT JOIN members_consolidated mem ON w.ward_code = mem.ward_code
LEFT JOIN mv_voting_district_compliance vdc ON w.ward_code = vdc.ward_code
WHERE w.is_active = TRUE
GROUP BY w.ward_code, w.ward_name, w.ward_number, w.municipality_code, m.municipality_name,
    m.district_code, pm.district_code, d.province_code, pd.province_code,
    w.is_compliant, w.compliance_approved_at, w.compliance_approved_by,
    w.last_audit_date, w.created_at, w.updated_at;

CREATE UNIQUE INDEX idx_mv_wcs_unique ON mv_ward_compliance_summary(ward_code);
CREATE INDEX idx_mv_wcs_municipality ON mv_ward_compliance_summary(municipality_code);
CREATE INDEX idx_mv_wcs_district ON mv_ward_compliance_summary(district_code);
CREATE INDEX idx_mv_wcs_province ON mv_ward_compliance_summary(province_code);
CREATE INDEX idx_mv_wcs_compliant ON mv_ward_compliance_summary(is_compliant);
CREATE INDEX idx_mv_wcs_criterion_1 ON mv_ward_compliance_summary(criterion_1_compliant);

\echo '>>> mv_ward_compliance_summary created successfully!'

COMMIT;

\echo '>>> Part 2 complete. Run deploy-all-materialized-views-part3.sql next.'

