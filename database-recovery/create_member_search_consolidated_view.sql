-- Create optimized member search view using members_consolidated table
-- This view is used by the member search functionality to provide fast search results
-- without needing to JOIN to the old memberships table

DROP VIEW IF EXISTS vw_member_search_consolidated CASCADE;

CREATE OR REPLACE VIEW vw_member_search_consolidated AS
SELECT
    m.member_id,
    m.id_number,
    m.firstname,
    m.surname,
    m.middle_name,
    CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
    m.cell_number,
    m.email,
    m.age,
    m.date_of_birth,
    
    -- Geographic information
    m.ward_code,
    w.ward_name,
    w.ward_number,
    m.municipality_code,
    mu.municipality_name,
    m.district_code,
    d.district_name,
    m.province_code,
    m.province_name,
    
    -- Voting information
    m.voting_district_code,
    vd.voting_district_name,
    m.voter_registration_number,
    m.voter_registration_date,
    vs.status_name as voter_status,
    
    -- Membership information (from members_consolidated - no JOIN needed!)
    m.membership_number,
    m.date_joined,
    m.expiry_date,
    m.last_payment_date,
    m.membership_amount,
    m.payment_status,
    ms.status_name as membership_status,
    ms.is_active as membership_active,
    st.subscription_name as subscription_type,
    
    -- Demographic information
    g.gender_name,
    r.race_name,
    c.citizenship_name,
    l.language_name,
    
    -- Professional information
    o.occupation_name,
    oc.category_name as occupation_category,
    q.qualification_name,
    
    -- Contact information
    m.residential_address,
    m.postal_address,
    m.landline_number,
    m.alternative_contact,
    
    -- Timestamps
    m.created_at,
    m.updated_at,
    
    -- Search text for full-text search (lowercase for case-insensitive search)
    LOWER(CONCAT(
        COALESCE(m.firstname, ''), ' ',
        COALESCE(m.surname, ''), ' ',
        COALESCE(m.middle_name, ''), ' ',
        COALESCE(m.id_number, ''), ' ',
        COALESCE(m.cell_number, ''), ' ',
        COALESCE(m.email, ''), ' ',
        COALESCE(m.membership_number, ''), ' ',
        COALESCE(w.ward_name, ''), ' ',
        COALESCE(mu.municipality_name, ''), ' ',
        COALESCE(d.district_name, ''), ' ',
        COALESCE(m.province_name, ''), ' ',
        COALESCE(o.occupation_name, ''), ' ',
        COALESCE(g.gender_name, ''), ' ',
        COALESCE(r.race_name, '')
    )) as search_text
    
FROM members_consolidated m
    -- Geographic JOINs
    LEFT JOIN wards w ON m.ward_code = w.ward_code
    LEFT JOIN municipalities mu ON m.municipality_code = mu.municipality_code
    LEFT JOIN districts d ON m.district_code = d.district_code
    
    -- Voting information JOINs
    LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code
    LEFT JOIN voter_statuses vs ON m.voter_status_id = vs.status_id
    
    -- Membership status JOINs (lookup tables only - no memberships table!)
    LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
    LEFT JOIN subscription_types st ON m.subscription_type_id = st.subscription_type_id
    
    -- Demographic JOINs
    LEFT JOIN genders g ON m.gender_id = g.gender_id
    LEFT JOIN races r ON m.race_id = r.race_id
    LEFT JOIN citizenships c ON m.citizenship_id = c.citizenship_id
    LEFT JOIN languages l ON m.language_id = l.language_id
    
    -- Professional JOINs
    LEFT JOIN occupations o ON m.occupation_id = o.occupation_id
    LEFT JOIN occupation_categories oc ON o.category_id = oc.category_id
    LEFT JOIN qualifications q ON m.qualification_id = q.qualification_id

WHERE m.member_id IS NOT NULL;

-- Create index on search_text for faster searches
CREATE INDEX IF NOT EXISTS idx_vw_member_search_consolidated_search_text 
ON members_consolidated USING gin(to_tsvector('english', 
    COALESCE(firstname, '') || ' ' || 
    COALESCE(surname, '') || ' ' || 
    COALESCE(id_number, '') || ' ' || 
    COALESCE(email, '') || ' ' || 
    COALESCE(membership_number, '')
));

-- Grant permissions
GRANT SELECT ON vw_member_search_consolidated TO eff_admin;

-- Add comment
COMMENT ON VIEW vw_member_search_consolidated IS 
'Optimized member search view using members_consolidated table. 
This view provides fast search results without needing to JOIN to the old memberships table.
All membership data comes directly from members_consolidated.';

