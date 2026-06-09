-- ============================================================================
-- OPTIMIZATION: Convert vw_birthday_monthly_stats to MATERIALIZED VIEW
-- ============================================================================
-- The original regular VIEW re-scans ~1.7M rows on every API call (45s).
-- A MATERIALIZED VIEW stores the pre-computed result set and serves it
-- instantly. It only needs a REFRESH when underlying data changes.
-- ============================================================================

BEGIN;

-- 1. Drop old regular view
DROP VIEW IF EXISTS vw_birthday_monthly_stats CASCADE;

-- 2. Create materialized view with the same query
CREATE MATERIALIZED VIEW IF NOT EXISTS vw_birthday_monthly_stats AS
WITH monthly_birthdays AS (
    SELECT
        EXTRACT(MONTH FROM m.date_of_birth)::INTEGER AS birth_month,
        TO_CHAR(TO_DATE(EXTRACT(MONTH FROM m.date_of_birth)::TEXT, 'MM'), 'Month') AS month_name,
        m.member_id,
        m.cell_number,
        m.membership_status_id,
        m.expiry_date,
        m.date_of_birth,
        CASE 
            WHEN mst.is_active = true 
                 AND (m.expiry_date IS NULL OR m.expiry_date >= CURRENT_DATE - INTERVAL '90 days')
            THEN true
            ELSE false
        END AS is_good_standing,
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
    COUNT(*) AS total_birthdays,
    COUNT(*) FILTER (WHERE is_good_standing = true) AS good_standing_count,
    COUNT(*) FILTER (WHERE is_good_standing = true AND has_valid_phone = true) AS sms_eligible_count,
    COUNT(*) FILTER (WHERE is_good_standing = false) AS not_good_standing_count,
    COUNT(*) FILTER (WHERE has_valid_phone = false) AS no_phone_count,
    ROUND(
        (COUNT(*) FILTER (WHERE is_good_standing = true) * 100.0) / NULLIF(COUNT(*), 0),
        2
    ) AS good_standing_percentage,
    ROUND(
        (COUNT(*) FILTER (WHERE is_good_standing = true AND has_valid_phone = true) * 100.0) / NULLIF(COUNT(*), 0),
        2
    ) AS sms_eligible_percentage
FROM monthly_birthdays
GROUP BY birth_month, month_name
ORDER BY birth_month;

-- 3. Create unique index so REFRESH CONCURRENTLY can be used later
CREATE UNIQUE INDEX IF NOT EXISTS idx_birthday_monthly_stats_month
ON vw_birthday_monthly_stats (birth_month);

COMMIT;

-- 4. Verify
SELECT * FROM vw_birthday_monthly_stats ORDER BY birth_month;
