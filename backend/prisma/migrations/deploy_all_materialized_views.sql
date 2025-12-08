-- =====================================================
-- PRODUCTION DEPLOYMENT: All Materialized Views
-- =====================================================
-- Purpose: Deploy all materialized views required for optimal performance
-- Execute this script in the production database
-- Date: 2025-12-04
--
-- Views included:
--   0a. vw_member_details - Base view (dependency for materialized views)
--   0b. vw_enhanced_member_search - Member search view (required for members list)
--   1. mv_hierarchical_dashboard_stats - Hierarchical Dashboard
--   2. mv_membership_analytics_summary - Analytics Dashboard
--   3. mv_geographic_performance - Geographic Performance
--   4. mv_membership_growth_monthly - Membership Growth
--   5. mv_voting_district_compliance - Ward Audit VD Compliance
--   6. mv_ward_compliance_summary - Ward Audit Summary
-- =====================================================

-- =====================================================
-- SECTION 0: BASE VIEW - vw_member_details (REQUIRED DEPENDENCY)
-- =====================================================
DROP VIEW IF EXISTS vw_member_details CASCADE;

CREATE OR REPLACE VIEW vw_member_details AS
SELECT
    m.member_id,
    m.id_number,
    m.firstname,
    m.surname,
    m.middle_name,
    CONCAT(m.firstname, ' ', COALESCE(m.middle_name || ' ', ''), COALESCE(m.surname, '')) AS full_name,
    m.date_of_birth,
    m.age,

    -- Demographic information with resolved lookups
    g.gender_name,
    r.race_name,
    c.citizenship_name,
    l.language_name,

    -- Contact information
    m.residential_address,
    m.postal_address,
    m.cell_number,
    m.landline_number,
    m.alternative_contact,
    m.email,

    -- Professional information
    o.occupation_name,
    oc.category_name AS occupation_category,
    q.qualification_name,
    q.level_order AS qualification_level,

    -- Geographic information (with metro support)
    m.ward_code,
    w.ward_name,
    w.ward_number,
    mu.municipality_code,
    mu.municipality_name,
    mu.municipality_type,

    -- District information (handle metros with parent municipalities)
    COALESCE(mu.district_code, pm.district_code) AS district_code,
    COALESCE(d.district_name, pd.district_name) AS district_name,

    -- Province information (handle metros with parent municipalities)
    COALESCE(d.province_code, pd.province_code) AS province_code,
    COALESCE(p.province_name, pp.province_name) AS province_name,

    -- Voting information
    m.voting_district_code,
    vd.voting_district_name,
    vs_status.status_name AS voter_status,
    m.voter_registration_number,
    m.voter_registration_date,

    -- Membership information (all from members_consolidated)
    m.current_membership_id AS membership_id,
    m.membership_number,
    m.date_joined,
    m.expiry_date,
    m.last_payment_date,
    ms_status.status_name AS membership_status,
    ms_status.is_active AS membership_active,
    st.subscription_name AS subscription_type,
    m.membership_amount,

    -- Calculated membership standing
    CASE
        WHEN m.expiry_date >= CURRENT_DATE AND ms_status.is_active = true THEN 'Active'
        WHEN m.expiry_date < CURRENT_DATE THEN 'Expired'
        WHEN ms_status.is_active = false THEN 'Inactive'
        ELSE 'Unknown'
    END AS membership_standing,

    -- Days until expiry
    CASE
        WHEN m.expiry_date IS NOT NULL THEN (m.expiry_date - CURRENT_DATE)
        ELSE NULL
    END AS days_until_expiry,

    -- Timestamps
    m.created_at AS member_created_at,
    m.updated_at AS member_updated_at

FROM members_consolidated m
    -- Geographic JOINs
    LEFT JOIN wards w ON m.ward_code = w.ward_code
    LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
    LEFT JOIN municipalities pm ON mu.parent_municipality_id = pm.municipality_id
    LEFT JOIN districts d ON mu.district_code = d.district_code
    LEFT JOIN districts pd ON pm.district_code = pd.district_code
    LEFT JOIN provinces p ON d.province_code = p.province_code
    LEFT JOIN provinces pp ON pd.province_code = pp.province_code

    -- Voting information JOINs
    LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code

    -- Demographic JOINs
    LEFT JOIN genders g ON m.gender_id = g.gender_id
    LEFT JOIN races r ON m.race_id = r.race_id
    LEFT JOIN citizenships c ON m.citizenship_id = c.citizenship_id
    LEFT JOIN languages l ON m.language_id = l.language_id

    -- Professional JOINs
    LEFT JOIN occupations o ON m.occupation_id = o.occupation_id
    LEFT JOIN occupation_categories oc ON o.category_id = oc.category_id
    LEFT JOIN qualifications q ON m.qualification_id = q.qualification_id

    -- Voter status JOIN
    LEFT JOIN voter_statuses vs_status ON m.voter_status_id = vs_status.status_id

    -- Membership status JOINs
    LEFT JOIN membership_statuses ms_status ON m.membership_status_id = ms_status.status_id
    LEFT JOIN subscription_types st ON m.subscription_type_id = st.subscription_type_id;

-- =====================================================
-- SECTION 0B: BASE VIEW - vw_enhanced_member_search (REQUIRED DEPENDENCY)
-- =====================================================
DROP VIEW IF EXISTS vw_enhanced_member_search CASCADE;

CREATE VIEW vw_enhanced_member_search AS
SELECT
  -- Core member fields from members_consolidated
  m.member_id,
  m.id_number,
  m.firstname,
  m.surname,
  m.middle_name,
  CONCAT(m.firstname, ' ', COALESCE(m.middle_name, ''), ' ', COALESCE(m.surname, '')) AS full_name,
  m.date_of_birth,
  m.age,

  -- IDs for filtering/joining
  m.gender_id,
  m.race_id,
  m.citizenship_id,
  m.language_id,

  -- Lookup names
  g.gender_name,
  r.race_name,
  c.citizenship_name,
  l.language_name,

  -- Contact information
  m.cell_number,
  m.landline_number,
  m.alternative_contact,
  m.email,
  m.residential_address,
  m.postal_address,

  -- Geographic codes (from members_consolidated - source of truth)
  m.ward_code,
  m.voting_district_code,
  m.voter_district_code,
  m.municipality_code,
  m.district_code,
  m.province_code,

  -- Geographic names (from lookup tables)
  w.ward_name,
  w.ward_number,
  CONCAT('Ward ', w.ward_number, ' - ', w.ward_name) AS ward_display,
  mu.municipality_name,
  d.district_name,
  p.province_name,
  CONCAT(
    COALESCE(w.ward_name, ''), ', ',
    COALESCE(mu.municipality_name, ''), ', ',
    COALESCE(d.district_name, ''), ', ',
    COALESCE(p.province_name, '')
  ) AS location_display,

  -- Voter information
  m.voting_station_id,
  m.voter_status_id,
  vs.status_name AS voter_status_name,
  m.voter_registration_number,
  m.voter_registration_date,
  m.voter_verified_at,

  -- Occupation and qualification
  m.occupation_id,
  m.qualification_id,
  o.occupation_name,
  q.qualification_name,

  -- Membership information
  m.membership_type,
  m.application_id,
  m.current_membership_id,
  m.membership_number,
  m.date_joined,
  m.last_payment_date,
  m.expiry_date,
  m.subscription_type_id,
  m.membership_amount,
  m.membership_status_id,
  m.payment_method,
  m.payment_reference,
  m.payment_status,

  -- Timestamps
  m.created_at,
  m.updated_at,

  -- Search text for full-text search
  CONCAT(
    m.firstname, ' ',
    COALESCE(m.middle_name, ''), ' ',
    COALESCE(m.surname, ''), ' ',
    m.id_number, ' ',
    COALESCE(m.email, ''), ' ',
    COALESCE(m.cell_number, ''), ' ',
    COALESCE(m.landline_number, ''), ' ',
    COALESCE(m.residential_address, ''), ' ',
    COALESCE(w.ward_name, ''), ' ',
    COALESCE(mu.municipality_name, ''), ' ',
    COALESCE(d.district_name, ''), ' ',
    COALESCE(p.province_name, ''), ' ',
    COALESCE(o.occupation_name, ''), ' ',
    COALESCE(g.gender_name, ''), ' ',
    COALESCE(r.race_name, '')
  ) AS search_text

FROM members_consolidated m
LEFT JOIN genders g ON m.gender_id = g.gender_id
LEFT JOIN races r ON m.race_id = r.race_id
LEFT JOIN citizenships c ON m.citizenship_id = c.citizenship_id
LEFT JOIN languages l ON m.language_id = l.language_id
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON m.municipality_code = mu.municipality_code
LEFT JOIN districts d ON m.district_code = d.district_code
LEFT JOIN provinces p ON m.province_code = p.province_code
LEFT JOIN voter_statuses vs ON m.voter_status_id = vs.status_id
LEFT JOIN occupations o ON m.occupation_id = o.occupation_id
LEFT JOIN qualifications q ON m.qualification_id = q.qualification_id;

COMMENT ON VIEW vw_enhanced_member_search IS 'Complete member search view with all fields from members_consolidated plus lookup names.';

-- =====================================================
-- SECTION 1: HIERARCHICAL DASHBOARD VIEW
-- =====================================================
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

-- =====================================================
-- SECTION 2: ANALYTICS SUMMARY VIEW
-- =====================================================
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

-- =====================================================
-- SECTION 3: GEOGRAPHIC PERFORMANCE VIEW
-- =====================================================
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


-- =====================================================
-- SECTION 4: MEMBERSHIP GROWTH MONTHLY VIEW
-- =====================================================
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

-- =====================================================
-- SECTION 5: VOTING DISTRICT COMPLIANCE VIEW
-- =====================================================
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

-- =====================================================
-- SECTION 6: WARD COMPLIANCE SUMMARY VIEW
-- =====================================================
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

-- =====================================================
-- SECTION 7: CREATE REFRESH FUNCTIONS
-- =====================================================
CREATE OR REPLACE FUNCTION refresh_ward_audit_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_voting_district_compliance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ward_compliance_summary;
    RAISE NOTICE 'Ward audit materialized views refreshed successfully at %', NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
    RAISE NOTICE 'Starting refresh of all materialized views at %', NOW();
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_hierarchical_dashboard_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_membership_analytics_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_geographic_performance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_membership_growth_monthly;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_voting_district_compliance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ward_compliance_summary;
    RAISE NOTICE 'All materialized views refreshed successfully at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
SELECT
    'mv_hierarchical_dashboard_stats' as view_name, COUNT(*) as row_count FROM mv_hierarchical_dashboard_stats
UNION ALL SELECT 'mv_membership_analytics_summary', COUNT(*) FROM mv_membership_analytics_summary
UNION ALL SELECT 'mv_geographic_performance', COUNT(*) FROM mv_geographic_performance
UNION ALL SELECT 'mv_membership_growth_monthly', COUNT(*) FROM mv_membership_growth_monthly
UNION ALL SELECT 'mv_voting_district_compliance', COUNT(*) FROM mv_voting_district_compliance
UNION ALL SELECT 'mv_ward_compliance_summary', COUNT(*) FROM mv_ward_compliance_summary;
