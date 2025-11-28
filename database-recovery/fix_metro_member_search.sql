-- Fix Metro Member Search Issue
-- This script fixes the vw_member_details view to properly include metro sub-region members
-- when filtering by province, district, or municipality
--
-- Issue: Metro sub-regions have NULL district_code because they link to parent metros
-- Solution: Use COALESCE to get district_code from parent municipality when direct district_code is NULL

BEGIN;

-- Drop and recreate vw_member_details with metro support
DROP VIEW IF EXISTS vw_member_details CASCADE;

CREATE OR REPLACE VIEW vw_member_details AS
SELECT
    m.member_id,
    m.id_number,
    m.firstname,
    m.surname,
    m.middle_name,
    CONCAT(m.firstname, ' ', COALESCE(m.middle_name || ' ', ''), COALESCE(m.surname, '')) as full_name,
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
    oc.category_name as occupation_category,
    q.qualification_name,
    q.level_order as qualification_level,

    -- Geographic information (FIXED FOR METROS)
    m.ward_code,
    w.ward_name,
    w.ward_number,
    
    -- Municipality info (direct from ward)
    mu.municipality_code,
    mu.municipality_name,
    mu.municipality_type,
    
    -- District info (COALESCE to handle metro sub-regions)
    -- For metro sub-regions: get district from parent municipality
    -- For regular municipalities: get district directly
    COALESCE(mu.district_code, pm.district_code) as district_code,
    COALESCE(d.district_name, pd.district_name) as district_name,
    
    -- Province info (COALESCE to handle metro sub-regions)
    COALESCE(d.province_code, pd.province_code) as province_code,
    COALESCE(p.province_name, pp.province_name) as province_name,

    -- Voting information
    m.voting_district_code,
    vd.voting_district_name,
    vs_status.status_name as voter_status,
    m.voter_registration_number,
    m.voter_registration_date,

    -- Membership information
    ms.membership_id,
    ms.membership_number,
    ms.date_joined,
    ms.expiry_date,
    ms.last_payment_date,
    ms_status.status_name as membership_status,
    ms_status.is_active as membership_active,
    st.subscription_name as subscription_type,
    ms.membership_amount,

    -- Membership standing
    CASE
        WHEN ms.expiry_date >= CURRENT_DATE AND ms_status.is_active = TRUE THEN 'Active'
        WHEN ms.expiry_date < CURRENT_DATE THEN 'Expired'
        WHEN ms_status.is_active = FALSE THEN 'Inactive'
        ELSE 'Unknown'
    END as membership_standing,

    -- Days until expiry (negative if expired)
    CASE
        WHEN ms.expiry_date IS NOT NULL THEN ms.expiry_date - CURRENT_DATE
        ELSE NULL
    END as days_until_expiry,

    -- Timestamps
    m.created_at as member_created_at,
    m.updated_at as member_updated_at

FROM members m

-- Geographic joins with metro support
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code

-- Join to parent municipality (for metro sub-regions)
LEFT JOIN municipalities pm ON mu.parent_municipality_id = pm.municipality_id

-- Join to districts (both direct and through parent)
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN districts pd ON pm.district_code = pd.district_code

-- Join to provinces (both direct and through parent)
LEFT JOIN provinces p ON d.province_code = p.province_code
LEFT JOIN provinces pp ON pd.province_code = pp.province_code

-- Other joins
LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code

-- Lookup table joins
LEFT JOIN genders g ON m.gender_id = g.gender_id
LEFT JOIN races r ON m.race_id = r.race_id
LEFT JOIN citizenships c ON m.citizenship_id = c.citizenship_id
LEFT JOIN languages l ON m.language_id = l.language_id
LEFT JOIN occupations o ON m.occupation_id = o.occupation_id
LEFT JOIN occupation_categories oc ON o.category_id = oc.category_id
LEFT JOIN qualifications q ON m.qualification_id = q.qualification_id
LEFT JOIN voter_statuses vs_status ON m.voter_status_id = vs_status.status_id

-- Membership joins
LEFT JOIN memberships ms ON m.member_id = ms.member_id
LEFT JOIN membership_statuses ms_status ON ms.status_id = ms_status.status_id
LEFT JOIN subscription_types st ON ms.subscription_type_id = st.subscription_type_id;

-- Grant permissions
GRANT SELECT ON vw_member_details TO PUBLIC;

-- Create indexes on the underlying tables to improve view performance
CREATE INDEX IF NOT EXISTS idx_municipalities_parent ON municipalities(parent_municipality_id) WHERE parent_municipality_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_municipalities_type ON municipalities(municipality_type);

COMMIT;

-- Display success message
SELECT 'vw_member_details view fixed for metro sub-regions!' as message;

-- Verify the fix
SELECT 
    'Before fix: Metro members had NULL province_code' as status,
    COUNT(*) as metro_members_with_province
FROM vw_member_details vmd
JOIN municipalities mu ON vmd.municipality_code = mu.municipality_code
WHERE mu.municipality_type = 'Metro Sub-Region'
  AND vmd.province_code IS NOT NULL;

