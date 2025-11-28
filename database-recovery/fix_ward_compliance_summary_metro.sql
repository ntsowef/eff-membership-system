/**
 * Fix vw_ward_compliance_summary View for Metro Sub-Regions
 * 
 * Issue: The vw_ward_compliance_summary view doesn't include metro sub-regions
 * because it uses direct joins to districts without considering parent municipalities.
 * 
 * This causes ward.province_code to be NULL for metro wards, which breaks the
 * presiding officer selection (getMembersByProvince) in the ward audit system.
 * 
 * Solution: Add parent municipality joins with COALESCE to resolve district_code
 * and province_code through the parent-child relationship for metros.
 * 
 * Date: 2025-01-23
 */

-- Drop and recreate the view with metro support
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
    
    -- Member counts
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
    
    -- Overall criterion 1 compliance
    CASE 
        WHEN COUNT(DISTINCT mem.member_id) >= 200 
        AND COUNT(DISTINCT vdc.voting_district_code) > 0
        AND COUNT(DISTINCT vdc.voting_district_code) = COUNT(DISTINCT CASE WHEN vdc.is_compliant THEN vdc.voting_district_code END)
        THEN TRUE 
        ELSE FALSE 
    END as criterion_1_compliant,
    
    -- Compliance status
    w.is_compliant,
    w.compliance_approved_at,
    w.compliance_approved_by,
    w.last_audit_date,
    
    -- Delegate counts
    COUNT(DISTINCT CASE WHEN wd.assembly_type_id = (SELECT assembly_type_id FROM assembly_types WHERE assembly_code = 'SRPA') AND wd.delegate_status = 'Active' THEN wd.delegate_id END) as srpa_delegates,
    COUNT(DISTINCT CASE WHEN wd.assembly_type_id = (SELECT assembly_type_id FROM assembly_types WHERE assembly_code = 'PPA') AND wd.delegate_status = 'Active' THEN wd.delegate_id END) as ppa_delegates,
    COUNT(DISTINCT CASE WHEN wd.assembly_type_id = (SELECT assembly_type_id FROM assembly_types WHERE assembly_code = 'NPA') AND wd.delegate_status = 'Active' THEN wd.delegate_id END) as npa_delegates,
    
    w.created_at,
    w.updated_at
FROM wards w
LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code

-- ADDED: Join to parent municipality (for metro sub-regions)
LEFT JOIN municipalities pm ON m.parent_municipality_id = pm.municipality_id

-- MODIFIED: Join to districts (both direct and through parent)
LEFT JOIN districts d ON m.district_code = d.district_code
LEFT JOIN districts pd ON pm.district_code = pd.district_code

LEFT JOIN members mem ON w.ward_code = mem.ward_code
LEFT JOIN vw_voting_district_compliance vdc ON w.ward_code = vdc.ward_code
LEFT JOIN ward_delegates wd ON w.ward_code = wd.ward_code
WHERE w.is_active = TRUE
GROUP BY 
    w.ward_code, w.ward_name, w.ward_number, w.municipality_code, 
    m.municipality_name, 
    m.district_code, pm.district_code,  -- ADDED: pm.district_code to GROUP BY
    d.province_code, pd.province_code,  -- ADDED: pd.province_code to GROUP BY
    w.is_compliant, w.compliance_approved_at, w.compliance_approved_by, 
    w.last_audit_date, w.created_at, w.updated_at;

-- Add comment
COMMENT ON VIEW vw_ward_compliance_summary IS 'Comprehensive ward compliance summary with all criteria - FIXED to include metro sub-regions';

-- Verify the fix
DO $$
DECLARE
    metro_ward_count INTEGER;
    null_province_count INTEGER;
BEGIN
    -- Count metro wards
    SELECT COUNT(*) INTO metro_ward_count
    FROM vw_ward_compliance_summary wcs
    JOIN municipalities m ON wcs.municipality_code = m.municipality_code
    WHERE m.municipality_type = 'Metro Sub-Region';
    
    -- Count wards with NULL province_code
    SELECT COUNT(*) INTO null_province_count
    FROM vw_ward_compliance_summary
    WHERE province_code IS NULL;
    
    RAISE NOTICE '✅ Fix applied successfully!';
    RAISE NOTICE '   Metro wards in view: %', metro_ward_count;
    RAISE NOTICE '   Wards with NULL province_code: %', null_province_count;
    
    IF null_province_count > 0 THEN
        RAISE WARNING '⚠️  Still have % wards with NULL province_code', null_province_count;
    ELSE
        RAISE NOTICE '✅ All wards now have province_code populated!';
    END IF;
END $$;

