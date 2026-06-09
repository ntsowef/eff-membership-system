-- Migration 040b: Add missing columns to sms_delivery_callbacks

-- Add missing columns
ALTER TABLE sms_delivery_callbacks ADD COLUMN IF NOT EXISTS raw_status VARCHAR(100);
ALTER TABLE sms_delivery_callbacks ADD COLUMN IF NOT EXISTS request_method VARCHAR(10) DEFAULT 'POST';
ALTER TABLE sms_delivery_callbacks ADD COLUMN IF NOT EXISTS processing_attempts INTEGER DEFAULT 0;
ALTER TABLE sms_delivery_callbacks ADD COLUMN IF NOT EXISTS max_processing_attempts INTEGER DEFAULT 3;
ALTER TABLE sms_delivery_callbacks ADD COLUMN IF NOT EXISTS cost DECIMAL(10, 4);
ALTER TABLE sms_delivery_callbacks ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'ZAR';
ALTER TABLE sms_delivery_callbacks ADD COLUMN IF NOT EXISTS signature_valid BOOLEAN;
ALTER TABLE sms_delivery_callbacks ADD COLUMN IF NOT EXISTS signature_header VARCHAR(500);
ALTER TABLE sms_delivery_callbacks ADD COLUMN IF NOT EXISTS delivery_timestamp TIMESTAMP;

-- Rename id to callback_id if needed (skip if already callback_id)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sms_delivery_callbacks' AND column_name='id') THEN
        ALTER TABLE sms_delivery_callbacks RENAME COLUMN id TO callback_id;
    END IF;
END $$;

-- Add check constraint on delivery_status if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sms_delivery_callbacks_status_check') THEN
        ALTER TABLE sms_delivery_callbacks ADD CONSTRAINT sms_delivery_callbacks_status_check
            CHECK (delivery_status IN ('delivered', 'failed', 'expired', 'rejected', 'pending', 'sent', 'queued', 'unknown'));
    END IF;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Check constraint may already exist or delivery_status has incompatible values';
END $$;

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_sms_callbacks_provider_status ON sms_delivery_callbacks(provider_name, delivery_status);
CREATE INDEX IF NOT EXISTS idx_sms_callbacks_unprocessed ON sms_delivery_callbacks(processed_successfully, processing_attempts)
    WHERE processed_successfully = FALSE;

-- Ensure sms_webhook_log table exists
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

