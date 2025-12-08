-- Migration: Fix vw_member_details to use members_consolidated table
-- Date: 2025-11-07
-- Issue: vw_member_details queries 'members' table (508,869 records) instead of 'members_consolidated' (552,267 records)
-- This causes the members list to show 43,398 fewer members than the actual count

-- Drop the existing view
DROP VIEW IF EXISTS vw_member_details CASCADE;

-- Recreate the view using members_consolidated as the base table
CREATE OR REPLACE VIEW vw_member_details AS
SELECT 
    m.member_id,
    m.id_number,
    m.firstname,
    m.surname,
    m.middle_name,
    CONCAT(m.firstname, ' ', COALESCE(m.middle_name || ' ', ''), COALESCE(m.surname, '')) AS full_name,
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
    oc.category_name AS occupation_category,
    q.qualification_name,
    q.level_order AS qualification_level,
    
    -- Geographic information (with metro support)
    m.ward_code,
    w.ward_name,
    w.ward_number,
    mu.municipality_code,
    mu.municipality_name,
    mu.municipality_type,
    
    -- District information (handle metros with parent municipalities)
    COALESCE(mu.district_code, pm.district_code) AS district_code,
    COALESCE(d.district_name, pd.district_name) AS district_name,
    
    -- Province information (handle metros with parent municipalities)
    COALESCE(d.province_code, pd.province_code) AS province_code,
    COALESCE(p.province_name, pp.province_name) AS province_name,
    
    -- Voting information
    m.voting_district_code,
    vd.voting_district_name,
    vs_status.status_name AS voter_status,
    m.voter_registration_number,
    m.voter_registration_date,
    
    -- Membership information (all from members_consolidated - no separate memberships table join needed)
    m.current_membership_id AS membership_id,
    m.membership_number,
    m.date_joined,
    m.expiry_date,
    m.last_payment_date,
    ms_status.status_name AS membership_status,
    ms_status.is_active AS membership_active,
    st.subscription_name AS subscription_type,
    m.membership_amount,
    
    -- Calculated membership standing
    CASE
        WHEN m.expiry_date >= CURRENT_DATE AND ms_status.is_active = true THEN 'Active'
        WHEN m.expiry_date < CURRENT_DATE THEN 'Expired'
        WHEN ms_status.is_active = false THEN 'Inactive'
        ELSE 'Unknown'
    END AS membership_standing,
    
    -- Days until expiry
    CASE
        WHEN m.expiry_date IS NOT NULL THEN (m.expiry_date - CURRENT_DATE)
        ELSE NULL
    END AS days_until_expiry,
    
    -- Timestamps
    m.created_at AS member_created_at,
    m.updated_at AS member_updated_at

FROM members_consolidated m  -- ✅ CHANGED FROM 'members' TO 'members_consolidated'
    -- Geographic JOINs
    LEFT JOIN wards w ON m.ward_code = w.ward_code
    LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
    LEFT JOIN municipalities pm ON mu.parent_municipality_id = pm.municipality_id
    LEFT JOIN districts d ON mu.district_code = d.district_code
    LEFT JOIN districts pd ON pm.district_code = pd.district_code
    LEFT JOIN provinces p ON d.province_code = p.province_code
    LEFT JOIN provinces pp ON pd.province_code = pp.province_code
    
    -- Voting information JOINs
    LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code
    
    -- Demographic JOINs
    LEFT JOIN genders g ON m.gender_id = g.gender_id
    LEFT JOIN races r ON m.race_id = r.race_id
    LEFT JOIN citizenships c ON m.citizenship_id = c.citizenship_id
    LEFT JOIN languages l ON m.language_id = l.language_id
    
    -- Professional JOINs
    LEFT JOIN occupations o ON m.occupation_id = o.occupation_id
    LEFT JOIN occupation_categories oc ON o.category_id = oc.category_id
    LEFT JOIN qualifications q ON m.qualification_id = q.qualification_id
    
    -- Voter status JOIN
    LEFT JOIN voter_statuses vs_status ON m.voter_status_id = vs_status.status_id
    
    -- Membership status JOINs (lookup tables only - no memberships table!)
    LEFT JOIN membership_statuses ms_status ON m.membership_status_id = ms_status.status_id
    LEFT JOIN subscription_types st ON m.subscription_type_id = st.subscription_type_id;

-- Verify the fix
SELECT 
    'vw_member_details' as view_name,
    COUNT(*) as member_count,
    'Should now match members_consolidated count (552,267)' as note
FROM vw_member_details;

SELECT 
    'members_consolidated' as table_name,
    COUNT(*) as member_count,
    'Source of truth' as note
FROM members_consolidated;

