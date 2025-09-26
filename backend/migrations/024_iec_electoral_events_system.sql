-- IEC Electoral Events System Migration
-- This migration creates tables to store IEC Electoral Event data
-- Based on IEC API analysis: ElectoralEventTypeID=3 for Local Government Elections

-- Enable foreign key constraints
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Create IEC Electoral Event Types table
CREATE TABLE IF NOT EXISTS iec_electoral_event_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  iec_event_type_id INT NOT NULL UNIQUE, -- Maps to IEC API ElectoralEventTypeID
  description VARCHAR(255) NOT NULL,
  is_municipal_election BOOLEAN DEFAULT FALSE, -- TRUE for Local Government Elections
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_iec_event_type_id (iec_event_type_id),
  INDEX idx_municipal_election (is_municipal_election),
  INDEX idx_description (description)
);

-- 2. Create IEC Electoral Events table
CREATE TABLE IF NOT EXISTS iec_electoral_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  iec_event_id INT NOT NULL UNIQUE, -- Maps to IEC API ElectoralEventID
  iec_event_type_id INT NOT NULL, -- Maps to IEC API ElectoralEventTypeID
  description VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  election_year YEAR NULL, -- Extracted from description
  election_date DATE NULL, -- If available from API
  
  -- Metadata
  last_synced_at TIMESTAMP NULL,
  sync_status ENUM('pending', 'syncing', 'completed', 'failed') DEFAULT 'pending',
  sync_error TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign key
  FOREIGN KEY (iec_event_type_id) REFERENCES iec_electoral_event_types(iec_event_type_id) ON DELETE RESTRICT,
  
  -- Indexes
  INDEX idx_iec_event_id (iec_event_id),
  INDEX idx_iec_event_type_id (iec_event_type_id),
  INDEX idx_is_active (is_active),
  INDEX idx_election_year (election_year),
  INDEX idx_sync_status (sync_status),
  INDEX idx_last_synced (last_synced_at)
);

-- 3. Create IEC Electoral Event Delimitations table (for geographic data)
CREATE TABLE IF NOT EXISTS iec_electoral_event_delimitations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  iec_event_id INT NOT NULL,
  province_id INT NULL,
  province_name VARCHAR(255) NULL,
  municipality_id INT NULL,
  municipality_name VARCHAR(255) NULL,
  ward_id INT NULL,
  ward_number VARCHAR(50) NULL,
  voting_district_number VARCHAR(50) NULL,
  voting_district_name VARCHAR(255) NULL,
  
  -- Metadata
  last_synced_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign key
  FOREIGN KEY (iec_event_id) REFERENCES iec_electoral_events(iec_event_id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_iec_event_id (iec_event_id),
  INDEX idx_province_id (province_id),
  INDEX idx_municipality_id (municipality_id),
  INDEX idx_ward_id (ward_id),
  INDEX idx_voting_district (voting_district_number),
  INDEX idx_composite_location (province_id, municipality_id, ward_id)
);

-- 4. Create IEC Electoral Event Sync Log table
CREATE TABLE IF NOT EXISTS iec_electoral_event_sync_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sync_type ENUM('event_types', 'events', 'delimitations', 'full_sync') NOT NULL,
  sync_status ENUM('started', 'completed', 'failed') NOT NULL,
  records_processed INT DEFAULT 0,
  records_created INT DEFAULT 0,
  records_updated INT DEFAULT 0,
  records_failed INT DEFAULT 0,
  error_message TEXT NULL,
  sync_duration_ms INT NULL,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP NULL,
  
  -- Metadata
  triggered_by ENUM('manual', 'scheduled', 'api_call') DEFAULT 'manual',
  user_id INT NULL,
  
  -- Indexes
  INDEX idx_sync_type (sync_type),
  INDEX idx_sync_status (sync_status),
  INDEX idx_started_at (started_at),
  INDEX idx_triggered_by (triggered_by)
);

-- 5. Insert initial IEC Electoral Event Types (based on API analysis)
INSERT INTO iec_electoral_event_types (iec_event_type_id, description, is_municipal_election) VALUES
(1, 'National Election', FALSE),
(2, 'Provincial Election', FALSE),
(3, 'Local Government Election', TRUE), -- This is Municipal Elections
(4, 'By-Election', FALSE)
ON DUPLICATE KEY UPDATE 
  description = VALUES(description),
  is_municipal_election = VALUES(is_municipal_election),
  updated_at = CURRENT_TIMESTAMP;

-- 6. Insert known IEC Electoral Events (based on API analysis)
INSERT INTO iec_electoral_events (iec_event_id, iec_event_type_id, description, is_active, election_year) VALUES
-- Local Government Elections (Municipal Elections)
(1091, 3, 'LOCAL GOVERNMENT ELECTION 2021', TRUE, 2021),
(402, 3, 'LOCAL GOVERNMENT ELECTION 2016', FALSE, 2016),
(197, 3, 'LGE 2011', FALSE, 2011),
(95, 3, 'LGE 2006', FALSE, 2006),
(2, 3, 'LGE 2000', FALSE, 2000),

-- National Elections (for reference)
(1334, 1, '2024 NATIONAL ELECTION', TRUE, 2024),
(699, 1, '2019 NATIONAL ELECTION', FALSE, 2019),
(291, 1, '2014 National Election', FALSE, 2014),
(146, 1, '22 Apr 2009 National Election', FALSE, 2009),
(45, 1, '14 Apr 2004 National Election', FALSE, 2004),
(1, 1, 'National Elections 1999', FALSE, 1999)
ON DUPLICATE KEY UPDATE 
  description = VALUES(description),
  is_active = VALUES(is_active),
  election_year = VALUES(election_year),
  updated_at = CURRENT_TIMESTAMP;

-- 7. Create view for active municipal elections
CREATE OR REPLACE VIEW active_municipal_elections AS
SELECT 
  iee.id,
  iee.iec_event_id,
  iee.description,
  iee.election_year,
  iee.election_date,
  iee.is_active,
  ieet.description as event_type_description
FROM iec_electoral_events iee
JOIN iec_electoral_event_types ieet ON iee.iec_event_type_id = ieet.iec_event_type_id
WHERE ieet.is_municipal_election = TRUE
  AND iee.is_active = TRUE;

-- 8. Create view for municipal election history
CREATE OR REPLACE VIEW municipal_election_history AS
SELECT 
  iee.id,
  iee.iec_event_id,
  iee.description,
  iee.election_year,
  iee.election_date,
  iee.is_active,
  iee.last_synced_at,
  ieet.description as event_type_description
FROM iec_electoral_events iee
JOIN iec_electoral_event_types ieet ON iee.iec_event_type_id = ieet.iec_event_type_id
WHERE ieet.is_municipal_election = TRUE
ORDER BY iee.election_year DESC;

-- 9. Create indexes for performance optimization (MySQL doesn't support partial indexes like PostgreSQL)
-- CREATE INDEX idx_iec_events_municipal_active ON iec_electoral_events (iec_event_type_id, is_active);

-- 10. Add configuration settings for IEC sync
INSERT INTO system_settings (setting_key, setting_value, description, category) VALUES
('iec_sync_enabled', 'true', 'Enable automatic synchronization with IEC API', 'iec_integration'),
('iec_sync_interval_hours', '24', 'Hours between automatic IEC data synchronization', 'iec_integration'),
('iec_active_municipal_election_id', '1091', 'Current active municipal election IEC Event ID', 'iec_integration'),
('iec_last_full_sync', NULL, 'Timestamp of last full IEC data synchronization', 'iec_integration')
ON DUPLICATE KEY UPDATE 
  setting_value = VALUES(setting_value),
  description = VALUES(description),
  updated_at = CURRENT_TIMESTAMP;

-- Success message
SELECT 'IEC Electoral Events System migration completed successfully' as message;
