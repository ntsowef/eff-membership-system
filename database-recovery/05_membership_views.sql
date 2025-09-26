-- Membership Management Views for EFF Membership Management System
-- PostgreSQL Version
-- Created: 2025-01-23
-- Purpose: Essential views for membership directory, audit, and reporting

-- Start transaction
BEGIN;

-- 1. Complete Member Directory View
-- This view provides comprehensive member information with all lookups resolved
CREATE OR REPLACE VIEW vw_member_directory AS
SELECT
    m.member_id,
    m.id_number,
    m.firstname,
    m.surname,
    m.middle_name,
    CONCAT(m.firstname, ' ', COALESCE(m.middle_name || ' ', ''), COALESCE(m.surname, '')) as full_name,
    m.date_of_birth,
    m.age,
    
    -- Demographic information
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
    
    -- Geographic information
    m.ward_code,
    w.ward_name,
    w.ward_number,
    mu.municipality_code,
    mu.municipality_name,
    d.district_code,
    d.district_name,
    p.province_code,
    p.province_name,
    
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
    
    -- Audit information
    m.created_at as member_created_at,
    m.updated_at as member_updated_at

FROM members m
-- Geographic joins
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
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

-- 2. Ward Membership Audit View
-- This view provides ward-level membership counts and standing classifications
CREATE OR REPLACE VIEW vw_ward_membership_audit AS
SELECT
    w.ward_code,
    w.ward_name,
    w.ward_number,
    w.municipality_code,
    mu.municipality_name,
    mu.district_code,
    d.district_name,
    d.province_code,
    p.province_name,

    -- Active member counts (based on expiry date and status)
    COALESCE(SUM(CASE
        WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 1
        ELSE 0
    END), 0) as active_members,

    COALESCE(SUM(CASE
        WHEN ms.expiry_date < CURRENT_DATE OR mst.is_active = FALSE THEN 1
        ELSE 0
    END), 0) as expired_members,

    COALESCE(SUM(CASE
        WHEN ms.expiry_date IS NULL THEN 1
        ELSE 0
    END), 0) as inactive_members,

    COUNT(mem.member_id) as total_members,

    -- Standing classification based on active members
    CASE
        WHEN COALESCE(SUM(CASE
            WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 1
            ELSE 0
        END), 0) >= 200 THEN 'Good Standing'
        WHEN COALESCE(SUM(CASE
            WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 1
            ELSE 0
        END), 0) >= 100 THEN 'Acceptable Standing'
        ELSE 'Needs Improvement'
    END as ward_standing,

    -- Standing level for sorting (1=Good, 2=Acceptable, 3=Needs Improvement)
    CASE
        WHEN COALESCE(SUM(CASE
            WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 1
            ELSE 0
        END), 0) >= 200 THEN 1
        WHEN COALESCE(SUM(CASE
            WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 1
            ELSE 0
        END), 0) >= 100 THEN 2
        ELSE 3
    END as standing_level,

    -- Performance metrics
    ROUND(
        (COALESCE(SUM(CASE
            WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 1
            ELSE 0
        END), 0) * 100.0) / NULLIF(COUNT(mem.member_id), 0), 2
    ) as active_percentage,

    -- Target achievement (200 members = 100%)
    ROUND(
        (COALESCE(SUM(CASE
            WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 1
            ELSE 0
        END), 0) * 100.0) / 200, 2
    ) as target_achievement_percentage,

    -- Members needed to reach next level
    CASE
        WHEN COALESCE(SUM(CASE
            WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 1
            ELSE 0
        END), 0) >= 200 THEN 0
        WHEN COALESCE(SUM(CASE
            WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 1
            ELSE 0
        END), 0) >= 100 THEN
            200 - COALESCE(SUM(CASE
                WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 1
                ELSE 0
            END), 0)
        ELSE 100 - COALESCE(SUM(CASE
            WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 1
            ELSE 0
        END), 0)
    END as members_needed_next_level,

    -- Last updated timestamp
    CURRENT_TIMESTAMP as last_updated

FROM wards w
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
LEFT JOIN members mem ON w.ward_code = mem.ward_code
LEFT JOIN memberships ms ON mem.member_id = ms.member_id
LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id
GROUP BY
    w.ward_code, w.ward_name, w.ward_number, w.municipality_code, mu.municipality_name,
    mu.district_code, d.district_name, d.province_code, p.province_name;

-- 3. Municipality Ward Performance View
-- This view aggregates ward performance to municipality level
CREATE OR REPLACE VIEW vw_municipality_ward_performance AS
SELECT
    mu.municipality_code,
    mu.municipality_name,
    mu.district_code,
    d.district_name,
    d.province_code,
    p.province_name,

    -- Ward counts by standing
    COUNT(wa.ward_code) as total_wards,
    SUM(CASE WHEN wa.standing_level = 1 THEN 1 ELSE 0 END) as good_standing_wards,
    SUM(CASE WHEN wa.standing_level = 2 THEN 1 ELSE 0 END) as acceptable_standing_wards,
    SUM(CASE WHEN wa.standing_level = 3 THEN 1 ELSE 0 END) as needs_improvement_wards,

    -- Compliance calculation (Good + Acceptable / Total)
    SUM(CASE WHEN wa.standing_level IN (1, 2) THEN 1 ELSE 0 END) as compliant_wards,
    ROUND(
        (SUM(CASE WHEN wa.standing_level IN (1, 2) THEN 1 ELSE 0 END) * 100.0) /
        NULLIF(COUNT(wa.ward_code), 0), 2
    ) as compliance_percentage,

    -- Municipality performance classification
    CASE
        WHEN ROUND(
            (SUM(CASE WHEN wa.standing_level IN (1, 2) THEN 1 ELSE 0 END) * 100.0) /
            NULLIF(COUNT(wa.ward_code), 0), 2
        ) >= 70 THEN 'Performing Municipality'
        ELSE 'Underperforming Municipality'
    END as municipality_performance,

    -- Performance level for sorting (1=Performing, 2=Underperforming)
    CASE
        WHEN ROUND(
            (SUM(CASE WHEN wa.standing_level IN (1, 2) THEN 1 ELSE 0 END) * 100.0) /
            NULLIF(COUNT(wa.ward_code), 0), 2
        ) >= 70 THEN 1
        ELSE 2
    END as performance_level,

    -- Aggregate member statistics
    COALESCE(SUM(wa.active_members), 0) as total_active_members,
    COALESCE(SUM(wa.total_members), 0) as total_all_members,
    ROUND(COALESCE(AVG(wa.active_members), 0), 1) as avg_active_per_ward,

    -- Wards needed to reach compliance (70%)
    CASE
        WHEN ROUND(
            (SUM(CASE WHEN wa.standing_level IN (1, 2) THEN 1 ELSE 0 END) * 100.0) /
            NULLIF(COUNT(wa.ward_code), 0), 2
        ) >= 70 THEN 0
        ELSE CEIL(COUNT(wa.ward_code) * 0.7) - SUM(CASE WHEN wa.standing_level IN (1, 2) THEN 1 ELSE 0 END)
    END as wards_needed_compliance,

    CURRENT_TIMESTAMP as last_updated

FROM municipalities mu
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
LEFT JOIN vw_ward_membership_audit wa ON mu.municipality_code = wa.municipality_code
GROUP BY
    mu.municipality_code, mu.municipality_name, mu.district_code, d.district_name,
    d.province_code, p.province_name;

-- 4. Member Search View (optimized for search functionality)
CREATE OR REPLACE VIEW vw_member_search AS
SELECT
    m.member_id,
    m.id_number,
    m.firstname,
    m.surname,
    CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
    m.cell_number,
    m.email,
    m.ward_code,
    w.ward_name,
    mu.municipality_name,
    p.province_name,
    ms.membership_number,
    ms_status.status_name as membership_status,
    ms.expiry_date,
    
    -- Search text for full-text search
    CONCAT_WS(' ',
        m.firstname,
        m.surname,
        m.middle_name,
        m.id_number,
        m.cell_number,
        m.landline_number,
        m.email,
        m.residential_address,
        w.ward_name,
        mu.municipality_name,
        d.district_name,
        p.province_name,
        o.occupation_name,
        g.gender_name,
        r.race_name,
        ms.membership_number
    ) as search_text,
    
    m.created_at,
    m.updated_at

FROM members m
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
LEFT JOIN genders g ON m.gender_id = g.gender_id
LEFT JOIN races r ON m.race_id = r.race_id
LEFT JOIN occupations o ON m.occupation_id = o.occupation_id
LEFT JOIN memberships ms ON m.member_id = ms.member_id
LEFT JOIN membership_statuses ms_status ON ms.status_id = ms_status.status_id;

COMMIT;

-- Display completion message
SELECT 'Membership views created successfully!' as message;
