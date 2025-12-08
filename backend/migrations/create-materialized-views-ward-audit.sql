/**
 * Create Materialized Views for Ward Audit System
 * 
 * Problem: Current views do full table scans on 626,759 members for EVERY query
 *   - vw_voting_district_compliance: Scans all members (6.3 seconds)
 *   - vw_ward_compliance_summary: Depends on voting district view (10+ seconds)
 *   - This affects ALL municipalities, not just JHB004
 * 
 * Solution: Create materialized views that pre-calculate all aggregations
 *   - Query time: < 100ms (100x faster!)
 *   - Trade-off: Data refreshed periodically (e.g., every 15 minutes)
 * 
 * Date: 2025-11-08
 * Impact: ALL ward audit endpoints will be dramatically faster
 */

-- =====================================================
-- STEP 1: Create Materialized View for Voting District Compliance
-- =====================================================

DROP MATERIALIZED VIEW IF EXISTS mv_voting_district_compliance CASCADE;

CREATE MATERIALIZED VIEW mv_voting_district_compliance AS
SELECT 
    vd.voting_district_code,
    vd.voting_district_name,
    vd.ward_code,
    w.ward_name,
    w.municipality_code,
    
    -- Member count (using members_consolidated)
    COUNT(DISTINCT m.member_id) AS member_count,
    
    -- Compliance check (5+ members required)
    CASE 
        WHEN COUNT(DISTINCT m.member_id) >= 5 THEN TRUE 
        ELSE FALSE 
    END AS is_compliant,
    
    -- Compliance status text
    CASE 
        WHEN COUNT(DISTINCT m.member_id) >= 5 THEN 'Compliant'
        WHEN COUNT(DISTINCT m.member_id) > 0 THEN 'Non-Compliant'
        ELSE 'No Members'
    END AS compliance_status,
    
    -- Metadata
    NOW() as last_refreshed
    
FROM voting_districts vd
LEFT JOIN wards w ON vd.ward_code = w.ward_code
LEFT JOIN members_consolidated m ON vd.voting_district_code = m.voting_district_code

-- Exclude special voting districts
WHERE vd.voting_district_code NOT IN ('99999999', '33333333', '22222222', '11111111')

GROUP BY 
    vd.voting_district_code, 
    vd.voting_district_name, 
    vd.ward_code, 
    w.ward_name, 
    w.municipality_code;

-- Create indexes for fast lookups
CREATE INDEX idx_mv_vdc_ward_code ON mv_voting_district_compliance(ward_code);
CREATE INDEX idx_mv_vdc_municipality ON mv_voting_district_compliance(municipality_code);
CREATE INDEX idx_mv_vdc_voting_district ON mv_voting_district_compliance(voting_district_code);
CREATE INDEX idx_mv_vdc_compliant ON mv_voting_district_compliance(is_compliant);

COMMENT ON MATERIALIZED VIEW mv_voting_district_compliance IS 'Materialized view for voting district compliance - refreshed periodically for performance';

-- =====================================================
-- STEP 2: Create Materialized View for Ward Compliance Summary
-- =====================================================

DROP MATERIALIZED VIEW IF EXISTS mv_ward_compliance_summary CASCADE;

CREATE MATERIALIZED VIEW mv_ward_compliance_summary AS
SELECT 
    w.ward_code,
    w.ward_name,
    w.ward_number,
    w.municipality_code,
    m.municipality_name,
    
    -- Geographic info
    COALESCE(m.district_code, pm.district_code) as district_code,
    COALESCE(d.province_code, pd.province_code) as province_code,
    
    -- Member counts (using members_consolidated)
    COUNT(DISTINCT mem.member_id) as total_members,
    CASE WHEN COUNT(DISTINCT mem.member_id) >= 200 THEN TRUE ELSE FALSE END as meets_member_threshold,
    
    -- Voting district compliance (using materialized view)
    COUNT(DISTINCT vdc.voting_district_code) as total_voting_districts,
    COUNT(DISTINCT CASE WHEN vdc.is_compliant THEN vdc.voting_district_code END) as compliant_voting_districts,
    CASE 
        WHEN COUNT(DISTINCT vdc.voting_district_code) > 0 
        AND COUNT(DISTINCT vdc.voting_district_code) = COUNT(DISTINCT CASE WHEN vdc.is_compliant THEN vdc.voting_district_code END)
        THEN TRUE 
        ELSE FALSE 
    END as all_vds_compliant,
    
    -- Criterion 1: Complex VD-based compliance rules
    -- Rules:
    -- 1. If ward has <= 3 VDs: Must have ALL VDs compliant (no exceptions)
    -- 2. If ward has >= 4 VDs AND >= 200 members: Pass (allow exception)
    -- 3. If ward has >= 4 VDs AND 190-199 members AND all VDs compliant: Pass (exception)
    -- 4. Otherwise: Fail
    CASE
        -- Rule 1: <= 3 VDs - Must have ALL VDs compliant
        WHEN COUNT(DISTINCT vdc.voting_district_code) <= 3 THEN
            CASE
                WHEN COUNT(DISTINCT vdc.voting_district_code) > 0
                AND COUNT(DISTINCT vdc.voting_district_code) = COUNT(DISTINCT CASE WHEN vdc.is_compliant THEN vdc.voting_district_code END)
                THEN TRUE
                ELSE FALSE
            END

        -- Rule 2 & 3: >= 4 VDs - Check member count and VD compliance
        WHEN COUNT(DISTINCT vdc.voting_district_code) >= 4 THEN
            CASE
                -- Rule 2: >= 200 members - Pass (allow exception even if not all VDs compliant)
                WHEN COUNT(DISTINCT mem.member_id) >= 200 THEN TRUE

                -- Rule 3: 190-199 members AND all VDs compliant - Pass (exception)
                WHEN COUNT(DISTINCT mem.member_id) >= 190
                AND COUNT(DISTINCT mem.member_id) < 200
                AND COUNT(DISTINCT vdc.voting_district_code) = COUNT(DISTINCT CASE WHEN vdc.is_compliant THEN vdc.voting_district_code END)
                THEN TRUE

                -- Otherwise fail
                ELSE FALSE
            END

        -- No VDs or other edge cases - Fail
        ELSE FALSE
    END as criterion_1_compliant,

    -- Track if exception was used (for UI display)
    CASE
        -- Exception used if >= 4 VDs and either:
        -- 1. >= 200 members but not all VDs compliant, OR
        -- 2. 190-199 members with all VDs compliant
        WHEN COUNT(DISTINCT vdc.voting_district_code) >= 4 THEN
            CASE
                WHEN COUNT(DISTINCT mem.member_id) >= 200
                AND COUNT(DISTINCT vdc.voting_district_code) != COUNT(DISTINCT CASE WHEN vdc.is_compliant THEN vdc.voting_district_code END)
                THEN TRUE

                WHEN COUNT(DISTINCT mem.member_id) >= 190
                AND COUNT(DISTINCT mem.member_id) < 200
                AND COUNT(DISTINCT vdc.voting_district_code) = COUNT(DISTINCT CASE WHEN vdc.is_compliant THEN vdc.voting_district_code END)
                THEN TRUE

                ELSE FALSE
            END
        ELSE FALSE
    END as criterion_1_exception_applied,
    
    -- Ward compliance status
    w.is_compliant,
    w.compliance_approved_at,
    w.compliance_approved_by,
    w.last_audit_date,
    
    -- Delegate counts by assembly type
    COUNT(DISTINCT CASE 
        WHEN wd.assembly_type_id = (SELECT assembly_type_id FROM assembly_types WHERE assembly_code = 'SRPA')
        AND wd.delegate_status = 'Active'
        THEN wd.delegate_id 
    END) as srpa_delegates,
    
    COUNT(DISTINCT CASE 
        WHEN wd.assembly_type_id = (SELECT assembly_type_id FROM assembly_types WHERE assembly_code = 'PPA')
        AND wd.delegate_status = 'Active'
        THEN wd.delegate_id 
    END) as ppa_delegates,
    
    COUNT(DISTINCT CASE 
        WHEN wd.assembly_type_id = (SELECT assembly_type_id FROM assembly_types WHERE assembly_code = 'NPA')
        AND wd.delegate_status = 'Active'
        THEN wd.delegate_id 
    END) as npa_delegates,
    
    w.created_at,
    w.updated_at,

    -- Metadata
    NOW() as last_refreshed

FROM wards w
LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
LEFT JOIN municipalities pm ON m.parent_municipality_id = pm.municipality_id
LEFT JOIN districts d ON m.district_code = d.district_code
LEFT JOIN districts pd ON pm.district_code = pd.district_code
LEFT JOIN members_consolidated mem ON w.ward_code = mem.ward_code
LEFT JOIN mv_voting_district_compliance vdc ON w.ward_code = vdc.ward_code
LEFT JOIN ward_delegates wd ON w.ward_code = wd.ward_code
WHERE w.is_active = TRUE
GROUP BY
    w.ward_code, w.ward_name, w.ward_number, w.municipality_code,
    m.municipality_name,
    m.district_code, pm.district_code,
    d.province_code, pd.province_code,
    w.is_compliant, w.compliance_approved_at, w.compliance_approved_by,
    w.last_audit_date, w.created_at, w.updated_at;

-- Create indexes for fast lookups
CREATE INDEX idx_mv_wcs_ward_code ON mv_ward_compliance_summary(ward_code);
CREATE INDEX idx_mv_wcs_municipality ON mv_ward_compliance_summary(municipality_code);
CREATE INDEX idx_mv_wcs_district ON mv_ward_compliance_summary(district_code);
CREATE INDEX idx_mv_wcs_province ON mv_ward_compliance_summary(province_code);
CREATE INDEX idx_mv_wcs_compliant ON mv_ward_compliance_summary(is_compliant);
CREATE INDEX idx_mv_wcs_criterion_1 ON mv_ward_compliance_summary(criterion_1_compliant);

COMMENT ON MATERIALIZED VIEW mv_ward_compliance_summary IS 'Materialized view for ward compliance summary - refreshed periodically for performance';

-- =====================================================
-- STEP 3: Create Function to Refresh Materialized Views
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_ward_audit_materialized_views()
RETURNS void AS $$
BEGIN
    -- Refresh in correct order (voting districts first, then wards)
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_voting_district_compliance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ward_compliance_summary;

    RAISE NOTICE 'Ward audit materialized views refreshed successfully at %', NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_ward_audit_materialized_views() IS 'Refresh all ward audit materialized views in correct dependency order';

-- =====================================================
-- STEP 4: Create Unique Indexes for CONCURRENT Refresh
-- =====================================================

-- Unique index on voting district compliance (required for CONCURRENT refresh)
CREATE UNIQUE INDEX idx_mv_vdc_unique ON mv_voting_district_compliance(voting_district_code);

-- Unique index on ward compliance summary (required for CONCURRENT refresh)
CREATE UNIQUE INDEX idx_mv_wcs_unique ON mv_ward_compliance_summary(ward_code);

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT
    'Materialized views created successfully!' as status,
    (SELECT COUNT(*) FROM mv_voting_district_compliance) as voting_districts_count,
    (SELECT COUNT(*) FROM mv_ward_compliance_summary) as wards_count,
    NOW() as created_at;

