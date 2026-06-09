-- Migration: SMS Send Log Table
-- Description: Creates a unified table to log all SMS sends with source tracking and delivery status
-- Date: 2026-02-06

-- SMS Send Log Table - tracks all SMS messages sent from any source
CREATE TABLE IF NOT EXISTS sms_send_log (
    id SERIAL PRIMARY KEY,
    
    -- Message identification
    message_id VARCHAR(255) NOT NULL UNIQUE,
    provider_message_id VARCHAR(255),
    
    -- Source tracking
    source_type VARCHAR(50) NOT NULL, -- 'quick_send', 'birthday', 'campaign', 'expiration_reminder', 'bulk'
    source_reference_id VARCHAR(255), -- Reference to campaign_id, birthday_record_id, etc.
    
    -- Recipient information
    recipient_phone VARCHAR(20) NOT NULL,
    recipient_name VARCHAR(255),
    recipient_member_id VARCHAR(50),
    
    -- Message content
    message_content TEXT NOT NULL,
    message_length INT,
    
    -- Sender information
    sender_id INT, -- User who initiated the send
    sender_name VARCHAR(255),
    
    -- Delivery tracking
    status VARCHAR(50) DEFAULT 'pending', -- pending, queued, sending, sent, delivered, failed, expired
    delivery_timestamp TIMESTAMP,
    
    -- Error tracking
    error_code VARCHAR(100),
    error_message TEXT,
    
    -- Retry tracking
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    last_retry_at TIMESTAMP,
    
    -- Cost tracking
    cost DECIMAL(10, 4) DEFAULT 0.0000,
    
    -- Provider information
    provider_name VARCHAR(100) DEFAULT 'JSON Applink',
    
    -- Webhook data (for debugging)
    webhook_data JSONB,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    CONSTRAINT chk_source_type CHECK (source_type IN ('quick_send', 'birthday', 'campaign', 'expiration_reminder', 'bulk', 'manual'))
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_sms_send_log_message_id ON sms_send_log(message_id);
CREATE INDEX IF NOT EXISTS idx_sms_send_log_source_type ON sms_send_log(source_type);
CREATE INDEX IF NOT EXISTS idx_sms_send_log_recipient_phone ON sms_send_log(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_sms_send_log_recipient_member_id ON sms_send_log(recipient_member_id);
CREATE INDEX IF NOT EXISTS idx_sms_send_log_status ON sms_send_log(status);
CREATE INDEX IF NOT EXISTS idx_sms_send_log_created_at ON sms_send_log(created_at);
CREATE INDEX IF NOT EXISTS idx_sms_send_log_source_reference ON sms_send_log(source_type, source_reference_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sms_send_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sms_send_log_updated_at ON sms_send_log;
CREATE TRIGGER trigger_sms_send_log_updated_at
    BEFORE UPDATE ON sms_send_log
    FOR EACH ROW
    EXECUTE FUNCTION update_sms_send_log_updated_at();

-- View for SMS delivery statistics by source
CREATE OR REPLACE VIEW vw_sms_delivery_stats_by_source AS
SELECT 
    source_type,
    COUNT(*) as total_messages,
    SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
    SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
    ROUND(SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as delivery_rate,
    SUM(cost) as total_cost,
    MAX(created_at) as last_sent_at
FROM sms_send_log
GROUP BY source_type;

-- View for daily SMS statistics
CREATE OR REPLACE VIEW vw_sms_daily_stats AS
SELECT 
    DATE(created_at) as send_date,
    source_type,
    COUNT(*) as total_messages,
    SUM(CASE WHEN status IN ('delivered', 'sent') THEN 1 ELSE 0 END) as successful,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
    SUM(cost) as total_cost
FROM sms_send_log
GROUP BY DATE(created_at), source_type
ORDER BY send_date DESC, source_type;

-- Comment on table
COMMENT ON TABLE sms_send_log IS 'Unified log of all SMS messages sent from the system with delivery tracking';
COMMENT ON COLUMN sms_send_log.source_type IS 'Source of the SMS: quick_send, birthday, campaign, expiration_reminder, bulk, manual';
COMMENT ON COLUMN sms_send_log.source_reference_id IS 'Reference ID to the source record (campaign_id, etc.)';

