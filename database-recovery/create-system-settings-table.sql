-- Create system_settings table for PostgreSQL
-- This table stores system-wide configuration settings

-- Drop table if exists (for clean migration)
DROP TABLE IF EXISTS system_settings CASCADE;

-- Create system_settings table
CREATE TABLE system_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  setting_type VARCHAR(20) NOT NULL DEFAULT 'string',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on setting_key for faster lookups
CREATE INDEX idx_system_settings_key ON system_settings(setting_key);

-- Add constraint to check setting_type values
ALTER TABLE system_settings 
ADD CONSTRAINT chk_setting_type 
CHECK (setting_type IN ('string', 'integer', 'float', 'boolean', 'json'));

-- Insert initial system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('membership_fee', '100.00', 'float', 'Annual membership fee in ZAR'),
('membership_duration', '12', 'integer', 'Membership duration in months'),
('renewal_reminder_days', '30,14,7,1', 'string', 'Days before expiry to send renewal reminders'),
('system_email', 'system@eff.org.za', 'string', 'System email address for notifications'),
('enable_sms_notifications', 'true', 'boolean', 'Whether to enable SMS notifications'),
('analytics_cache_duration', '86400', 'integer', 'Duration in seconds to cache analytics data');

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_system_settings_updated_at
BEFORE UPDATE ON system_settings
FOR EACH ROW
EXECUTE FUNCTION update_system_settings_updated_at();

-- Display created settings
SELECT 
  id,
  setting_key,
  setting_value,
  setting_type,
  description
FROM system_settings
ORDER BY setting_key;

