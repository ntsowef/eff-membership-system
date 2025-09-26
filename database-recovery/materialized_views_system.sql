-- =====================================================================================
-- MATERIALIZED VIEWS AND TABLES FOR HIGH-PERFORMANCE EFF MEMBERSHIP SYSTEM
-- =====================================================================================
-- Purpose: Pre-computed views and tables for 20,000+ concurrent user performance
-- Refresh Strategy: Scheduled refreshes and trigger-based updates
-- =====================================================================================

-- =====================================================================================
-- 1. MATERIALIZED MEMBERSHIP SUMMARY TABLE
-- =====================================================================================

-- High-performance membership summary for dashboard and analytics
CREATE TABLE IF NOT EXISTS mv_membership_summary (
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
    
    -- Demographics
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
    ward_performance_level VARCHAR(20), -- 'Good Standing', 'Acceptable', 'Needs Improvement'
    membership_growth_rate DECIMAL(5,2) DEFAULT 0.00,
    retention_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Birthday information
    birthdays_this_month INTEGER DEFAULT 0,
    birthdays_next_month INTEGER DEFAULT 0,
    
    -- Last update tracking
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_as_of_date DATE DEFAULT CURRENT_DATE,
    
    -- Indexes for performance
    UNIQUE(province_code, district_code, municipality_code, ward_code)
);

-- Create indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_mv_membership_summary_province ON mv_membership_summary(province_code);
CREATE INDEX IF NOT EXISTS idx_mv_membership_summary_municipality ON mv_membership_summary(municipality_code);
CREATE INDEX IF NOT EXISTS idx_mv_membership_summary_ward ON mv_membership_summary(ward_code);
CREATE INDEX IF NOT EXISTS idx_mv_membership_summary_performance ON mv_membership_summary(ward_performance_level);
CREATE INDEX IF NOT EXISTS idx_mv_membership_summary_updated ON mv_membership_summary(last_updated);

-- =====================================================================================
-- 2. MATERIALIZED DAILY STATISTICS TABLE
-- =====================================================================================

-- Pre-computed daily statistics for dashboard performance
CREATE TABLE IF NOT EXISTS mv_daily_statistics (
    stat_date DATE PRIMARY KEY,
    
    -- Overall membership stats
    total_members INTEGER DEFAULT 0,
    active_members INTEGER DEFAULT 0,
    new_registrations INTEGER DEFAULT 0,
    renewals INTEGER DEFAULT 0,
    expirations INTEGER DEFAULT 0,
    
    -- Geographic distribution
    provinces_with_members INTEGER DEFAULT 0,
    municipalities_with_members INTEGER DEFAULT 0,
    wards_with_members INTEGER DEFAULT 0,
    
    -- Performance metrics
    wards_good_standing INTEGER DEFAULT 0,
    wards_acceptable INTEGER DEFAULT 0,
    wards_needs_improvement INTEGER DEFAULT 0,
    
    -- Birthday statistics
    birthdays_today INTEGER DEFAULT 0,
    birthday_sms_sent INTEGER DEFAULT 0,
    birthday_sms_delivered INTEGER DEFAULT 0,
    
    -- Communication stats
    total_sms_campaigns INTEGER DEFAULT 0,
    total_sms_sent INTEGER DEFAULT 0,
    sms_delivery_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Payment statistics
    payments_received INTEGER DEFAULT 0,
    total_payment_amount DECIMAL(12,2) DEFAULT 0.00,
    
    -- System performance
    avg_response_time_ms INTEGER DEFAULT 0,
    peak_concurrent_users INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_mv_daily_statistics_date ON mv_daily_statistics(stat_date DESC);

-- =====================================================================================
-- 3. MATERIALIZED MEMBER SEARCH TABLE
-- =====================================================================================

-- Optimized member search with pre-computed search fields
CREATE TABLE IF NOT EXISTS mv_member_search (
    member_id INTEGER PRIMARY KEY,
    
    -- Basic information
    id_number VARCHAR(20),
    membership_number VARCHAR(50),
    firstname VARCHAR(100),
    surname VARCHAR(100),
    full_name VARCHAR(200),
    
    -- Search-optimized fields
    search_name TEXT, -- Lowercase full name for searching
    search_id TEXT,   -- Formatted ID number for searching
    search_membership TEXT, -- Formatted membership number
    
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
    gender VARCHAR(10),
    age INTEGER,
    date_of_birth DATE,
    
    -- Computed fields for filtering
    is_expired BOOLEAN DEFAULT FALSE,
    days_until_expiry INTEGER,
    has_valid_contact BOOLEAN DEFAULT FALSE,
    
    -- Update tracking
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_mv_member_search_name ON mv_member_search USING gin(to_tsvector('english', search_name));
CREATE INDEX IF NOT EXISTS idx_mv_member_search_id ON mv_member_search(search_id);
CREATE INDEX IF NOT EXISTS idx_mv_member_search_membership ON mv_member_search(search_membership);
CREATE INDEX IF NOT EXISTS idx_mv_member_search_cell ON mv_member_search(cell_number);
CREATE INDEX IF NOT EXISTS idx_mv_member_search_province ON mv_member_search(province_code);
CREATE INDEX IF NOT EXISTS idx_mv_member_search_municipality ON mv_member_search(municipality_code);
CREATE INDEX IF NOT EXISTS idx_mv_member_search_ward ON mv_member_search(ward_code);
CREATE INDEX IF NOT EXISTS idx_mv_member_search_status ON mv_member_search(membership_status);
CREATE INDEX IF NOT EXISTS idx_mv_member_search_active ON mv_member_search(is_active);

-- =====================================================================================
-- 4. MATERIALIZED BIRTHDAY CALENDAR TABLE
-- =====================================================================================

-- Pre-computed birthday calendar for fast daily processing
CREATE TABLE IF NOT EXISTS mv_birthday_calendar (
    calendar_id SERIAL PRIMARY KEY,
    
    -- Date information
    birthday_date DATE,
    month_day VARCHAR(5), -- MM-DD format for matching
    
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
    
    -- Update tracking
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(member_id, birthday_date)
);

-- Indexes for birthday processing
CREATE INDEX IF NOT EXISTS idx_mv_birthday_calendar_month_day ON mv_birthday_calendar(month_day);
CREATE INDEX IF NOT EXISTS idx_mv_birthday_calendar_date ON mv_birthday_calendar(birthday_date);
CREATE INDEX IF NOT EXISTS idx_mv_birthday_calendar_eligible ON mv_birthday_calendar(sms_eligible, is_active);
CREATE INDEX IF NOT EXISTS idx_mv_birthday_calendar_member ON mv_birthday_calendar(member_id);

-- =====================================================================================
-- 5. MATERIALIZED LEADERSHIP HIERARCHY TABLE
-- =====================================================================================

-- Pre-computed leadership structure for fast hierarchy queries
CREATE TABLE IF NOT EXISTS mv_leadership_hierarchy (
    hierarchy_id SERIAL PRIMARY KEY,
    
    -- Position information
    position_id INTEGER,
    position_name VARCHAR(255),
    position_level INTEGER, -- 1=National, 2=Provincial, 3=Regional, 4=Municipal, 5=Ward
    position_category VARCHAR(50), -- 'Executive', 'Committee', 'Deployment'
    
    -- Geographic scope
    province_code VARCHAR(10),
    province_name VARCHAR(100),
    municipality_code VARCHAR(10),
    municipality_name VARCHAR(100),
    ward_code VARCHAR(20),
    ward_name VARCHAR(100),
    
    -- Current appointment
    member_id INTEGER,
    member_name VARCHAR(200),
    appointment_date DATE,
    appointment_status VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Hierarchy relationships
    parent_position_id INTEGER,
    hierarchy_path TEXT, -- Comma-separated path of position IDs
    
    -- Contact information
    cell_number VARCHAR(20),
    email VARCHAR(255),
    
    -- Update tracking
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for leadership queries
CREATE INDEX IF NOT EXISTS idx_mv_leadership_hierarchy_level ON mv_leadership_hierarchy(position_level);
CREATE INDEX IF NOT EXISTS idx_mv_leadership_hierarchy_province ON mv_leadership_hierarchy(province_code);
CREATE INDEX IF NOT EXISTS idx_mv_leadership_hierarchy_municipality ON mv_leadership_hierarchy(municipality_code);
CREATE INDEX IF NOT EXISTS idx_mv_leadership_hierarchy_ward ON mv_leadership_hierarchy(ward_code);
CREATE INDEX IF NOT EXISTS idx_mv_leadership_hierarchy_member ON mv_leadership_hierarchy(member_id);
CREATE INDEX IF NOT EXISTS idx_mv_leadership_hierarchy_active ON mv_leadership_hierarchy(is_active);

-- =====================================================================================
-- 6. REFRESH FUNCTIONS FOR MATERIALIZED TABLES
-- =====================================================================================

-- Function to refresh membership summary
CREATE OR REPLACE FUNCTION refresh_mv_membership_summary()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_rows_affected INTEGER := 0;
BEGIN
    -- Clear existing data
    DELETE FROM mv_membership_summary;
    
    -- Rebuild membership summary
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
        
        -- Demographics
        COUNT(CASE WHEN m.gender = 'Male' THEN 1 END) as male_members,
        COUNT(CASE WHEN m.gender = 'Female' THEN 1 END) as female_members,
        COUNT(CASE WHEN m.gender NOT IN ('Male', 'Female') OR m.gender IS NULL THEN 1 END) as other_gender_members,
        
        -- Age groups
        COUNT(CASE WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.date_of_birth)) BETWEEN 18 AND 25 THEN 1 END) as age_18_25,
        COUNT(CASE WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.date_of_birth)) BETWEEN 26 AND 35 THEN 1 END) as age_26_35,
        COUNT(CASE WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.date_of_birth)) BETWEEN 36 AND 45 THEN 1 END) as age_36_45,
        COUNT(CASE WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.date_of_birth)) BETWEEN 46 AND 55 THEN 1 END) as age_46_55,
        COUNT(CASE WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.date_of_birth)) BETWEEN 56 AND 65 THEN 1 END) as age_56_65,
        COUNT(CASE WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.date_of_birth)) > 65 THEN 1 END) as age_over_65,
        
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
    GROUP BY p.province_code, p.province_name, d.district_code, d.district_name,
             mu.municipality_code, mu.municipality_name, w.ward_code, w.ward_name
    HAVING COUNT(m.member_id) > 0; -- Only include areas with members
    
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    
    RETURN v_rows_affected;
END;
$$;

-- Function to refresh member search table
CREATE OR REPLACE FUNCTION refresh_mv_member_search()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_rows_affected INTEGER := 0;
BEGIN
    -- Clear existing data
    DELETE FROM mv_member_search;

    -- Rebuild member search table
    INSERT INTO mv_member_search (
        member_id, id_number, membership_number, firstname, surname, full_name,
        search_name, search_id, search_membership,
        cell_number, email,
        province_code, province_name, municipality_code, municipality_name,
        ward_code, ward_name, voting_district_code,
        membership_status, is_active, expiry_date,
        gender, age, date_of_birth,
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
        LOWER(REPLACE(m.id_number, ' ', '')) as search_id,
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

        m.gender,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.date_of_birth))::INTEGER as age,
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
    LEFT JOIN provinces p ON d.province_code = p.province_code;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

    RETURN v_rows_affected;
END;
$$;

-- Function to refresh birthday calendar
CREATE OR REPLACE FUNCTION refresh_mv_birthday_calendar()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_rows_affected INTEGER := 0;
BEGIN
    -- Clear existing data
    DELETE FROM mv_birthday_calendar;

    -- Rebuild birthday calendar
    INSERT INTO mv_birthday_calendar (
        birthday_date, month_day, member_id, full_name, cell_number, email,
        birth_year, current_age,
        province_name, municipality_name, ward_name,
        membership_number, membership_status, expiry_date, is_active,
        sms_eligible, has_valid_cell,
        last_sms_sent_year, sms_sent_this_year,
        last_updated
    )
    SELECT
        m.date_of_birth as birthday_date,
        TO_CHAR(m.date_of_birth, 'MM-DD') as month_day,
        m.member_id,
        CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
        m.cell_number,
        m.email,

        EXTRACT(YEAR FROM m.date_of_birth)::INTEGER as birth_year,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.date_of_birth))::INTEGER as current_age,

        p.province_name,
        mu.municipality_name,
        w.ward_name,

        ms.membership_number,
        mst.status_name as membership_status,
        ms.expiry_date,
        mst.is_active,

        -- SMS eligibility
        CASE WHEN (m.cell_number ~ '^(\+27|0)[6-8][0-9]{8}$'
                   AND ms.expiry_date >= CURRENT_DATE
                   AND mst.is_active = TRUE)
             THEN TRUE ELSE FALSE END as sms_eligible,
        CASE WHEN m.cell_number ~ '^(\+27|0)[6-8][0-9]{8}$' THEN TRUE ELSE FALSE END as has_valid_cell,

        -- Check if SMS sent this year
        COALESCE((SELECT EXTRACT(YEAR FROM MAX(sm.created_at))::INTEGER
                  FROM sms_messages sm
                  JOIN sms_campaigns sc ON sm.campaign_id = sc.campaign_id
                  WHERE sm.member_id = m.member_id
                    AND sc.campaign_name LIKE 'Birthday Wishes%'
                    AND sm.status IN ('Sent', 'Delivered')), 0) as last_sms_sent_year,

        CASE WHEN EXISTS (
            SELECT 1 FROM sms_messages sm
            JOIN sms_campaigns sc ON sm.campaign_id = sc.campaign_id
            WHERE sm.member_id = m.member_id
              AND sc.campaign_name LIKE 'Birthday Wishes - ' || EXTRACT(YEAR FROM CURRENT_DATE) || '%'
              AND sm.status IN ('Sent', 'Delivered', 'Queued', 'Processing')
        ) THEN TRUE ELSE FALSE END as sms_sent_this_year,

        CURRENT_TIMESTAMP as last_updated

    FROM members m
    JOIN memberships ms ON m.member_id = ms.member_id
    JOIN membership_statuses mst ON ms.status_id = mst.status_id
    LEFT JOIN wards w ON m.ward_code = w.ward_code
    LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
    LEFT JOIN districts d ON mu.district_code = d.district_code
    LEFT JOIN provinces p ON d.province_code = p.province_code
    WHERE m.date_of_birth IS NOT NULL;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

    RETURN v_rows_affected;
END;
$$;

-- Function to refresh daily statistics
CREATE OR REPLACE FUNCTION refresh_mv_daily_statistics(p_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_rows_affected INTEGER := 0;
BEGIN
    -- Insert or update daily statistics
    INSERT INTO mv_daily_statistics (
        stat_date, total_members, active_members, new_registrations, renewals, expirations,
        provinces_with_members, municipalities_with_members, wards_with_members,
        wards_good_standing, wards_acceptable, wards_needs_improvement,
        birthdays_today, birthday_sms_sent, birthday_sms_delivered,
        total_sms_campaigns, total_sms_sent, sms_delivery_rate,
        payments_received, total_payment_amount,
        created_at, updated_at
    )
    SELECT
        p_date as stat_date,

        -- Overall membership stats
        (SELECT COUNT(*) FROM members) as total_members,
        (SELECT COUNT(*) FROM memberships ms JOIN membership_statuses mst ON ms.status_id = mst.status_id
         WHERE ms.expiry_date >= p_date AND mst.is_active = TRUE) as active_members,
        (SELECT COUNT(*) FROM memberships WHERE DATE(date_joined) = p_date) as new_registrations,
        (SELECT COUNT(*) FROM membership_renewals WHERE DATE(renewal_date) = p_date) as renewals,
        (SELECT COUNT(*) FROM memberships WHERE expiry_date = p_date) as expirations,

        -- Geographic distribution
        (SELECT COUNT(DISTINCT p.province_code) FROM provinces p
         JOIN districts d ON p.province_code = d.province_code
         JOIN municipalities mu ON d.district_code = mu.district_code
         JOIN wards w ON mu.municipality_code = w.municipality_code
         JOIN members m ON w.ward_code = m.ward_code) as provinces_with_members,
        (SELECT COUNT(DISTINCT mu.municipality_code) FROM municipalities mu
         JOIN wards w ON mu.municipality_code = w.municipality_code
         JOIN members m ON w.ward_code = m.ward_code) as municipalities_with_members,
        (SELECT COUNT(DISTINCT w.ward_code) FROM wards w
         JOIN members m ON w.ward_code = m.ward_code) as wards_with_members,

        -- Performance metrics from materialized summary
        (SELECT COUNT(*) FROM mv_membership_summary WHERE ward_performance_level = 'Good Standing') as wards_good_standing,
        (SELECT COUNT(*) FROM mv_membership_summary WHERE ward_performance_level = 'Acceptable') as wards_acceptable,
        (SELECT COUNT(*) FROM mv_membership_summary WHERE ward_performance_level = 'Needs Improvement') as wards_needs_improvement,

        -- Birthday statistics
        (SELECT COUNT(*) FROM mv_birthday_calendar WHERE TO_CHAR(birthday_date, 'MM-DD') = TO_CHAR(p_date, 'MM-DD')) as birthdays_today,
        (SELECT COUNT(*) FROM sms_messages sm JOIN sms_campaigns sc ON sm.campaign_id = sc.campaign_id
         WHERE DATE(sm.created_at) = p_date AND sc.campaign_name LIKE 'Birthday Wishes%') as birthday_sms_sent,
        (SELECT COUNT(*) FROM sms_messages sm JOIN sms_campaigns sc ON sm.campaign_id = sc.campaign_id
         WHERE DATE(sm.created_at) = p_date AND sc.campaign_name LIKE 'Birthday Wishes%' AND sm.status = 'Delivered') as birthday_sms_delivered,

        -- Communication stats
        (SELECT COUNT(*) FROM sms_campaigns WHERE DATE(created_at) = p_date) as total_sms_campaigns,
        (SELECT COUNT(*) FROM sms_messages WHERE DATE(created_at) = p_date) as total_sms_sent,
        COALESCE((SELECT (COUNT(CASE WHEN status = 'Delivered' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0))
                  FROM sms_messages WHERE DATE(created_at) = p_date), 0) as sms_delivery_rate,

        -- Payment statistics
        (SELECT COUNT(*) FROM payments WHERE DATE(payment_date) = p_date AND payment_status = 'Completed') as payments_received,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE DATE(payment_date) = p_date AND payment_status = 'Completed') as total_payment_amount,

        CURRENT_TIMESTAMP as created_at,
        CURRENT_TIMESTAMP as updated_at

    ON CONFLICT (stat_date) DO UPDATE SET
        total_members = EXCLUDED.total_members,
        active_members = EXCLUDED.active_members,
        new_registrations = EXCLUDED.new_registrations,
        renewals = EXCLUDED.renewals,
        expirations = EXCLUDED.expirations,
        provinces_with_members = EXCLUDED.provinces_with_members,
        municipalities_with_members = EXCLUDED.municipalities_with_members,
        wards_with_members = EXCLUDED.wards_with_members,
        wards_good_standing = EXCLUDED.wards_good_standing,
        wards_acceptable = EXCLUDED.wards_acceptable,
        wards_needs_improvement = EXCLUDED.wards_needs_improvement,
        birthdays_today = EXCLUDED.birthdays_today,
        birthday_sms_sent = EXCLUDED.birthday_sms_sent,
        birthday_sms_delivered = EXCLUDED.birthday_sms_delivered,
        total_sms_campaigns = EXCLUDED.total_sms_campaigns,
        total_sms_sent = EXCLUDED.total_sms_sent,
        sms_delivery_rate = EXCLUDED.sms_delivery_rate,
        payments_received = EXCLUDED.payments_received,
        total_payment_amount = EXCLUDED.total_payment_amount,
        updated_at = CURRENT_TIMESTAMP;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

    RETURN v_rows_affected;
END;
$$;

-- Master refresh function to update all materialized tables
CREATE OR REPLACE FUNCTION refresh_all_materialized_tables()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_start_time TIMESTAMP := CURRENT_TIMESTAMP;
    v_membership_rows INTEGER;
    v_search_rows INTEGER;
    v_birthday_rows INTEGER;
    v_stats_rows INTEGER;
    v_end_time TIMESTAMP;
    v_duration INTERVAL;
BEGIN
    -- Refresh all materialized tables
    SELECT refresh_mv_membership_summary() INTO v_membership_rows;
    SELECT refresh_mv_member_search() INTO v_search_rows;
    SELECT refresh_mv_birthday_calendar() INTO v_birthday_rows;
    SELECT refresh_mv_daily_statistics() INTO v_stats_rows;

    v_end_time := CURRENT_TIMESTAMP;
    v_duration := v_end_time - v_start_time;

    RETURN json_build_object(
        'success', true,
        'refresh_completed_at', v_end_time,
        'duration_seconds', EXTRACT(EPOCH FROM v_duration),
        'tables_refreshed', json_build_object(
            'membership_summary', v_membership_rows,
            'member_search', v_search_rows,
            'birthday_calendar', v_birthday_rows,
            'daily_statistics', v_stats_rows
        ),
        'total_rows_processed', v_membership_rows + v_search_rows + v_birthday_rows + v_stats_rows
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'REFRESH_ERROR',
        'message', SQLERRM
    );
END;
$$;

SELECT 'Materialized Views and Tables System Created Successfully!' as result;
