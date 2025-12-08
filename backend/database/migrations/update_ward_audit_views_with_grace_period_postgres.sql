-- Update Ward Audit Views to Include 90-Day Grace Period (PostgreSQL)
-- Date: 2025-01-12
-- Purpose: Update ward membership audit views to count members with 90-day grace period as active

-- =====================================================
-- 1. Update Ward Membership Audit View
-- =====================================================

DROP VIEW IF EXISTS vw_ward_membership_audit CASCADE;

CREATE VIEW vw_ward_membership_audit AS
SELECT
    w.ward_code,
    w.ward_name,
    w.municipality_code,
    m.municipality_name,
    m.district_code,
    d.district_name,
    d.province_code,
    p.province_name,

    -- Active member counts (based on expiry date with 90-day grace period)
    -- Active = not expired OR in grace period (expired < 90 days)
    SUM(CASE
        WHEN ms.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1
        ELSE 0
    END) as active_members,

    SUM(CASE
        WHEN ms.expiry_date < CURRENT_DATE - INTERVAL '90 days' OR mst.is_active = false THEN 1
        ELSE 0
    END) as expired_members,

    SUM(CASE
        WHEN ms.expiry_date IS NULL THEN 1
        ELSE 0
    END) as inactive_members,

    COUNT(mem.member_id) as total_members,

    -- Standing classification based on active members (with 90-day grace period)
    CASE
        WHEN SUM(CASE
            WHEN ms.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1
            ELSE 0
        END) >= 200 THEN 'Good Standing'
        WHEN SUM(CASE
            WHEN ms.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1
            ELSE 0
        END) >= 100 THEN 'Acceptable Standing'
        ELSE 'Needs Improvement'
    END as ward_standing,

    -- Standing level for sorting (1=Good, 2=Acceptable, 3=Needs Improvement)
    CASE
        WHEN SUM(CASE
            WHEN ms.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1
            ELSE 0
        END) >= 200 THEN 1
        WHEN SUM(CASE
            WHEN ms.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1
            ELSE 0
        END) >= 100 THEN 2
        ELSE 3
    END as standing_level,

    -- Performance metrics
    ROUND(
        (SUM(CASE
            WHEN ms.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1
            ELSE 0
        END) * 100.0) / NULLIF(COUNT(mem.member_id), 0), 2
    ) as active_percentage,

    -- Target achievement (200 members = 100%)
    ROUND(
        (SUM(CASE
            WHEN ms.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1
            ELSE 0
        END) * 100.0) / 200, 2
    ) as target_achievement_percentage,

    -- Members needed to reach next level
    CASE
        WHEN SUM(CASE
            WHEN ms.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1
            ELSE 0
        END) >= 200 THEN 0
        WHEN SUM(CASE
            WHEN ms.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1
            ELSE 0
        END) >= 100 THEN
            200 - SUM(CASE
                WHEN ms.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1
                ELSE 0
            END)
        ELSE 100 - SUM(CASE
            WHEN ms.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1
            ELSE 0
        END)
    END as members_needed_next_level,

    -- Last updated timestamp
    CURRENT_TIMESTAMP as last_updated

FROM wards w
LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
LEFT JOIN districts d ON m.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
LEFT JOIN members mem ON w.ward_code = mem.ward_code
LEFT JOIN memberships ms ON mem.member_id = ms.member_id
LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id
GROUP BY
    w.ward_code, w.ward_name, w.municipality_code, m.municipality_name,
    m.district_code, d.district_name, d.province_code, p.province_name;

-- =====================================================
-- 2. Update Ward Membership Trends View
-- =====================================================

DROP VIEW IF EXISTS vw_ward_membership_trends CASCADE;

CREATE VIEW vw_ward_membership_trends AS
SELECT
    w.ward_code,
    w.ward_name,
    w.municipality_code,
    m.municipality_name,
    TO_CHAR(ms.date_joined, 'YYYY-MM-01') as trend_month,

    -- Active members with 90-day grace period
    SUM(CASE
        WHEN ms.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1
        ELSE 0
    END) as active_members,

    COUNT(mem.member_id) as total_members,

    -- Growth trend indicator (simplified)
    CASE
        WHEN SUM(CASE
            WHEN ms.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1
            ELSE 0
        END) > 0 THEN 'Growing'
        ELSE 'Stable'
    END as growth_trend,

    -- Standing classification for the month (with 90-day grace period)
    CASE
        WHEN SUM(CASE
            WHEN ms.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1
            ELSE 0
        END) >= 200 THEN 'Good Standing'
        WHEN SUM(CASE
            WHEN ms.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1
            ELSE 0
        END) >= 100 THEN 'Acceptable Standing'
        ELSE 'Needs Improvement'
    END as monthly_standing,

    -- Placeholder values for compatibility
    NULL as month_over_month_growth,
    NULL as year_over_year_growth,

    CURRENT_TIMESTAMP as last_updated

FROM wards w
LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
LEFT JOIN members mem ON w.ward_code = mem.ward_code
LEFT JOIN memberships ms ON mem.member_id = ms.member_id
LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id
WHERE ms.date_joined >= CURRENT_DATE - INTERVAL '24 months'
GROUP BY
    w.ward_code, w.ward_name, w.municipality_code, m.municipality_name,
    TO_CHAR(ms.date_joined, 'YYYY-MM-01')
ORDER BY w.ward_code, trend_month DESC;

