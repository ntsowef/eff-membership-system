-- User Management and Roles Tables for EFF Membership Management System
-- PostgreSQL Version
-- Created: 2025-01-23
-- Purpose: User accounts, roles, permissions, and authentication

-- Start transaction
BEGIN;

-- 1. Roles table (system roles)
CREATE TABLE IF NOT EXISTS roles (
  role_id SERIAL PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL UNIQUE,
  role_code VARCHAR(20) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default roles
INSERT INTO roles (role_name, role_code, description) VALUES
('Super Administrator', 'SUPER_ADMIN', 'System Administrator with full access'),
('National Administrator', 'NATIONAL_ADMIN', 'National level administrator'),
('Provincial Administrator', 'PROVINCIAL_ADMIN', 'Provincial level administrator'),
('District Administrator', 'DISTRICT_ADMIN', 'District level administrator'),
('Municipal Administrator', 'MUNICIPAL_ADMIN', 'Municipal level administrator'),
('Ward Administrator', 'WARD_ADMIN', 'Ward level administrator'),
('Member', 'MEMBER', 'Regular member with basic access'),
('Guest', 'GUEST', 'Guest user with limited access')
ON CONFLICT (role_name) DO NOTHING;

-- 2. Permissions table (system permissions)
CREATE TABLE IF NOT EXISTS permissions (
  permission_id SERIAL PRIMARY KEY,
  permission_name VARCHAR(100) NOT NULL UNIQUE,
  permission_code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert basic permissions
INSERT INTO permissions (permission_name, permission_code, description, resource, action) VALUES
-- Member permissions
('Create Members', 'MEMBERS_CREATE', 'Create new members', 'members', 'create'),
('View Members', 'MEMBERS_READ', 'View member information', 'members', 'read'),
('Update Members', 'MEMBERS_UPDATE', 'Update member information', 'members', 'update'),
('Delete Members', 'MEMBERS_DELETE', 'Delete members', 'members', 'delete'),
('Export Members', 'MEMBERS_EXPORT', 'Export member data', 'members', 'export'),

-- Application permissions
('Review Applications', 'APPLICATIONS_REVIEW', 'Review membership applications', 'applications', 'review'),
('Approve Applications', 'APPLICATIONS_APPROVE', 'Approve membership applications', 'applications', 'approve'),
('Reject Applications', 'APPLICATIONS_REJECT', 'Reject membership applications', 'applications', 'reject'),

-- User management permissions
('Manage Users', 'USERS_MANAGE', 'Manage user accounts', 'users', 'manage'),
('View Users', 'USERS_READ', 'View user information', 'users', 'read'),
('Create Users', 'USERS_CREATE', 'Create new user accounts', 'users', 'create'),
('Update Users', 'USERS_UPDATE', 'Update user accounts', 'users', 'update'),
('Delete Users', 'USERS_DELETE', 'Delete user accounts', 'users', 'delete'),

-- Analytics and reporting permissions
('View Analytics', 'ANALYTICS_VIEW', 'View analytics and reports', 'analytics', 'view'),
('Export Reports', 'REPORTS_EXPORT', 'Export system reports', 'reports', 'export'),

-- System configuration permissions
('Configure System', 'SYSTEM_CONFIGURE', 'Configure system settings', 'system', 'configure'),
('Manage Roles', 'ROLES_MANAGE', 'Manage roles and permissions', 'roles', 'manage'),

-- Financial permissions
('View Payments', 'PAYMENTS_VIEW', 'View payment information', 'payments', 'view'),
('Process Payments', 'PAYMENTS_PROCESS', 'Process payments', 'payments', 'process'),
('Manage Renewals', 'RENEWALS_MANAGE', 'Manage membership renewals', 'renewals', 'manage'),

-- Leadership permissions
('Manage Leadership', 'LEADERSHIP_MANAGE', 'Manage leadership appointments', 'leadership', 'manage'),
('View Leadership', 'LEADERSHIP_VIEW', 'View leadership information', 'leadership', 'view')
ON CONFLICT (permission_name) DO NOTHING;

-- 3. Role permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  role_permission_id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role_id, permission_id)
);

-- 4. Users table (system user accounts)
CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  password_changed_at TIMESTAMP,
  
  -- Role and access level
  role_id INTEGER REFERENCES roles(role_id),
  admin_level VARCHAR(20) CHECK (admin_level IN ('national', 'province', 'district', 'municipality', 'ward')),
  
  -- Geographic assignment for admin users
  province_code VARCHAR(10) REFERENCES provinces(province_code),
  district_code VARCHAR(20) REFERENCES districts(district_code),
  municipal_code VARCHAR(20) REFERENCES municipalities(municipality_code),
  ward_code VARCHAR(20) REFERENCES wards(ward_code),
  
  -- Member association
  member_id INTEGER REFERENCES members(member_id),
  
  -- Authentication and security
  email_verified_at TIMESTAMP,
  remember_token VARCHAR(100),
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  locked_at TIMESTAMP,
  
  -- Multi-factor authentication
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret VARCHAR(255),
  
  -- Account status
  is_active BOOLEAN DEFAULT TRUE,
  account_locked BOOLEAN DEFAULT FALSE,
  
  -- Login tracking
  last_login_at TIMESTAMP,
  last_login_ip VARCHAR(45),
  
  -- Audit fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. User sessions table (session management)
CREATE TABLE IF NOT EXISTS user_sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  payload TEXT,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Audit logs table (system audit trail)
CREATE TABLE IF NOT EXISTS audit_logs (
  audit_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  session_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Notifications table (system notifications)
CREATE TABLE IF NOT EXISTS notifications (
  notification_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  member_id INTEGER REFERENCES members(member_id) ON DELETE CASCADE,
  
  -- Notification details
  recipient_type VARCHAR(20) NOT NULL DEFAULT 'User' CHECK (recipient_type IN ('User', 'Member', 'Admin')),
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('System', 'Renewal', 'Payment', 'Admin', 'Application Status', 'Voter Verification', 'Meeting', 'Leadership', 'Other')),
  delivery_channel VARCHAR(20) NOT NULL DEFAULT 'Email' CHECK (delivery_channel IN ('Email', 'SMS', 'In-App', 'Push')),
  delivery_status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (delivery_status IN ('Pending', 'Sent', 'Failed', 'Delivered')),
  
  -- Content
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  -- Delivery tracking
  sent_at TIMESTAMP,
  read_at TIMESTAMP,
  
  -- Template information
  template_id VARCHAR(50),
  template_data JSONB,
  
  -- Audit fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_roles_active ON roles(is_active);
CREATE INDEX IF NOT EXISTS idx_roles_code ON roles(role_code);

CREATE INDEX IF NOT EXISTS idx_permissions_active ON permissions(is_active);
CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(permission_code);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_member ON users(member_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_admin_level ON users(admin_level);
CREATE INDEX IF NOT EXISTS idx_users_province ON users(province_code);
CREATE INDEX IF NOT EXISTS idx_users_district ON users(district_code);
CREATE INDEX IF NOT EXISTS idx_users_municipal ON users(municipal_code);
CREATE INDEX IF NOT EXISTS idx_users_ward ON users(ward_code);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_activity ON user_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_member ON notifications(member_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- Create triggers to update updated_at timestamps
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Display completion message
SELECT 'User management and roles tables created successfully!' as message;
