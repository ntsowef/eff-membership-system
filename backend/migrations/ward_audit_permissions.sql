-- =====================================================
-- Ward Audit System - Permissions Setup
-- =====================================================
-- This script adds the required permissions for the Ward Audit System
-- and assigns them to appropriate roles.
--
-- Run this script after the main ward_audit_system.sql migration.
-- =====================================================

-- Add Ward Audit permissions
INSERT INTO permissions (permission_name, description, category, created_at, updated_at)
VALUES
  ('ward_audit.read', 'View ward audit data and compliance reports', 'Ward Audit', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ward_audit.approve', 'Approve ward compliance status', 'Ward Audit', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ward_audit.manage_delegates', 'Assign and manage ward delegates for assemblies', 'Ward Audit', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (permission_name) DO NOTHING;

-- Get permission IDs
DO $$
DECLARE
  perm_read_id INTEGER;
  perm_approve_id INTEGER;
  perm_manage_delegates_id INTEGER;
  role_national_admin_id INTEGER;
  role_provincial_admin_id INTEGER;
BEGIN
  -- Get permission IDs
  SELECT permission_id INTO perm_read_id FROM permissions WHERE permission_name = 'ward_audit.read';
  SELECT permission_id INTO perm_approve_id FROM permissions WHERE permission_name = 'ward_audit.approve';
  SELECT permission_id INTO perm_manage_delegates_id FROM permissions WHERE permission_name = 'ward_audit.manage_delegates';
  
  -- Get role IDs (adjust role names if different in your system)
  SELECT role_id INTO role_national_admin_id FROM roles WHERE role_name = 'National Admin';
  SELECT role_id INTO role_provincial_admin_id FROM roles WHERE role_name = 'Provincial Admin';
  
  -- Assign all permissions to National Admin
  IF role_national_admin_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id, created_at)
    VALUES
      (role_national_admin_id, perm_read_id, CURRENT_TIMESTAMP),
      (role_national_admin_id, perm_approve_id, CURRENT_TIMESTAMP),
      (role_national_admin_id, perm_manage_delegates_id, CURRENT_TIMESTAMP)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
    
    RAISE NOTICE 'Ward Audit permissions assigned to National Admin role';
  ELSE
    RAISE WARNING 'National Admin role not found. Please assign permissions manually.';
  END IF;
  
  -- Assign read and approve permissions to Provincial Admin
  IF role_provincial_admin_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id, created_at)
    VALUES
      (role_provincial_admin_id, perm_read_id, CURRENT_TIMESTAMP),
      (role_provincial_admin_id, perm_approve_id, CURRENT_TIMESTAMP),
      (role_provincial_admin_id, perm_manage_delegates_id, CURRENT_TIMESTAMP)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
    
    RAISE NOTICE 'Ward Audit permissions assigned to Provincial Admin role';
  ELSE
    RAISE WARNING 'Provincial Admin role not found. Please assign permissions manually.';
  END IF;
END $$;

-- Verify permissions were added
SELECT 
  p.permission_name,
  p.description,
  p.category,
  COUNT(rp.role_id) as assigned_to_roles
FROM permissions p
LEFT JOIN role_permissions rp ON p.permission_id = rp.permission_id
WHERE p.category = 'Ward Audit'
GROUP BY p.permission_id, p.permission_name, p.description, p.category
ORDER BY p.permission_name;

-- Show which roles have ward audit permissions
SELECT 
  r.role_name,
  p.permission_name,
  p.description
FROM roles r
JOIN role_permissions rp ON r.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.permission_id
WHERE p.category = 'Ward Audit'
ORDER BY r.role_name, p.permission_name;

-- =====================================================
-- End of Ward Audit Permissions Setup
-- =====================================================

