-- =====================================================
-- Update Criterion 1 Logic in Materialized View
-- =====================================================
-- This migration updates the mv_ward_compliance_summary materialized view
-- with the new Criterion 1 validation rules based on VD count
-- =====================================================

-- Drop the existing materialized view
DROP MATERIALIZED VIEW IF EXISTS mv_ward_compliance_summary CASCADE;

-- Recreate with new Criterion 1 logic
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
    
    -- Exception tracking from wards table
    w.criterion_1_exception_granted,
    w.criterion_1_exception_reason,
    w.criterion_1_exception_granted_by,
    w.criterion_1_exception_granted_at,
    
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
LEFT JOIN ward_delegates wd ON w.ward_code = wd.ward_code AND wd.delegate_status = 'Active'

WHERE w.is_active = TRUE

GROUP BY 
    w.ward_code, w.ward_name, w.ward_number, w.municipality_code, 
    m.municipality_name, m.district_code, pm.district_code,
    d.province_code, pd.province_code,
    w.is_compliant, w.compliance_approved_at, w.compliance_approved_by, 
    w.last_audit_date, w.created_at, w.updated_at,
    w.criterion_1_exception_granted, w.criterion_1_exception_reason,
    w.criterion_1_exception_granted_by, w.criterion_1_exception_granted_at;

-- Create indexes for fast lookups
CREATE UNIQUE INDEX idx_mv_wcs_unique ON mv_ward_compliance_summary(ward_code);
CREATE INDEX idx_mv_wcs_municipality ON mv_ward_compliance_summary(municipality_code);
CREATE INDEX idx_mv_wcs_district ON mv_ward_compliance_summary(district_code);
CREATE INDEX idx_mv_wcs_province ON mv_ward_compliance_summary(province_code);
CREATE INDEX idx_mv_wcs_compliant ON mv_ward_compliance_summary(is_compliant);
CREATE INDEX idx_mv_wcs_criterion_1 ON mv_ward_compliance_summary(criterion_1_compliant);

COMMENT ON MATERIALIZED VIEW mv_ward_compliance_summary IS 'Materialized view for ward compliance summary with updated Criterion 1 logic - refreshed periodically for performance';

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ward_compliance_summary;

SELECT 'Materialized view updated with new Criterion 1 logic successfully' as status;

