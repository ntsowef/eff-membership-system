-- =====================================================
-- Grant Self Data Management Permissions to Provincial Admin
-- =====================================================
-- This migration grants all self_data_management permissions
-- to Provincial Administrator role
-- =====================================================

BEGIN;

-- Get role and permission IDs
DO $$
DECLARE
  role_provincial_admin_id INTEGER;
  perm_read_id INTEGER;
  perm_write_id INTEGER;
  perm_delete_id INTEGER;
BEGIN
  -- Get Provincial Administrator role ID
  SELECT role_id INTO role_provincial_admin_id 
  FROM roles 
  WHERE role_name = 'Provincial Administrator';
  
  -- Get permission IDs
  SELECT permission_id INTO perm_read_id 
  FROM permissions 
  WHERE permission_name = 'self_data_management.read';
  
  SELECT permission_id INTO perm_write_id 
  FROM permissions 
  WHERE permission_name = 'self_data_management.write';
  
  SELECT permission_id INTO perm_delete_id 
  FROM permissions 
  WHERE permission_name = 'self_data_management.delete';
  
  -- Check if role exists
  IF role_provincial_admin_id IS NULL THEN
    RAISE WARNING 'Provincial Administrator role not found!';
    RETURN;
  END IF;
  
  -- Check if permissions exist
  IF perm_read_id IS NULL THEN
    RAISE WARNING 'self_data_management.read permission not found!';
  END IF;
  
  IF perm_write_id IS NULL THEN
    RAISE WARNING 'self_data_management.write permission not found!';
  END IF;
  
  IF perm_delete_id IS NULL THEN
    RAISE WARNING 'self_data_management.delete permission not found!';
  END IF;
  
  -- Grant read permission
  IF perm_read_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id, created_at)
    VALUES (role_provincial_admin_id, perm_read_id, CURRENT_TIMESTAMP)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
    
    RAISE NOTICE '✓ Granted self_data_management.read to Provincial Administrator';
  END IF;
  
  -- Grant write permission
  IF perm_write_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id, created_at)
    VALUES (role_provincial_admin_id, perm_write_id, CURRENT_TIMESTAMP)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
    
    RAISE NOTICE '✓ Granted self_data_management.write to Provincial Administrator';
  END IF;
  
  -- Grant delete permission
  IF perm_delete_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id, created_at)
    VALUES (role_provincial_admin_id, perm_delete_id, CURRENT_TIMESTAMP)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
    
    RAISE NOTICE '✓ Granted self_data_management.delete to Provincial Administrator';
  END IF;
  
  RAISE NOTICE '✅ Successfully granted all Self Data Management permissions to Provincial Administrator';
END $$;

-- Verify the permissions were granted
SELECT 
  r.role_name,
  p.permission_name,
  p.description
FROM roles r
JOIN role_permissions rp ON r.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.permission_id
WHERE r.role_name = 'Provincial Administrator'
  AND p.permission_name LIKE 'self_data_management%'
ORDER BY p.permission_name;

COMMIT;

