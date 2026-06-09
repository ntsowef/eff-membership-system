-- =====================================================================================
-- Add WhatsApp OTP delivery tracking columns to user_otp_codes table
-- =====================================================================================
-- Purpose: Track WhatsApp OTP delivery status separately from SMS delivery
-- =====================================================================================

-- Add WhatsApp delivery tracking columns
ALTER TABLE user_otp_codes
ADD COLUMN IF NOT EXISTS whatsapp_delivery_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS whatsapp_delivered_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS whatsapp_delivery_error TEXT;

-- Add comments
COMMENT ON COLUMN user_otp_codes.whatsapp_delivery_status IS 'WhatsApp OTP delivery status: pending, sent, failed, not_attempted';
COMMENT ON COLUMN user_otp_codes.whatsapp_delivered_at IS 'Timestamp when WhatsApp OTP delivery was attempted';
COMMENT ON COLUMN user_otp_codes.whatsapp_delivery_error IS 'Error message if WhatsApp delivery failed';

