-- Additional Admin Accounts for Hierarchy Testing
-- Run this AFTER the main sample-data.sql to add municipal and ward admin accounts

-- =====================================================
-- IMPORTANT: PASSWORD INFORMATION
-- =====================================================
-- All existing accounts in sample-data.sql use password: "Password123!"
-- The hash is: $2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO

-- =====================================================
-- ADDITIONAL MUNICIPAL ADMIN ACCOUNTS
-- =====================================================
-- Note: Using the correct municipality IDs from the existing sample-data.sql
INSERT INTO users (name, email, password, role, admin_level, province_id, region_id, municipality_id, ward_id, member_id, is_active) VALUES
('City of Johannesburg Municipal Admin', 'joburg.municipal@membership.org.za', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'admin', 'municipality', 3, 14, 11, NULL, NULL, TRUE),
('City of Tshwane Municipal Admin', 'tshwane.municipal@membership.org.za', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'admin', 'municipality', 3, 15, 12, NULL, NULL, TRUE),
('Cape Town Municipal Admin', 'capetown.municipal@membership.org.za', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'admin', 'municipality', 9, 47, 32, NULL, NULL, TRUE);

-- =====================================================
-- ADDITIONAL WARD ADMIN ACCOUNTS
-- =====================================================
-- Note: Using the correct ward IDs from the existing sample-data.sql
INSERT INTO users (name, email, password, role, admin_level, province_id, region_id, municipality_id, ward_id, member_id, is_active) VALUES
('Johannesburg Ward 23 Admin', 'joburg.ward23@membership.org.za', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'admin', 'ward', 3, 14, 11, 2, NULL, TRUE),
('Johannesburg Ward 87 Admin', 'joburg.ward87@membership.org.za', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'admin', 'ward', 3, 14, 11, 3, NULL, TRUE),
('Tshwane Ward 82 Admin', 'tshwane.ward82@membership.org.za', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'admin', 'ward', 3, 15, 12, 16, NULL, TRUE),
('Cape Town Ward 57 Admin', 'capetown.ward57@membership.org.za', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'admin', 'ward', 9, 47, 32, 6, NULL, TRUE);

-- =====================================================
-- TESTING CREDENTIALS
-- =====================================================
-- All accounts use password: "Password123!"
--
-- Municipal Admin Accounts:
-- - joburg.municipal@membership.org.za / Password123!
-- - tshwane.municipal@membership.org.za / Password123!
-- - capetown.municipal@membership.org.za / Password123!
--
-- Ward Admin Accounts:
-- - joburg.ward23@membership.org.za / Password123!
-- - joburg.ward87@membership.org.za / Password123!
-- - tshwane.ward82@membership.org.za / Password123!
-- - capetown.ward57@membership.org.za / Password123!
--
-- Note: These accounts are in addition to the existing admin accounts in sample-data.sql:
-- - soweto.admin@membership.org.za (Municipal Admin for Johannesburg)
-- - sandton.admin@membership.org.za (Municipal Admin for Sandton)
-- - jhb.ward58.admin@membership.org.za (Ward Admin for Johannesburg Ward 58)


