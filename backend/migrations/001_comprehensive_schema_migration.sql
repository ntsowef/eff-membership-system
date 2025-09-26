-- Comprehensive Database Schema Migration
-- This migration adds missing tables according to PRD requirements
-- Run this after the existing database_schema.sql

-- Enable foreign key constraints
SET FOREIGN_KEY_CHECKS = 1;

-- Start transaction
START TRANSACTION;

-- 0. Users table already exists, skip creation

-- 1. Create Roles table (missing from current schema)
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_role_name (name)
);

-- Insert default roles
INSERT IGNORE INTO roles (name, description) VALUES
('super_admin', 'System Administrator with full access'),
('national_admin', 'National level administrator'),
('provincial_admin', 'Provincial level administrator'),
('regional_admin', 'Regional level administrator'),
('municipal_admin', 'Municipal level administrator'),
('ward_admin', 'Ward level administrator'),
('member', 'Regular member with basic access');

-- 2. Create Permissions table (missing from current schema)
CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_permission_name (name),
  INDEX idx_permission_resource (resource),
  INDEX idx_permission_action (action)
);

-- Insert basic permissions
INSERT IGNORE INTO permissions (name, description, resource, action) VALUES
('members.create', 'Create new members', 'members', 'create'),
('members.read', 'View member information', 'members', 'read'),
('members.update', 'Update member information', 'members', 'update'),
('members.delete', 'Delete members', 'members', 'delete'),
('applications.review', 'Review membership applications', 'applications', 'review'),
('applications.approve', 'Approve membership applications', 'applications', 'approve'),
('applications.reject', 'Reject membership applications', 'applications', 'reject'),
('users.manage', 'Manage user accounts', 'users', 'manage'),
('analytics.view', 'View analytics and reports', 'analytics', 'view'),
('system.configure', 'Configure system settings', 'system', 'configure');

-- 3. Create RolePermissions junction table (missing from current schema)
CREATE TABLE IF NOT EXISTS role_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_role_permission (role_id, permission_id),
  INDEX idx_role_permissions_role (role_id),
  INDEX idx_role_permissions_permission (permission_id)
);

-- 4. Create MembershipApplications table (missing from current schema)
CREATE TABLE IF NOT EXISTS membership_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_number VARCHAR(20) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  id_number VARCHAR(13) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender ENUM('Male', 'Female', 'Other', 'Prefer not to say') NOT NULL,
  email VARCHAR(255),
  cell_number VARCHAR(20) NOT NULL,
  alternative_number VARCHAR(20),
  residential_address TEXT NOT NULL,
  postal_address TEXT,
  ward_code VARCHAR(20) NOT NULL,
  application_type ENUM('New', 'Renewal', 'Transfer') NOT NULL DEFAULT 'New',
  status ENUM('Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected') NOT NULL DEFAULT 'Draft',
  submitted_at TIMESTAMP NULL,
  reviewed_at TIMESTAMP NULL,
  reviewed_by INT NULL,
  rejection_reason TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (ward_code) REFERENCES wards(ward_code) ON DELETE RESTRICT,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_application_number (application_number),
  INDEX idx_application_id_number (id_number),
  INDEX idx_application_status (status),
  INDEX idx_application_ward (ward_code),
  INDEX idx_application_submitted (submitted_at),
  INDEX idx_application_reviewed (reviewed_at)
);

-- 5. Create Documents table (missing from current schema)
CREATE TABLE IF NOT EXISTS documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NULL,
  application_id INT NULL,
  document_type ENUM('ID Copy', 'Proof of Address', 'Profile Photo', 'Supporting Document') NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  status ENUM('Active', 'Archived', 'Deleted') NOT NULL DEFAULT 'Active',
  uploaded_by INT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  FOREIGN KEY (application_id) REFERENCES membership_applications(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_document_member (member_id),
  INDEX idx_document_application (application_id),
  INDEX idx_document_type (document_type),
  INDEX idx_document_status (status),
  INDEX idx_document_uploaded (uploaded_at)
);

-- 6. Create VoterVerifications table (missing from current schema)
CREATE TABLE IF NOT EXISTS voter_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  verification_method ENUM('API', 'Manual', 'Document') NOT NULL,
  status ENUM('Registered', 'Not Registered', 'Pending', 'Error') NOT NULL,
  voter_registration_number VARCHAR(50),
  voting_district VARCHAR(100),
  verification_date TIMESTAMP NOT NULL,
  verified_by INT NULL,
  next_verification_date DATE NULL,
  verification_notes TEXT,
  api_response JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_voter_verification_member (member_id),
  INDEX idx_voter_verification_status (status),
  INDEX idx_voter_verification_date (verification_date),
  INDEX idx_voter_verification_next (next_verification_date)
);

-- 7. Foreign key constraints likely already exist, skip

-- 8. Create Notifications table (missing from current schema)
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  member_id INT NULL,
  recipient_type ENUM('User', 'Member', 'Admin') NOT NULL DEFAULT 'User',
  notification_type ENUM('System', 'Renewal', 'Payment', 'Admin', 'Application Status', 'Voter Verification', 'Meeting', 'Leadership', 'Other') NOT NULL,
  delivery_channel ENUM('Email', 'SMS', 'In-App', 'Push') NOT NULL DEFAULT 'Email',
  delivery_status ENUM('Pending', 'Sent', 'Failed', 'Delivered') NOT NULL DEFAULT 'Pending',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMP NULL,
  read_at TIMESTAMP NULL,
  template_id VARCHAR(50) NULL,
  template_data JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  INDEX idx_notification_user (user_id),
  INDEX idx_notification_member (member_id),
  INDEX idx_notification_type (notification_type),
  INDEX idx_notification_status (delivery_status),
  INDEX idx_notification_created (created_at)
);

-- 9. Create AuditLogs table (missing from current schema)
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  session_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_action (action),
  INDEX idx_audit_entity (entity_type, entity_id),
  INDEX idx_audit_created (created_at)
);

-- 10. Update Members table to align with PRD specifications
ALTER TABLE members
ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100) NULL AFTER surname,
ADD COLUMN IF NOT EXISTS alternative_contact VARCHAR(20) NULL AFTER cell_number,
ADD COLUMN IF NOT EXISTS postal_address TEXT NULL AFTER residential_address,
ADD COLUMN IF NOT EXISTS voter_verified_at TIMESTAMP NULL AFTER voter_registration_date,
ADD COLUMN IF NOT EXISTS membership_type ENUM('Regular', 'Student', 'Senior', 'Honorary') DEFAULT 'Regular',
ADD COLUMN IF NOT EXISTS application_id INT NULL;

-- Add foreign key for application_id if it doesn't exist
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
               WHERE TABLE_NAME = 'members' AND COLUMN_NAME = 'application_id' 
               AND CONSTRAINT_NAME != 'PRIMARY') = 0,
              'ALTER TABLE members ADD CONSTRAINT fk_members_application FOREIGN KEY (application_id) REFERENCES membership_applications(id) ON DELETE SET NULL',
              'SELECT "Foreign key already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- membership_status column doesn't exist in members table, skip

-- voter_status column doesn't exist in members table (uses voter_status_id instead), skip

-- Commit the transaction
COMMIT;

-- Display completion message
SELECT 'Comprehensive database schema migration completed successfully!' as message;
