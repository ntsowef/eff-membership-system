-- Fix vw_member_details_optimized to include expiry_date and membership_status
-- This view is missing critical columns that the backend expects

-- Drop the existing view
DROP VIEW IF EXISTS vw_member_details_optimized CASCADE;

-- Recreate with all necessary columns including expiry_date
CREATE OR REPLACE VIEW vw_member_details_optimized AS
SELECT 
    m.member_id,
    m.id_number,
    m.firstname,
    COALESCE(m.surname, '') as surname,
    COALESCE(m.email, '') as email,
    COALESCE(m.cell_number, '') as cell_number,
    m.created_at as member_created_at,
    
    -- Pre-calculated membership number to avoid CONCAT in queries
    COALESCE(ms.membership_number, CONCAT('MEM', LPAD(m.member_id::TEXT, 6, '0'))) as membership_number,
    
    -- Geographic data with optimized joins (METRO SUPPORT)
    -- Use COALESCE to get province from parent municipality when direct join fails
    COALESCE(p.province_code, pp.province_code) as province_code,
    COALESCE(p.province_name, pp.province_name) as province_name,
    
    -- District information
    COALESCE(d.district_code, pd.district_code) as district_code,
    COALESCE(d.district_name, pd.district_name) as district_name,
    
    -- Municipality information
    COALESCE(mu.municipality_code, m.municipality_code) as municipality_code,
    COALESCE(mu.municipality_name, m.municipality_name) as municipality_name,
    
    -- Ward information
    w.ward_code,
    w.ward_number,
    w.ward_name,
    
    -- Voting district and station information
    COALESCE(
        CAST(REPLACE(CAST(m.voting_district_code AS TEXT), '.0', '') AS VARCHAR),
        vd.voting_district_code
    ) as voting_district_code,
    COALESCE(vd.voting_district_name, 'Not Available') as voting_district_name,

    CAST(REPLACE(CAST(m.voter_district_code AS TEXT), '.0', '') AS VARCHAR) as voting_station_code,
    COALESCE(vs.station_name, 'Not Available') as voting_station_name,
    
    -- Demographic information
    COALESCE(g.gender_name, 'Unknown') as gender_name,
    COALESCE(r.race_name, 'Unknown') as race_name,
    
    -- Membership status (optimized) - CRITICAL FIELDS
    CASE 
        WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 'Active'
        WHEN ms.expiry_date < CURRENT_DATE THEN 'Expired'
        ELSE 'Inactive'
    END as membership_status,
    
    -- CRITICAL: Include actual expiry_date from memberships table
    ms.expiry_date,
    ms.last_payment_date,
    ms.date_joined,
    ms.membership_amount,
    
    -- Calculated fields for performance
    CASE 
        WHEN ms.expiry_date >= CURRENT_DATE THEN 
            (ms.expiry_date - CURRENT_DATE)::INTEGER
        ELSE 0 
    END as days_until_expiry,
    
    -- Status information
    mst.is_active,
    mst.status_name

FROM members m

-- Join with memberships table (CRITICAL for expiry_date)
LEFT JOIN memberships ms ON m.member_id = ms.member_id
LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id

-- Geographic joins with metro support
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code

-- Metro fallback: Join directly through member's municipality_code
LEFT JOIN municipalities mum ON m.municipality_code = mum.municipality_code
LEFT JOIN districts pd ON mum.district_code = pd.district_code
LEFT JOIN provinces pp ON pd.province_code = pp.province_code

-- Voting district and station joins
LEFT JOIN voting_districts vd ON
    CAST(REPLACE(CAST(m.voting_district_code AS TEXT), '.0', '') AS VARCHAR) = vd.voting_district_code
LEFT JOIN voting_stations vs ON
    vd.voting_district_code = vs.voting_district_code

-- Demographic joins
LEFT JOIN genders g ON m.gender_id = g.gender_id
LEFT JOIN races r ON m.race_id = r.race_id;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vw_member_details_optimized_id_number 
    ON members(id_number);

CREATE INDEX IF NOT EXISTS idx_vw_member_details_optimized_member_id 
    ON members(member_id);

CREATE INDEX IF NOT EXISTS idx_memberships_member_id 
    ON memberships(member_id);

CREATE INDEX IF NOT EXISTS idx_memberships_expiry_date 
    ON memberships(expiry_date);

-- Grant permissions
GRANT SELECT ON vw_member_details_optimized TO PUBLIC;

-- Verify the view has the required columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vw_member_details_optimized' 
  AND column_name IN ('expiry_date', 'membership_status', 'days_until_expiry', 'membership_amount')
ORDER BY column_name;

COMMENT ON VIEW vw_member_details_optimized IS 'Performance-optimized view for member details with membership status and expiry date. Includes metro support for municipalities that are directly under provinces.';

