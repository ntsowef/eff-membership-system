-- Communication Module Database Schema
-- Extends existing notification system for comprehensive communication features

-- Message Templates Table
CREATE TABLE message_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_type ENUM('Email', 'SMS', 'In-App', 'Push') NOT NULL,
  category ENUM('System', 'Marketing', 'Announcement', 'Reminder', 'Welcome', 'Custom') DEFAULT 'Custom',
  subject VARCHAR(500), -- For email templates
  content TEXT NOT NULL,
  variables JSON, -- Template variables like {{member_name}}, {{expiry_date}}
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_template_type (template_type),
  INDEX idx_category (category),
  INDEX idx_active (is_active)
);

-- Communication Campaigns Table
CREATE TABLE communication_campaigns (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  campaign_type ENUM('Mass', 'Targeted', 'Individual') NOT NULL,
  status ENUM('Draft', 'Scheduled', 'Sending', 'Completed', 'Cancelled', 'Failed') DEFAULT 'Draft',
  template_id INT,
  delivery_channels JSON, -- ['Email', 'SMS', 'In-App']
  
  -- Targeting criteria
  target_criteria JSON, -- Geographic, demographic, membership filters
  recipient_count INT DEFAULT 0,
  
  -- Scheduling
  scheduled_at TIMESTAMP NULL,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  
  -- Tracking
  total_sent INT DEFAULT 0,
  total_delivered INT DEFAULT 0,
  total_failed INT DEFAULT 0,
  total_opened INT DEFAULT 0, -- Email tracking
  total_clicked INT DEFAULT 0, -- Link tracking
  
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (template_id) REFERENCES message_templates(id) ON DELETE SET NULL,
  INDEX idx_campaign_status (status),
  INDEX idx_campaign_type (campaign_type),
  INDEX idx_scheduled_at (scheduled_at),
  INDEX idx_created_by (created_by)
);

-- Individual Messages/Conversations Table
CREATE TABLE messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  conversation_id VARCHAR(50) NOT NULL, -- UUID for grouping related messages
  campaign_id INT NULL, -- Link to campaign if part of mass communication
  
  -- Sender/Recipient
  sender_type ENUM('Admin', 'Member', 'System') NOT NULL,
  sender_id INT NULL, -- user_id or member_id based on sender_type
  recipient_type ENUM('Admin', 'Member', 'All') NOT NULL,
  recipient_id INT NULL, -- user_id or member_id based on recipient_type
  
  -- Message content
  subject VARCHAR(500),
  content TEXT NOT NULL,
  message_type ENUM('Text', 'HTML', 'Template') DEFAULT 'Text',
  template_id INT NULL,
  template_data JSON, -- Data for template variables
  
  -- Delivery
  delivery_channels JSON, -- ['Email', 'SMS', 'In-App']
  delivery_status ENUM('Draft', 'Queued', 'Sending', 'Sent', 'Delivered', 'Failed', 'Read') DEFAULT 'Draft',
  
  -- Tracking
  sent_at TIMESTAMP NULL,
  delivered_at TIMESTAMP NULL,
  read_at TIMESTAMP NULL,
  failed_reason TEXT NULL,
  
  -- Metadata
  priority ENUM('Low', 'Normal', 'High', 'Urgent') DEFAULT 'Normal',
  is_reply BOOLEAN DEFAULT FALSE,
  parent_message_id INT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (campaign_id) REFERENCES communication_campaigns(id) ON DELETE SET NULL,
  FOREIGN KEY (template_id) REFERENCES message_templates(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_message_id) REFERENCES messages(id) ON DELETE SET NULL,
  
  INDEX idx_conversation (conversation_id),
  INDEX idx_sender (sender_type, sender_id),
  INDEX idx_recipient (recipient_type, recipient_id),
  INDEX idx_delivery_status (delivery_status),
  INDEX idx_sent_at (sent_at),
  INDEX idx_campaign (campaign_id)
);

-- Message Delivery Tracking Table (extends notifications table concept)
CREATE TABLE message_deliveries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  message_id INT NOT NULL,
  campaign_id INT NULL,
  
  -- Recipient details
  recipient_type ENUM('Member', 'Admin') NOT NULL,
  recipient_id INT NOT NULL,
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(20),
  
  -- Delivery details
  delivery_channel ENUM('Email', 'SMS', 'In-App', 'Push') NOT NULL,
  delivery_status ENUM('Queued', 'Sending', 'Sent', 'Delivered', 'Failed', 'Bounced', 'Opened', 'Clicked') DEFAULT 'Queued',
  
  -- Tracking timestamps
  queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP NULL,
  delivered_at TIMESTAMP NULL,
  opened_at TIMESTAMP NULL,
  clicked_at TIMESTAMP NULL,
  failed_at TIMESTAMP NULL,
  
  -- Error handling
  failure_reason TEXT NULL,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  next_retry_at TIMESTAMP NULL,
  
  -- External tracking
  external_message_id VARCHAR(255), -- Provider message ID (Twilio, etc.)
  tracking_data JSON, -- Additional tracking metadata
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES communication_campaigns(id) ON DELETE SET NULL,
  
  INDEX idx_message (message_id),
  INDEX idx_campaign (campaign_id),
  INDEX idx_recipient (recipient_type, recipient_id),
  INDEX idx_delivery_status (delivery_status),
  INDEX idx_delivery_channel (delivery_channel),
  INDEX idx_retry (next_retry_at, retry_count)
);

-- Communication Preferences Table
CREATE TABLE communication_preferences (
  id INT PRIMARY KEY AUTO_INCREMENT,
  member_id INT NOT NULL,
  
  -- Channel preferences
  email_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT TRUE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  
  -- Content preferences
  marketing_emails BOOLEAN DEFAULT TRUE,
  system_notifications BOOLEAN DEFAULT TRUE,
  membership_reminders BOOLEAN DEFAULT TRUE,
  event_notifications BOOLEAN DEFAULT TRUE,
  newsletter BOOLEAN DEFAULT TRUE,
  
  -- Frequency preferences
  digest_frequency ENUM('Immediate', 'Daily', 'Weekly', 'Monthly') DEFAULT 'Immediate',
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '08:00:00',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  UNIQUE KEY unique_member_preferences (member_id)
);

-- Communication Analytics Table
CREATE TABLE communication_analytics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  date DATE NOT NULL,
  
  -- Campaign metrics
  campaigns_sent INT DEFAULT 0,
  campaigns_completed INT DEFAULT 0,
  campaigns_failed INT DEFAULT 0,
  
  -- Message metrics by channel
  emails_sent INT DEFAULT 0,
  emails_delivered INT DEFAULT 0,
  emails_opened INT DEFAULT 0,
  emails_clicked INT DEFAULT 0,
  emails_bounced INT DEFAULT 0,
  
  sms_sent INT DEFAULT 0,
  sms_delivered INT DEFAULT 0,
  sms_failed INT DEFAULT 0,
  
  in_app_sent INT DEFAULT 0,
  in_app_delivered INT DEFAULT 0,
  in_app_read INT DEFAULT 0,
  
  -- Geographic breakdown
  province_breakdown JSON, -- {"GP": 150, "WC": 200, ...}
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_date_analytics (date),
  INDEX idx_date (date)
);

-- Message Queue Table (for batch processing)
CREATE TABLE message_queue (
  id INT PRIMARY KEY AUTO_INCREMENT,
  campaign_id INT NULL,
  message_id INT NOT NULL,
  
  -- Queue details
  queue_type ENUM('Immediate', 'Scheduled', 'Batch', 'Retry') DEFAULT 'Immediate',
  priority INT DEFAULT 5, -- 1-10, higher = more priority
  
  -- Processing
  status ENUM('Pending', 'Processing', 'Completed', 'Failed') DEFAULT 'Pending',
  scheduled_for TIMESTAMP NULL,
  processed_at TIMESTAMP NULL,
  
  -- Retry logic
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  retry_after TIMESTAMP NULL,
  
  -- Error handling
  error_message TEXT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (campaign_id) REFERENCES communication_campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  
  INDEX idx_queue_status (status),
  INDEX idx_priority (priority),
  INDEX idx_scheduled_for (scheduled_for),
  INDEX idx_retry_after (retry_after)
);
