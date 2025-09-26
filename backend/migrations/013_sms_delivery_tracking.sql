-- SMS Delivery Tracking Migration
-- This migration adds comprehensive SMS delivery tracking and monitoring capabilities

-- SMS Delivery Tracking Table
CREATE TABLE IF NOT EXISTS sms_delivery_tracking (
    id INT PRIMARY KEY AUTO_INCREMENT,
    message_id VARCHAR(255) NOT NULL,
    provider_message_id VARCHAR(255),
    
    -- Delivery status tracking
    status ENUM('pending', 'queued', 'sending', 'sent', 'delivered', 'failed', 'expired') DEFAULT 'pending',
    delivery_timestamp TIMESTAMP NULL,
    
    -- Error tracking
    error_code VARCHAR(50),
    error_message TEXT,
    
    -- Retry tracking
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    
    -- Cost tracking
    cost DECIMAL(10, 4) DEFAULT 0.0000,
    
    -- Metadata
    provider_name VARCHAR(100),
    webhook_data JSON,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_message_id (message_id),
    INDEX idx_provider_message_id (provider_message_id),
    INDEX idx_status (status),
    INDEX idx_delivery_timestamp (delivery_timestamp),
    INDEX idx_retry_count (retry_count),
    INDEX idx_created_at (created_at),
    
    -- Composite indexes for common queries
    INDEX idx_status_retry (status, retry_count),
    INDEX idx_status_created (status, created_at),
    
    -- Unique constraint to prevent duplicate tracking entries
    UNIQUE KEY uk_message_provider (message_id, provider_message_id)
);

-- SMS Provider Health Monitoring Table
CREATE TABLE IF NOT EXISTS sms_provider_health (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider_name VARCHAR(100) NOT NULL,
    
    -- Health status
    is_healthy BOOLEAN DEFAULT TRUE,
    health_message TEXT,
    response_time_ms INT,
    
    -- Error tracking
    consecutive_failures INT DEFAULT 0,
    last_error_message TEXT,
    last_error_timestamp TIMESTAMP NULL,
    
    -- Performance metrics
    success_rate_24h DECIMAL(5, 2) DEFAULT 100.00,
    average_response_time_24h INT DEFAULT 0,
    total_messages_24h INT DEFAULT 0,
    
    -- Timestamps
    last_check_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_provider_name (provider_name),
    INDEX idx_is_healthy (is_healthy),
    INDEX idx_last_check (last_check_timestamp),
    
    -- Unique constraint for provider
    UNIQUE KEY uk_provider_name (provider_name)
);

-- SMS Rate Limiting Table
CREATE TABLE IF NOT EXISTS sms_rate_limits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider_name VARCHAR(100) NOT NULL,
    
    -- Rate limiting configuration
    requests_per_minute INT DEFAULT 100,
    requests_per_hour INT DEFAULT 1000,
    requests_per_day INT DEFAULT 10000,
    
    -- Current usage tracking
    current_minute_count INT DEFAULT 0,
    current_hour_count INT DEFAULT 0,
    current_day_count INT DEFAULT 0,
    
    -- Reset timestamps
    minute_reset_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hour_reset_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    day_reset_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_provider_name (provider_name),
    INDEX idx_minute_reset (minute_reset_time),
    INDEX idx_hour_reset (hour_reset_time),
    INDEX idx_day_reset (day_reset_time),
    
    -- Unique constraint for provider
    UNIQUE KEY uk_provider_name (provider_name)
);

-- SMS Webhook Log Table (for debugging and audit)
CREATE TABLE IF NOT EXISTS sms_webhook_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider_name VARCHAR(100),
    
    -- Request details
    request_method VARCHAR(10),
    request_headers JSON,
    request_body JSON,
    request_ip VARCHAR(45),
    
    -- Response details
    response_status INT,
    response_message TEXT,
    
    -- Processing details
    processed_successfully BOOLEAN DEFAULT FALSE,
    processing_error TEXT,
    message_id VARCHAR(255),
    
    -- Timestamps
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    
    -- Indexes
    INDEX idx_provider_name (provider_name),
    INDEX idx_message_id (message_id),
    INDEX idx_received_at (received_at),
    INDEX idx_processed_successfully (processed_successfully)
);

-- Insert default provider health records
INSERT IGNORE INTO sms_provider_health (provider_name, is_healthy, health_message) VALUES
('JSON Applink', TRUE, 'Provider initialized'),
('Mock SMS Provider', TRUE, 'Mock provider always healthy'),
('Twilio', TRUE, 'Provider initialized'),
('Clickatell', TRUE, 'Provider initialized');

-- Insert default rate limit configurations
INSERT IGNORE INTO sms_rate_limits (provider_name, requests_per_minute, requests_per_hour, requests_per_day) VALUES
('JSON Applink', 100, 1000, 10000),
('Mock SMS Provider', 1000, 10000, 100000),
('Twilio', 100, 1000, 10000),
('Clickatell', 100, 1000, 10000);

-- Create view for SMS delivery analytics
CREATE OR REPLACE VIEW vw_sms_delivery_analytics AS
SELECT 
    DATE(created_at) as delivery_date,
    provider_name,
    status,
    COUNT(*) as message_count,
    ROUND(AVG(cost), 4) as average_cost,
    SUM(cost) as total_cost,
    ROUND(AVG(retry_count), 2) as average_retries,
    MIN(created_at) as first_message_time,
    MAX(created_at) as last_message_time
FROM sms_delivery_tracking
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(created_at), provider_name, status
ORDER BY delivery_date DESC, provider_name, status;

-- Create view for provider performance metrics
CREATE OR REPLACE VIEW vw_sms_provider_performance AS
SELECT 
    sph.provider_name,
    sph.is_healthy,
    sph.health_message,
    sph.response_time_ms,
    sph.success_rate_24h,
    sph.average_response_time_24h,
    sph.total_messages_24h,
    sph.consecutive_failures,
    sph.last_check_timestamp,
    
    -- Rate limit information
    srl.requests_per_minute,
    srl.current_minute_count,
    srl.requests_per_hour,
    srl.current_hour_count,
    srl.requests_per_day,
    srl.current_day_count,
    
    -- Recent delivery statistics
    COALESCE(recent_stats.total_messages, 0) as recent_total_messages,
    COALESCE(recent_stats.delivered_messages, 0) as recent_delivered_messages,
    COALESCE(recent_stats.failed_messages, 0) as recent_failed_messages,
    COALESCE(ROUND((recent_stats.delivered_messages / NULLIF(recent_stats.total_messages, 0)) * 100, 2), 0) as recent_delivery_rate
    
FROM sms_provider_health sph
LEFT JOIN sms_rate_limits srl ON sph.provider_name = srl.provider_name
LEFT JOIN (
    SELECT 
        provider_name,
        COUNT(*) as total_messages,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_messages,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_messages
    FROM sms_delivery_tracking
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    GROUP BY provider_name
) recent_stats ON sph.provider_name = recent_stats.provider_name;

-- Add indexes to existing SMS tables for better performance
ALTER TABLE sms_messages 
ADD INDEX IF NOT EXISTS idx_provider_message_id (provider_message_id),
ADD INDEX IF NOT EXISTS idx_status_created (status, created_at),
ADD INDEX IF NOT EXISTS idx_campaign_status (campaign_id, status);

ALTER TABLE sms_campaigns
ADD INDEX IF NOT EXISTS idx_status_scheduled (status, scheduled_at),
ADD INDEX IF NOT EXISTS idx_target_type (target_type);

-- Update existing SMS messages table to include delivery tracking reference
ALTER TABLE sms_messages 
ADD COLUMN IF NOT EXISTS delivery_tracking_id INT,
ADD INDEX IF NOT EXISTS idx_delivery_tracking_id (delivery_tracking_id);
