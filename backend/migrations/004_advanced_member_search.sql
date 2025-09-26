-- Advanced Member Search System Migration
-- This migration creates tables and indexes for advanced member search functionality

START TRANSACTION;

-- 1. Create saved_searches table for storing user search queries
CREATE TABLE IF NOT EXISTS saved_searches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  query_name VARCHAR(255) NOT NULL,
  search_filters JSON NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  is_favorite BOOLEAN DEFAULT FALSE,
  usage_count INT DEFAULT 0,
  last_used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_saved_searches_user (user_id),
  INDEX idx_saved_searches_name (query_name),
  INDEX idx_saved_searches_public (is_public),
  INDEX idx_saved_searches_favorite (is_favorite),
  INDEX idx_saved_searches_usage (usage_count),
  INDEX idx_saved_searches_last_used (last_used_at)
);

-- 2. Create search_history table for tracking search analytics
CREATE TABLE IF NOT EXISTS search_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  search_query TEXT NOT NULL,
  search_filters JSON NULL,
  results_count INT DEFAULT 0,
  execution_time_ms INT DEFAULT 0,
  search_type ENUM('quick', 'advanced', 'saved') DEFAULT 'quick',
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_search_history_user (user_id),
  INDEX idx_search_history_type (search_type),
  INDEX idx_search_history_created (created_at),
  INDEX idx_search_history_results (results_count)
);

-- 3. Create member_search_index table for full-text search optimization
CREATE TABLE IF NOT EXISTS member_search_index (
  member_id INT PRIMARY KEY,
  search_text TEXT NOT NULL,
  keywords TEXT NULL,
  location_text TEXT NULL,
  contact_text TEXT NULL,
  demographic_text TEXT NULL,
  membership_text TEXT NULL,
  last_indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  
  -- Full-text indexes
  FULLTEXT INDEX ft_search_text (search_text),
  FULLTEXT INDEX ft_keywords (keywords),
  FULLTEXT INDEX ft_location (location_text),
  FULLTEXT INDEX ft_contact (contact_text),
  FULLTEXT INDEX ft_demographic (demographic_text),
  FULLTEXT INDEX ft_membership (membership_text),
  
  -- Regular indexes
  INDEX idx_member_search_last_indexed (last_indexed_at)
);

-- 4. Create search_filters table for predefined filter sets
CREATE TABLE IF NOT EXISTS search_filters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filter_name VARCHAR(255) NOT NULL,
  filter_category VARCHAR(100) NOT NULL,
  filter_config JSON NOT NULL,
  description TEXT NULL,
  is_system_filter BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INT DEFAULT 0,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_search_filters_name (filter_name),
  INDEX idx_search_filters_category (filter_category),
  INDEX idx_search_filters_system (is_system_filter),
  INDEX idx_search_filters_active (is_active),
  INDEX idx_search_filters_usage (usage_count)
);

-- 5. Insert system predefined filters
INSERT INTO search_filters (filter_name, filter_category, filter_config, description, is_system_filter) VALUES
('Active Members', 'Membership Status', '{"membership_active": true}', 'Members with active membership status', TRUE),
('Expired Memberships', 'Membership Status', '{"membership_expired": true}', 'Members with expired memberships', TRUE),
('Members with Email', 'Contact Information', '{"has_email": true}', 'Members who have email addresses', TRUE),
('Members without Email', 'Contact Information', '{"has_email": false}', 'Members who do not have email addresses', TRUE),
('Members with Cell Phone', 'Contact Information', '{"has_cell_number": true}', 'Members who have cell phone numbers', TRUE),
('Young Members (18-35)', 'Demographics', '{"age_min": 18, "age_max": 35}', 'Members aged between 18 and 35 years', TRUE),
('Senior Members (65+)', 'Demographics', '{"age_min": 65}', 'Members aged 65 years and older', TRUE),
('Eligible Voters', 'Voter Information', '{"is_eligible_to_vote": true}', 'Members who are eligible to vote', TRUE),
('Registered Voters', 'Voter Information', '{"has_voter_registration_number": true}', 'Members with voter registration numbers', TRUE),
('Expiring Soon (30 days)', 'Membership Status', '{"membership_expiry_from": "CURDATE()", "membership_expiry_to": "DATE_ADD(CURDATE(), INTERVAL 30 DAY)"}', 'Members whose membership expires within 30 days', TRUE);

-- 6. Create indexes on existing tables for better search performance
-- Add indexes to members table for search optimization
ALTER TABLE members 
ADD INDEX IF NOT EXISTS idx_members_search_name (firstname, surname),
ADD INDEX IF NOT EXISTS idx_members_search_id (id_number),
ADD INDEX IF NOT EXISTS idx_members_search_email (email),
ADD INDEX IF NOT EXISTS idx_members_search_phone (cell_number),
ADD INDEX IF NOT EXISTS idx_members_search_age (age),
ADD INDEX IF NOT EXISTS idx_members_search_gender (gender_id),
ADD INDEX IF NOT EXISTS idx_members_search_race (race_id),
ADD INDEX IF NOT EXISTS idx_members_search_citizenship (citizenship_id),
ADD INDEX IF NOT EXISTS idx_members_search_language (language_id),
ADD INDEX IF NOT EXISTS idx_members_search_occupation (occupation_id),
ADD INDEX IF NOT EXISTS idx_members_search_qualification (qualification_id),
ADD INDEX IF NOT EXISTS idx_members_search_voter_status (voter_status_id),
ADD INDEX IF NOT EXISTS idx_members_search_voting_station (voting_station_id),
ADD INDEX IF NOT EXISTS idx_members_search_created (created_at),
ADD INDEX IF NOT EXISTS idx_members_search_updated (updated_at);

-- Add indexes to memberships table for search optimization
ALTER TABLE memberships
ADD INDEX IF NOT EXISTS idx_memberships_search_status (status_id),
ADD INDEX IF NOT EXISTS idx_memberships_search_expiry (expiry_date),
ADD INDEX IF NOT EXISTS idx_memberships_search_joined (date_joined);

-- 7. Create enhanced member search view with additional fields
CREATE OR REPLACE VIEW vw_enhanced_member_search AS
SELECT 
  m.member_id,
  m.id_number,
  m.firstname,
  m.surname,
  CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
  m.age,
  m.date_of_birth,
  g.gender_name,
  r.race_name,
  c.citizenship_name,
  l.language_name,
  m.cell_number,
  m.landline_number,
  m.email,
  m.residential_address,
  m.ward_code,
  w.ward_name,
  w.ward_number,
  CONCAT('Ward ', w.ward_number, ' - ', w.ward_name) as ward_display,
  w.municipality_code,
  mu.municipality_name,
  w.district_code,
  d.district_name,
  w.province_code,
  p.province_name,
  CONCAT(w.ward_name, ', ', mu.municipality_name, ', ', d.district_name, ', ', p.province_name) as location_display,
  vs.station_name as voting_station_name,
  o.occupation_name,
  q.qualification_name,
  voter_s.status_name as voter_status,
  voter_s.is_eligible_to_vote,
  m.voter_registration_number,
  m.voter_registration_date,
  ms.status_name as membership_status,
  mem.expiry_date as membership_expiry_date,
  mem.date_joined as membership_date_joined,
  mem.membership_amount,
  CASE 
    WHEN mem.expiry_date > CURDATE() THEN 'Active'
    WHEN mem.expiry_date <= CURDATE() THEN 'Expired'
    ELSE 'Unknown'
  END as membership_status_display,
  DATEDIFF(mem.expiry_date, CURDATE()) as days_until_expiry,
  TIMESTAMPDIFF(YEAR, mem.date_joined, CURDATE()) as membership_duration_years,
  -- Enhanced search text with more fields
  CONCAT(
    m.firstname, ' ', COALESCE(m.surname, ''), ' ',
    m.id_number, ' ',
    COALESCE(m.email, ''), ' ',
    COALESCE(m.cell_number, ''), ' ',
    COALESCE(m.landline_number, ''), ' ',
    COALESCE(m.residential_address, ''), ' ',
    COALESCE(w.ward_name, ''), ' ',
    COALESCE(mu.municipality_name, ''), ' ',
    COALESCE(d.district_name, ''), ' ',
    COALESCE(p.province_name, ''), ' ',
    COALESCE(o.occupation_name, ''), ' ',
    COALESCE(g.gender_name, ''), ' ',
    COALESCE(r.race_name, '')
  ) as search_text,
  m.created_at,
  m.updated_at
FROM members m
LEFT JOIN genders g ON m.gender_id = g.gender_id
LEFT JOIN races r ON m.race_id = r.race_id
LEFT JOIN citizenships c ON m.citizenship_id = c.citizenship_id
LEFT JOIN languages l ON m.language_id = l.language_id
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON w.district_code = d.district_code
LEFT JOIN provinces p ON w.province_code = p.province_code
LEFT JOIN voting_stations vs ON m.voting_station_id = vs.voting_station_id
LEFT JOIN occupations o ON m.occupation_id = o.occupation_id
LEFT JOIN qualification_levels q ON m.qualification_id = q.qualification_id
LEFT JOIN voter_statuses voter_s ON m.voter_status_id = voter_s.voter_status_id
LEFT JOIN memberships mem ON m.member_id = mem.member_id
LEFT JOIN membership_statuses ms ON mem.status_id = ms.status_id;

-- 8. Create search analytics view
CREATE OR REPLACE VIEW vw_search_analytics AS
SELECT 
  DATE(created_at) as search_date,
  search_type,
  COUNT(*) as search_count,
  AVG(results_count) as avg_results,
  AVG(execution_time_ms) as avg_execution_time,
  COUNT(DISTINCT user_id) as unique_users
FROM search_history
GROUP BY DATE(created_at), search_type
ORDER BY search_date DESC, search_count DESC;

-- 9. Create popular searches view
CREATE OR REPLACE VIEW vw_popular_searches AS
SELECT 
  search_query,
  search_type,
  COUNT(*) as usage_count,
  AVG(results_count) as avg_results,
  MAX(created_at) as last_used,
  COUNT(DISTINCT user_id) as unique_users
FROM search_history
WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY search_query, search_type
HAVING usage_count >= 2
ORDER BY usage_count DESC, last_used DESC
LIMIT 50;

COMMIT;
