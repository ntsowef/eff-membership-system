-- Fix vw_member_details_optimized to use province_code directly from members_consolidated
-- This ensures that members with metro municipalities still get their province_code displayed

-- Drop the existing view
DROP VIEW IF EXISTS vw_member_details_optimized CASCADE;

-- Recreate with province_code from members_consolidated as the primary source
CREATE OR REPLACE VIEW vw_member_details_optimized AS
SELECT 
    m.member_id,
    m.id_number,
    m.firstname,
    COALESCE(m.surname, '') as surname,
    COALESCE(m.email, '') as email,
    COALESCE(m.cell_number, '') as cell_number,
    m.created_at as member_created_at,
    
    -- Pre-calculated membership number (from members_consolidated directly)
    COALESCE(m.membership_number, CONCAT('MEM', LPAD(m.member_id::TEXT, 6, '0'))) as membership_number,
    
    -- Geographic data - USE MEMBER'S OWN PROVINCE_CODE FIRST (most reliable for metros)
    -- Fallback to joined province data only if member's province_code is null
    COALESCE(m.province_code, p.province_code, pp.province_code) as province_code,
    COALESCE(p.province_name, pp.province_name) as province_name,
    
    -- District information (handle metros with parent municipalities)
    COALESCE(d.district_code, pd.district_code) as district_code,
    COALESCE(d.district_name, pd.district_name) as district_name,
    
    -- Municipality information
    COALESCE(mu.municipality_code, m.municipality_code) as municipality_code,
    COALESCE(mu.municipality_name, m.municipality_name) as municipality_name,
    
    -- Ward information
    w.ward_code,
    w.ward_number,
    w.ward_name,
    
    -- Voting district information
    COALESCE(vd.voting_district_name, 'Not Available') as voting_district_name,
    
    -- Voting station information
    COALESCE(vs.station_name, 'Not Available') as voting_station_name,
    
    -- Demographic information
    COALESCE(g.gender_name, 'Unknown') as gender_name,
    
    -- Membership status (optimized) - CRITICAL FIELDS
    -- All membership data comes from members_consolidated directly (no separate memberships table)
    CASE 
        WHEN m.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 'Active'
        WHEN m.expiry_date < CURRENT_DATE THEN 'Expired'
        ELSE 'Inactive'
    END as membership_status,
    
    -- CRITICAL: Include actual membership fields from members_consolidated
    m.expiry_date,
    m.last_payment_date,
    m.date_joined,
    m.membership_amount,
    
    -- Calculated fields for performance
    CASE 
        WHEN m.expiry_date >= CURRENT_DATE THEN 
            (m.expiry_date - CURRENT_DATE)::INTEGER
        ELSE 0 
    END as days_until_expiry,
    
    -- Status information
    mst.is_active,
    mst.status_name

FROM members_consolidated m

-- Join membership status lookup table only
LEFT JOIN membership_statuses mst ON m.membership_status_id = mst.status_id

-- Geographic joins with metro support
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code

-- Metro fallback: Join directly through member's municipality_code
LEFT JOIN municipalities mum ON m.municipality_code = mum.municipality_code
LEFT JOIN municipalities pm ON mum.parent_municipality_id = pm.municipality_id
LEFT JOIN districts pd ON pm.district_code = pd.district_code
LEFT JOIN provinces pp ON pd.province_code = pp.province_code

-- Voting information
LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code
LEFT JOIN voting_stations vs ON m.voting_station_code = vs.station_code

-- Demographic information
LEFT JOIN genders g ON m.gender_id = g.gender_id;

-- Grant permissions
GRANT SELECT ON vw_member_details_optimized TO PUBLIC;

-- Verify the fix
SELECT 
    'Test member 7501165402082' as test_case,
    member_id,
    id_number,
    firstname,
    province_code,
    province_name,
    municipality_name,
    ward_code
FROM vw_member_details_optimized
WHERE id_number = '7501165402082';

