-- Ward Membership Audit System Database Views - MySQL Version
-- Created: 2025-09-07
-- Purpose: Comprehensive ward membership audit with hierarchical municipality oversight

-- =====================================================
-- 1. Ward Membership Audit View
-- =====================================================
-- This view provides ward-level membership counts and standing classifications

DROP VIEW IF EXISTS vw_ward_membership_audit;

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

    -- Active member counts (based on expiry date and status)
    SUM(CASE
        WHEN ms.expiry_date >= CURDATE() AND mst.is_active = 1 THEN 1
        ELSE 0
    END) as active_members,

    SUM(CASE
        WHEN ms.expiry_date < CURDATE() OR mst.is_active = 0 THEN 1
        ELSE 0
    END) as expired_members,

    SUM(CASE
        WHEN ms.expiry_date IS NULL THEN 1
        ELSE 0
    END) as inactive_members,

    COUNT(mem.member_id) as total_members,

    -- Standing classification based on active members
    CASE
        WHEN SUM(CASE
            WHEN ms.expiry_date >= CURDATE() AND mst.is_active = 1 THEN 1
            ELSE 0
        END) >= 200 THEN CONVERT('Good Standing' USING utf8mb4) COLLATE utf8mb4_unicode_ci
        WHEN SUM(CASE
            WHEN ms.expiry_date >= CURDATE() AND mst.is_active = 1 THEN 1
            ELSE 0
        END) >= 100 THEN CONVERT('Acceptable Standing' USING utf8mb4) COLLATE utf8mb4_unicode_ci
        ELSE CONVERT('Needs Improvement' USING utf8mb4) COLLATE utf8mb4_unicode_ci
    END as ward_standing,

    -- Standing level for sorting (1=Good, 2=Acceptable, 3=Needs Improvement)
    CASE
        WHEN SUM(CASE
            WHEN ms.expiry_date >= CURDATE() AND mst.is_active = 1 THEN 1
            ELSE 0
        END) >= 200 THEN 1
        WHEN SUM(CASE
            WHEN ms.expiry_date >= CURDATE() AND mst.is_active = 1 THEN 1
            ELSE 0
        END) >= 100 THEN 2
        ELSE 3
    END as standing_level,

    -- Performance metrics
    ROUND(
        (SUM(CASE
            WHEN ms.expiry_date >= CURDATE() AND mst.is_active = 1 THEN 1
            ELSE 0
        END) * 100.0) / NULLIF(COUNT(mem.member_id), 0), 2
    ) as active_percentage,

    -- Target achievement (200 members = 100%)
    ROUND(
        (SUM(CASE
            WHEN ms.expiry_date >= CURDATE() AND mst.is_active = 1 THEN 1
            ELSE 0
        END) * 100.0) / 200, 2
    ) as target_achievement_percentage,

    -- Members needed to reach next level
    CASE
        WHEN SUM(CASE
            WHEN ms.expiry_date >= CURDATE() AND mst.is_active = 1 THEN 1
            ELSE 0
        END) >= 200 THEN 0
        WHEN SUM(CASE
            WHEN ms.expiry_date >= CURDATE() AND mst.is_active = 1 THEN 1
            ELSE 0
        END) >= 100 THEN
            200 - SUM(CASE
                WHEN ms.expiry_date >= CURDATE() AND mst.is_active = 1 THEN 1
                ELSE 0
            END)
        ELSE 100 - SUM(CASE
            WHEN ms.expiry_date >= CURDATE() AND mst.is_active = 1 THEN 1
            ELSE 0
        END)
    END as members_needed_next_level,

    -- Last updated timestamp
    NOW() as last_updated

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
-- 2. Municipality Ward Performance View
-- =====================================================
-- This view aggregates ward performance to municipality level

DROP VIEW IF EXISTS vw_municipality_ward_performance;

CREATE VIEW vw_municipality_ward_performance AS
SELECT
    m.municipality_code,
    m.municipality_name,
    m.district_code,
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
        ) >= 70 THEN CONVERT('Performing Municipality' USING utf8mb4) COLLATE utf8mb4_unicode_ci
        ELSE CONVERT('Underperforming Municipality' USING utf8mb4) COLLATE utf8mb4_unicode_ci
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
    IFNULL(SUM(wa.active_members), 0) as total_active_members,
    IFNULL(SUM(wa.total_members), 0) as total_all_members,
    ROUND(IFNULL(AVG(wa.active_members), 0), 1) as avg_active_per_ward,

    -- Wards needed to reach compliance (70%)
    CASE
        WHEN ROUND(
            (SUM(CASE WHEN wa.standing_level IN (1, 2) THEN 1 ELSE 0 END) * 100.0) /
            NULLIF(COUNT(wa.ward_code), 0), 2
        ) >= 70 THEN 0
        ELSE CEIL(COUNT(wa.ward_code) * 0.7) - SUM(CASE WHEN wa.standing_level IN (1, 2) THEN 1 ELSE 0 END)
    END as wards_needed_compliance,

    NOW() as last_updated

FROM municipalities m
LEFT JOIN districts d ON m.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
LEFT JOIN vw_ward_membership_audit wa ON m.municipality_code = wa.municipality_code
GROUP BY
    m.municipality_code, m.municipality_name, m.district_code, d.district_name,
    d.province_code, p.province_name;

-- =====================================================
-- 3. Ward Membership Trends View (Simplified for MySQL)
-- =====================================================
-- This view provides historical membership trends for analysis

DROP VIEW IF EXISTS vw_ward_membership_trends;

CREATE VIEW vw_ward_membership_trends AS
SELECT
    w.ward_code,
    w.ward_name,
    w.municipality_code,
    m.municipality_name,
    DATE_FORMAT(ms.date_joined, '%Y-%m-01') as trend_month,

    SUM(CASE
        WHEN ms.expiry_date >= CURDATE() AND mst.is_active = 1 THEN 1
        ELSE 0
    END) as active_members,

    COUNT(mem.member_id) as total_members,

    -- Growth trend indicator (simplified)
    CASE
        WHEN SUM(CASE
            WHEN ms.expiry_date >= CURDATE() AND mst.is_active = 1 THEN 1
            ELSE 0
        END) > 0 THEN CONVERT('Growing' USING utf8mb4) COLLATE utf8mb4_unicode_ci
        ELSE CONVERT('Stable' USING utf8mb4) COLLATE utf8mb4_unicode_ci
    END as growth_trend,

    -- Standing classification for the month
    CASE
        WHEN SUM(CASE
            WHEN ms.expiry_date >= CURDATE() AND mst.is_active = 1 THEN 1
            ELSE 0
        END) >= 200 THEN CONVERT('Good Standing' USING utf8mb4) COLLATE utf8mb4_unicode_ci
        WHEN SUM(CASE
            WHEN ms.expiry_date >= CURDATE() AND mst.is_active = 1 THEN 1
            ELSE 0
        END) >= 100 THEN CONVERT('Acceptable Standing' USING utf8mb4) COLLATE utf8mb4_unicode_ci
        ELSE CONVERT('Needs Improvement' USING utf8mb4) COLLATE utf8mb4_unicode_ci
    END as monthly_standing,

    -- Placeholder values for compatibility
    NULL as month_over_month_growth,
    NULL as year_over_year_growth,

    NOW() as last_updated

FROM wards w
LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
LEFT JOIN members mem ON w.ward_code = mem.ward_code
LEFT JOIN memberships ms ON mem.member_id = ms.member_id
LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id
WHERE ms.date_joined >= DATE_SUB(CURDATE(), INTERVAL 24 MONTH)
GROUP BY
    w.ward_code, w.ward_name, w.municipality_code, m.municipality_name,
    DATE_FORMAT(ms.date_joined, '%Y-%m-01')
ORDER BY w.ward_code, trend_month DESC;
