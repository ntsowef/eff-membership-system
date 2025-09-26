-- SMS Management System Database Schema
-- Migration: 012_sms_management_system.sql
-- Description: Complete SMS campaign management, templates, and delivery tracking

-- SMS Templates Table
CREATE TABLE IF NOT EXISTS sms_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    variables JSON, -- Store template variables like {name}, {ward}, etc.
    category ENUM('campaign', 'notification', 'reminder', 'announcement', 'custom') DEFAULT 'custom',
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_sms_templates_category (category),
    INDEX idx_sms_templates_active (is_active),
    INDEX idx_sms_templates_created_by (created_by)
);

-- SMS Campaigns Table
CREATE TABLE IF NOT EXISTS sms_campaigns (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_id INT,
    message_content TEXT NOT NULL,
    
    -- Campaign targeting
    target_type ENUM('all', 'province', 'district', 'municipality', 'ward', 'custom', 'list') NOT NULL,
    target_criteria JSON, -- Store targeting criteria
    
    -- Campaign scheduling
    status ENUM('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled', 'failed') DEFAULT 'draft',
    scheduled_at TIMESTAMP NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    
    -- Campaign statistics
    total_recipients INT DEFAULT 0,
    messages_sent INT DEFAULT 0,
    messages_delivered INT DEFAULT 0,
    messages_failed INT DEFAULT 0,
    messages_pending INT DEFAULT 0,
    
    -- Campaign settings
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    send_rate_limit INT DEFAULT 100, -- Messages per minute
    retry_failed BOOLEAN DEFAULT TRUE,
    max_retries INT DEFAULT 3,
    
    -- Metadata
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (template_id) REFERENCES sms_templates(id) ON DELETE SET NULL,
    INDEX idx_sms_campaigns_status (status),
    INDEX idx_sms_campaigns_scheduled (scheduled_at),
    INDEX idx_sms_campaigns_target_type (target_type),
    INDEX idx_sms_campaigns_created_by (created_by)
);

-- SMS Messages Table (Individual message records)
CREATE TABLE IF NOT EXISTS sms_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    campaign_id INT,
    
    -- Recipient information
    recipient_phone VARCHAR(20) NOT NULL,
    recipient_name VARCHAR(255),
    recipient_member_id INT NULL, -- Link to members table if applicable
    
    -- Message content
    message_content TEXT NOT NULL,
    message_length INT,
    sms_parts INT DEFAULT 1, -- Number of SMS parts for long messages
    
    -- Delivery tracking
    status ENUM('pending', 'queued', 'sending', 'sent', 'delivered', 'failed', 'expired') DEFAULT 'pending',
    provider_message_id VARCHAR(255), -- External SMS provider message ID
    
    -- Timestamps
    queued_at TIMESTAMP NULL,
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    failed_at TIMESTAMP NULL,
    
    -- Error handling
    error_code VARCHAR(50),
    error_message TEXT,
    retry_count INT DEFAULT 0,
    
    -- Cost tracking
    cost_per_sms DECIMAL(10, 4) DEFAULT 0.0000,
    total_cost DECIMAL(10, 4) DEFAULT 0.0000,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (campaign_id) REFERENCES sms_campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_member_id) REFERENCES members(member_id) ON DELETE SET NULL,
    
    INDEX idx_sms_messages_campaign (campaign_id),
    INDEX idx_sms_messages_status (status),
    INDEX idx_sms_messages_phone (recipient_phone),
    INDEX idx_sms_messages_member (recipient_member_id),
    INDEX idx_sms_messages_sent_at (sent_at),
    INDEX idx_sms_messages_delivered_at (delivered_at)
);

-- SMS Contact Lists Table
CREATE TABLE IF NOT EXISTS sms_contact_lists (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- List statistics
    total_contacts INT DEFAULT 0,
    active_contacts INT DEFAULT 0,
    
    -- List settings
    is_active BOOLEAN DEFAULT TRUE,
    allow_duplicates BOOLEAN DEFAULT FALSE,
    
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_sms_contact_lists_active (is_active),
    INDEX idx_sms_contact_lists_created_by (created_by)
);

-- SMS Contact List Members Table
CREATE TABLE IF NOT EXISTS sms_contact_list_members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    list_id INT NOT NULL,
    
    -- Contact information
    phone_number VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    member_id INT NULL, -- Link to members table if applicable
    
    -- Additional contact data
    metadata JSON, -- Store additional contact information
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    opted_out BOOLEAN DEFAULT FALSE,
    opted_out_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (list_id) REFERENCES sms_contact_lists(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE SET NULL,
    
    UNIQUE KEY unique_list_phone (list_id, phone_number),
    INDEX idx_sms_contact_list_members_list (list_id),
    INDEX idx_sms_contact_list_members_phone (phone_number),
    INDEX idx_sms_contact_list_members_member (member_id),
    INDEX idx_sms_contact_list_members_active (is_active)
);

-- SMS Delivery Reports Table
CREATE TABLE IF NOT EXISTS sms_delivery_reports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    message_id INT NOT NULL,
    
    -- Delivery status from provider
    delivery_status ENUM('delivered', 'failed', 'expired', 'rejected', 'unknown') NOT NULL,
    delivery_timestamp TIMESTAMP NOT NULL,
    
    -- Provider details
    provider_name VARCHAR(100),
    provider_response JSON,
    
    -- Error details
    error_code VARCHAR(50),
    error_description TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (message_id) REFERENCES sms_messages(id) ON DELETE CASCADE,
    
    INDEX idx_sms_delivery_reports_message (message_id),
    INDEX idx_sms_delivery_reports_status (delivery_status),
    INDEX idx_sms_delivery_reports_timestamp (delivery_timestamp)
);

-- SMS Provider Configuration Table
CREATE TABLE IF NOT EXISTS sms_provider_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider_name VARCHAR(100) NOT NULL,
    
    -- Provider settings
    api_endpoint VARCHAR(500),
    api_key VARCHAR(500),
    api_secret VARCHAR(500),
    sender_id VARCHAR(50),
    
    -- Provider capabilities
    supports_delivery_reports BOOLEAN DEFAULT FALSE,
    supports_unicode BOOLEAN DEFAULT FALSE,
    max_message_length INT DEFAULT 160,
    
    -- Rate limiting
    rate_limit_per_minute INT DEFAULT 100,
    rate_limit_per_hour INT DEFAULT 1000,
    
    -- Cost settings
    cost_per_sms DECIMAL(10, 4) DEFAULT 0.0000,
    
    -- Status
    is_active BOOLEAN DEFAULT FALSE,
    is_primary BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_provider_name (provider_name),
    INDEX idx_sms_provider_config_active (is_active),
    INDEX idx_sms_provider_config_primary (is_primary)
);

-- SMS Campaign Recipients Table (for tracking who should receive each campaign)
CREATE TABLE IF NOT EXISTS sms_campaign_recipients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    campaign_id INT NOT NULL,
    
    -- Recipient details
    phone_number VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    member_id INT NULL,
    
    -- Personalization data
    personalization_data JSON,
    
    -- Status
    status ENUM('pending', 'processed', 'excluded', 'failed') DEFAULT 'pending',
    exclusion_reason VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (campaign_id) REFERENCES sms_campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE SET NULL,
    
    UNIQUE KEY unique_campaign_phone (campaign_id, phone_number),
    INDEX idx_sms_campaign_recipients_campaign (campaign_id),
    INDEX idx_sms_campaign_recipients_phone (phone_number),
    INDEX idx_sms_campaign_recipients_member (member_id),
    INDEX idx_sms_campaign_recipients_status (status)
);

-- Insert default SMS templates
INSERT INTO sms_templates (name, description, content, variables, category, is_active) VALUES
('Welcome Message', 'Welcome new members to the organization', 'Welcome to our organization, {name}! We are excited to have you as a member in {ward}, {municipality}.', '["name", "ward", "municipality"]', 'notification', TRUE),
('Meeting Reminder', 'Remind members about upcoming meetings', 'Reminder: {meeting_title} on {date} at {time} in {location}. Please confirm your attendance.', '["meeting_title", "date", "time", "location"]', 'reminder', TRUE),
('Election Announcement', 'Announce upcoming elections', 'Election Notice: Voting for {position} will take place on {date} from {start_time} to {end_time}. Your vote matters!', '["position", "date", "start_time", "end_time"]', 'announcement', TRUE),
('Payment Reminder', 'Remind members about membership fees', 'Dear {name}, your membership fee of R{amount} is due on {due_date}. Please make payment to avoid suspension.', '["name", "amount", "due_date"]', 'reminder', TRUE),
('Event Invitation', 'Invite members to events', 'You are invited to {event_name} on {date} at {venue}. RSVP by {rsvp_date}. Contact: {contact_number}', '["event_name", "date", "venue", "rsvp_date", "contact_number"]', 'campaign', TRUE);

-- Insert default SMS provider configuration (mock provider for development)
INSERT INTO sms_provider_config (provider_name, api_endpoint, sender_id, supports_delivery_reports, supports_unicode, max_message_length, rate_limit_per_minute, cost_per_sms, is_active, is_primary) VALUES
('Mock SMS Provider', 'http://localhost:5000/api/v1/sms/mock-send', 'MEMBERSHIP', TRUE, TRUE, 160, 1000, 0.0500, TRUE, TRUE);

-- Create indexes for performance optimization
CREATE INDEX idx_sms_messages_campaign_status ON sms_messages(campaign_id, status);
CREATE INDEX idx_sms_messages_status_sent_at ON sms_messages(status, sent_at);
CREATE INDEX idx_sms_campaigns_status_scheduled ON sms_campaigns(status, scheduled_at);

COMMIT;
