-- =====================================================================================
-- MIGRATION 040: SMS Delivery Callbacks Table
-- Comprehensive webhook/callback system for SMS delivery status reports
-- =====================================================================================

BEGIN;

-- SMS Delivery Callbacks Table
-- Stores all incoming delivery reports from SMS providers
CREATE TABLE IF NOT EXISTS sms_delivery_callbacks (
    callback_id SERIAL PRIMARY KEY,

    -- Callback identification
    received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,

    -- Message tracking
    message_id VARCHAR(255),
    provider_message_id VARCHAR(255),
    campaign_id INTEGER REFERENCES sms_campaigns(campaign_id) ON DELETE SET NULL,

    -- Provider information
    provider_name VARCHAR(100) NOT NULL DEFAULT 'unknown',
    provider_type VARCHAR(50) DEFAULT 'http',

    -- Delivery status
    delivery_status VARCHAR(30) NOT NULL DEFAULT 'unknown'
        CHECK (delivery_status IN ('delivered', 'failed', 'expired', 'rejected', 'pending', 'sent', 'queued', 'unknown')),
    raw_status VARCHAR(100),

    -- Error tracking
    error_code VARCHAR(100),
    error_message TEXT,
    failure_reason TEXT,

    -- Webhook metadata
    request_headers JSONB,
    request_body JSONB,
    request_ip VARCHAR(45),
    request_method VARCHAR(10) DEFAULT 'POST',
    response_status INTEGER,

    -- Processing status
    processed_successfully BOOLEAN DEFAULT FALSE,
    processing_error TEXT,
    processing_attempts INTEGER DEFAULT 0,
    max_processing_attempts INTEGER DEFAULT 3,

    -- Cost tracking
    cost DECIMAL(10, 4),
    currency VARCHAR(3) DEFAULT 'ZAR',

    -- Signature verification
    signature_valid BOOLEAN,
    signature_header VARCHAR(500),

    -- Timestamps for audit trail
    delivery_timestamp TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sms_callbacks_message_id ON sms_delivery_callbacks(message_id);
CREATE INDEX IF NOT EXISTS idx_sms_callbacks_provider_message_id ON sms_delivery_callbacks(provider_message_id);
CREATE INDEX IF NOT EXISTS idx_sms_callbacks_campaign_id ON sms_delivery_callbacks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sms_callbacks_provider_name ON sms_delivery_callbacks(provider_name);
CREATE INDEX IF NOT EXISTS idx_sms_callbacks_delivery_status ON sms_delivery_callbacks(delivery_status);
CREATE INDEX IF NOT EXISTS idx_sms_callbacks_received_at ON sms_delivery_callbacks(received_at);
CREATE INDEX IF NOT EXISTS idx_sms_callbacks_processed ON sms_delivery_callbacks(processed_successfully);
CREATE INDEX IF NOT EXISTS idx_sms_callbacks_request_ip ON sms_delivery_callbacks(request_ip);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sms_callbacks_provider_status ON sms_delivery_callbacks(provider_name, delivery_status);
CREATE INDEX IF NOT EXISTS idx_sms_callbacks_unprocessed ON sms_delivery_callbacks(processed_successfully, processing_attempts)
    WHERE processed_successfully = FALSE;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_sms_delivery_callbacks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sms_delivery_callbacks_updated_at ON sms_delivery_callbacks;
CREATE TRIGGER trg_sms_delivery_callbacks_updated_at
    BEFORE UPDATE ON sms_delivery_callbacks
    FOR EACH ROW
    EXECUTE FUNCTION update_sms_delivery_callbacks_updated_at();

-- Ensure sms_webhook_log table exists (PostgreSQL version)
CREATE TABLE IF NOT EXISTS sms_webhook_log (
    id SERIAL PRIMARY KEY,
    provider_name VARCHAR(100),
    request_method VARCHAR(10),
    request_headers JSONB,
    request_body JSONB,
    request_ip VARCHAR(45),
    response_status INTEGER,
    response_message TEXT,
    processed_successfully BOOLEAN DEFAULT FALSE,
    processing_error TEXT,
    message_id VARCHAR(255),
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_log_provider ON sms_webhook_log(provider_name);
CREATE INDEX IF NOT EXISTS idx_webhook_log_message_id ON sms_webhook_log(message_id);
CREATE INDEX IF NOT EXISTS idx_webhook_log_received ON sms_webhook_log(received_at);

COMMIT;

