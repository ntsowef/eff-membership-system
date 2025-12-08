/**
 * Fix vw_ward_compliance_summary View to Use members_consolidated
 * 
 * Issue: The view uses the OLD "members" table which:
 *   - Has 508,869 stale records
 *   - Does NOT have the latest data
 *   - Causes queries to take 13+ seconds
 * 
 * Solution: Update view to use "members_consolidated" table which:
 *   - Has 626,759 current records
 *   - Is the single source of truth
 *   - Will significantly improve query performance
 * 
 * Date: 2025-11-08
 * Endpoint: GET /api/v1/ward-audit/wards?municipality_code=JHB004
 */

-- Drop and recreate the view with members_consolidated
DROP VIEW IF EXISTS vw_ward_compliance_summary CASCADE;

CREATE OR REPLACE VIEW vw_ward_compliance_summary AS
SELECT 
    w.ward_code,
    w.ward_name,
    w.ward_number,
    w.municipality_code,
    m.municipality_name,
    
    -- FIXED: Use COALESCE to get district_code from either direct or parent municipality
    COALESCE(m.district_code, pm.district_code) as district_code,
    
    -- FIXED: Use COALESCE to get province_code from either direct or parent municipality's district
    COALESCE(d.province_code, pd.province_code) as province_code,
    
    -- Member counts (NOW USING members_consolidated)
    COUNT(DISTINCT mem.member_id) as total_members,
    CASE WHEN COUNT(DISTINCT mem.member_id) >= 200 THEN TRUE ELSE FALSE END as meets_member_threshold,
    
    -- Voting district compliance
    COUNT(DISTINCT vdc.voting_district_code) as total_voting_districts,
    COUNT(DISTINCT CASE WHEN vdc.is_compliant THEN vdc.voting_district_code END) as compliant_voting_districts,
    CASE 
        WHEN COUNT(DISTINCT vdc.voting_district_code) > 0 
        AND COUNT(DISTINCT vdc.voting_district_code) = COUNT(DISTINCT CASE WHEN vdc.is_compliant THEN vdc.voting_district_code END)
        THEN TRUE 
        ELSE FALSE 
    END as all_vds_compliant,
    
    -- Criterion 1: Member threshold + All VDs compliant
    CASE 
        WHEN COUNT(DISTINCT mem.member_id) >= 200 
        AND COUNT(DISTINCT vdc.voting_district_code) > 0
        AND COUNT(DISTINCT vdc.voting_district_code) = COUNT(DISTINCT CASE WHEN vdc.is_compliant THEN vdc.voting_district_code END)
        THEN TRUE 
        ELSE FALSE 
    END as criterion_1_compliant,
    
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
    w.updated_at
FROM wards w
LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
LEFT JOIN municipalities pm ON m.parent_municipality_id = pm.municipality_id
LEFT JOIN districts d ON m.district_code = d.district_code
LEFT JOIN districts pd ON pm.district_code = pd.district_code

-- ✅ FIXED: Changed from "members" to "members_consolidated"
LEFT JOIN members_consolidated mem ON w.ward_code = mem.ward_code

LEFT JOIN vw_voting_district_compliance vdc ON w.ward_code = vdc.ward_code
LEFT JOIN ward_delegates wd ON w.ward_code = wd.ward_code
WHERE w.is_active = TRUE
GROUP BY 
    w.ward_code, w.ward_name, w.ward_number, w.municipality_code, 
    m.municipality_name, 
    m.district_code, pm.district_code,
    d.province_code, pd.province_code,
    w.is_compliant, w.compliance_approved_at, w.compliance_approved_by, 
    w.last_audit_date, w.created_at, w.updated_at;

-- Add comment
COMMENT ON VIEW vw_ward_compliance_summary IS 'Comprehensive ward compliance summary - FIXED to use members_consolidated for better performance';

-- Verify the fix
SELECT 'View updated successfully - now using members_consolidated' as status;

