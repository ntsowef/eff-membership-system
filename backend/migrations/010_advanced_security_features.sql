-- Advanced Security Features Migration
-- This migration adds comprehensive security features including MFA, session management, and security logging

START TRANSACTION;

-- 1. Add security fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS account_locked BOOLEAN DEFAULT FALSE AFTER is_active,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP NULL AFTER account_locked,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP NULL AFTER locked_until,
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER password,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP NULL AFTER password_changed_at,
ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45) NULL AFTER last_login_at,
ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0 AFTER last_login_ip,
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255) NULL AFTER failed_login_attempts,
ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP NULL AFTER password_reset_token;

-- 2. Create user_mfa_settings table for Multi-Factor Authentication
CREATE TABLE IF NOT EXISTS user_mfa_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  secret_key VARCHAR(255) NOT NULL,
  backup_codes JSON NULL,
  is_enabled BOOLEAN DEFAULT FALSE,
  enabled_at TIMESTAMP NULL,
  disabled_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_user_mfa_settings_user (user_id),
  INDEX idx_user_mfa_settings_enabled (is_enabled),
  
  -- Unique constraint
  UNIQUE KEY unique_mfa_per_user (user_id)
);

-- 3. Create login_attempts table for tracking login attempts
CREATE TABLE IF NOT EXISTS login_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  email VARCHAR(255) NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT NULL,
  success BOOLEAN NOT NULL,
  failure_reason VARCHAR(100) NULL,
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_login_attempts_user (user_id),
  INDEX idx_login_attempts_ip (ip_address),
  INDEX idx_login_attempts_success (success),
  INDEX idx_login_attempts_attempted_at (attempted_at),
  INDEX idx_login_attempts_user_time (user_id, attempted_at)
);

-- 4. Create user_sessions table for session management
CREATE TABLE IF NOT EXISTS user_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT NULL,
  expires_at TIMESTAMP NOT NULL,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_user_sessions_session_id (session_id),
  INDEX idx_user_sessions_user (user_id),
  INDEX idx_user_sessions_expires (expires_at),
  INDEX idx_user_sessions_active (is_active),
  INDEX idx_user_sessions_ip (ip_address)
);

-- 5. Create security_events table for comprehensive security logging
CREATE TABLE IF NOT EXISTS security_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  event_type ENUM('login', 'logout', 'password_change', 'mfa_setup', 'account_locked', 'suspicious_activity', 'permission_change', 'data_access') NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT NULL,
  details JSON NULL,
  severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_security_events_user (user_id),
  INDEX idx_security_events_type (event_type),
  INDEX idx_security_events_ip (ip_address),
  INDEX idx_security_events_severity (severity),
  INDEX idx_security_events_created_at (created_at),
  INDEX idx_security_events_user_type (user_id, event_type)
);

-- 6. Create user_security_settings table for per-user security preferences
CREATE TABLE IF NOT EXISTS user_security_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  session_timeout_minutes INT DEFAULT 1440, -- 24 hours
  max_failed_attempts INT DEFAULT 5,
  lockout_duration_minutes INT DEFAULT 30,
  password_expiry_days INT DEFAULT 90,
  require_password_change BOOLEAN DEFAULT FALSE,
  email_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_user_security_settings_user (user_id),
  
  -- Unique constraint
  UNIQUE KEY unique_security_settings_per_user (user_id)
);

-- 7. Create password_history table to prevent password reuse
CREATE TABLE IF NOT EXISTS password_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_password_history_user (user_id),
  INDEX idx_password_history_created_at (created_at)
);

-- 8. Create api_rate_limits table for API rate limiting
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL, -- IP address or user ID
  identifier_type ENUM('ip', 'user') NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  requests_count INT DEFAULT 1,
  window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  window_end TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_api_rate_limits_identifier (identifier, identifier_type),
  INDEX idx_api_rate_limits_endpoint (endpoint),
  INDEX idx_api_rate_limits_window (window_start, window_end),
  
  -- Unique constraint for rate limiting windows
  UNIQUE KEY unique_rate_limit_window (identifier, identifier_type, endpoint, window_start)
);

-- 9. Create security_policies table for configurable security policies
CREATE TABLE IF NOT EXISTS security_policies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  policy_name VARCHAR(100) NOT NULL UNIQUE,
  policy_value TEXT NOT NULL,
  policy_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
  description TEXT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_security_policies_name (policy_name),
  INDEX idx_security_policies_active (is_active)
);

-- 10. Insert default security policies
INSERT INTO security_policies (policy_name, policy_value, policy_type, description) VALUES
('max_failed_login_attempts', '5', 'number', 'Maximum failed login attempts before account lockout'),
('account_lockout_duration', '30', 'number', 'Account lockout duration in minutes'),
('session_timeout', '1440', 'number', 'Session timeout in minutes'),
('password_min_length', '8', 'number', 'Minimum password length'),
('password_require_uppercase', 'true', 'boolean', 'Require uppercase letters in password'),
('password_require_lowercase', 'true', 'boolean', 'Require lowercase letters in password'),
('password_require_numbers', 'true', 'boolean', 'Require numbers in password'),
('password_require_symbols', 'true', 'boolean', 'Require symbols in password'),
('password_expiry_days', '90', 'number', 'Password expiry in days'),
('password_history_count', '5', 'number', 'Number of previous passwords to remember'),
('mfa_required_for_admins', 'true', 'boolean', 'Require MFA for admin users'),
('api_rate_limit_per_minute', '100', 'number', 'API requests per minute per user'),
('suspicious_activity_threshold', '3', 'number', 'Number of different IPs to trigger suspicious activity alert');

-- 11. Create security_alerts table for security notifications
CREATE TABLE IF NOT EXISTS security_alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  alert_type ENUM('account_locked', 'suspicious_login', 'multiple_failed_attempts', 'password_expired', 'mfa_disabled', 'admin_action') NOT NULL,
  user_id INT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  severity ENUM('info', 'warning', 'error', 'critical') DEFAULT 'warning',
  is_read BOOLEAN DEFAULT FALSE,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_by INT NULL,
  resolved_at TIMESTAMP NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_security_alerts_type (alert_type),
  INDEX idx_security_alerts_user (user_id),
  INDEX idx_security_alerts_severity (severity),
  INDEX idx_security_alerts_read (is_read),
  INDEX idx_security_alerts_resolved (is_resolved),
  INDEX idx_security_alerts_created_at (created_at)
);

-- 12. Create trusted_devices table for device management
CREATE TABLE IF NOT EXISTS trusted_devices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  device_fingerprint VARCHAR(255) NOT NULL,
  device_name VARCHAR(255) NULL,
  device_type VARCHAR(50) NULL,
  browser VARCHAR(100) NULL,
  os VARCHAR(100) NULL,
  ip_address VARCHAR(45) NOT NULL,
  is_trusted BOOLEAN DEFAULT FALSE,
  trusted_at TIMESTAMP NULL,
  last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_trusted_devices_user (user_id),
  INDEX idx_trusted_devices_fingerprint (device_fingerprint),
  INDEX idx_trusted_devices_trusted (is_trusted),
  INDEX idx_trusted_devices_expires (expires_at),
  
  -- Unique constraint
  UNIQUE KEY unique_device_per_user (user_id, device_fingerprint)
);

-- 13. Create views for security monitoring
CREATE OR REPLACE VIEW vw_security_dashboard AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_events,
  COUNT(CASE WHEN event_type = 'login' THEN 1 END) as login_events,
  COUNT(CASE WHEN event_type = 'account_locked' THEN 1 END) as lockout_events,
  COUNT(CASE WHEN event_type = 'suspicious_activity' THEN 1 END) as suspicious_events,
  COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_events,
  COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_severity_events,
  COUNT(DISTINCT user_id) as affected_users,
  COUNT(DISTINCT ip_address) as unique_ips
FROM security_events
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 14. Create view for failed login analysis
CREATE OR REPLACE VIEW vw_failed_login_analysis AS
SELECT 
  ip_address,
  COUNT(*) as failed_attempts,
  COUNT(DISTINCT user_id) as targeted_users,
  MIN(attempted_at) as first_attempt,
  MAX(attempted_at) as last_attempt,
  COUNT(CASE WHEN attempted_at > DATE_SUB(NOW(), INTERVAL 1 HOUR) THEN 1 END) as recent_attempts
FROM login_attempts
WHERE success = FALSE
AND attempted_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY ip_address
HAVING failed_attempts >= 5
ORDER BY failed_attempts DESC, recent_attempts DESC;

-- 15. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_account_locked ON users(account_locked, locked_until);
CREATE INDEX IF NOT EXISTS idx_users_password_changed ON users(password_changed_at);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at);

-- 16. Create triggers for security automation
DELIMITER //

-- Trigger to update password_changed_at when password is updated
CREATE TRIGGER IF NOT EXISTS tr_users_password_update
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
  IF OLD.password != NEW.password THEN
    SET NEW.password_changed_at = NOW();
    SET NEW.failed_login_attempts = 0;
    SET NEW.account_locked = FALSE;
    SET NEW.locked_until = NULL;
  END IF;
END//

-- Trigger to log password changes in history
CREATE TRIGGER IF NOT EXISTS tr_password_history_insert
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  IF OLD.password != NEW.password THEN
    INSERT INTO password_history (user_id, password_hash, created_at)
    VALUES (NEW.id, NEW.password, NOW());
    
    -- Keep only last 5 passwords
    DELETE FROM password_history 
    WHERE user_id = NEW.id 
    AND id NOT IN (
      SELECT id FROM (
        SELECT id FROM password_history 
        WHERE user_id = NEW.id 
        ORDER BY created_at DESC 
        LIMIT 5
      ) as recent_passwords
    );
  END IF;
END//

-- Trigger to clean up expired sessions
CREATE EVENT IF NOT EXISTS ev_cleanup_expired_sessions
ON SCHEDULE EVERY 1 HOUR
DO
BEGIN
  DELETE FROM user_sessions WHERE expires_at < NOW();
  DELETE FROM api_rate_limits WHERE window_end < DATE_SUB(NOW(), INTERVAL 1 DAY);
  DELETE FROM login_attempts WHERE attempted_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
END//

DELIMITER ;

-- 17. Enable event scheduler
SET GLOBAL event_scheduler = ON;

COMMIT;
