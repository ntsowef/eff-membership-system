-- ============================================================================
-- MONTHLY BIRTHDAY STATISTICS VIEW FOR ACTIVE/GOOD STANDING MEMBERS
-- ============================================================================
-- This view provides monthly birthday statistics for members who are:
-- 1. In good standing (active membership status)
-- 2. Have valid membership (not expired or within grace period)
-- ============================================================================

BEGIN;

-- Drop existing view if exists
DROP VIEW IF EXISTS vw_birthday_monthly_stats CASCADE;

-- ============================================================================
-- VIEW: Monthly Birthday Statistics for Active Members
-- ============================================================================
CREATE OR REPLACE VIEW vw_birthday_monthly_stats AS
WITH monthly_birthdays AS (
    SELECT
        EXTRACT(MONTH FROM m.date_of_birth)::INTEGER AS birth_month,
        TO_CHAR(TO_DATE(EXTRACT(MONTH FROM m.date_of_birth)::TEXT, 'MM'), 'Month') AS month_name,
        m.member_id,
        m.firstname,
        m.surname,
        m.cell_number,
        m.date_of_birth,
        m.province_code,
        m.province_name,
        m.municipality_code,
        m.municipality_name,
        m.ward_code,
        m.membership_status_id,
        COALESCE(mst.status_name, 'Unknown') AS membership_status,
        m.expiry_date,
        -- Determine if member is in good standing (active and not expired)
        CASE 
            WHEN mst.is_active = true 
                 AND (m.expiry_date IS NULL OR m.expiry_date >= CURRENT_DATE - INTERVAL '90 days')
            THEN true
            ELSE false
        END AS is_good_standing,
        -- Has valid phone number
        CASE 
            WHEN m.cell_number IS NOT NULL 
                 AND m.cell_number != '' 
                 AND LENGTH(TRIM(m.cell_number)) >= 10
            THEN true
            ELSE false
        END AS has_valid_phone
    FROM members_consolidated m
    LEFT JOIN membership_statuses mst ON m.membership_status_id = mst.status_id
    WHERE m.date_of_birth IS NOT NULL
)
SELECT
    birth_month,
    TRIM(month_name) AS month_name,
    
    -- Total members with birthdays in this month
    COUNT(*) AS total_birthdays,
    
    -- Members in good standing
    COUNT(*) FILTER (WHERE is_good_standing = true) AS good_standing_count,
    
    -- Members in good standing with valid phone (can receive SMS)
    COUNT(*) FILTER (WHERE is_good_standing = true AND has_valid_phone = true) AS sms_eligible_count,
    
    -- Members NOT in good standing
    COUNT(*) FILTER (WHERE is_good_standing = false) AS not_good_standing_count,
    
    -- Members without valid phone
    COUNT(*) FILTER (WHERE has_valid_phone = false) AS no_phone_count,
    
    -- Percentage in good standing
    ROUND(
        (COUNT(*) FILTER (WHERE is_good_standing = true) * 100.0) / NULLIF(COUNT(*), 0),
        2
    ) AS good_standing_percentage,
    
    -- Percentage SMS eligible (good standing + valid phone)
    ROUND(
        (COUNT(*) FILTER (WHERE is_good_standing = true AND has_valid_phone = true) * 100.0) / NULLIF(COUNT(*), 0),
        2
    ) AS sms_eligible_percentage

FROM monthly_birthdays
GROUP BY birth_month, month_name
ORDER BY birth_month;

-- ============================================================================
-- VIEW: Detailed Birthday List for Active Members (Current Month)
-- ============================================================================
DROP VIEW IF EXISTS vw_birthday_active_members_current_month CASCADE;

CREATE OR REPLACE VIEW vw_birthday_active_members_current_month AS
SELECT
    m.member_id,
    COALESCE(m.membership_number, 'MEM' || LPAD(m.member_id::TEXT, 6, '0')) AS membership_number,
    m.firstname,
    m.surname,
    CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) AS full_name,
    m.cell_number,
    m.date_of_birth,
    EXTRACT(DAY FROM m.date_of_birth)::INTEGER AS birth_day,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.date_of_birth))::INTEGER AS current_age,
    m.province_code,
    m.province_name,
    m.municipality_name,
    m.ward_code,
    COALESCE(mst.status_name, 'Unknown') AS membership_status,
    m.expiry_date,
    -- Check if birthday message was already sent this year
    CASE
        WHEN EXISTS (
            SELECT 1 FROM birthday_messages_sent bms
            WHERE bms.member_id = m.member_id
            AND bms.birthday_year = EXTRACT(YEAR FROM CURRENT_DATE)
        ) THEN true
        ELSE false
    END AS message_sent_this_year
FROM members_consolidated m
LEFT JOIN membership_statuses mst ON m.membership_status_id = mst.status_id
WHERE 
    -- Birthday is in current month
    EXTRACT(MONTH FROM m.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
    -- Has valid date of birth
    AND m.date_of_birth IS NOT NULL
    -- Is in good standing (active status and not expired beyond grace period)
    AND mst.is_active = true
    AND (m.expiry_date IS NULL OR m.expiry_date >= CURRENT_DATE - INTERVAL '90 days')
    -- Has valid phone number
    AND m.cell_number IS NOT NULL
    AND m.cell_number != ''
    AND LENGTH(TRIM(m.cell_number)) >= 10
ORDER BY EXTRACT(DAY FROM m.date_of_birth), m.firstname, m.surname;

COMMIT;

-- Verify the views
SELECT 'vw_birthday_monthly_stats' AS view_name, COUNT(*) AS record_count FROM vw_birthday_monthly_stats
UNION ALL
SELECT 'vw_birthday_active_members_current_month', COUNT(*) FROM vw_birthday_active_members_current_month;

-- Show monthly stats
SELECT * FROM vw_birthday_monthly_stats;

