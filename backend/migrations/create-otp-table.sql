-- =====================================================================================
-- OTP (One-Time Password) Table for Multi-Factor Authentication
-- =====================================================================================
-- Purpose: Store OTP codes for Provincial, Municipality, and Ward Admin users
-- Security: OTP codes are hashed before storage
-- Validity: OTPs are valid for 24 hours from generation
-- =====================================================================================

-- Drop table if exists (for clean migration)
DROP TABLE IF EXISTS user_otp_codes CASCADE;

-- Create OTP codes table
CREATE TABLE user_otp_codes (
  otp_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  
  -- OTP details
  otp_code_hash VARCHAR(255) NOT NULL, -- Hashed OTP code for security
  otp_plain VARCHAR(10), -- Plain OTP for SMS sending (cleared after sending)
  
  -- Timestamps
  generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL, -- OTP expires after 24 hours
  validated_at TIMESTAMP, -- When OTP was successfully validated
  
  -- Status tracking
  is_validated BOOLEAN DEFAULT FALSE,
  is_expired BOOLEAN DEFAULT FALSE,
  attempts_count INTEGER DEFAULT 0, -- Track validation attempts
  max_attempts INTEGER DEFAULT 5, -- Maximum validation attempts allowed
  
  -- Session tracking
  session_token VARCHAR(255), -- Token generated after successful OTP validation
  session_expires_at TIMESTAMP, -- Session expires after 24 hours
  
  -- Delivery tracking
  sent_to_number VARCHAR(20), -- Phone number where OTP was sent
  delivery_status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed
  delivery_attempted_at TIMESTAMP,
  delivery_error TEXT,
  
  -- Security and audit
  ip_address VARCHAR(45), -- IP address from which OTP was requested
  user_agent TEXT, -- Browser/device information
  invalidated_at TIMESTAMP, -- When OTP was manually invalidated
  invalidation_reason VARCHAR(255), -- Reason for invalidation (e.g., 'new_otp_requested')
  
  -- Audit fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_user_otp_user_id ON user_otp_codes(user_id);
CREATE INDEX idx_user_otp_expires_at ON user_otp_codes(expires_at);
CREATE INDEX idx_user_otp_validated ON user_otp_codes(is_validated, expires_at);
CREATE INDEX idx_user_otp_session_token ON user_otp_codes(session_token);
CREATE INDEX idx_user_otp_generated_at ON user_otp_codes(generated_at);

-- Create composite index for active OTP lookup
CREATE INDEX idx_user_otp_active ON user_otp_codes(user_id, is_validated, is_expired, expires_at);

-- Add comments for documentation
COMMENT ON TABLE user_otp_codes IS 'Stores OTP codes for multi-factor authentication for Provincial, Municipality, and Ward Admin users';
COMMENT ON COLUMN user_otp_codes.otp_code_hash IS 'Hashed OTP code using bcrypt for security';
COMMENT ON COLUMN user_otp_codes.otp_plain IS 'Plain OTP for SMS sending, cleared immediately after sending';
COMMENT ON COLUMN user_otp_codes.expires_at IS 'OTP expires 24 hours after generation';
COMMENT ON COLUMN user_otp_codes.session_token IS 'JWT token generated after successful OTP validation, valid for 24 hours';
COMMENT ON COLUMN user_otp_codes.attempts_count IS 'Number of validation attempts to prevent brute force';
COMMENT ON COLUMN user_otp_codes.invalidation_reason IS 'Reason for invalidation: new_otp_requested, max_attempts_exceeded, manual_invalidation';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_otp_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_otp_codes_updated_at
  BEFORE UPDATE ON user_otp_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_user_otp_codes_updated_at();

-- Create function to automatically mark expired OTPs
CREATE OR REPLACE FUNCTION mark_expired_otps()
RETURNS void AS $$
BEGIN
  UPDATE user_otp_codes
  SET is_expired = TRUE
  WHERE expires_at < CURRENT_TIMESTAMP
    AND is_expired = FALSE
    AND is_validated = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Create function to invalidate previous OTPs when new one is generated
CREATE OR REPLACE FUNCTION invalidate_previous_otps()
RETURNS TRIGGER AS $$
BEGIN
  -- Invalidate all previous non-validated OTPs for this user
  UPDATE user_otp_codes
  SET 
    invalidated_at = CURRENT_TIMESTAMP,
    invalidation_reason = 'new_otp_requested',
    is_expired = TRUE
  WHERE user_id = NEW.user_id
    AND otp_id != NEW.otp_id
    AND is_validated = FALSE
    AND invalidated_at IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_invalidate_previous_otps
  AFTER INSERT ON user_otp_codes
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_previous_otps();

-- Create view for active OTPs (for easy querying)
CREATE OR REPLACE VIEW vw_active_otps AS
SELECT 
  otp_id,
  user_id,
  otp_code_hash,
  generated_at,
  expires_at,
  attempts_count,
  max_attempts,
  sent_to_number,
  delivery_status,
  ip_address,
  EXTRACT(EPOCH FROM (expires_at - CURRENT_TIMESTAMP)) / 3600 AS hours_until_expiry
FROM user_otp_codes
WHERE is_validated = FALSE
  AND is_expired = FALSE
  AND expires_at > CURRENT_TIMESTAMP
  AND invalidated_at IS NULL
  AND attempts_count < max_attempts;

COMMENT ON VIEW vw_active_otps IS 'View of currently active (non-validated, non-expired) OTP codes';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON user_otp_codes TO your_app_user;
-- GRANT SELECT ON vw_active_otps TO your_app_user;

