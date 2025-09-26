-- Migration: Add Voting Districts to Geographic Hierarchy
-- This adds voting districts as the lowest level in the geographic hierarchy:
-- Province → District → Municipality → Ward → Voting District

-- 1. Create voting_districts table
CREATE TABLE IF NOT EXISTS voting_districts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  voting_district_code VARCHAR(20) NOT NULL UNIQUE,
  voting_district_name VARCHAR(255) NOT NULL,
  voting_district_number VARCHAR(10) NOT NULL,
  ward_code VARCHAR(20) NOT NULL,
  
  -- Geographic coordinates (optional)
  latitude DECIMAL(10, 8) NULL,
  longitude DECIMAL(11, 8) NULL,
  
  -- Administrative info
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  FOREIGN KEY (ward_code) REFERENCES wards(ward_code) ON DELETE CASCADE ON UPDATE CASCADE,
  
  -- Indexes for performance
  INDEX idx_voting_districts_ward_code (ward_code),
  INDEX idx_voting_districts_active (is_active),
  INDEX idx_voting_districts_name (voting_district_name),
  INDEX idx_voting_districts_number (voting_district_number),
  
  -- Unique constraint to prevent duplicate voting districts in same ward
  UNIQUE KEY unique_voting_district_per_ward (ward_code, voting_district_number)
);

-- 2. Add voting_district_code to members table
ALTER TABLE members 
ADD COLUMN voting_district_code VARCHAR(20) NULL AFTER ward_code,
ADD INDEX idx_members_voting_district (voting_district_code),
ADD FOREIGN KEY fk_members_voting_district (voting_district_code) 
  REFERENCES voting_districts(voting_district_code) ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. Add voting_district_code to membership_applications table
ALTER TABLE membership_applications 
ADD COLUMN voting_district_code VARCHAR(20) NULL AFTER ward_code,
ADD INDEX idx_membership_applications_voting_district (voting_district_code),
ADD FOREIGN KEY fk_membership_applications_voting_district (voting_district_code) 
  REFERENCES voting_districts(voting_district_code) ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Add voting_district_code to membership_renewals table (if exists)
ALTER TABLE membership_renewals 
ADD COLUMN voting_district_code VARCHAR(20) NULL AFTER ward_code,
ADD INDEX idx_membership_renewals_voting_district (voting_district_code),
ADD FOREIGN KEY fk_membership_renewals_voting_district (voting_district_code) 
  REFERENCES voting_districts(voting_district_code) ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Add voting_district_code to voter_verifications table (if exists)
ALTER TABLE voter_verifications 
ADD COLUMN voting_district_code VARCHAR(20) NULL AFTER ward_code,
ADD INDEX idx_voter_verifications_voting_district (voting_district_code),
ADD FOREIGN KEY fk_voter_verifications_voting_district (voting_district_code) 
  REFERENCES voting_districts(voting_district_code) ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Create geographic hierarchy view including voting districts
CREATE OR REPLACE VIEW geographic_hierarchy_complete AS
SELECT 
  p.province_code,
  p.province_name,
  d.district_code,
  d.district_name,
  m.municipal_code,
  m.municipal_name,
  w.ward_code,
  w.ward_name,
  w.ward_number,
  vd.voting_district_code,
  vd.voting_district_name,
  vd.voting_district_number,
  CONCAT(p.province_name, ' → ', d.district_name, ' → ', m.municipal_name, ' → ', w.ward_name, ' → ', vd.voting_district_name) as full_hierarchy
FROM provinces p
JOIN districts d ON p.province_code = d.province_code
JOIN municipalities m ON d.district_code = m.district_code
JOIN wards w ON m.municipal_code = w.municipal_code
LEFT JOIN voting_districts vd ON w.ward_code = vd.ward_code
WHERE p.is_active = TRUE 
  AND d.is_active = TRUE 
  AND m.is_active = TRUE 
  AND w.is_active = TRUE 
  AND (vd.is_active = TRUE OR vd.is_active IS NULL);

-- 7. Insert sample voting districts data (you can customize this)
INSERT INTO voting_districts (voting_district_code, voting_district_name, voting_district_number, ward_code) VALUES
-- Sample data for major wards - you'll need to populate with real data
('VD001001', 'Johannesburg CBD North', '1', 'WRD001'),
('VD001002', 'Johannesburg CBD South', '2', 'WRD001'),
('VD002001', 'Sandton North', '1', 'WRD002'),
('VD002002', 'Sandton South', '2', 'WRD002'),
('VD003001', 'Soweto Orlando East', '1', 'WRD003'),
('VD003002', 'Soweto Orlando West', '2', 'WRD003');

-- 8. Create stored procedure for geographic statistics including voting districts
DELIMITER //
CREATE PROCEDURE GetGeographicStatistics()
BEGIN
  SELECT 
    'Summary' as level_type,
    COUNT(DISTINCT p.province_code) as provinces,
    COUNT(DISTINCT d.district_code) as districts,
    COUNT(DISTINCT m.municipal_code) as municipalities,
    COUNT(DISTINCT w.ward_code) as wards,
    COUNT(DISTINCT vd.voting_district_code) as voting_districts
  FROM provinces p
  LEFT JOIN districts d ON p.province_code = d.province_code
  LEFT JOIN municipalities m ON d.district_code = m.district_code
  LEFT JOIN wards w ON m.municipal_code = w.municipal_code
  LEFT JOIN voting_districts vd ON w.ward_code = vd.ward_code
  WHERE p.is_active = TRUE;
  
  SELECT 
    p.province_name,
    COUNT(DISTINCT d.district_code) as districts,
    COUNT(DISTINCT m.municipal_code) as municipalities,
    COUNT(DISTINCT w.ward_code) as wards,
    COUNT(DISTINCT vd.voting_district_code) as voting_districts,
    COUNT(DISTINCT mem.id) as members
  FROM provinces p
  LEFT JOIN districts d ON p.province_code = d.province_code
  LEFT JOIN municipalities m ON d.district_code = m.district_code
  LEFT JOIN wards w ON m.municipal_code = w.municipal_code
  LEFT JOIN voting_districts vd ON w.ward_code = vd.ward_code
  LEFT JOIN members mem ON vd.voting_district_code = mem.voting_district_code
  WHERE p.is_active = TRUE
  GROUP BY p.province_code, p.province_name
  ORDER BY p.province_name;
END //
DELIMITER ;
