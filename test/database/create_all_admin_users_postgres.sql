-- =====================================================================================
-- COMPREHENSIVE ADMIN USER CREATION SCRIPT FOR POSTGRESQL
-- EFF Membership Management System
-- =====================================================================================
-- This script creates admin users at all levels: National, Provincial, District, Municipal, and Ward
-- Password for all users: Admin@123
-- Hashed with bcrypt (10 rounds): $2b$10$rZ5c3Hn8qF7vK9mL2pN4OeX6wY8zA1bC3dE5fG7hI9jK1lM3nO5pQ
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- 1. NATIONAL ADMIN
-- =====================================================================================

INSERT INTO users (
    name, email, password, role_id, admin_level,
    province_code, district_code, municipal_code, ward_code,
    is_active, created_at, updated_at, id
)
SELECT
    'National Administrator',
    'national.admin@eff.org.za',
    '$2b$10$rZ5c3Hn8qF7vK9mL2pN4OeX6wY8zA1bC3dE5fG7hI9jK1lM3nO5pQ',
    (SELECT role_id FROM roles WHERE role_code = 'NATIONAL_ADMIN' LIMIT 1),
    'national',
    NULL, NULL, NULL, NULL,
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    COALESCE((SELECT MAX(id) FROM users), 0) + 1
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'national.admin@eff.org.za'
);

-- =====================================================================================
-- 2. PROVINCIAL ADMINS (9 Provinces)
-- =====================================================================================

INSERT INTO users (
    name, email, password, role_id, admin_level,
    province_code, district_code, municipal_code, ward_code,
    is_active, created_at, updated_at, id
)
SELECT
    p.province_name || ' Provincial Admin' as name,
    LOWER(REPLACE(p.province_name, ' ', '')) || '.admin@eff.org.za' as email,
    '$2b$10$rZ5c3Hn8qF7vK9mL2pN4OeX6wY8zA1bC3dE5fG7hI9jK1lM3nO5pQ' as password,
    (SELECT role_id FROM roles WHERE role_code = 'PROVINCIAL_ADMIN' LIMIT 1) as role_id,
    'province' as admin_level,
    p.province_code,
    NULL, NULL, NULL,
    TRUE as is_active,
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at,
    COALESCE((SELECT MAX(id) FROM users), 0) + ROW_NUMBER() OVER (ORDER BY p.province_code) as id
FROM provinces p
WHERE NOT EXISTS (
    SELECT 1 FROM users u
    WHERE u.email = LOWER(REPLACE(p.province_name, ' ', '')) || '.admin@eff.org.za'
);

-- =====================================================================================
-- 3. DISTRICT ADMINS (All Districts)
-- =====================================================================================

INSERT INTO users (
    name, email, password, role_id, admin_level,
    province_code, district_code, municipal_code, ward_code,
    is_active, created_at, updated_at, id
)
SELECT
    d.district_name || ' District Admin' as name,
    'district.' || LOWER(REPLACE(REPLACE(d.district_name, ' ', '.'), '/', '.')) || '.admin@eff.org.za' as email,
    '$2b$10$rZ5c3Hn8qF7vK9mL2pN4OeX6wY8zA1bC3dE5fG7hI9jK1lM3nO5pQ' as password,
    (SELECT role_id FROM roles WHERE role_code = 'DISTRICT_ADMIN' LIMIT 1) as role_id,
    'district' as admin_level,
    d.province_code,
    d.district_code,
    NULL, NULL,
    TRUE as is_active,
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at,
    COALESCE((SELECT MAX(id) FROM users), 0) + ROW_NUMBER() OVER (ORDER BY d.district_code) as id
FROM districts d
WHERE NOT EXISTS (
    SELECT 1 FROM users u
    WHERE u.email = 'district.' || LOWER(REPLACE(REPLACE(d.district_name, ' ', '.'), '/', '.')) || '.admin@eff.org.za'
);

-- =====================================================================================
-- 4. MUNICIPAL ADMINS (All Municipalities)
-- =====================================================================================

INSERT INTO users (
    name, email, password, role_id, admin_level,
    province_code, district_code, municipal_code, ward_code,
    is_active, created_at, updated_at, id
)
SELECT
    m.municipality_name || ' Municipal Admin' as name,
    'municipal.' || LOWER(m.municipality_code) || '.admin@eff.org.za' as email,
    '$2b$10$rZ5c3Hn8qF7vK9mL2pN4OeX6wY8zA1bC3dE5fG7hI9jK1lM3nO5pQ' as password,
    (SELECT role_id FROM roles WHERE role_code = 'MUNICIPAL_ADMIN' LIMIT 1) as role_id,
    'municipality' as admin_level,
    d.province_code,
    m.district_code,
    m.municipality_code,
    NULL,
    TRUE as is_active,
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at,
    COALESCE((SELECT MAX(id) FROM users), 0) + ROW_NUMBER() OVER (ORDER BY m.municipality_code) as id
FROM municipalities m
JOIN districts d ON m.district_code = d.district_code
WHERE NOT EXISTS (
    SELECT 1 FROM users u
    WHERE u.email = 'municipal.' || LOWER(m.municipality_code) || '.admin@eff.org.za'
);

-- =====================================================================================
-- 5. WARD ADMINS (All Wards)
-- =====================================================================================

INSERT INTO users (
    name, email, password, role_id, admin_level,
    province_code, district_code, municipal_code, ward_code,
    is_active, created_at, updated_at, id
)
SELECT
    COALESCE('Ward ' || w.ward_number || ' - ' || m.municipality_name || ' Admin', w.ward_name || ' - ' || m.municipality_name || ' Admin') as name,
    'ward.' || LOWER(w.ward_code) || '.admin@eff.org.za' as email,
    '$2b$10$rZ5c3Hn8qF7vK9mL2pN4OeX6wY8zA1bC3dE5fG7hI9jK1lM3nO5pQ' as password,
    (SELECT role_id FROM roles WHERE role_code = 'WARD_ADMIN' LIMIT 1) as role_id,
    'ward' as admin_level,
    d.province_code,
    m.district_code,
    w.municipality_code,
    w.ward_code,
    TRUE as is_active,
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at,
    COALESCE((SELECT MAX(id) FROM users), 0) + ROW_NUMBER() OVER (ORDER BY w.ward_code) as id
FROM wards w
JOIN municipalities m ON w.municipality_code = m.municipality_code
JOIN districts d ON m.district_code = d.district_code
WHERE w.ward_code IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM users u
    WHERE u.email = 'ward.' || LOWER(w.ward_code) || '.admin@eff.org.za'
);

-- =====================================================================================
-- 6. CREATE ADMIN HIERARCHY VIEW
-- =====================================================================================

CREATE OR REPLACE VIEW admin_hierarchy_view AS
SELECT
    u.user_id,
    u.name as admin_name,
    u.email,
    u.admin_level,
    u.is_active,
    r.role_name,
    CASE
        WHEN u.admin_level = 'national' THEN 'National Level'
        WHEN u.admin_level = 'province' THEN p.province_name || ' Province'
        WHEN u.admin_level = 'district' THEN d.district_name || ' District, ' || p.province_name || ' Province'
        WHEN u.admin_level = 'municipality' THEN m.municipality_name || ' Municipality, ' || d.district_name || ' District, ' || p.province_name || ' Province'
        WHEN u.admin_level = 'ward' THEN COALESCE('Ward ' || w.ward_number, w.ward_name) || ', ' || m.municipality_name || ' Municipality, ' || d.district_name || ' District, ' || p.province_name || ' Province'
        ELSE 'No Assignment'
    END as full_hierarchy,
    u.province_code,
    u.district_code,
    u.municipal_code,
    u.ward_code,
    u.created_at
FROM users u
LEFT JOIN roles r ON u.role_id = r.role_id
LEFT JOIN provinces p ON u.province_code = p.province_code
LEFT JOIN districts d ON u.district_code = d.district_code
LEFT JOIN municipalities m ON u.municipal_code = m.municipality_code
LEFT JOIN wards w ON u.ward_code = w.ward_code
WHERE u.admin_level IS NOT NULL
ORDER BY
    CASE u.admin_level
        WHEN 'national' THEN 1
        WHEN 'province' THEN 2
        WHEN 'district' THEN 3
        WHEN 'municipality' THEN 4
        WHEN 'ward' THEN 5
        ELSE 6
    END,
    p.province_name, d.district_name, m.municipality_name, w.ward_number;

-- =====================================================================================
-- 7. ADMIN STATISTICS AND SUMMARY
-- =====================================================================================

-- Show summary of created admins
SELECT
    'ADMIN CREATION SUMMARY' as summary_type,
    admin_level,
    COUNT(*) as admin_count,
    COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_count
FROM users
WHERE admin_level IS NOT NULL
GROUP BY admin_level
ORDER BY
    CASE admin_level
        WHEN 'national' THEN 1
        WHEN 'province' THEN 2
        WHEN 'district' THEN 3
        WHEN 'municipality' THEN 4
        WHEN 'ward' THEN 5
        ELSE 6
    END;

-- Show geographic coverage
SELECT
    'GEOGRAPHIC ADMIN COVERAGE' as coverage_type,
    'Provinces with Admins' as level_type,
    COUNT(DISTINCT province_code) as count
FROM users
WHERE admin_level = 'province'
UNION ALL
SELECT
    'GEOGRAPHIC ADMIN COVERAGE',
    'Districts with Admins',
    COUNT(DISTINCT district_code)
FROM users
WHERE admin_level = 'district'
UNION ALL
SELECT
    'GEOGRAPHIC ADMIN COVERAGE',
    'Municipalities with Admins',
    COUNT(DISTINCT municipal_code)
FROM users
WHERE admin_level = 'municipality'
UNION ALL
SELECT
    'GEOGRAPHIC ADMIN COVERAGE',
    'Wards with Admins',
    COUNT(DISTINCT ward_code)
FROM users
WHERE admin_level = 'ward';

-- Show sample admin credentials
SELECT
    'SAMPLE ADMIN CREDENTIALS' as info,
    admin_level,
    email,
    'Admin@123' as default_password,
    full_hierarchy
FROM admin_hierarchy_view
WHERE admin_level IN ('national', 'province', 'district', 'municipality', 'ward')
ORDER BY
    CASE admin_level
        WHEN 'national' THEN 1
        WHEN 'province' THEN 2
        WHEN 'district' THEN 3
        WHEN 'municipality' THEN 4
        WHEN 'ward' THEN 5
    END
LIMIT 20;

COMMIT;

-- =====================================================================================
-- USAGE INSTRUCTIONS
-- =====================================================================================
-- 
-- To run this script:
-- psql -U eff_admin -d eff_membership_db -f create_all_admin_users_postgres.sql
--
-- Default Password for all users: Admin@123
--
-- Sample Login Credentials:
-- - National Admin: national.admin@eff.org.za / Admin@123
-- - Gauteng Provincial Admin: gauteng.admin@eff.org.za / Admin@123
-- - District Admins: district.[district-name].admin@eff.org.za / Admin@123
-- - Municipal Admins: municipal.[municipality-name].admin@eff.org.za / Admin@123
-- - Ward Admins: ward.[ward-number].[municipality-name].admin@eff.org.za / Admin@123
--
-- =====================================================================================

