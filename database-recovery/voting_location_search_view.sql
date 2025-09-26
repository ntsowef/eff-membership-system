-- =====================================================================================
-- VOTING LOCATION SEARCH VIEW FOR EFF MEMBER ELECTORAL ANALYSIS
-- =====================================================================================
-- Purpose: Enable searching for EFF members by voting district or voting station
-- Features: Complete member info, geographic hierarchy, membership status, fast search
-- Usage: Electoral analysis, member organization, campaign planning
-- =====================================================================================

-- =====================================================================================
-- 1. MAIN VOTING LOCATION SEARCH VIEW
-- =====================================================================================

CREATE OR REPLACE VIEW vw_member_voting_location_search AS
SELECT 
    -- Member identification
    m.member_id,
    m.id_number,
    ms.membership_number,
    
    -- Member personal information
    m.firstname,
    m.surname,
    CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
    m.middle_name,
    m.date_of_birth,
    m.age,
    
    -- Contact information
    m.cell_number,
    m.landline_number,
    m.alternative_contact,
    m.email,
    m.residential_address,
    m.postal_address,
    
    -- Demographics
    g.gender_name,
    r.race_name,
    l.language_name,
    c.citizenship_name,
    
    -- Voting location assignments (PRIMARY FOCUS)
    m.voting_district_code,
    m.voting_station_id,
    
    -- Voting district information
    vd.voting_district_name,
    vd.district_type,
    vd.is_active as voting_district_active,
    
    -- Voting station information
    vs.station_name as voting_station_name,
    vs.station_code as voting_station_code,
    vs.address as station_address,
    vs.registered_voters,
    vs.is_active as voting_station_active,
    
    -- Geographic hierarchy (for context and filtering)
    m.ward_code,
    w.ward_name,
    w.ward_number,
    
    mu.municipality_code,
    mu.municipality_name,
    mu.municipality_type,
    
    d.district_code,
    d.district_name,
    
    p.province_code,
    p.province_name,
    
    -- Membership status and details
    ms.membership_id,
    ms.date_joined,
    ms.expiry_date,
    ms.status_id,
    mst.status_name as membership_status,
    mst.is_active as membership_active,
    
    -- Membership status indicators
    CASE 
        WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 'Active'
        WHEN ms.expiry_date < CURRENT_DATE THEN 'Expired'
        WHEN mst.is_active = FALSE THEN 'Inactive'
        ELSE 'Unknown'
    END as current_status,
    
    -- Days until expiry (for renewal planning)
    CASE 
        WHEN ms.expiry_date >= CURRENT_DATE THEN (ms.expiry_date - CURRENT_DATE)::INTEGER
        ELSE NULL
    END as days_until_expiry,
    
    -- Voting assignment status
    CASE 
        WHEN m.voting_district_code IS NOT NULL AND m.voting_station_id IS NOT NULL THEN 'Fully Assigned'
        WHEN m.voting_district_code IS NOT NULL AND m.voting_station_id IS NULL THEN 'District Only'
        WHEN m.voting_district_code IS NULL AND m.voting_station_id IS NOT NULL THEN 'Station Only'
        ELSE 'Not Assigned'
    END as voting_assignment_status,
    
    -- Geographic completeness indicator
    CASE 
        WHEN p.province_code IS NOT NULL AND mu.municipality_code IS NOT NULL AND w.ward_code IS NOT NULL THEN 'Complete'
        WHEN p.province_code IS NOT NULL AND mu.municipality_code IS NOT NULL THEN 'Partial'
        WHEN p.province_code IS NOT NULL THEN 'Province Only'
        ELSE 'Incomplete'
    END as geographic_completeness,
    
    -- Contact validation
    CASE 
        WHEN m.cell_number ~ '^(\+27|0)[6-8][0-9]{8}$' THEN TRUE
        ELSE FALSE
    END as has_valid_cell_number,
    
    CASE 
        WHEN m.email IS NOT NULL AND m.email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN TRUE
        ELSE FALSE
    END as has_valid_email,
    
    -- Voter registration information
    voter_status.status_name as voter_status,
    m.voter_registration_number,
    m.voter_registration_date,
    m.voter_verified_at,
    
    -- Professional information
    o.occupation_name,
    oc.category_name as occupation_category,
    q.qualification_name,
    
    -- Search optimization fields (lowercase for case-insensitive search)
    LOWER(CONCAT(m.firstname, ' ', COALESCE(m.surname, ''))) as search_name,
    LOWER(m.voting_district_code) as search_voting_district,
    LOWER(vs.station_code) as search_voting_station_code,
    LOWER(vd.voting_district_name) as search_voting_district_name,
    LOWER(vs.station_name) as search_voting_station_name,
    
    -- Audit information
    m.created_at as member_created_at,
    m.updated_at as member_updated_at,
    ms.created_at as membership_created_at

FROM members m
-- Core membership information
LEFT JOIN memberships ms ON m.member_id = ms.member_id
LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id

-- Voting location information (PRIMARY JOINS)
LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code
LEFT JOIN voting_stations vs ON m.voting_station_id = vs.voting_station_id

-- Geographic hierarchy
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code

-- Reference data
LEFT JOIN genders g ON m.gender_id = g.gender_id
LEFT JOIN races r ON m.race_id = r.race_id
LEFT JOIN languages l ON m.language_id = l.language_id
LEFT JOIN citizenships c ON m.citizenship_id = c.citizenship_id
LEFT JOIN voter_statuses voter_status ON m.voter_status_id = voter_status.status_id
LEFT JOIN occupations o ON m.occupation_id = o.occupation_id
LEFT JOIN occupation_categories oc ON o.category_id = oc.category_id
LEFT JOIN qualifications q ON m.qualification_id = q.qualification_id;

-- =====================================================================================
-- 2. OPTIMIZED INDEXES FOR FAST SEARCH PERFORMANCE
-- =====================================================================================

-- Primary voting location search indexes
CREATE INDEX IF NOT EXISTS idx_members_voting_district_code ON members(voting_district_code) WHERE voting_district_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_voting_station_id ON members(voting_station_id) WHERE voting_station_id IS NOT NULL;

-- Composite indexes for common search patterns
CREATE INDEX IF NOT EXISTS idx_members_voting_location_composite ON members(voting_district_code, voting_station_id) WHERE voting_district_code IS NOT NULL OR voting_station_id IS NOT NULL;

-- Geographic hierarchy indexes for filtering
CREATE INDEX IF NOT EXISTS idx_members_ward_voting ON members(ward_code, voting_district_code) WHERE ward_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_municipality_voting ON members(ward_code) INCLUDE (voting_district_code, voting_station_id);

-- Membership status indexes for active member filtering
CREATE INDEX IF NOT EXISTS idx_memberships_status_expiry ON memberships(status_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_memberships_active_voting ON memberships(expiry_date) WHERE expiry_date >= CURRENT_DATE;

-- Full-text search indexes for name searching (removed due to immutability requirement)
-- CREATE INDEX IF NOT EXISTS idx_members_fullname_gin ON members USING gin(to_tsvector('english', firstname || ' ' || COALESCE(surname, '')));

-- Voting districts and stations indexes
CREATE INDEX IF NOT EXISTS idx_voting_districts_code_name ON voting_districts(voting_district_code, voting_district_name);
CREATE INDEX IF NOT EXISTS idx_voting_stations_id_code ON voting_stations(voting_station_id, station_code);
CREATE INDEX IF NOT EXISTS idx_voting_stations_name_gin ON voting_stations USING gin(to_tsvector('english', station_name));

-- =====================================================================================
-- 3. SPECIALIZED SEARCH VIEWS FOR COMMON USE CASES
-- =====================================================================================

-- View for members with voting district assignments
CREATE OR REPLACE VIEW vw_members_by_voting_district AS
SELECT 
    voting_district_code,
    voting_district_name,
    province_name,
    municipality_name,
    ward_name,
    COUNT(*) as total_members,
    COUNT(CASE WHEN current_status = 'Active' THEN 1 END) as active_members,
    COUNT(CASE WHEN current_status = 'Expired' THEN 1 END) as expired_members,
    COUNT(CASE WHEN has_valid_cell_number THEN 1 END) as members_with_valid_cell,
    COUNT(CASE WHEN has_valid_email THEN 1 END) as members_with_valid_email,
    
    -- Contact reach statistics
    ROUND(
        (COUNT(CASE WHEN has_valid_cell_number THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2
    ) as cell_coverage_percent,
    
    ROUND(
        (COUNT(CASE WHEN has_valid_email THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2
    ) as email_coverage_percent

FROM vw_member_voting_location_search
WHERE voting_district_code IS NOT NULL
GROUP BY voting_district_code, voting_district_name, province_name, municipality_name, ward_name
ORDER BY province_name, municipality_name, voting_district_name;

-- View for members with voting station assignments
CREATE OR REPLACE VIEW vw_members_by_voting_station AS
SELECT 
    voting_station_id,
    voting_station_name,
    voting_station_code,
    station_address,
    voting_district_name,
    province_name,
    municipality_name,
    ward_name,
    COUNT(*) as total_members,
    COUNT(CASE WHEN current_status = 'Active' THEN 1 END) as active_members,
    COUNT(CASE WHEN current_status = 'Expired' THEN 1 END) as expired_members,
    COUNT(CASE WHEN has_valid_cell_number THEN 1 END) as members_with_valid_cell,
    
    -- Station capacity analysis
    CASE 
        WHEN COUNT(*) >= 1000 THEN 'High Density'
        WHEN COUNT(*) >= 500 THEN 'Medium Density'
        WHEN COUNT(*) >= 100 THEN 'Low Density'
        ELSE 'Very Low Density'
    END as member_density,
    
    -- Contact reach statistics
    ROUND(
        (COUNT(CASE WHEN has_valid_cell_number THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2
    ) as cell_coverage_percent

FROM vw_member_voting_location_search
WHERE voting_station_id IS NOT NULL
GROUP BY voting_station_id, voting_station_name, voting_station_code, station_address, 
         voting_district_name, province_name, municipality_name, ward_name
ORDER BY province_name, municipality_name, voting_station_name;

-- =====================================================================================
-- 4. VOTING ASSIGNMENT ANALYTICS VIEW
-- =====================================================================================

CREATE OR REPLACE VIEW vw_voting_assignment_analytics AS
SELECT 
    province_name,
    municipality_name,
    
    -- Total member counts
    COUNT(*) as total_members,
    COUNT(CASE WHEN current_status = 'Active' THEN 1 END) as active_members,
    
    -- Voting assignment statistics
    COUNT(CASE WHEN voting_assignment_status = 'Fully Assigned' THEN 1 END) as fully_assigned,
    COUNT(CASE WHEN voting_assignment_status = 'District Only' THEN 1 END) as district_only,
    COUNT(CASE WHEN voting_assignment_status = 'Station Only' THEN 1 END) as station_only,
    COUNT(CASE WHEN voting_assignment_status = 'Not Assigned' THEN 1 END) as not_assigned,
    
    -- Assignment completion percentages
    ROUND(
        (COUNT(CASE WHEN voting_assignment_status = 'Fully Assigned' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2
    ) as full_assignment_percent,
    
    ROUND(
        (COUNT(CASE WHEN voting_district_code IS NOT NULL THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2
    ) as district_assignment_percent,
    
    ROUND(
        (COUNT(CASE WHEN voting_station_id IS NOT NULL THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2
    ) as station_assignment_percent,
    
    -- Unique voting locations
    COUNT(DISTINCT voting_district_code) as unique_voting_districts,
    COUNT(DISTINCT voting_station_id) as unique_voting_stations

FROM vw_member_voting_location_search
GROUP BY province_name, municipality_name
ORDER BY province_name, municipality_name;

SELECT 'Voting Location Search Views Created Successfully!' as result;
