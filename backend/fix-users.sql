-- Fix demo users for login system
-- Update users to be active and have proper admin levels

UPDATE users 
SET 
    is_active = 1,
    admin_level = 'national',
    name = 'Super Administrator'
WHERE email = 'admin@membership.org';

UPDATE users 
SET 
    is_active = 1,
    admin_level = 'province',
    province_code = 'GP',
    name = 'Gauteng Administrator'
WHERE email = 'gauteng.admin@membership.org';

-- Verify the updates
SELECT 
    id, name, email, is_active, admin_level, province_code,
    CASE WHEN password IS NOT NULL THEN 'Present' ELSE 'Missing' END as password_status
FROM users 
WHERE email IN ('admin@membership.org', 'gauteng.admin@membership.org');
