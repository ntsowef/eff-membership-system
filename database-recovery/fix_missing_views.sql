-- Fix the missing critical views that had errors during schema creation

-- 1. Fix vw_member_details (Core view referenced throughout backend)
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
    
    -- Geographic information (complete hierarchy)
    m.ward_code,
    w.ward_name,
    w.ward_number,
    w.municipality_code,
    mu.municipality_name,
    d.district_code,
    d.district_name,
    p.province_code,
    p.province_name,
    
    -- Voting information
    m.voting_district_code,
    vd.voting_district_name,
    m.voting_station_id,
    vs.station_name as voting_station_name,
    vs.station_code as voting_station_code,
    vs_status.status_name as voter_status,
    -- vs_status.is_eligible as is_eligible_to_vote, -- Column doesn't exist, using default
    CASE WHEN vs_status.status_name = 'Registered' THEN TRUE ELSE FALSE END as is_eligible_to_vote,
    m.voter_registration_number,
    m.voter_registration_date,
    
    -- Timestamps
    m.created_at as member_created_at,
    m.updated_at as member_updated_at

FROM members m
-- Geographic joins
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
LEFT JOIN occupations o ON m.occupation_id = o.occupation_id
LEFT JOIN occupation_categories oc ON o.category_id = oc.category_id
LEFT JOIN qualifications q ON m.qualification_id = q.qualification_id
LEFT JOIN voter_statuses vs_status ON m.voter_status_id = vs_status.status_id;

-- 2. Fix vw_membership_details (Referenced in ward audits and membership management)
CREATE OR REPLACE VIEW vw_membership_details AS
SELECT
    ms.membership_id,
    ms.member_id,
    ms.membership_number,
    ms.date_joined,
    ms.expiry_date,
    ms.last_payment_date,
    ms.membership_amount,
    ms.payment_method,
    ms.payment_reference,
    ms.payment_status,
    
    -- Membership status information
    mst.status_name,
    mst.is_active,
    mst.description as status_description,
    
    -- Subscription type information
    st.subscription_name,
    st.duration_months,
    -- st.amount as subscription_amount, -- Column doesn't exist, using membership_amount
    ms.membership_amount as subscription_amount,
    st.description as subscription_description,
    
    -- Calculated fields
    CASE 
        WHEN ms.expiry_date >= CURRENT_DATE THEN 
            EXTRACT(DAYS FROM (ms.expiry_date - CURRENT_DATE))
        ELSE 0 
    END as days_until_expiry,
    
    CASE 
        WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 'Active'
        WHEN ms.expiry_date < CURRENT_DATE THEN 'Expired'
        WHEN mst.is_active = FALSE THEN 'Inactive'
        ELSE 'Unknown'
    END as membership_standing,
    
    -- Payment status indicators
    CASE 
        WHEN ms.payment_status = 'Completed' THEN TRUE
        ELSE FALSE 
    END as payment_completed,
    
    CASE 
        WHEN ms.last_payment_date >= CURRENT_DATE - INTERVAL '30 days' THEN TRUE
        ELSE FALSE 
    END as recent_payment,
    
    -- Renewal information
    CASE 
        WHEN ms.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN TRUE
        ELSE FALSE 
    END as renewal_due_soon,
    
    CASE 
        WHEN ms.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN TRUE
        ELSE FALSE 
    END as renewal_due_urgent,
    
    -- Timestamps
    ms.created_at as membership_created_at,
    ms.updated_at as membership_updated_at

FROM memberships ms
LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id
LEFT JOIN subscription_types st ON ms.subscription_type_id = st.subscription_type_id;

-- 3. Fix vw_member_details_optimized (Performance-optimized for high-volume queries)
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
    p.province_name,
    mu.municipality_name,
    w.ward_number,
    w.ward_name,
    COALESCE(vs.station_name, 'Not Available') as voting_station_name,
    
    -- Demographic information
    COALESCE(g.gender_name, 'Unknown') as gender_name,
    COALESCE(r.race_name, 'Unknown') as race_name,
    
    -- Membership status (optimized)
    CASE 
        WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 'Active'
        WHEN ms.expiry_date < CURRENT_DATE THEN 'Expired'
        ELSE 'Inactive'
    END as membership_status,
    
    ms.expiry_date,
    ms.membership_amount,
    
    -- Calculated fields for performance
    CASE 
        WHEN ms.expiry_date >= CURRENT_DATE THEN 
            EXTRACT(DAYS FROM (ms.expiry_date - CURRENT_DATE))
        ELSE 0 
    END as days_until_expiry

FROM members m
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code  
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
LEFT JOIN voting_stations vs ON m.voting_station_id = vs.voting_station_id
LEFT JOIN genders g ON m.gender_id = g.gender_id
LEFT JOIN races r ON m.race_id = r.race_id
LEFT JOIN memberships ms ON m.member_id = ms.member_id
LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id;

SELECT 'Missing critical views have been created successfully!' as result;
