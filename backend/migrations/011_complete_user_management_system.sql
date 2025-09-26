-- Complete User Management System Migration
-- This migration ensures all user management tables are properly set up
-- and creates any missing components for the hierarchical admin system

START TRANSACTION;

-- 1. Ensure users table has all required fields for the new system
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role_id INT NULL AFTER password,
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE AFTER role_id,
ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(255) NULL AFTER mfa_enabled,
ADD COLUMN IF NOT EXISTS province_code VARCHAR(10) NULL AFTER ward_id,
ADD COLUMN IF NOT EXISTS district_code VARCHAR(10) NULL AFTER province_code,
ADD COLUMN IF NOT EXISTS municipal_code VARCHAR(10) NULL AFTER district_code,
ADD COLUMN IF NOT EXISTS ward_code VARCHAR(10) NULL AFTER municipal_code,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP NULL AFTER mfa_secret,
ADD COLUMN IF NOT EXISTS remember_token VARCHAR(100) NULL AFTER email_verified_at;

-- 2. Add foreign key for role_id if it doesn't exist
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE 
                  WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME = 'users' 
                  AND CONSTRAINT_NAME = 'fk_users_role_id');

SET @sql = IF(@fk_exists = 0, 
    'ALTER TABLE users ADD CONSTRAINT fk_users_role_id FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL',
    'SELECT "Foreign key already exists" as message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Create admin_user_creation_log table for tracking admin creation
CREATE TABLE IF NOT EXISTS admin_user_creation_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_user_id INT NOT NULL,
  created_by_user_id INT NOT NULL,
  admin_level ENUM('national') NOT NULL,
  geographic_scope JSON NULL, -- Store province_code, district_code, etc.
  permissions_granted JSON NULL,
  creation_reason TEXT NULL,
  approved_by INT NULL,
  approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP NULL,
  
  -- Foreign keys
  FOREIGN KEY (created_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_admin_creation_log_created_user (created_user_id),
  INDEX idx_admin_creation_log_created_by (created_by_user_id),
  INDEX idx_admin_creation_log_level (admin_level),
  INDEX idx_admin_creation_log_status (approval_status),
  INDEX idx_admin_creation_log_created_at (created_at)
);

-- 4. Create user_role_history table for tracking role changes
CREATE TABLE IF NOT EXISTS user_role_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  old_role_id INT NULL,
  new_role_id INT NULL,
  old_admin_level ENUM('national', 'province', 'district', 'municipality', 'ward', 'none') NULL,
  new_admin_level ENUM('national', 'province', 'district', 'municipality', 'ward', 'none') NULL,
  changed_by INT NOT NULL,
  change_reason TEXT NULL,
  effective_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (old_role_id) REFERENCES roles(id) ON DELETE SET NULL,
  FOREIGN KEY (new_role_id) REFERENCES roles(id) ON DELETE SET NULL,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_user_role_history_user (user_id),
  INDEX idx_user_role_history_changed_by (changed_by),
  INDEX idx_user_role_history_effective_date (effective_date)
);



-- 6. Create concurrent_session_limits table for managing concurrent logins
CREATE TABLE IF NOT EXISTS concurrent_session_limits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  admin_level ENUM('national', 'province', 'district', 'municipality', 'ward', 'none') NOT NULL,
  max_concurrent_sessions INT DEFAULT 3,
  session_timeout_minutes INT DEFAULT 1440, -- 24 hours
  force_single_session BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  
  -- Unique constraint
  UNIQUE KEY unique_role_admin_level (role_id, admin_level),
  
  -- Indexes
  INDEX idx_concurrent_session_limits_role (role_id),
  INDEX idx_concurrent_session_limits_admin_level (admin_level)
);

-- 7. Insert default concurrent session limits
INSERT IGNORE INTO concurrent_session_limits (role_id, admin_level, max_concurrent_sessions, session_timeout_minutes, force_single_session) 
SELECT r.id, 'national', 5, 480, FALSE FROM roles r WHERE r.name = 'super_admin'
UNION ALL
SELECT r.id, 'national', 3, 480, FALSE FROM roles r WHERE r.name = 'national_admin'
UNION ALL
SELECT r.id, 'province', 3, 720, FALSE FROM roles r WHERE r.name = 'provincial_admin'
UNION ALL
SELECT r.id, 'district', 2, 720, FALSE FROM roles r WHERE r.name = 'regional_admin'
UNION ALL
SELECT r.id, 'municipality', 2, 720, FALSE FROM roles r WHERE r.name = 'municipal_admin'
UNION ALL
SELECT r.id, 'ward', 2, 720, FALSE FROM roles r WHERE r.name = 'ward_admin'
UNION ALL
SELECT r.id, 'none', 1, 1440, FALSE FROM roles r WHERE r.name = 'member';

-- 8. Create user_creation_workflow table for managing user creation approvals
CREATE TABLE IF NOT EXISTS user_creation_workflow (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id VARCHAR(50) NOT NULL UNIQUE,
  requested_by INT NOT NULL,
  user_data JSON NOT NULL, -- Store the complete user creation data
  admin_level ENUM('national') NOT NULL,
  justification TEXT NULL,
  status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
  reviewed_by INT NULL,
  reviewed_at TIMESTAMP NULL,
  review_notes TEXT NULL,
  created_user_id INT NULL, -- Set when user is actually created
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_user_id) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_user_creation_workflow_requested_by (requested_by),
  INDEX idx_user_creation_workflow_status (status),
  INDEX idx_user_creation_workflow_admin_level (admin_level),
  INDEX idx_user_creation_workflow_created_at (created_at)
);

-- 9. Create system_configuration table for user management settings
CREATE TABLE IF NOT EXISTS system_configuration (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value JSON NOT NULL,
  description TEXT NULL,
  category ENUM('authentication', 'authorization', 'security', 'user_management', 'system') DEFAULT 'system',
  is_encrypted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_system_configuration_category (category),
  INDEX idx_system_configuration_key (config_key)
);

-- 10. Insert default system configuration
INSERT IGNORE INTO system_configuration (config_key, config_value, description, category) VALUES
('max_failed_login_attempts', '5', 'Maximum failed login attempts before account lockout', 'security'),
('account_lockout_duration_minutes', '30', 'Duration in minutes for account lockout', 'security'),
('password_min_length', '8', 'Minimum password length requirement', 'security'),
('password_require_special_chars', 'true', 'Require special characters in passwords', 'security'),
('session_timeout_minutes', '1440', 'Default session timeout in minutes (24 hours)', 'authentication'),
('mfa_required_for_admins', 'true', 'Require MFA for admin users', 'security'),
('max_concurrent_sessions_per_user', '3', 'Maximum concurrent sessions per user', 'authentication'),
('user_creation_requires_approval', 'false', 'Whether user creation requires approval workflow', 'user_management'),
('admin_creation_requires_approval', 'true', 'Whether admin creation requires approval workflow', 'user_management'),
('geographic_boundary_enforcement', 'true', 'Enforce geographic boundary restrictions', 'authorization');

COMMIT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_admin_level ON users(admin_level);
CREATE INDEX IF NOT EXISTS idx_users_province_code ON users(province_code);
CREATE INDEX IF NOT EXISTS idx_users_district_code ON users(district_code);
CREATE INDEX IF NOT EXISTS idx_users_municipal_code ON users(municipal_code);
CREATE INDEX IF NOT EXISTS idx_users_ward_code ON users(ward_code);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified_at);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_users_mfa_enabled ON users(mfa_enabled);

-- Log migration completion
INSERT INTO migration_history (migration_name, executed_at, status) 
VALUES ('011_complete_user_management_system', NOW(), 'completed')
ON DUPLICATE KEY UPDATE executed_at = NOW(), status = 'completed';
