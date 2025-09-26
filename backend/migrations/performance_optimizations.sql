-- =====================================================
-- PERFORMANCE OPTIMIZATIONS FOR HIGH CONCURRENT LOAD
-- Target: 20,000+ concurrent user sessions
-- =====================================================

-- 1. CREATE CRITICAL INDEXES FOR MEMBER LOOKUPS
-- =====================================================

-- Primary index for ID number lookups (most frequent query)
CREATE INDEX IF NOT EXISTS idx_members_id_number_optimized 
ON members(id_number) 
USING BTREE;

-- Composite index for member card generation queries
CREATE INDEX IF NOT EXISTS idx_members_card_lookup 
ON members(member_id, id_number, firstname, surname) 
USING BTREE;

-- Index for membership number generation
CREATE INDEX IF NOT EXISTS idx_members_membership_number 
ON members(member_id) 
USING BTREE;

-- Geographic lookup optimization
CREATE INDEX IF NOT EXISTS idx_members_geographic 
ON members(province_code, municipality_code, ward_code) 
USING BTREE;

-- Status-based queries optimization
CREATE INDEX IF NOT EXISTS idx_members_status_active 
ON members(membership_status, member_created_at) 
USING BTREE;

-- 2. OPTIMIZE VIEW PERFORMANCE
-- =====================================================

-- Drop existing view and recreate with optimized structure
DROP VIEW IF EXISTS vw_member_details_optimized;

CREATE VIEW vw_member_details_optimized AS
SELECT 
  m.member_id,
  m.id_number,
  m.firstname,
  COALESCE(m.surname, '') as surname,
  COALESCE(m.email, '') as email,
  COALESCE(m.cell_number, '') as cell_number,
  m.member_created_at,
  -- Pre-calculate membership number to avoid CONCAT in queries
  CONCAT('MEM', LPAD(m.member_id, 6, '0')) as membership_number,
  -- Geographic data with optimized joins
  p.province_name,
  mu.municipality_name,
  w.ward_number,
  COALESCE(vs.station_name, 'Not Available') as voting_station_name
FROM members m
FORCE INDEX (idx_members_id_number_optimized)
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code  
LEFT JOIN provinces p ON w.province_code = p.province_code
LEFT JOIN voting_stations vs ON m.voting_station_id = vs.station_id
WHERE m.membership_status = 'Active';

-- 3. CREATE MATERIALIZED VIEW SIMULATION FOR HEAVY QUERIES
-- =====================================================

-- Create a summary table for frequently accessed member data
CREATE TABLE IF NOT EXISTS member_cache_summary (
  member_id INT PRIMARY KEY,
  id_number VARCHAR(13) NOT NULL UNIQUE,
  membership_number VARCHAR(20) NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  province_name VARCHAR(100),
  municipality_name VARCHAR(100),
  ward_number VARCHAR(10),
  voting_station_name VARCHAR(200),
  membership_status VARCHAR(20),
  join_date DATETIME,
  expiry_date DATETIME,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cache_id_number (id_number),
  INDEX idx_cache_member_id (member_id),
  INDEX idx_cache_membership_number (membership_number),
  INDEX idx_cache_status (membership_status),
  INDEX idx_cache_updated (last_updated)
) ENGINE=InnoDB;

-- 4. CREATE STORED PROCEDURES FOR OPTIMIZED QUERIES
-- =====================================================

DELIMITER //

-- Optimized member lookup by ID number
CREATE PROCEDURE IF NOT EXISTS sp_get_member_by_id_number_optimized(
  IN p_id_number VARCHAR(13)
)
READS SQL DATA
DETERMINISTIC
SQL SECURITY DEFINER
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  -- Try cache first
  SELECT 
    member_id,
    membership_number,
    SUBSTRING_INDEX(full_name, ' ', 1) as first_name,
    SUBSTRING_INDEX(full_name, ' ', -1) as last_name,
    email,
    phone as phone_number,
    province_name,
    municipality_name,
    ward_number,
    voting_station_name,
    'Standard' as membership_type,
    join_date,
    expiry_date,
    id_number
  FROM member_cache_summary 
  WHERE id_number = p_id_number 
    AND membership_status = 'Active'
  LIMIT 1;
END //

-- Optimized member lookup by member ID
CREATE PROCEDURE IF NOT EXISTS sp_get_member_by_id_optimized(
  IN p_member_id INT
)
READS SQL DATA
DETERMINISTIC
SQL SECURITY DEFINER
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  -- Try cache first
  SELECT 
    member_id,
    membership_number,
    SUBSTRING_INDEX(full_name, ' ', 1) as first_name,
    SUBSTRING_INDEX(full_name, ' ', -1) as last_name,
    email,
    phone as phone_number,
    province_name,
    municipality_name,
    ward_number,
    voting_station_name,
    'Standard' as membership_type,
    join_date,
    expiry_date
  FROM member_cache_summary 
  WHERE member_id = p_member_id 
    AND membership_status = 'Active'
  LIMIT 1;
END //

DELIMITER ;

-- 5. CREATE TRIGGERS TO MAINTAIN CACHE
-- =====================================================

DELIMITER //

-- Trigger to update cache on member insert
CREATE TRIGGER IF NOT EXISTS tr_member_cache_insert
AFTER INSERT ON members
FOR EACH ROW
BEGIN
  INSERT INTO member_cache_summary (
    member_id, id_number, membership_number, full_name,
    email, phone, province_name, municipality_name,
    ward_number, voting_station_name, membership_status,
    join_date, expiry_date
  )
  SELECT 
    NEW.member_id,
    NEW.id_number,
    CONCAT('MEM', LPAD(NEW.member_id, 6, '0')),
    CONCAT(NEW.firstname, ' ', COALESCE(NEW.surname, '')),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.cell_number, ''),
    COALESCE(p.province_name, ''),
    COALESCE(mu.municipality_name, ''),
    COALESCE(w.ward_number, ''),
    COALESCE(vs.station_name, 'Not Available'),
    NEW.membership_status,
    NEW.member_created_at,
    DATE_ADD(NEW.member_created_at, INTERVAL 365 DAY)
  FROM members m
  LEFT JOIN wards w ON NEW.ward_code = w.ward_code
  LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code  
  LEFT JOIN provinces p ON w.province_code = p.province_code
  LEFT JOIN voting_stations vs ON NEW.voting_station_id = vs.station_id
  WHERE m.member_id = NEW.member_id;
END //

-- Trigger to update cache on member update
CREATE TRIGGER IF NOT EXISTS tr_member_cache_update
AFTER UPDATE ON members
FOR EACH ROW
BEGIN
  IF OLD.id_number != NEW.id_number OR 
     OLD.firstname != NEW.firstname OR 
     OLD.surname != NEW.surname OR
     OLD.email != NEW.email OR
     OLD.cell_number != NEW.cell_number OR
     OLD.membership_status != NEW.membership_status THEN
    
    UPDATE member_cache_summary 
    SET 
      id_number = NEW.id_number,
      full_name = CONCAT(NEW.firstname, ' ', COALESCE(NEW.surname, '')),
      email = COALESCE(NEW.email, ''),
      phone = COALESCE(NEW.cell_number, ''),
      membership_status = NEW.membership_status,
      last_updated = CURRENT_TIMESTAMP
    WHERE member_id = NEW.member_id;
  END IF;
END //

DELIMITER ;

-- 6. OPTIMIZE MYSQL CONFIGURATION SETTINGS
-- =====================================================

-- Set optimal configuration for high concurrency
SET GLOBAL innodb_buffer_pool_size = 2147483648; -- 2GB
SET GLOBAL max_connections = 2000;
SET GLOBAL innodb_thread_concurrency = 0; -- Let InnoDB decide
SET GLOBAL innodb_read_io_threads = 8;
SET GLOBAL innodb_write_io_threads = 8;
SET GLOBAL innodb_flush_log_at_trx_commit = 2; -- Better performance, slight durability trade-off
SET GLOBAL query_cache_size = 268435456; -- 256MB
SET GLOBAL query_cache_type = ON;
SET GLOBAL tmp_table_size = 134217728; -- 128MB
SET GLOBAL max_heap_table_size = 134217728; -- 128MB

-- 7. POPULATE INITIAL CACHE DATA
-- =====================================================

-- Populate cache with existing member data
INSERT IGNORE INTO member_cache_summary (
  member_id, id_number, membership_number, full_name,
  email, phone, province_name, municipality_name,
  ward_number, voting_station_name, membership_status,
  join_date, expiry_date
)
SELECT 
  m.member_id,
  m.id_number,
  CONCAT('MEM', LPAD(m.member_id, 6, '0')),
  CONCAT(m.firstname, ' ', COALESCE(m.surname, '')),
  COALESCE(m.email, ''),
  COALESCE(m.cell_number, ''),
  COALESCE(p.province_name, ''),
  COALESCE(mu.municipality_name, ''),
  COALESCE(w.ward_number, ''),
  COALESCE(vs.station_name, 'Not Available'),
  m.membership_status,
  m.member_created_at,
  DATE_ADD(m.member_created_at, INTERVAL 365 DAY)
FROM members m
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code  
LEFT JOIN provinces p ON w.province_code = p.province_code
LEFT JOIN voting_stations vs ON m.voting_station_id = vs.station_id
WHERE m.membership_status = 'Active';

-- 8. CREATE PERFORMANCE MONITORING VIEWS
-- =====================================================

CREATE VIEW IF NOT EXISTS vw_performance_metrics AS
SELECT 
  'Database Connections' as metric_name,
  VARIABLE_VALUE as current_value,
  'connections' as unit
FROM INFORMATION_SCHEMA.GLOBAL_STATUS 
WHERE VARIABLE_NAME = 'Threads_connected'
UNION ALL
SELECT 
  'Query Cache Hit Rate' as metric_name,
  ROUND(
    (SELECT VARIABLE_VALUE FROM INFORMATION_SCHEMA.GLOBAL_STATUS WHERE VARIABLE_NAME = 'Qcache_hits') /
    (SELECT VARIABLE_VALUE FROM INFORMATION_SCHEMA.GLOBAL_STATUS WHERE VARIABLE_NAME = 'Qcache_hits' + 
     SELECT VARIABLE_VALUE FROM INFORMATION_SCHEMA.GLOBAL_STATUS WHERE VARIABLE_NAME = 'Qcache_inserts') * 100, 2
  ) as current_value,
  'percentage' as unit;

-- Performance optimization complete
SELECT 'Performance optimizations applied successfully!' as status;
