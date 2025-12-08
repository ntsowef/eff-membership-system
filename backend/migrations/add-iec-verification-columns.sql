-- Migration: Add IEC verification columns to membership_applications table
-- Date: 2025-11-10
-- Purpose: Store IEC voter verification data for use during member approval process

-- Add columns to store IEC verification data
ALTER TABLE membership_applications 
ADD COLUMN IF NOT EXISTS iec_verification_data JSONB,
ADD COLUMN IF NOT EXISTS iec_is_registered BOOLEAN,
ADD COLUMN IF NOT EXISTS iec_voter_status VARCHAR(100);

-- Add comments for documentation
COMMENT ON COLUMN membership_applications.iec_verification_data IS 'Full IEC API verification response stored as JSON';
COMMENT ON COLUMN membership_applications.iec_is_registered IS 'Boolean flag indicating if voter is registered with IEC';
COMMENT ON COLUMN membership_applications.iec_voter_status IS 'IEC voter status text (e.g., "You are registered.", "Not Registered")';

-- Create index for faster queries on voter registration status
CREATE INDEX IF NOT EXISTS idx_membership_applications_iec_registered 
ON membership_applications(iec_is_registered) 
WHERE iec_is_registered IS NOT NULL;

COMMENT ON INDEX idx_membership_applications_iec_registered IS 'Index for filtering applications by IEC registration status';

-- Create reference table for special voting district codes
CREATE TABLE IF NOT EXISTS voting_district_special_codes (
  code VARCHAR(20) PRIMARY KEY,
  description VARCHAR(255) NOT NULL,
  usage_context TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE voting_district_special_codes IS 'Reference table for special voting district codes used when IEC data is unavailable or voter is not registered';

-- Insert special codes
INSERT INTO voting_district_special_codes (code, description, usage_context) VALUES
  ('222222222', 'Registered - No VD Data', 'IEC confirmed voter registration but no voting district number was returned'),
  ('999999999', 'Not Registered to Vote', 'IEC confirmed person is NOT registered to vote'),
  ('888888888', 'Verification Failed/Pending', 'IEC verification failed or is pending verification')
ON CONFLICT (code) DO UPDATE SET
  description = EXCLUDED.description,
  usage_context = EXCLUDED.usage_context;

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'membership_applications'
  AND column_name IN ('iec_verification_data', 'iec_is_registered', 'iec_voter_status')
ORDER BY ordinal_position;

-- Show special codes
SELECT * FROM voting_district_special_codes ORDER BY code;

COMMENT ON TABLE voting_district_special_codes IS 'Reference table for special voting district codes';

