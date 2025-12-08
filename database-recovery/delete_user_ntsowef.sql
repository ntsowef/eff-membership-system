-- Delete user with email ntsowef@gmail.com
-- This script will completely remove the user from the system

-- First, let's check if the user exists
SELECT user_id, name, email, admin_level, is_active 
FROM users 
WHERE email = 'ntsowef@gmail.com';

-- Delete related records first (to avoid foreign key constraints)

-- Delete OTP codes
DELETE FROM user_otp_codes 
WHERE user_id IN (SELECT user_id FROM users WHERE email = 'ntsowef@gmail.com');

-- Delete audit logs (optional - you may want to keep these for compliance)
-- DELETE FROM audit_logs 
-- WHERE user_id IN (SELECT user_id FROM users WHERE email = 'ntsowef@gmail.com');

-- Delete user creation workflows
DELETE FROM user_creation_workflows 
WHERE user_id IN (SELECT user_id FROM users WHERE email = 'ntsowef@gmail.com');

-- Delete password reset tokens (if any)
-- Already handled by UPDATE users SET password_reset_token = NULL

-- Finally, delete the user
DELETE FROM users 
WHERE email = 'ntsowef@gmail.com';

-- Verify deletion
SELECT COUNT(*) as remaining_users 
FROM users 
WHERE email = 'ntsowef@gmail.com';

