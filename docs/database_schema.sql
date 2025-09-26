-- Membership System Database Schema
-- This file contains the complete database schema for the membership system

-- Enable foreign key constraints
SET FOREIGN_KEY_CHECKS = 1;

-- Drop tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS analytics_cache;
DROP TABLE IF EXISTS leadership_roles;
DROP TABLE IF EXISTS leadership_positions;
DROP TABLE IF EXISTS payment_transactions;
DROP TABLE IF EXISTS membership_renewals;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS system_settings;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS wards;
DROP TABLE IF EXISTS municipalities;
DROP TABLE IF EXISTS regions;
DROP TABLE IF EXISTS provinces;
DROP TABLE IF EXISTS national;

-- 1. National table
CREATE TABLE national (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(10) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Initial data
INSERT INTO national (id, name, code) VALUES (1, 'South Africa', 'ZA');

-- 2. Provinces table
CREATE TABLE provinces (
  id INT AUTO_INCREMENT PRIMARY KEY,
  national_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(10) NOT NULL UNIQUE,
  capital VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (national_id) REFERENCES national(id) ON DELETE RESTRICT,
  INDEX idx_province_name (name),
  INDEX idx_province_code (code)
);

-- 3. Regions table
CREATE TABLE regions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  province_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE RESTRICT,
  UNIQUE KEY unique_region_code_per_province (province_id, code),
  INDEX idx_region_name (name),
  INDEX idx_region_code (code)
);

-- 4. Municipalities table
CREATE TABLE municipalities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  region_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL,
  municipality_type ENUM('Metropolitan', 'District', 'Local') NOT NULL,
  description TEXT,
  total_wards INT DEFAULT 0 COMMENT 'Total number of wards in this municipality',
  represented_wards INT DEFAULT 0 COMMENT 'Number of wards with 200+ members (in good standing)',
  is_adequately_represented BOOLEAN DEFAULT FALSE COMMENT 'True if 65% or more wards are in good standing',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE RESTRICT,
  UNIQUE KEY unique_municipality_code_per_region (region_id, code),
  INDEX idx_municipality_name (name),
  INDEX idx_municipality_code (code),
  INDEX idx_municipality_type (municipality_type)
);

-- 5. Wards table
CREATE TABLE wards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  municipality_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  ward_number VARCHAR(20) NOT NULL,
  description TEXT,
  member_count INT DEFAULT 0 COMMENT 'Number of active members in this ward',
  is_in_good_standing BOOLEAN DEFAULT FALSE COMMENT 'True if ward has 200+ members',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (municipality_id) REFERENCES municipalities(id) ON DELETE RESTRICT,
  UNIQUE KEY unique_ward_number_per_municipality (municipality_id, ward_number),
  INDEX idx_ward_name (name),
  INDEX idx_ward_number (ward_number),
  INDEX idx_member_count (member_count)
);

-- 6. Members table
CREATE TABLE members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  id_number VARCHAR(13) NOT NULL UNIQUE,
  date_of_birth DATE NOT NULL,
  gender ENUM('Male', 'Female', 'Other') NOT NULL,
  email VARCHAR(255),
  cell_number VARCHAR(20),
  residential_address TEXT,
  ward_id INT NOT NULL,
  membership_number VARCHAR(20) UNIQUE,
  membership_start_date DATE NOT NULL,
  membership_expiry_date DATE,
  membership_status ENUM('Active', 'Expired', 'Suspended', 'Cancelled') NOT NULL DEFAULT 'Active',
  voter_status ENUM('Registered', 'Not Registered', 'Pending Verification') NOT NULL DEFAULT 'Not Registered',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE RESTRICT,
  INDEX idx_member_name (last_name, first_name),
  INDEX idx_member_id_number (id_number),
  INDEX idx_member_ward (ward_id),
  INDEX idx_member_status (membership_status),
  INDEX idx_member_voter_status (voter_status),
  INDEX idx_member_expiry (membership_expiry_date)
);

-- 7. Users table
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'member') NOT NULL DEFAULT 'member',
  admin_level ENUM('national', 'province', 'region', 'municipality', 'ward', 'none') DEFAULT 'none',
  province_id INT,
  region_id INT,
  municipality_id INT,
  ward_id INT,
  member_id INT,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE RESTRICT,
  FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE RESTRICT,
  FOREIGN KEY (municipality_id) REFERENCES municipalities(id) ON DELETE RESTRICT,
  FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE RESTRICT,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL,
  INDEX idx_user_email (email),
  INDEX idx_user_role (role),
  INDEX idx_user_admin_level (admin_level)
);

-- 8. System Settings table
CREATE TABLE system_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  setting_type ENUM('string', 'integer', 'float', 'boolean', 'json') NOT NULL DEFAULT 'string',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_setting_key (setting_key)
);

-- 9. Notifications table
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  member_id INT,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  notification_type ENUM('System', 'Renewal', 'Payment', 'Admin', 'Other') NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  INDEX idx_notification_user (user_id),
  INDEX idx_notification_member (member_id),
  INDEX idx_notification_type (notification_type),
  INDEX idx_notification_read (is_read)
);

-- 10. Membership Renewals table
CREATE TABLE membership_renewals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  previous_expiry_date DATE NOT NULL,
  new_expiry_date DATE NOT NULL,
  renewal_date DATE NOT NULL,
  renewal_amount DECIMAL(10, 2) NOT NULL,
  payment_status ENUM('Pending', 'Completed', 'Failed', 'Waived') NOT NULL,
  renewal_method ENUM('Online', 'Branch', 'Automatic', 'Admin') NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
  INDEX idx_renewal_member (member_id),
  INDEX idx_renewal_date (renewal_date),
  INDEX idx_renewal_status (payment_status)
);

-- 11. Payment Transactions table
CREATE TABLE payment_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  renewal_id INT,
  transaction_reference VARCHAR(100) NOT NULL UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method ENUM('Credit Card', 'Debit Card', 'EFT', 'Cash', 'Other') NOT NULL,
  payment_status ENUM('Pending', 'Completed', 'Failed', 'Refunded') NOT NULL,
  payment_date TIMESTAMP NOT NULL,
  gateway_response TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
  FOREIGN KEY (renewal_id) REFERENCES membership_renewals(id) ON DELETE SET NULL,
  INDEX idx_transaction_reference (transaction_reference),
  INDEX idx_transaction_member (member_id),
  INDEX idx_transaction_renewal (renewal_id),
  INDEX idx_transaction_status (payment_status)
);

-- 12. Leadership Positions table
CREATE TABLE leadership_positions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  position_name VARCHAR(100) NOT NULL,
  position_level ENUM('national', 'province', 'region', 'municipality', 'ward') NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_position_name_level (position_name, position_level),
  INDEX idx_position_level (position_level),
  INDEX idx_position_order (display_order)
);

-- 13. Leadership Roles table
CREATE TABLE leadership_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  position_id INT NOT NULL,
  national_id INT,
  province_id INT,
  region_id INT,
  municipality_id INT,
  ward_id INT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
  FOREIGN KEY (position_id) REFERENCES leadership_positions(id) ON DELETE RESTRICT,
  FOREIGN KEY (national_id) REFERENCES national(id) ON DELETE RESTRICT,
  FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE RESTRICT,
  FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE RESTRICT,
  FOREIGN KEY (municipality_id) REFERENCES municipalities(id) ON DELETE RESTRICT,
  FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE RESTRICT,
  INDEX idx_role_member (member_id),
  INDEX idx_role_position (position_id),
  INDEX idx_role_national (national_id),
  INDEX idx_role_province (province_id),
  INDEX idx_role_region (region_id),
  INDEX idx_role_municipality (municipality_id),
  INDEX idx_role_ward (ward_id),
  INDEX idx_role_active (is_active)
);

-- 14. Analytics Cache table
CREATE TABLE analytics_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cache_key VARCHAR(255) NOT NULL UNIQUE,
  cache_data JSON NOT NULL,
  level ENUM('national', 'province', 'region', 'municipality', 'ward') NOT NULL,
  entity_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  INDEX idx_cache_key (cache_key),
  INDEX idx_cache_level_entity (level, entity_id),
  INDEX idx_cache_expiry (expires_at)
);

-- 15. Audit Logs table
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id INT,
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_action (action),
  INDEX idx_audit_table (table_name),
  INDEX idx_audit_record (table_name, record_id),
  INDEX idx_audit_time (created_at)
);

-- Create initial leadership positions
INSERT INTO leadership_positions (position_name, position_level, display_order) VALUES
-- National positions
('President', 'national', 1),
('Deputy President', 'national', 2),
('National Chair', 'national', 3),
('Secretary General', 'national', 4),
('Deputy Secretary General', 'national', 5),
('Treasurer General', 'national', 6),
('Member of Executive', 'national', 7),

-- Province positions
('Chairperson', 'province', 1),
('Deputy Chairperson', 'province', 2),
('Secretary', 'province', 3),
('Deputy Secretary', 'province', 4),
('Treasurer', 'province', 5),
('Member of Executive', 'province', 6),

-- Region positions
('Chairperson', 'region', 1),
('Deputy Chairperson', 'region', 2),
('Secretary', 'region', 3),
('Deputy Secretary', 'region', 4),
('Treasurer', 'region', 5),
('Member of Executive', 'region', 6),

-- Municipality positions
('Chairperson', 'municipality', 1),
('Deputy Chairperson', 'municipality', 2),
('Secretary', 'municipality', 3),
('Deputy Secretary', 'municipality', 4),
('Treasurer', 'municipality', 5),
('Member of Executive', 'municipality', 6),

-- Ward positions
('Chairperson', 'ward', 1),
('Deputy Chairperson', 'ward', 2),
('Secretary', 'ward', 3),
('Deputy Secretary', 'ward', 4),
('Treasurer', 'ward', 5),
('Member of Executive', 'ward', 6);

-- System settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('membership_fee', '100.00', 'float', 'Annual membership fee in ZAR'),
('membership_duration', '12', 'integer', 'Membership duration in months'),
('renewal_reminder_days', '30,14,7,1', 'string', 'Days before expiry to send renewal reminders'),
('system_email', 'system@membership-system.org', 'string', 'System email address for notifications'),
('enable_sms_notifications', 'true', 'boolean', 'Whether to enable SMS notifications'),
('analytics_cache_duration', '86400', 'integer', 'Duration in seconds to cache analytics data');

-- Create triggers for member count maintenance

-- Trigger for incrementing ward member count when a new member is added
DELIMITER //
CREATE TRIGGER after_member_insert
AFTER INSERT ON members
FOR EACH ROW
BEGIN
  -- Update the ward's member count
  UPDATE wards 
  SET member_count = member_count + 1
  WHERE id = NEW.ward_id;
END//
DELIMITER ;

-- Trigger for updating ward member count when a member changes wards
DELIMITER //
CREATE TRIGGER after_member_update
AFTER UPDATE ON members
FOR EACH ROW
BEGIN
  -- If ward has changed
  IF NEW.ward_id != OLD.ward_id THEN
    -- Decrement the old ward's count
    UPDATE wards 
    SET member_count = member_count - 1
    WHERE id = OLD.ward_id;
    
    -- Increment the new ward's count
    UPDATE wards 
    SET member_count = member_count + 1
    WHERE id = NEW.ward_id;
  END IF;
END//
DELIMITER ;

-- Trigger for decrementing ward member count when a member is deleted
DELIMITER //
CREATE TRIGGER after_member_delete
AFTER DELETE ON members
FOR EACH ROW
BEGIN
  -- Update the ward's member count
  UPDATE wards 
  SET member_count = member_count - 1
  WHERE id = OLD.ward_id;
END//
DELIMITER ;

-- Create views for common analytics queries

-- View for membership statistics by province
CREATE VIEW view_province_stats AS
SELECT 
  p.id AS province_id,
  p.name AS province_name,
  COUNT(m.id) AS total_members,
  SUM(CASE WHEN m.membership_status = 'Active' THEN 1 ELSE 0 END) AS active_members,
  SUM(CASE WHEN m.membership_status = 'Expired' THEN 1 ELSE 0 END) AS expired_members,
  SUM(CASE WHEN m.voter_status = 'Registered' THEN 1 ELSE 0 END) AS registered_voters
FROM 
  provinces p
LEFT JOIN 
  regions r ON p.id = r.province_id
LEFT JOIN 
  municipalities mu ON r.id = mu.region_id
LEFT JOIN 
  wards w ON mu.id = w.municipality_id
LEFT JOIN 
  members m ON w.id = m.ward_id
GROUP BY 
  p.id, p.name;

-- View for membership statistics by region
CREATE VIEW view_region_stats AS
SELECT 
  r.id AS region_id,
  r.name AS region_name,
  p.id AS province_id,
  p.name AS province_name,
  COUNT(m.id) AS total_members,
  SUM(CASE WHEN m.membership_status = 'Active' THEN 1 ELSE 0 END) AS active_members,
  SUM(CASE WHEN m.membership_status = 'Expired' THEN 1 ELSE 0 END) AS expired_members,
  SUM(CASE WHEN m.voter_status = 'Registered' THEN 1 ELSE 0 END) AS registered_voters
FROM 
  regions r
JOIN 
  provinces p ON r.province_id = p.id
LEFT JOIN 
  municipalities mu ON r.id = mu.region_id
LEFT JOIN 
  wards w ON mu.id = w.municipality_id
LEFT JOIN 
  members m ON w.id = m.ward_id
GROUP BY 
  r.id, r.name, p.id, p.name;

-- View for membership statistics by municipality
CREATE VIEW view_municipality_stats AS
SELECT 
  mu.id AS municipality_id,
  mu.name AS municipality_name,
  r.id AS region_id,
  r.name AS region_name,
  p.id AS province_id,
  p.name AS province_name,
  COUNT(m.id) AS total_members,
  SUM(CASE WHEN m.membership_status = 'Active' THEN 1 ELSE 0 END) AS active_members,
  SUM(CASE WHEN m.membership_status = 'Expired' THEN 1 ELSE 0 END) AS expired_members,
  SUM(CASE WHEN m.voter_status = 'Registered' THEN 1 ELSE 0 END) AS registered_voters
FROM 
  municipalities mu
JOIN 
  regions r ON mu.region_id = r.id
JOIN 
  provinces p ON r.province_id = p.id
LEFT JOIN 
  wards w ON mu.id = w.municipality_id
LEFT JOIN 
  members m ON w.id = m.ward_id
GROUP BY 
  mu.id, mu.name, r.id, r.name, p.id, p.name;

-- View for membership statistics by ward
CREATE VIEW view_ward_stats AS
SELECT 
  w.id AS ward_id,
  w.name AS ward_name,
  w.ward_number,
  mu.id AS municipality_id,
  mu.name AS municipality_name,
  r.id AS region_id,
  r.name AS region_name,
  p.id AS province_id,
  p.name AS province_name,
  COUNT(m.id) AS total_members,
  SUM(CASE WHEN m.membership_status = 'Active' THEN 1 ELSE 0 END) AS active_members,
  SUM(CASE WHEN m.membership_status = 'Expired' THEN 1 ELSE 0 END) AS expired_members,
  SUM(CASE WHEN m.voter_status = 'Registered' THEN 1 ELSE 0 END) AS registered_voters
FROM 
  wards w
JOIN 
  municipalities mu ON w.municipality_id = mu.id
JOIN 
  regions r ON mu.region_id = r.id
JOIN 
  provinces p ON r.province_id = p.id
LEFT JOIN 
  members m ON w.id = m.ward_id
GROUP BY 
  w.id, w.name, w.ward_number, mu.id, mu.name, r.id, r.name, p.id, p.name;

-- View for leadership structure
CREATE VIEW view_leadership_structure AS
SELECT 
  lr.id AS role_id,
  lp.position_name,
  lp.position_level,
  m.id AS member_id,
  m.first_name,
  m.last_name,
  m.id_number,
  lr.start_date,
  lr.end_date,
  lr.is_active,
  n.id AS national_id,
  n.name AS national_name,
  p.id AS province_id,
  p.name AS province_name,
  r.id AS region_id,
  r.name AS region_name,
  mu.id AS municipality_id,
  mu.name AS municipality_name,
  w.id AS ward_id,
  w.name AS ward_name
FROM 
  leadership_roles lr
JOIN 
  leadership_positions lp ON lr.position_id = lp.id
JOIN 
  members m ON lr.member_id = m.id
LEFT JOIN 
  national n ON lr.national_id = n.id
LEFT JOIN 
  provinces p ON lr.province_id = p.id
LEFT JOIN 
  regions r ON lr.region_id = r.id
LEFT JOIN 
  municipalities mu ON lr.municipality_id = mu.id
LEFT JOIN 
  wards w ON lr.ward_id = w.id;

-- Commit the transaction
COMMIT;
