-- =====================================================================================
-- CREATE PERMANENT SUPER ADMIN USER
-- =====================================================================================
-- This script creates a permanent super admin user for the EFF Membership System
-- Run this script using: psql -h localhost -U postgres -d eff_membership_database -f backend/scripts/create-super-admin.sql
-- =====================================================================================

BEGIN;

-- 1. Ensure super_admin role exists
INSERT INTO roles (role_name, role_code, description, is_active, created_at)
VALUES ('super_admin', 'SUPER_ADMIN', 'Super Administrator with full system access', TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (role_name) DO NOTHING;

-- Get the super_admin role_id
DO $$
DECLARE
    v_role_id INTEGER;
    v_user_exists BOOLEAN;
BEGIN
    -- Get super_admin role_id
    SELECT role_id INTO v_role_id FROM roles WHERE role_name = 'super_admin';
    
    -- Check if super admin user already exists
    SELECT EXISTS(SELECT 1 FROM users WHERE email = 'superadmin@eff.org.za') INTO v_user_exists;
    
    IF v_user_exists THEN
        -- Update existing user to super_admin role
        UPDATE users 
        SET 
            role_id = v_role_id,
            admin_level = 'national',
            is_active = TRUE,
            email_verified_at = CURRENT_TIMESTAMP
        WHERE email = 'superadmin@eff.org.za';
        
        RAISE NOTICE '✅ Existing user updated to super_admin role';
        RAISE NOTICE '📧 Email: superadmin@eff.org.za';
        RAISE NOTICE '🔑 Use your existing password to login';
    ELSE
        -- Create new super admin user
        -- Password: SuperAdmin@2024! (bcrypt hash with 12 rounds)
        -- IMPORTANT: Change this password immediately after first login!
        INSERT INTO users (
            name, 
            email, 
            password, 
            role_id, 
            admin_level,
            cell_number,
            is_active, 
            email_verified_at, 
            created_at
        ) VALUES (
            'Super Administrator',
            'superadmin@eff.org.za',
            '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VjWZifHm.',  -- SuperAdmin@2024!
            v_role_id,
            'national',
            '+27123456789',
            TRUE,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );
        
        RAISE NOTICE '=======================================================================';
        RAISE NOTICE '🎉 SUPER ADMIN USER CREATED SUCCESSFULLY!';
        RAISE NOTICE '=======================================================================';
        RAISE NOTICE '';
        RAISE NOTICE '📝 Login Credentials:';
        RAISE NOTICE '   📧 Email:    superadmin@eff.org.za';
        RAISE NOTICE '   🔑 Password: SuperAdmin@2024!';
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  IMPORTANT SECURITY NOTICE:';
        RAISE NOTICE '   1. Change this password immediately after first login!';
        RAISE NOTICE '   2. Use a strong, unique password';
        RAISE NOTICE '   3. Enable MFA if available';
        RAISE NOTICE '   4. Keep these credentials secure';
        RAISE NOTICE '';
        RAISE NOTICE '🌐 Access the system at:';
        RAISE NOTICE '   Frontend: http://localhost:3000/login';
        RAISE NOTICE '   Super Admin: http://localhost:3000/admin/super-admin/dashboard';
        RAISE NOTICE '';
        RAISE NOTICE '✨ The super admin user has full access to:';
        RAISE NOTICE '   ✅ Super Admin Interface (all 8 pages)';
        RAISE NOTICE '   ✅ System monitoring and configuration';
        RAISE NOTICE '   ✅ Queue management';
        RAISE NOTICE '   ✅ User management';
        RAISE NOTICE '   ✅ Bulk upload management';
        RAISE NOTICE '   ✅ Lookup data management';
        RAISE NOTICE '   ✅ All other system features';
        RAISE NOTICE '';
        RAISE NOTICE '=======================================================================';
    END IF;
END $$;

COMMIT;

-- Verify the super admin user was created
SELECT 
    u.user_id,
    u.name,
    u.email,
    r.role_name,
    u.admin_level,
    u.is_active,
    u.email_verified_at IS NOT NULL as email_verified,
    u.created_at
FROM users u
JOIN roles r ON u.role_id = r.role_id
WHERE u.email = 'superadmin@eff.org.za';

