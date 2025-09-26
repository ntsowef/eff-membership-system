-- Comprehensive Admin Structure Creation
-- Creates admin users for all provinces, regions, municipalities, and wards
-- Database: membership_system_fresh

USE membership_system_fresh;

-- First, let's ensure we have the proper admin levels in the users table
-- Update the admin_level enum to include all levels if not already present
ALTER TABLE users MODIFY COLUMN admin_level ENUM('national', 'province', 'region', 'municipality', 'ward', 'none') DEFAULT 'none';

-- =====================================================
-- NATIONAL ADMIN
-- =====================================================

-- Create National Admin
INSERT INTO users (name, email, password, role, admin_level, is_active, created_at) VALUES
('National Administrator', 'national.admin@eff.org.za', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'national', TRUE, NOW())
ON DUPLICATE KEY UPDATE 
name = VALUES(name), 
role = VALUES(role), 
admin_level = VALUES(admin_level),
is_active = VALUES(is_active);

-- =====================================================
-- PROVINCIAL ADMINS
-- =====================================================

-- Create Provincial Admins for all 9 provinces
INSERT INTO users (name, email, password, role, admin_level, province_id, is_active, created_at) VALUES
-- Gauteng Province (ID: 6)
('Gauteng Provincial Admin', 'gauteng.admin@eff.org.za', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'province', 6, TRUE, NOW()),

-- Western Cape Province (ID: 7)
('Western Cape Provincial Admin', 'westerncape.admin@eff.org.za', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'province', 7, TRUE, NOW()),

-- KwaZulu-Natal Province (ID: 8)
('KwaZulu-Natal Provincial Admin', 'kwazulunatal.admin@eff.org.za', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'province', 8, TRUE, NOW()),

-- Eastern Cape Province (ID: 9)
('Eastern Cape Provincial Admin', 'easterncape.admin@eff.org.za', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'province', 9, TRUE, NOW()),

-- Limpopo Province (ID: 10)
('Limpopo Provincial Admin', 'limpopo.admin@eff.org.za', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'province', 10, TRUE, NOW()),

-- Mpumalanga Province (ID: 11)
('Mpumalanga Provincial Admin', 'mpumalanga.admin@eff.org.za', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'province', 11, TRUE, NOW()),

-- North West Province (ID: 12)
('North West Provincial Admin', 'northwest.admin@eff.org.za', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'province', 12, TRUE, NOW()),

-- Free State Province (ID: 13)
('Free State Provincial Admin', 'freestate.admin@eff.org.za', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'province', 13, TRUE, NOW()),

-- Northern Cape Province (ID: 14)
('Northern Cape Provincial Admin', 'northerncape.admin@eff.org.za', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'province', 14, TRUE, NOW())

ON DUPLICATE KEY UPDATE 
name = VALUES(name), 
role = VALUES(role), 
admin_level = VALUES(admin_level),
province_id = VALUES(province_id),
is_active = VALUES(is_active);

-- =====================================================
-- REGIONAL ADMINS
-- =====================================================

-- Create Regional Admins for all regions
-- Note: This will create admins for all existing regions in the database

INSERT INTO users (name, email, password, role, admin_level, province_id, region_id, is_active, created_at)
SELECT 
    CONCAT(r.name, ' Regional Admin') as name,
    CONCAT(LOWER(REPLACE(REPLACE(r.name, ' ', '.')), '-', '.'), '.region.admin@eff.org.za') as email,
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' as password,
    'admin' as role,
    'region' as admin_level,
    r.province_id,
    r.id as region_id,
    TRUE as is_active,
    NOW() as created_at
FROM regions r
WHERE r.id IS NOT NULL
ON DUPLICATE KEY UPDATE 
name = VALUES(name), 
role = VALUES(role), 
admin_level = VALUES(admin_level),
province_id = VALUES(province_id),
region_id = VALUES(region_id),
is_active = VALUES(is_active);

-- =====================================================
-- MUNICIPAL ADMINS
-- =====================================================

-- Create Municipal Admins for all municipalities
INSERT INTO users (name, email, password, role, admin_level, province_id, region_id, municipality_id, is_active, created_at)
SELECT 
    CONCAT(m.name, ' Municipal Admin') as name,
    CONCAT(LOWER(REPLACE(REPLACE(REPLACE(m.name, ' ', '.'), '-', '.'), '/', '.')), '.municipal.admin@eff.org.za') as email,
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' as password,
    'admin' as role,
    'municipality' as admin_level,
    r.province_id,
    m.region_id,
    m.id as municipality_id,
    TRUE as is_active,
    NOW() as created_at
FROM municipalities m
JOIN regions r ON m.region_id = r.id
WHERE m.id IS NOT NULL
ON DUPLICATE KEY UPDATE 
name = VALUES(name), 
role = VALUES(role), 
admin_level = VALUES(admin_level),
province_id = VALUES(province_id),
region_id = VALUES(region_id),
municipality_id = VALUES(municipality_id),
is_active = VALUES(is_active);

-- =====================================================
-- WARD ADMINS
-- =====================================================

-- Create Ward Admins for all wards
-- Note: This creates admins for all existing wards in the database
INSERT INTO users (name, email, password, role, admin_level, province_id, region_id, municipality_id, ward_id, is_active, created_at)
SELECT
    CONCAT(w.name, ' Ward Admin') as name,
    CONCAT('ward.', w.ward_number, '.', LOWER(REPLACE(REPLACE(REPLACE(m.name, ' ', '.'), '-', '.'), '/', '.')), '.admin@eff.org.za') as email,
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' as password,
    'admin' as role,
    'ward' as admin_level,
    r.province_id,
    m.region_id,
    w.municipality_id,
    w.id as ward_id,
    TRUE as is_active,
    NOW() as created_at
FROM wards w
JOIN municipalities m ON w.municipality_id = m.id
JOIN regions r ON m.region_id = r.id
WHERE w.id IS NOT NULL
ON DUPLICATE KEY UPDATE
name = VALUES(name),
role = VALUES(role),
admin_level = VALUES(admin_level),
province_id = VALUES(province_id),
region_id = VALUES(region_id),
municipality_id = VALUES(municipality_id),
ward_id = VALUES(ward_id),
is_active = VALUES(is_active);

-- =====================================================
-- ADMIN SUMMARY AND VERIFICATION
-- =====================================================

-- Create a view to easily see the admin hierarchy
CREATE OR REPLACE VIEW admin_hierarchy_view AS
SELECT
    u.id as user_id,
    u.name as admin_name,
    u.email,
    u.admin_level,
    u.is_active,
    CASE
        WHEN u.admin_level = 'national' THEN 'National Level'
        WHEN u.admin_level = 'province' THEN CONCAT(p.name, ' Province')
        WHEN u.admin_level = 'region' THEN CONCAT(r.name, ' Region, ', p.name, ' Province')
        WHEN u.admin_level = 'municipality' THEN CONCAT(m.name, ' Municipality, ', r.name, ' Region, ', p.name, ' Province')
        WHEN u.admin_level = 'ward' THEN CONCAT(w.name, ', ', m.name, ' Municipality, ', r.name, ' Region, ', p.name, ' Province')
        ELSE 'No Assignment'
    END as full_hierarchy,
    u.created_at
FROM users u
LEFT JOIN provinces p ON u.province_id = p.id
LEFT JOIN regions r ON u.region_id = r.id
LEFT JOIN municipalities m ON u.municipality_id = m.id
LEFT JOIN wards w ON u.ward_id = w.id
WHERE u.role = 'admin'
ORDER BY
    CASE u.admin_level
        WHEN 'national' THEN 1
        WHEN 'province' THEN 2
        WHEN 'region' THEN 3
        WHEN 'municipality' THEN 4
        WHEN 'ward' THEN 5
        ELSE 6
    END,
    p.name, r.name, m.name, w.name;

-- =====================================================
-- ADMIN STATISTICS
-- =====================================================

-- Show summary of created admins
SELECT
    'ADMIN CREATION SUMMARY' as summary_type,
    admin_level,
    COUNT(*) as admin_count,
    COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_count
FROM users
WHERE role = 'admin'
GROUP BY admin_level
ORDER BY
    CASE admin_level
        WHEN 'national' THEN 1
        WHEN 'province' THEN 2
        WHEN 'region' THEN 3
        WHEN 'municipality' THEN 4
        WHEN 'ward' THEN 5
        ELSE 6
    END;

-- =====================================================
-- SAMPLE ADMIN CREDENTIALS
-- =====================================================

-- Display sample admin credentials for testing
SELECT
    'SAMPLE ADMIN CREDENTIALS FOR TESTING' as info,
    admin_level,
    email,
    'password123' as default_password,
    full_hierarchy
FROM admin_hierarchy_view
WHERE admin_level IN ('national', 'province', 'municipality', 'ward')
LIMIT 10;

-- =====================================================
-- ADMIN PERMISSIONS SETUP (Optional Enhancement)
-- =====================================================

-- Create admin permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    permission_name VARCHAR(100) NOT NULL,
    permission_scope ENUM('read', 'write', 'delete', 'manage') NOT NULL,
    resource_type ENUM('members', 'analytics', 'reports', 'settings', 'users', 'all') NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INT,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_permission (user_id, permission_name, resource_type)
);

-- Grant basic permissions to all admins
INSERT INTO admin_permissions (user_id, permission_name, permission_scope, resource_type, granted_by, is_active)
SELECT
    u.id as user_id,
    CASE
        WHEN u.admin_level = 'national' THEN 'full_access'
        WHEN u.admin_level = 'province' THEN 'province_management'
        WHEN u.admin_level = 'region' THEN 'region_management'
        WHEN u.admin_level = 'municipality' THEN 'municipality_management'
        WHEN u.admin_level = 'ward' THEN 'ward_management'
    END as permission_name,
    CASE
        WHEN u.admin_level = 'national' THEN 'manage'
        ELSE 'write'
    END as permission_scope,
    'all' as resource_type,
    1 as granted_by, -- Assuming user ID 1 is the system admin
    TRUE as is_active
FROM users u
WHERE u.role = 'admin' AND u.admin_level != 'none'
ON DUPLICATE KEY UPDATE
permission_scope = VALUES(permission_scope),
is_active = VALUES(is_active);

-- =====================================================
-- FINAL VERIFICATION QUERIES
-- =====================================================

-- Count total admins created
SELECT
    'TOTAL ADMINS CREATED' as metric,
    COUNT(*) as count
FROM users
WHERE role = 'admin';

-- Show geographic coverage
SELECT
    'GEOGRAPHIC ADMIN COVERAGE' as coverage_type,
    'Provinces with Admins' as level_type,
    COUNT(DISTINCT province_id) as count
FROM users
WHERE role = 'admin' AND admin_level = 'province'
UNION ALL
SELECT
    'GEOGRAPHIC ADMIN COVERAGE',
    'Regions with Admins',
    COUNT(DISTINCT region_id)
FROM users
WHERE role = 'admin' AND admin_level = 'region'
UNION ALL
SELECT
    'GEOGRAPHIC ADMIN COVERAGE',
    'Municipalities with Admins',
    COUNT(DISTINCT municipality_id)
FROM users
WHERE role = 'admin' AND admin_level = 'municipality'
UNION ALL
SELECT
    'GEOGRAPHIC ADMIN COVERAGE',
    'Wards with Admins',
    COUNT(DISTINCT ward_id)
FROM users
WHERE role = 'admin' AND admin_level = 'ward';

-- Show sample admin login credentials
SELECT
    'LOGIN CREDENTIALS SAMPLE' as info,
    'Email' as field,
    email as value,
    'Password: password123' as note
FROM users
WHERE role = 'admin' AND admin_level IN ('national', 'province')
LIMIT 5;
