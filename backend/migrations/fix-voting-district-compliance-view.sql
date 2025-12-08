/**
 * Fix vw_voting_district_compliance View to Use members_consolidated
 * 
 * Issue: The view uses the OLD "members" table which:
 *   - Has 508,869 stale records
 *   - Causes sequential scans taking 10+ seconds
 *   - Is the ROOT CAUSE of slow ward compliance queries
 * 
 * Solution: Update view to use "members_consolidated" table
 * 
 * Impact: This will dramatically improve performance of:
 *   - GET /api/v1/ward-audit/wards?municipality_code=JHB004
 *   - All ward compliance queries
 * 
 * Date: 2025-11-08
 */

-- Drop and recreate the view with members_consolidated
DROP VIEW IF EXISTS vw_voting_district_compliance CASCADE;

CREATE OR REPLACE VIEW vw_voting_district_compliance AS
SELECT 
    vd.voting_district_code,
    vd.voting_district_name,
    vd.ward_code,
    w.ward_name,
    w.municipality_code,
    
    -- Member count (NOW USING members_consolidated)
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
    END AS compliance_status
    
FROM voting_districts vd
LEFT JOIN wards w ON vd.ward_code = w.ward_code

-- ✅ FIXED: Changed from "members" to "members_consolidated"
LEFT JOIN members_consolidated m ON vd.voting_district_code = m.voting_district_code

-- Exclude special voting districts
WHERE vd.voting_district_code NOT IN ('99999999', '33333333', '22222222', '11111111')

GROUP BY 
    vd.voting_district_code, 
    vd.voting_district_name, 
    vd.ward_code, 
    w.ward_name, 
    w.municipality_code;

-- Add comment
COMMENT ON VIEW vw_voting_district_compliance IS 'Voting district compliance summary - FIXED to use members_consolidated for better performance';

-- Verify the fix
SELECT 'View updated successfully - now using members_consolidated' as status;

