-- IEC LGE Ballot Results System Migration
-- Creates tables for mapping our geographic codes to IEC API IDs and storing ballot results

-- 1. IEC Province Mappings Table
-- Maps our province codes (LP, KZN, etc.) to IEC ProvinceID (numeric)
CREATE TABLE IF NOT EXISTS iec_province_mappings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  province_code VARCHAR(10) NOT NULL,
  province_name VARCHAR(100) NOT NULL,
  iec_province_id INT NOT NULL,
  iec_province_name VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_province_code (province_code),
  UNIQUE KEY unique_iec_province_id (iec_province_id),
  INDEX idx_province_code (province_code),
  INDEX idx_iec_province_id (iec_province_id),
  INDEX idx_is_active (is_active)
);

-- 2. IEC Municipality Mappings Table
-- Maps our municipality codes (BUF, EC124, etc.) to IEC MunicipalityID (numeric)
CREATE TABLE IF NOT EXISTS iec_municipality_mappings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  municipality_code VARCHAR(20) NOT NULL,
  municipality_name VARCHAR(100) NOT NULL,
  province_code VARCHAR(10) NOT NULL,
  iec_municipality_id INT NOT NULL,
  iec_municipality_name VARCHAR(100),
  iec_province_id INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_municipality_code (municipality_code),
  UNIQUE KEY unique_iec_municipality_id (iec_municipality_id),
  INDEX idx_municipality_code (municipality_code),
  INDEX idx_province_code (province_code),
  INDEX idx_iec_municipality_id (iec_municipality_id),
  INDEX idx_iec_province_id (iec_province_id),
  INDEX idx_is_active (is_active),
  
  FOREIGN KEY (province_code) REFERENCES provinces(province_code) ON UPDATE CASCADE
);

-- 3. IEC Ward Mappings Table
-- Maps our ward codes (29200001, etc.) to IEC WardID (numeric)
CREATE TABLE IF NOT EXISTS iec_ward_mappings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ward_code VARCHAR(20) NOT NULL,
  ward_name VARCHAR(100),
  ward_number INT,
  municipality_code VARCHAR(20) NOT NULL,
  province_code VARCHAR(10) NOT NULL,
  iec_ward_id INT NOT NULL,
  iec_ward_name VARCHAR(100),
  iec_municipality_id INT NOT NULL,
  iec_province_id INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_ward_code (ward_code),
  UNIQUE KEY unique_iec_ward_id (iec_ward_id),
  INDEX idx_ward_code (ward_code),
  INDEX idx_municipality_code (municipality_code),
  INDEX idx_province_code (province_code),
  INDEX idx_iec_ward_id (iec_ward_id),
  INDEX idx_iec_municipality_id (iec_municipality_id),
  INDEX idx_iec_province_id (iec_province_id),
  INDEX idx_is_active (is_active),
  
  FOREIGN KEY (municipality_code) REFERENCES municipalities(municipality_code) ON UPDATE CASCADE,
  FOREIGN KEY (province_code) REFERENCES provinces(province_code) ON UPDATE CASCADE
);

-- 4. IEC LGE Ballot Results Table
-- Stores Local Government Election ballot results from IEC API
CREATE TABLE IF NOT EXISTS iec_lge_ballot_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  iec_event_id INT NOT NULL,
  iec_province_id INT,
  iec_municipality_id INT,
  iec_ward_id INT,
  
  -- Geographic context (our codes for easy reference)
  province_code VARCHAR(10),
  municipality_code VARCHAR(20),
  ward_code VARCHAR(20),
  
  -- Ballot result data (JSON structure to handle varying IEC API response formats)
  ballot_data JSON NOT NULL,
  
  -- Result summary fields (extracted from JSON for easy querying)
  total_votes INT DEFAULT 0,
  registered_voters INT DEFAULT 0,
  voter_turnout_percentage DECIMAL(5,2) DEFAULT 0.00,
  
  -- Metadata
  result_type ENUM('province', 'municipality', 'ward') NOT NULL,
  data_source VARCHAR(50) DEFAULT 'IEC_API',
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_iec_event_id (iec_event_id),
  INDEX idx_iec_province_id (iec_province_id),
  INDEX idx_iec_municipality_id (iec_municipality_id),
  INDEX idx_iec_ward_id (iec_ward_id),
  INDEX idx_province_code (province_code),
  INDEX idx_municipality_code (municipality_code),
  INDEX idx_ward_code (ward_code),
  INDEX idx_result_type (result_type),
  INDEX idx_last_updated (last_updated),
  
  FOREIGN KEY (iec_event_id) REFERENCES iec_electoral_events(iec_event_id) ON DELETE CASCADE,
  FOREIGN KEY (province_code) REFERENCES provinces(province_code) ON UPDATE CASCADE,
  FOREIGN KEY (municipality_code) REFERENCES municipalities(municipality_code) ON UPDATE CASCADE,
  FOREIGN KEY (ward_code) REFERENCES wards(ward_code) ON UPDATE CASCADE
);

-- 5. IEC LGE Ballot Results Sync Log
-- Tracks synchronization history for ballot results
CREATE TABLE IF NOT EXISTS iec_lge_ballot_sync_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sync_type ENUM('province', 'municipality', 'ward', 'full') NOT NULL,
  iec_event_id INT NOT NULL,
  
  -- Geographic scope of sync
  province_code VARCHAR(10),
  municipality_code VARCHAR(20),
  ward_code VARCHAR(20),
  
  -- Sync results
  sync_status ENUM('started', 'completed', 'failed', 'partial') NOT NULL,
  records_processed INT DEFAULT 0,
  records_successful INT DEFAULT 0,
  records_failed INT DEFAULT 0,
  
  -- Timing
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP NULL,
  duration_ms INT DEFAULT 0,
  
  -- Error handling
  error_message TEXT,
  error_details JSON,
  
  -- API call details
  api_calls_made INT DEFAULT 0,
  api_calls_successful INT DEFAULT 0,
  api_calls_failed INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_sync_type (sync_type),
  INDEX idx_iec_event_id (iec_event_id),
  INDEX idx_sync_status (sync_status),
  INDEX idx_province_code (province_code),
  INDEX idx_municipality_code (municipality_code),
  INDEX idx_ward_code (ward_code),
  INDEX idx_started_at (started_at),
  
  FOREIGN KEY (iec_event_id) REFERENCES iec_electoral_events(iec_event_id) ON DELETE CASCADE
);

-- 6. Create Views for Easy Access

-- View: Current LGE Ballot Results by Province
CREATE OR REPLACE VIEW current_lge_results_by_province AS
SELECT 
  p.province_code,
  p.province_name,
  pm.iec_province_id,
  br.total_votes,
  br.registered_voters,
  br.voter_turnout_percentage,
  br.ballot_data,
  br.last_updated,
  ee.description as election_description,
  ee.election_year
FROM provinces p
LEFT JOIN iec_province_mappings pm ON p.province_code = pm.province_code
LEFT JOIN iec_lge_ballot_results br ON pm.iec_province_id = br.iec_province_id
LEFT JOIN iec_electoral_events ee ON br.iec_event_id = ee.iec_event_id
WHERE ee.is_active = TRUE AND br.result_type = 'province'
ORDER BY p.province_name;

-- View: Current LGE Ballot Results by Municipality
CREATE OR REPLACE VIEW current_lge_results_by_municipality AS
SELECT 
  m.municipality_code,
  m.municipality_name,
  m.province_code,
  p.province_name,
  mm.iec_municipality_id,
  mm.iec_province_id,
  br.total_votes,
  br.registered_voters,
  br.voter_turnout_percentage,
  br.ballot_data,
  br.last_updated,
  ee.description as election_description,
  ee.election_year
FROM municipalities m
LEFT JOIN provinces p ON m.province_code = p.province_code
LEFT JOIN iec_municipality_mappings mm ON m.municipality_code = mm.municipality_code
LEFT JOIN iec_lge_ballot_results br ON mm.iec_municipality_id = br.iec_municipality_id
LEFT JOIN iec_electoral_events ee ON br.iec_event_id = ee.iec_event_id
WHERE ee.is_active = TRUE AND br.result_type = 'municipality'
ORDER BY p.province_name, m.municipality_name;

-- View: Current LGE Ballot Results by Ward
CREATE OR REPLACE VIEW current_lge_results_by_ward AS
SELECT 
  w.ward_code,
  w.ward_name,
  w.ward_number,
  w.municipality_code,
  m.municipality_name,
  w.province_code,
  p.province_name,
  wm.iec_ward_id,
  wm.iec_municipality_id,
  wm.iec_province_id,
  br.total_votes,
  br.registered_voters,
  br.voter_turnout_percentage,
  br.ballot_data,
  br.last_updated,
  ee.description as election_description,
  ee.election_year
FROM wards w
LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
LEFT JOIN provinces p ON w.province_code = p.province_code
LEFT JOIN iec_ward_mappings wm ON w.ward_code = wm.ward_code
LEFT JOIN iec_lge_ballot_results br ON wm.iec_ward_id = br.iec_ward_id
LEFT JOIN iec_electoral_events ee ON br.iec_event_id = ee.iec_event_id
WHERE ee.is_active = TRUE AND br.result_type = 'ward'
ORDER BY p.province_name, m.municipality_name, w.ward_number;

-- 7. Insert Initial Province Mappings (to be populated via API discovery)
-- These will be populated by the IEC Geographic ID Discovery Service
INSERT IGNORE INTO iec_province_mappings (province_code, province_name, iec_province_id, iec_province_name) VALUES
('EC', 'Eastern Cape', 0, 'To be discovered'),
('FS', 'Free State', 0, 'To be discovered'),
('GP', 'Gauteng', 0, 'To be discovered'),
('KZN', 'KwaZulu-Natal', 0, 'To be discovered'),
('LP', 'Limpopo', 0, 'To be discovered'),
('MP', 'Mpumalanga', 0, 'To be discovered'),
('NC', 'Northern Cape', 0, 'To be discovered'),
('NW', 'North West', 0, 'To be discovered'),
('WC', 'Western Cape', 0, 'To be discovered');

-- Update the placeholder IEC IDs to NULL for proper handling
UPDATE iec_province_mappings SET iec_province_id = NULL WHERE iec_province_id = 0;
