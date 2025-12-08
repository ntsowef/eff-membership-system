-- Fix vw_member_details_optimized view to include voting_station_name
-- This view is used by the digital membership card generation

-- Drop the existing view if it exists
DROP VIEW IF EXISTS vw_member_details_optimized CASCADE;

-- Recreate the optimized view with all necessary columns including voting_station_name
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
    CONCAT('MEM', LPAD(m.member_id::TEXT, 6, '0')) as membership_number,

    -- Geographic data with optimized joins
    p.province_code,
    p.province_name,

    -- District information
    d.district_code,
    d.district_name,
    
    -- Municipality information
    mu.municipality_code,
    mu.municipality_name,
    
    -- Ward information
    w.ward_code,
    w.ward_number,
    w.ward_name,
    
    -- Voting station information (ADDED)
    COALESCE(vs.station_name, 'Not Available') as voting_station_name,
    COALESCE(vs.station_code, '') as voting_station_code,
    m.voting_station_id,
    
    -- Voting district information
    m.voting_district_code,
    COALESCE(vd.voting_district_name, '') as voting_district_name,
    
    -- Demographic information
    COALESCE(g.gender_name, 'Unknown') as gender_name,
    COALESCE(r.race_name, 'Unknown') as race_name,
    COALESCE(c.citizenship_name, 'Unknown') as citizenship_name,
    COALESCE(l.language_name, 'Unknown') as language_name,
    
    -- Voter status
    CASE WHEN vs_status.status_name = 'Registered' THEN TRUE ELSE FALSE END as is_eligible_to_vote,
    COALESCE(vs_status.status_name, 'Unknown') as voter_status,
    
    -- Membership status
    COALESCE(ms_status.status_name, 'Pending') as membership_status,
    COALESCE(ms_status.is_active, FALSE) as membership_active
    
FROM members m

-- Geographic joins (optimized with LEFT JOIN for metros)
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code

-- Voting information joins
LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code
LEFT JOIN voting_stations vs ON m.voting_station_id = vs.voting_station_id

-- Lookup table joins
LEFT JOIN genders g ON m.gender_id = g.gender_id
LEFT JOIN races r ON m.race_id = r.race_id
LEFT JOIN citizenships c ON m.citizenship_id = c.citizenship_id
LEFT JOIN languages l ON m.language_id = l.language_id
LEFT JOIN voter_statuses vs_status ON m.voter_status_id = vs_status.status_id

-- Membership status join (through memberships table)
LEFT JOIN memberships ms ON m.member_id = ms.member_id
LEFT JOIN membership_statuses ms_status ON ms.status_id = ms_status.status_id;

-- Create indexes on the base table for better view performance
CREATE INDEX IF NOT EXISTS idx_members_voting_station_id ON members(voting_station_id);
CREATE INDEX IF NOT EXISTS idx_members_voting_district_code ON members(voting_district_code);
CREATE INDEX IF NOT EXISTS idx_members_ward_code ON members(ward_code);

-- Grant permissions
GRANT SELECT ON vw_member_details_optimized TO PUBLIC;

-- Verify the view was created successfully
SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'vw_member_details_optimized' 
ORDER BY ordinal_position;

-- Test query to verify voting_station_name is accessible
SELECT 
    member_id,
    membership_number,
    firstname,
    surname,
    province_name,
    municipality_name,
    ward_code,
    voting_station_name,
    voting_station_code,
    member_created_at
FROM vw_member_details_optimized
LIMIT 5;

