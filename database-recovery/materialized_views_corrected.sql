-- =====================================================================================
-- CORRECTED MATERIALIZED VIEWS FOR ACTUAL SCHEMA
-- =====================================================================================
-- Fixed to work with actual table structure (gender_id, race_id, etc.)
-- =====================================================================================

-- Drop existing materialized tables to recreate with correct schema
DROP TABLE IF EXISTS mv_membership_summary CASCADE;
DROP TABLE IF EXISTS mv_member_search CASCADE;
DROP TABLE IF EXISTS mv_birthday_calendar CASCADE;

-- =====================================================================================
-- 1. CORRECTED MATERIALIZED MEMBERSHIP SUMMARY TABLE
-- =====================================================================================

CREATE TABLE mv_membership_summary (
    summary_id SERIAL PRIMARY KEY,
    
    -- Geographic identifiers
    province_code VARCHAR(10),
    province_name VARCHAR(100),
    district_code VARCHAR(10),
    district_name VARCHAR(100),
    municipality_code VARCHAR(10),
    municipality_name VARCHAR(100),
    ward_code VARCHAR(20),
    ward_name VARCHAR(100),
    
    -- Membership counts
    total_members INTEGER DEFAULT 0,
    active_members INTEGER DEFAULT 0,
    expired_members INTEGER DEFAULT 0,
    suspended_members INTEGER DEFAULT 0,
    new_members_this_month INTEGER DEFAULT 0,
    new_members_this_year INTEGER DEFAULT 0,
    
    -- Demographics (using lookup tables)
    male_members INTEGER DEFAULT 0,
    female_members INTEGER DEFAULT 0,
    other_gender_members INTEGER DEFAULT 0,
    
    -- Age groups
    age_18_25 INTEGER DEFAULT 0,
    age_26_35 INTEGER DEFAULT 0,
    age_36_45 INTEGER DEFAULT 0,
    age_46_55 INTEGER DEFAULT 0,
    age_56_65 INTEGER DEFAULT 0,
    age_over_65 INTEGER DEFAULT 0,
    
    -- Contact information
    members_with_email INTEGER DEFAULT 0,
    members_with_cell INTEGER DEFAULT 0,
    members_with_valid_cell INTEGER DEFAULT 0,
    
    -- Performance metrics
    ward_performance_level VARCHAR(20),
    membership_growth_rate DECIMAL(5,2) DEFAULT 0.00,
    retention_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Birthday information
    birthdays_this_month INTEGER DEFAULT 0,
    birthdays_next_month INTEGER DEFAULT 0,
    
    -- Last update tracking
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_as_of_date DATE DEFAULT CURRENT_DATE,
    
    UNIQUE(province_code, district_code, municipality_code, ward_code)
);

-- Create indexes
CREATE INDEX idx_mv_membership_summary_province ON mv_membership_summary(province_code);
CREATE INDEX idx_mv_membership_summary_municipality ON mv_membership_summary(municipality_code);
CREATE INDEX idx_mv_membership_summary_ward ON mv_membership_summary(ward_code);
CREATE INDEX idx_mv_membership_summary_performance ON mv_membership_summary(ward_performance_level);

-- =====================================================================================
-- 2. CORRECTED MATERIALIZED MEMBER SEARCH TABLE
-- =====================================================================================

CREATE TABLE mv_member_search (
    member_id INTEGER PRIMARY KEY,
    
    -- Basic information
    id_number VARCHAR(20),
    membership_number VARCHAR(50),
    firstname VARCHAR(100),
    surname VARCHAR(100),
    full_name VARCHAR(200),
    
    -- Search-optimized fields
    search_name TEXT,
    search_id TEXT,
    search_membership TEXT,
    
    -- Contact information
    cell_number VARCHAR(20),
    email VARCHAR(255),
    
    -- Geographic information
    province_code VARCHAR(10),
    province_name VARCHAR(100),
    municipality_code VARCHAR(10),
    municipality_name VARCHAR(100),
    ward_code VARCHAR(20),
    ward_name VARCHAR(100),
    voting_district_code VARCHAR(20),
    
    -- Status information
    membership_status VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    expiry_date DATE,
    
    -- Demographics
    gender_name VARCHAR(50),
    race_name VARCHAR(50),
    age INTEGER,
    date_of_birth DATE,
    
    -- Computed fields
    is_expired BOOLEAN DEFAULT FALSE,
    days_until_expiry INTEGER,
    has_valid_contact BOOLEAN DEFAULT FALSE,
    
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create search indexes
CREATE INDEX idx_mv_member_search_name ON mv_member_search USING gin(to_tsvector('english', search_name));
CREATE INDEX idx_mv_member_search_id ON mv_member_search(search_id);
CREATE INDEX idx_mv_member_search_membership ON mv_member_search(search_membership);
CREATE INDEX idx_mv_member_search_cell ON mv_member_search(cell_number);
CREATE INDEX idx_mv_member_search_province ON mv_member_search(province_code);
CREATE INDEX idx_mv_member_search_ward ON mv_member_search(ward_code);

-- =====================================================================================
-- 3. CORRECTED MATERIALIZED BIRTHDAY CALENDAR TABLE
-- =====================================================================================

CREATE TABLE mv_birthday_calendar (
    calendar_id SERIAL PRIMARY KEY,
    
    -- Date information
    birthday_date DATE,
    month_day VARCHAR(5),
    
    -- Member information
    member_id INTEGER,
    full_name VARCHAR(200),
    cell_number VARCHAR(20),
    email VARCHAR(255),
    
    -- Age calculation
    birth_year INTEGER,
    current_age INTEGER,
    
    -- Geographic information
    province_name VARCHAR(100),
    municipality_name VARCHAR(100),
    ward_name VARCHAR(100),
    
    -- Membership information
    membership_number VARCHAR(50),
    membership_status VARCHAR(50),
    expiry_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- SMS eligibility
    sms_eligible BOOLEAN DEFAULT FALSE,
    has_valid_cell BOOLEAN DEFAULT FALSE,
    
    -- Processing tracking
    last_sms_sent_year INTEGER,
    sms_sent_this_year BOOLEAN DEFAULT FALSE,
    
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(member_id, birthday_date)
);

-- Create birthday indexes
CREATE INDEX idx_mv_birthday_calendar_month_day ON mv_birthday_calendar(month_day);
CREATE INDEX idx_mv_birthday_calendar_eligible ON mv_birthday_calendar(sms_eligible, is_active);

-- =====================================================================================
-- 4. CORRECTED REFRESH FUNCTIONS
-- =====================================================================================

-- Corrected membership summary refresh function
CREATE OR REPLACE FUNCTION refresh_mv_membership_summary()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_rows_affected INTEGER := 0;
BEGIN
    DELETE FROM mv_membership_summary;
    
    INSERT INTO mv_membership_summary (
        province_code, province_name, district_code, district_name,
        municipality_code, municipality_name, ward_code, ward_name,
        total_members, active_members, expired_members, suspended_members,
        new_members_this_month, new_members_this_year,
        male_members, female_members, other_gender_members,
        age_18_25, age_26_35, age_36_45, age_46_55, age_56_65, age_over_65,
        members_with_email, members_with_cell, members_with_valid_cell,
        ward_performance_level, birthdays_this_month, birthdays_next_month,
        last_updated, data_as_of_date
    )
    SELECT 
        p.province_code, p.province_name,
        d.district_code, d.district_name,
        mu.municipality_code, mu.municipality_name,
        w.ward_code, w.ward_name,
        
        -- Membership counts
        COUNT(m.member_id) as total_members,
        COUNT(CASE WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active THEN 1 END) as active_members,
        COUNT(CASE WHEN ms.expiry_date < CURRENT_DATE THEN 1 END) as expired_members,
        COUNT(CASE WHEN NOT mst.is_active THEN 1 END) as suspended_members,
        COUNT(CASE WHEN ms.date_joined >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as new_members_this_month,
        COUNT(CASE WHEN ms.date_joined >= DATE_TRUNC('year', CURRENT_DATE) THEN 1 END) as new_members_this_year,
        
        -- Demographics using lookup tables
        COUNT(CASE WHEN g.gender_name = 'Male' THEN 1 END) as male_members,
        COUNT(CASE WHEN g.gender_name = 'Female' THEN 1 END) as female_members,
        COUNT(CASE WHEN g.gender_name NOT IN ('Male', 'Female') OR g.gender_name IS NULL THEN 1 END) as other_gender_members,
        
        -- Age groups
        COUNT(CASE WHEN m.age BETWEEN 18 AND 25 THEN 1 END) as age_18_25,
        COUNT(CASE WHEN m.age BETWEEN 26 AND 35 THEN 1 END) as age_26_35,
        COUNT(CASE WHEN m.age BETWEEN 36 AND 45 THEN 1 END) as age_36_45,
        COUNT(CASE WHEN m.age BETWEEN 46 AND 55 THEN 1 END) as age_46_55,
        COUNT(CASE WHEN m.age BETWEEN 56 AND 65 THEN 1 END) as age_56_65,
        COUNT(CASE WHEN m.age > 65 THEN 1 END) as age_over_65,
        
        -- Contact information
        COUNT(CASE WHEN m.email IS NOT NULL AND m.email != '' THEN 1 END) as members_with_email,
        COUNT(CASE WHEN m.cell_number IS NOT NULL AND m.cell_number != '' THEN 1 END) as members_with_cell,
        COUNT(CASE WHEN m.cell_number ~ '^(\+27|0)[6-8][0-9]{8}$' THEN 1 END) as members_with_valid_cell,
        
        -- Ward performance level
        CASE 
            WHEN COUNT(CASE WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active THEN 1 END) >= 200 THEN 'Good Standing'
            WHEN COUNT(CASE WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active THEN 1 END) >= 100 THEN 'Acceptable'
            ELSE 'Needs Improvement'
        END as ward_performance_level,
        
        -- Birthday information
        COUNT(CASE WHEN EXTRACT(MONTH FROM m.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE) THEN 1 END) as birthdays_this_month,
        COUNT(CASE WHEN EXTRACT(MONTH FROM m.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '1 month') THEN 1 END) as birthdays_next_month,
        
        CURRENT_TIMESTAMP as last_updated,
        CURRENT_DATE as data_as_of_date
        
    FROM provinces p
    LEFT JOIN districts d ON p.province_code = d.province_code
    LEFT JOIN municipalities mu ON d.district_code = mu.district_code
    LEFT JOIN wards w ON mu.municipality_code = w.municipality_code
    LEFT JOIN members m ON w.ward_code = m.ward_code
    LEFT JOIN memberships ms ON m.member_id = ms.member_id
    LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id
    LEFT JOIN genders g ON m.gender_id = g.gender_id
    GROUP BY p.province_code, p.province_name, d.district_code, d.district_name,
             mu.municipality_code, mu.municipality_name, w.ward_code, w.ward_name
    HAVING COUNT(m.member_id) > 0;
    
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    RETURN v_rows_affected;
END;
$$;

-- Corrected member search refresh function
CREATE OR REPLACE FUNCTION refresh_mv_member_search()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_rows_affected INTEGER := 0;
BEGIN
    DELETE FROM mv_member_search;
    
    INSERT INTO mv_member_search (
        member_id, id_number, membership_number, firstname, surname, full_name,
        search_name, search_id, search_membership,
        cell_number, email,
        province_code, province_name, municipality_code, municipality_name,
        ward_code, ward_name, voting_district_code,
        membership_status, is_active, expiry_date,
        gender_name, race_name, age, date_of_birth,
        is_expired, days_until_expiry, has_valid_contact,
        last_updated
    )
    SELECT 
        m.member_id,
        m.id_number,
        ms.membership_number,
        m.firstname,
        m.surname,
        CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
        
        -- Search-optimized fields
        LOWER(CONCAT(m.firstname, ' ', COALESCE(m.surname, ''))) as search_name,
        LOWER(REPLACE(COALESCE(m.id_number, ''), ' ', '')) as search_id,
        LOWER(REPLACE(COALESCE(ms.membership_number, ''), ' ', '')) as search_membership,
        
        m.cell_number,
        m.email,
        
        p.province_code, p.province_name,
        mu.municipality_code, mu.municipality_name,
        w.ward_code, w.ward_name,
        m.voting_district_code,
        
        mst.status_name as membership_status,
        mst.is_active,
        ms.expiry_date,
        
        g.gender_name,
        r.race_name,
        m.age,
        m.date_of_birth,
        
        -- Computed fields
        CASE WHEN ms.expiry_date < CURRENT_DATE THEN TRUE ELSE FALSE END as is_expired,
        (ms.expiry_date - CURRENT_DATE)::INTEGER as days_until_expiry,
        CASE WHEN (m.cell_number ~ '^(\+27|0)[6-8][0-9]{8}$' OR (m.email IS NOT NULL AND m.email != '')) THEN TRUE ELSE FALSE END as has_valid_contact,
        
        CURRENT_TIMESTAMP as last_updated
        
    FROM members m
    JOIN memberships ms ON m.member_id = ms.member_id
    JOIN membership_statuses mst ON ms.status_id = mst.status_id
    LEFT JOIN wards w ON m.ward_code = w.ward_code
    LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
    LEFT JOIN districts d ON mu.district_code = d.district_code
    LEFT JOIN provinces p ON d.province_code = p.province_code
    LEFT JOIN genders g ON m.gender_id = g.gender_id
    LEFT JOIN races r ON m.race_id = r.race_id;
    
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    RETURN v_rows_affected;
END;
$$;

SELECT 'Corrected Materialized Views Created Successfully!' as result;
