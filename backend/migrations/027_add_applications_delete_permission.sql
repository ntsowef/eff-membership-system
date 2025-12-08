-- Add applications.delete permission for National Admin and Super Admin
-- This allows authorized administrators to delete (soft delete) applications
-- PostgreSQL version

-- Start transaction
BEGIN;

-- 1. Create the applications.delete permission (using ON CONFLICT for idempotency)
INSERT INTO permissions (permission_name, permission_code, description, resource, action)
VALUES ('Delete Applications', 'APPLICATIONS_DELETE', 'Delete membership applications', 'applications', 'delete')
ON CONFLICT (permission_name) DO NOTHING;

-- 2. Assign applications.delete permission to Super Admin role (if exists)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r, permissions p
WHERE r.role_name = 'super_admin'
  AND p.permission_code = 'APPLICATIONS_DELETE'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.role_id AND rp.permission_id = p.permission_id
  );

-- 3. Assign applications.delete permission to National Admin role (if exists)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r, permissions p
WHERE r.role_name = 'national_admin'
  AND p.permission_code = 'APPLICATIONS_DELETE'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.role_id AND rp.permission_id = p.permission_id
  );

-- Commit transaction
COMMIT;

-- Verify the permission was created
SELECT
  p.permission_id,
  p.permission_name,
  p.permission_code,
  p.description,
  p.resource,
  p.action,
  STRING_AGG(r.role_name, ', ') as assigned_roles
FROM permissions p
LEFT JOIN role_permissions rp ON p.permission_id = rp.permission_id
LEFT JOIN roles r ON rp.role_id = r.role_id
WHERE p.permission_code = 'APPLICATIONS_DELETE'
GROUP BY p.permission_id, p.permission_name, p.permission_code, p.description, p.resource, p.action;

