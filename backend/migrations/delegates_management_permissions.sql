-- =====================================================
-- Delegates Management - Permissions Setup
-- =====================================================
-- This script adds the required permissions for the Delegates Management module
-- and assigns them to appropriate roles.
--
-- Run this script to set up delegates management permissions.
-- =====================================================

-- Add Delegates Management permissions (if not already added by ward_audit_permissions.sql)
INSERT INTO permissions (permission_name, description, category, created_at, updated_at)
VALUES
  ('ward_audit.read', 'View ward audit data and compliance reports', 'Ward Audit', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ward_audit.approve', 'Approve ward compliance status', 'Ward Audit', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ward_audit.manage_delegates', 'Assign and manage ward delegates for assemblies', 'Ward Audit', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('delegates.read', 'View delegates information', 'Delegates Management', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('delegates.manage', 'Manage delegates (assign, update, remove)', 'Delegates Management', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('delegates.export', 'Export delegates data and reports', 'Delegates Management', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (permission_name) DO NOTHING;

-- Get permission IDs
DO $$
DECLARE
  perm_ward_audit_read_id INTEGER;
  perm_ward_audit_approve_id INTEGER;
  perm_ward_audit_manage_delegates_id INTEGER;
  perm_delegates_read_id INTEGER;
  perm_delegates_manage_id INTEGER;
  perm_delegates_export_id INTEGER;
  role_national_admin_id INTEGER;
  role_provincial_admin_id INTEGER;
  role_district_admin_id INTEGER;
  role_municipal_admin_id INTEGER;
BEGIN
  -- Get permission IDs
  SELECT permission_id INTO perm_ward_audit_read_id FROM permissions WHERE permission_name = 'ward_audit.read';
  SELECT permission_id INTO perm_ward_audit_approve_id FROM permissions WHERE permission_name = 'ward_audit.approve';
  SELECT permission_id INTO perm_ward_audit_manage_delegates_id FROM permissions WHERE permission_name = 'ward_audit.manage_delegates';
  SELECT permission_id INTO perm_delegates_read_id FROM permissions WHERE permission_name = 'delegates.read';
  SELECT permission_id INTO perm_delegates_manage_id FROM permissions WHERE permission_name = 'delegates.manage';
  SELECT permission_id INTO perm_delegates_export_id FROM permissions WHERE permission_name = 'delegates.export';
  
  -- Get role IDs
  SELECT role_id INTO role_national_admin_id FROM roles WHERE role_name = 'national_admin';
  SELECT role_id INTO role_provincial_admin_id FROM roles WHERE role_name = 'provincial_admin';
  SELECT role_id INTO role_district_admin_id FROM roles WHERE role_name = 'district_admin';
  SELECT role_id INTO role_municipal_admin_id FROM roles WHERE role_name = 'municipal_admin';
  
  -- Assign all permissions to National Admin
  IF role_national_admin_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id, created_at)
    VALUES
      (role_national_admin_id, perm_ward_audit_read_id, CURRENT_TIMESTAMP),
      (role_national_admin_id, perm_ward_audit_approve_id, CURRENT_TIMESTAMP),
      (role_national_admin_id, perm_ward_audit_manage_delegates_id, CURRENT_TIMESTAMP),
      (role_national_admin_id, perm_delegates_read_id, CURRENT_TIMESTAMP),
      (role_national_admin_id, perm_delegates_manage_id, CURRENT_TIMESTAMP),
      (role_national_admin_id, perm_delegates_export_id, CURRENT_TIMESTAMP)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
    
    RAISE NOTICE 'Delegates Management permissions assigned to National Admin role';
  ELSE
    RAISE WARNING 'National Admin role not found. Please assign permissions manually.';
  END IF;
  
  -- Assign permissions to Provincial Admin
  IF role_provincial_admin_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id, created_at)
    VALUES
      (role_provincial_admin_id, perm_ward_audit_read_id, CURRENT_TIMESTAMP),
      (role_provincial_admin_id, perm_ward_audit_approve_id, CURRENT_TIMESTAMP),
      (role_provincial_admin_id, perm_ward_audit_manage_delegates_id, CURRENT_TIMESTAMP),
      (role_provincial_admin_id, perm_delegates_read_id, CURRENT_TIMESTAMP),
      (role_provincial_admin_id, perm_delegates_manage_id, CURRENT_TIMESTAMP),
      (role_provincial_admin_id, perm_delegates_export_id, CURRENT_TIMESTAMP)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
    
    RAISE NOTICE 'Delegates Management permissions assigned to Provincial Admin role';
  ELSE
    RAISE WARNING 'Provincial Admin role not found. Please assign permissions manually.';
  END IF;

  -- Assign read and manage permissions to District Admin
  IF role_district_admin_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id, created_at)
    VALUES
      (role_district_admin_id, perm_ward_audit_read_id, CURRENT_TIMESTAMP),
      (role_district_admin_id, perm_delegates_read_id, CURRENT_TIMESTAMP),
      (role_district_admin_id, perm_delegates_manage_id, CURRENT_TIMESTAMP),
      (role_district_admin_id, perm_delegates_export_id, CURRENT_TIMESTAMP)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
    
    RAISE NOTICE 'Delegates Management permissions assigned to District Admin role';
  ELSE
    RAISE WARNING 'District Admin role not found. Please assign permissions manually.';
  END IF;

  -- Assign read and manage permissions to Municipal Admin
  IF role_municipal_admin_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id, created_at)
    VALUES
      (role_municipal_admin_id, perm_ward_audit_read_id, CURRENT_TIMESTAMP),
      (role_municipal_admin_id, perm_delegates_read_id, CURRENT_TIMESTAMP),
      (role_municipal_admin_id, perm_delegates_manage_id, CURRENT_TIMESTAMP),
      (role_municipal_admin_id, perm_delegates_export_id, CURRENT_TIMESTAMP)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
    
    RAISE NOTICE 'Delegates Management permissions assigned to Municipal Admin role';
  ELSE
    RAISE WARNING 'Municipal Admin role not found. Please assign permissions manually.';
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
WHERE p.category IN ('Ward Audit', 'Delegates Management')
GROUP BY p.permission_id, p.permission_name, p.description, p.category
ORDER BY p.category, p.permission_name;

-- Show which roles have delegates management permissions
SELECT 
  r.role_name,
  p.permission_name,
  p.description
FROM roles r
JOIN role_permissions rp ON r.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.permission_id
WHERE p.category IN ('Ward Audit', 'Delegates Management')
ORDER BY r.role_name, p.permission_name;

