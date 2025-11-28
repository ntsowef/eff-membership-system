-- Create SMS Webhook and Delivery Tracking Tables
-- These tables are required for SMS delivery tracking and webhook processing

-- Drop tables if they exist (for clean recreation)
DROP TABLE IF EXISTS sms_webhook_log CASCADE;
DROP TABLE IF EXISTS sms_delivery_tracking CASCADE;

-- SMS Webhook Log Table
-- Logs all incoming webhook requests from SMS providers
CREATE TABLE sms_webhook_log (
    id SERIAL PRIMARY KEY,
    provider_name VARCHAR(100) NOT NULL,
    request_method VARCHAR(10) NOT NULL DEFAULT 'POST',
    request_headers TEXT,
    request_body TEXT,
    request_ip VARCHAR(50),
    response_status INTEGER,
    response_message TEXT,
    processed_successfully BOOLEAN DEFAULT FALSE,
    processing_error TEXT,
    message_id VARCHAR(255),
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for webhook log
CREATE INDEX idx_webhook_log_provider ON sms_webhook_log(provider_name);
CREATE INDEX idx_webhook_log_message_id ON sms_webhook_log(message_id);
CREATE INDEX idx_webhook_log_received_at ON sms_webhook_log(received_at DESC);
CREATE INDEX idx_webhook_log_processed ON sms_webhook_log(processed_successfully);

-- SMS Delivery Tracking Table
-- Tracks delivery status of sent SMS messages
CREATE TABLE sms_delivery_tracking (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(255) NOT NULL UNIQUE,
    provider_message_id VARCHAR(255),
    provider_name VARCHAR(100) DEFAULT 'JSON Applink',
    status VARCHAR(50) NOT NULL,
    error_code VARCHAR(100),
    error_message TEXT,
    delivery_timestamp TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    cost DECIMAL(10, 4) DEFAULT 0.0000,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for delivery tracking
CREATE INDEX idx_delivery_tracking_message_id ON sms_delivery_tracking(message_id);
CREATE INDEX idx_delivery_tracking_provider_id ON sms_delivery_tracking(provider_message_id);
CREATE INDEX idx_delivery_tracking_provider_name ON sms_delivery_tracking(provider_name);
CREATE INDEX idx_delivery_tracking_status ON sms_delivery_tracking(status);
CREATE INDEX idx_delivery_tracking_created_at ON sms_delivery_tracking(created_at DESC);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_sms_webhook_log_updated_at
    BEFORE UPDATE ON sms_webhook_log
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sms_delivery_tracking_updated_at
    BEFORE UPDATE ON sms_delivery_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE sms_webhook_log IS 'Logs all incoming webhook requests from SMS providers for audit and debugging';
COMMENT ON TABLE sms_delivery_tracking IS 'Tracks delivery status of sent SMS messages';

COMMENT ON COLUMN sms_webhook_log.provider_name IS 'Name of the SMS provider (e.g., JSON Applink, Twilio)';
COMMENT ON COLUMN sms_webhook_log.request_body IS 'Full webhook request body as JSON';
COMMENT ON COLUMN sms_webhook_log.processed_successfully IS 'Whether the webhook was processed successfully';
COMMENT ON COLUMN sms_webhook_log.message_id IS 'SMS message ID extracted from webhook';

COMMENT ON COLUMN sms_delivery_tracking.message_id IS 'Internal message ID (unique identifier)';
COMMENT ON COLUMN sms_delivery_tracking.provider_message_id IS 'Provider-specific message ID';
COMMENT ON COLUMN sms_delivery_tracking.provider_name IS 'Name of the SMS provider (e.g., JSON Applink, Mock SMS Provider)';
COMMENT ON COLUMN sms_delivery_tracking.status IS 'Delivery status (delivered, failed, pending, etc.)';
COMMENT ON COLUMN sms_delivery_tracking.cost IS 'Cost of sending the SMS in local currency';

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE sms_webhook_log TO eff_admin;
GRANT ALL PRIVILEGES ON TABLE sms_delivery_tracking TO eff_admin;
GRANT USAGE, SELECT ON SEQUENCE sms_webhook_log_id_seq TO eff_admin;
GRANT USAGE, SELECT ON SEQUENCE sms_delivery_tracking_id_seq TO eff_admin;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ SMS webhook and delivery tracking tables created successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - sms_webhook_log (for webhook logging)';
    RAISE NOTICE '  - sms_delivery_tracking (for delivery status tracking)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Start backend server: cd backend && npm run dev';
    RAISE NOTICE '  2. Test webhook: node test/sms/send-and-track-sms.js';
    RAISE NOTICE '  3. Check delivery reports in database';
END $$;

