# Membership System Database Schema

This document outlines the complete database schema for the membership system, including tables, relationships, indexes, and constraints.

## Schema Overview

The database follows the hierarchical structure of the organization:
- National → Province → Region → Municipality → Ward
- Members belong to wards and have associated user accounts
- Administrators can exist at different hierarchical levels

## Tables

### 1. National

```sql
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
```

### 2. Provinces

```sql
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
```

### 3. Regions

```sql
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
```

### 4. Municipalities

```sql
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
```

### 5. Wards

```sql
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
```

### 6. Members

```sql
CREATE TABLE members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  id_number VARCHAR(13) NOT NULL UNIQUE,
  gender ENUM('Male', 'Female', 'Other', 'Prefer not to say') NOT NULL,
  date_of_birth DATE NOT NULL,
  email VARCHAR(255),
  contact_number VARCHAR(20) NOT NULL,
  alternative_contact VARCHAR(20),
  residential_address TEXT NOT NULL,
  postal_address TEXT,
  province_id INT NOT NULL,
  region_id INT NOT NULL,
  municipality_id INT NOT NULL,
  ward_id INT NOT NULL,
  voting_district_name VARCHAR(100),
  voting_district_id VARCHAR(20),
  membership_number VARCHAR(20) UNIQUE,
  membership_start_date DATE NOT NULL,
  membership_expiry_date DATE NOT NULL,
  membership_status ENUM('Active', 'Inactive', 'Suspended', 'Expired') DEFAULT 'Active',
  voter_status ENUM('Registered', 'Not Registered', 'Pending Verification') DEFAULT 'Pending Verification',
  branch VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE RESTRICT,
  FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE RESTRICT,
  FOREIGN KEY (municipality_id) REFERENCES municipalities(id) ON DELETE RESTRICT,
  FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE RESTRICT,
  INDEX idx_member_id_number (id_number),
  INDEX idx_member_name (last_name, first_name),
  INDEX idx_member_email (email),
  INDEX idx_member_contact (contact_number),
  INDEX idx_member_membership_number (membership_number),
  INDEX idx_member_status (membership_status),
  INDEX idx_member_expiry (membership_expiry_date),
  INDEX idx_member_voter_status (voter_status),
  INDEX idx_member_voting_district (voting_district_id)
);
```

### 7. Users

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'member') NOT NULL DEFAULT 'member',
  admin_level ENUM('national', 'province', 'region', 'municipality', 'ward', 'none') DEFAULT 'none',
  province_id INT,
  region_id INT,
  municipality_id INT,
  ward_id INT,
  member_id INT UNIQUE,
  email_verified_at TIMESTAMP NULL,
  last_login TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  remember_token VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE SET NULL,
  FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE SET NULL,
  FOREIGN KEY (municipality_id) REFERENCES municipalities(id) ON DELETE SET NULL,
  FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE SET NULL,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL,
  INDEX idx_user_email (email),
  INDEX idx_user_role (role),
  INDEX idx_user_admin_level (admin_level),
  INDEX idx_user_member (member_id)
);
```

### 8. Membership Payments

```sql
CREATE TABLE membership_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method ENUM('Cash', 'Bank Transfer', 'Credit Card', 'Debit Card', 'Mobile Money', 'Other') NOT NULL,
  reference_number VARCHAR(50),
  receipt_number VARCHAR(50),
  payment_status ENUM('Pending', 'Completed', 'Failed', 'Refunded') DEFAULT 'Pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
  INDEX idx_payment_member (member_id),
  INDEX idx_payment_date (payment_date),
  INDEX idx_payment_status (payment_status),
  INDEX idx_payment_reference (reference_number)
);
```

### 9. Voter Verification

```sql
CREATE TABLE voter_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  id_number VARCHAR(13) NOT NULL,
  verification_date TIMESTAMP NOT NULL,
  verification_status ENUM('Verified', 'Not Verified', 'Pending', 'Error') NOT NULL,
  verification_method ENUM('Manual', 'API', 'Batch') NOT NULL,
  verified_by INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_verification_id_number (id_number),
  INDEX idx_verification_status (verification_status),
  INDEX idx_verification_date (verification_date)
);
```

### 10. System Settings

```sql
CREATE TABLE system_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  setting_type ENUM('string', 'integer', 'float', 'boolean', 'json') NOT NULL DEFAULT 'string',
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_setting_key (setting_key),
  INDEX idx_setting_public (is_public)
);

-- Initial system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) 
VALUES 
('membership_fee', '100', 'float', 'Annual membership fee amount', true),
('membership_duration', '12', 'integer', 'Membership duration in months', true),
('email_notifications', 'true', 'boolean', 'Enable email notifications', false),
('sms_notifications', 'true', 'boolean', 'Enable SMS notifications', false),
('maintenance_mode', 'false', 'boolean', 'System maintenance mode', true),
('system_version', '1.0.0', 'string', 'Current system version', true);
```

### 11. Leadership Roles

```sql
CREATE TABLE leadership_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  level ENUM('national', 'province', 'region', 'municipality', 'ward') NOT NULL,
  structure_name ENUM('CCT', 'NEC', 'PEC', 'PCT', 'REC', 'RCT', 'SRCT', 'BEC', 'BCT') NOT NULL,
  position ENUM('chairperson', 'deputy_chairperson', 'secretary', 'deputy_secretary', 'treasurer', 'organizer', 'spokesperson', 'member') NOT NULL,
  entity_id INT NULL,
  start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMP NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  UNIQUE KEY uk_active_position (level, structure_name, position, entity_id, is_active),
  INDEX idx_leadership_member (member_id),
  INDEX idx_leadership_level_entity (level, entity_id),
  INDEX idx_leadership_active (is_active)
);
```

### 12. Audit Logs

```sql
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT,
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_action (action),
  INDEX idx_audit_entity (entity_type, entity_id),
  INDEX idx_audit_created (created_at)
);
```

### 13. Analytics Cache

```sql
CREATE TABLE analytics_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cache_key VARCHAR(255) NOT NULL UNIQUE,
  cache_value JSON NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cache_key (cache_key),
  INDEX idx_cache_expiry (expires_at)
);
```

## Database Views

### 1. Member Details View

```sql
CREATE VIEW vw_member_details AS
SELECT 
  m.id AS member_id,
  m.first_name,
  m.last_name,
  m.id_number,
  m.gender,
  m.date_of_birth,
  m.email,
  m.contact_number,
  m.membership_number,
  m.membership_status,
  m.membership_expiry_date,
  m.voter_status,
  w.id AS ward_id,
  w.name AS ward_name,
  w.ward_number,
  mu.id AS municipality_id,
  mu.name AS municipality_name,
  r.id AS region_id,
  r.name AS region_name,
  p.id AS province_id,
  p.name AS province_name
FROM members m
JOIN wards w ON m.ward_id = w.id
JOIN municipalities mu ON w.municipality_id = mu.id
JOIN regions r ON mu.region_id = r.id
JOIN provinces p ON r.province_id = p.id;
```

### 2. Top Wards View

```sql
CREATE VIEW vw_top_wards AS
SELECT 
  w.id,
  w.name,
  w.ward_number,
  m.name AS municipality,
  r.name AS region,
  p.name AS province,
  w.member_count AS members
FROM wards w
JOIN municipalities m ON w.municipality_id = m.id
JOIN regions r ON m.region_id = r.id
JOIN provinces p ON r.province_id = p.id
ORDER BY w.member_count DESC
LIMIT 10;
```

### 3. Top Municipalities View

```sql
CREATE VIEW vw_top_municipalities AS
SELECT 
  m.id,
  m.name,
  m.municipality_type,
  r.name AS region,
  p.name AS province,
  SUM(w.member_count) AS members
FROM municipalities m
JOIN regions r ON m.region_id = r.id
JOIN provinces p ON r.province_id = p.id
JOIN wards w ON w.municipality_id = m.id
GROUP BY m.id, m.name, m.municipality_type, r.name, p.name
ORDER BY members DESC
LIMIT 10;
```

### 4. Top Regions View

```sql
CREATE VIEW vw_top_regions AS
SELECT 
  r.id,
  r.name,
  p.name AS province,
  SUM(w.member_count) AS members
FROM regions r
JOIN provinces p ON r.province_id = p.id
JOIN municipalities m ON m.region_id = r.id
JOIN wards w ON w.municipality_id = m.id
GROUP BY r.id, r.name, p.name
ORDER BY members DESC
LIMIT 10;
```

### 5. Membership Expiry View

```sql
CREATE VIEW vw_membership_expiry AS
SELECT 
  m.id,
  m.first_name,
  m.last_name,
  m.email,
  m.contact_number,
  m.membership_number,
  m.membership_expiry_date,
  DATEDIFF(m.membership_expiry_date, CURDATE()) AS days_to_expiry,
  w.name AS ward_name,
  mu.name AS municipality_name,
  p.name AS province_name
FROM members m
JOIN wards w ON m.ward_id = w.id
JOIN municipalities mu ON w.municipality_id = mu.id
JOIN regions r ON mu.region_id = r.id
JOIN provinces p ON r.province_id = p.id
WHERE m.membership_status = 'Active'
ORDER BY days_to_expiry ASC;
```

## Stored Procedures

### 1. Search Members by ID Number

```sql
DELIMITER //

CREATE PROCEDURE sp_search_members_by_id_number(IN search_id_number VARCHAR(13))
BEGIN
  SELECT 
    m.id AS member_id,
    m.first_name,
    m.last_name,
    m.id_number,
    m.gender,
    m.email,
    m.contact_number,
    m.membership_number,
    m.membership_status,
    m.membership_expiry_date,
    m.voter_status,
    w.name AS ward_name,
    mu.name AS municipality_name,
    r.name AS region_name,
    p.name AS province_name
  FROM members m
  JOIN wards w ON m.ward_id = w.id
  JOIN municipalities mu ON w.municipality_id = mu.id
  JOIN regions r ON mu.region_id = r.id
  JOIN provinces p ON r.province_id = p.id
  WHERE m.id_number = search_id_number;
END //

DELIMITER ;
```

### 2. Update Member Count

```sql
DELIMITER //

CREATE PROCEDURE sp_update_ward_member_count(IN ward_id_param INT)
BEGIN
  DECLARE member_count_var INT;
  
  -- Count members in the ward
  SELECT COUNT(*) INTO member_count_var 
  FROM members 
  WHERE ward_id = ward_id_param AND membership_status = 'Active';
  
  -- Update the ward's member count
  UPDATE wards 
  SET member_count = member_count_var,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = ward_id_param;
  
  -- Return the updated count
  SELECT member_count_var AS updated_member_count;
END //

DELIMITER ;
```

### 3. Renew Membership

```sql
DELIMITER //

CREATE PROCEDURE sp_renew_membership(
  IN member_id_param INT,
  IN payment_amount DECIMAL(10, 2),
  IN payment_method_param VARCHAR(50),
  IN reference_number_param VARCHAR(50),
  IN renewal_months INT
)
BEGIN
  DECLARE current_expiry_date DATE;
  DECLARE new_expiry_date DATE;
  
  -- Start transaction
  START TRANSACTION;
  
  -- Get current expiry date
  SELECT membership_expiry_date INTO current_expiry_date
  FROM members
  WHERE id = member_id_param;
  
  -- Calculate new expiry date
  IF current_expiry_date < CURDATE() THEN
    -- If already expired, start from today
    SET new_expiry_date = DATE_ADD(CURDATE(), INTERVAL renewal_months MONTH);
  ELSE
    -- If not expired, add to current expiry date
    SET new_expiry_date = DATE_ADD(current_expiry_date, INTERVAL renewal_months MONTH);
  END IF;
  
  -- Update member record
  UPDATE members
  SET membership_expiry_date = new_expiry_date,
      membership_status = 'Active',
      updated_at = CURRENT_TIMESTAMP
  WHERE id = member_id_param;
  
  -- Record payment
  INSERT INTO membership_payments (
    member_id,
    amount,
    payment_date,
    payment_method,
    reference_number,
    payment_status
  ) VALUES (
    member_id_param,
    payment_amount,
    CURDATE(),
    payment_method_param,
    reference_number_param,
    'Completed'
  );
  
  -- Commit transaction
  COMMIT;
  
  -- Return the new expiry date
  SELECT new_expiry_date AS updated_expiry_date;
END //

DELIMITER ;
```

### 4. Get Membership Analytics

```sql
DELIMITER //

CREATE PROCEDURE sp_get_membership_analytics()
BEGIN
  -- Total members
  SELECT COUNT(*) AS total_members FROM members;
  
  -- Active members
  SELECT COUNT(*) AS active_members FROM members WHERE membership_status = 'Active';
  
  -- Members by province
  SELECT 
    p.name AS province_name,
    COUNT(m.id) AS member_count
  FROM members m
  JOIN wards w ON m.ward_id = w.id
  JOIN municipalities mu ON w.municipality_id = mu.id
  JOIN regions r ON mu.region_id = r.id
  JOIN provinces p ON r.province_id = p.id
  WHERE m.membership_status = 'Active'
  GROUP BY p.id, p.name
  ORDER BY member_count DESC;
  
  -- Members by gender
  SELECT 
    gender,
    COUNT(*) AS count
  FROM members
  WHERE membership_status = 'Active'
  GROUP BY gender;
  
  -- Voter verification status
  SELECT 
    voter_status,
    COUNT(*) AS count
  FROM members
  WHERE membership_status = 'Active'
  GROUP BY voter_status;
  
  -- Largest entities
  SELECT * FROM vw_top_wards LIMIT 1;
  SELECT * FROM vw_top_municipalities LIMIT 1;
  SELECT * FROM vw_top_regions LIMIT 1;
END //

DELIMITER ;
```

## Triggers

### 1. Update Member Count on Insert

```sql
DELIMITER //

CREATE TRIGGER after_member_insert
AFTER INSERT ON members
FOR EACH ROW
BEGIN
  -- Update the ward's member count
  UPDATE wards 
  SET member_count = member_count + 1
  WHERE id = NEW.ward_id;
END //

DELIMITER ;
```

### 2. Update Member Count on Update

```sql
DELIMITER //

CREATE TRIGGER after_member_update
AFTER UPDATE ON members
FOR EACH ROW
BEGIN
  -- If ward changed or status changed
  IF (NEW.ward_id != OLD.ward_id) OR 
     (NEW.membership_status != OLD.membership_status) THEN
    
    -- If old status was Active, decrement old ward
    IF OLD.membership_status = 'Active' THEN
      UPDATE wards 
      SET member_count = member_count - 1
      WHERE id = OLD.ward_id;
    END IF;
    
    -- If new status is Active, increment new ward
    IF NEW.membership_status = 'Active' THEN
      UPDATE wards 
      SET member_count = member_count + 1
      WHERE id = NEW.ward_id;
    END IF;
  END IF;
END //

DELIMITER ;
```

### 3. Update Member Count on Delete

```sql
DELIMITER //

CREATE TRIGGER before_member_delete
BEFORE DELETE ON members
FOR EACH ROW
BEGIN
  -- If member was active, decrement ward count
  IF OLD.membership_status = 'Active' THEN
    UPDATE wards 
    SET member_count = member_count - 1
    WHERE id = OLD.ward_id;
  END IF;
END //

DELIMITER ;
```

### 4. Audit Log Trigger

```sql
DELIMITER //

CREATE TRIGGER after_member_change
AFTER UPDATE ON members
FOR EACH ROW
BEGIN
  -- Create JSON objects for old and new values
  SET @old_values = JSON_OBJECT(
    'first_name', OLD.first_name,
    'last_name', OLD.last_name,
    'email', OLD.email,
    'contact_number', OLD.contact_number,
    'ward_id', OLD.ward_id,
    'membership_status', OLD.membership_status,
    'membership_expiry_date', OLD.membership_expiry_date,
    'voter_status', OLD.voter_status
  );
  
  SET @new_values = JSON_OBJECT(
    'first_name', NEW.first_name,
    'last_name', NEW.last_name,
    'email', NEW.email,
    'contact_number', NEW.contact_number,
    'ward_id', NEW.ward_id,
    'membership_status', NEW.membership_status,
    'membership_expiry_date', NEW.membership_expiry_date,
    'voter_status', NEW.voter_status
  );
  
  -- Insert audit log
  INSERT INTO audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values
  ) VALUES (
    @current_user_id, -- This would be set by the application
    'update',
    'member',
    NEW.id,
    @old_values,
    @new_values
  );
END //

DELIMITER ;
```

## Indexes

The schema includes the following key indexes to optimize search operations:

1. **ID Number Index**: `idx_member_id_number` on `members.id_number` for fast lookup by ID number
2. **Member Name Index**: `idx_member_name` on `members.last_name, members.first_name` for name searches
3. **Ward Member Count Index**: `idx_member_count` on `wards.member_count` for analytics queries
4. **Membership Status Index**: `idx_member_status` on `members.membership_status` for filtering active members
5. **Voter Status Index**: `idx_member_voter_status` on `members.voter_status` for voter verification queries
6. **Membership Expiry Index**: `idx_member_expiry` on `members.membership_expiry_date` for renewal notifications

## Optimization Notes

1. **ID Number Searching**: The `id_number` field in the `members` table is indexed and has a UNIQUE constraint to ensure fast lookups and data integrity.

2. **Hierarchical Queries**: The schema includes indexes on foreign keys and commonly queried fields to optimize hierarchical queries (e.g., finding all members in a province).

3. **Analytics Performance**: Database views are used to pre-compute common analytics queries, reducing the load on the database for dashboard displays.

4. **Audit Trail**: The `audit_logs` table captures changes to critical data, with indexes to support efficient filtering and reporting.

5. **Caching Support**: The `analytics_cache` table provides a database-level caching mechanism for expensive analytics queries.

This schema provides a solid foundation for the membership system, with proper indexing to support efficient ID number searches and other key operations.
