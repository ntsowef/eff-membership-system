-- Birthday SMS System Database Schema
-- Migration: 013_birthday_sms_system.sql
-- Description: Automated birthday messaging system for members

-- Birthday SMS Configuration Table
CREATE TABLE IF NOT EXISTS birthday_sms_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Configuration settings
    is_enabled BOOLEAN DEFAULT TRUE,
    template_id INT NOT NULL,
    send_time TIME DEFAULT '09:00:00', -- Time to send birthday messages
    timezone VARCHAR(50) DEFAULT 'Africa/Johannesburg',
    
    -- Message customization
    days_before_reminder INT DEFAULT 0, -- Send reminder X days before birthday
    include_age BOOLEAN DEFAULT TRUE,
    include_organization_name BOOLEAN DEFAULT TRUE,
    
    -- Scheduling settings
    max_daily_sends INT DEFAULT 1000, -- Rate limiting
    retry_failed_sends BOOLEAN DEFAULT TRUE,
    max_retries INT DEFAULT 3,
    
    -- Metadata
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (template_id) REFERENCES sms_templates(id) ON DELETE RESTRICT,
    INDEX idx_birthday_config_enabled (is_enabled),
    INDEX idx_birthday_config_template (template_id)
);

-- Birthday SMS History Table
CREATE TABLE IF NOT EXISTS birthday_sms_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Member information
    member_id INT NOT NULL,
    member_name VARCHAR(255) NOT NULL,
    member_phone VARCHAR(20) NOT NULL,
    birth_date DATE NOT NULL,
    age_at_birthday INT,
    
    -- Message details
    template_id INT,
    message_content TEXT NOT NULL,
    campaign_id INT, -- Link to SMS campaign if created
    message_id INT, -- Link to individual SMS message
    
    -- Sending details
    scheduled_date DATE NOT NULL,
    sent_at TIMESTAMP NULL,
    delivery_status ENUM('pending', 'sent', 'delivered', 'failed', 'cancelled') DEFAULT 'pending',
    
    -- Error handling
    error_message TEXT NULL,
    retry_count INT DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES sms_templates(id) ON DELETE SET NULL,
    FOREIGN KEY (campaign_id) REFERENCES sms_campaigns(id) ON DELETE SET NULL,
    FOREIGN KEY (message_id) REFERENCES sms_messages(id) ON DELETE SET NULL,
    
    -- Prevent duplicate birthday messages for same member on same date
    UNIQUE KEY unique_member_birthday_date (member_id, scheduled_date),
    
    INDEX idx_birthday_history_member (member_id),
    INDEX idx_birthday_history_scheduled (scheduled_date),
    INDEX idx_birthday_history_status (delivery_status),
    INDEX idx_birthday_history_sent (sent_at),
    INDEX idx_birthday_history_birth_date (birth_date)
);

-- Birthday SMS Queue Table (for processing)
CREATE TABLE IF NOT EXISTS birthday_sms_queue (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Member information
    member_id INT NOT NULL,
    member_name VARCHAR(255) NOT NULL,
    member_phone VARCHAR(20) NOT NULL,
    birth_date DATE NOT NULL,
    age_at_birthday INT,
    
    -- Processing details
    scheduled_for DATE NOT NULL,
    priority ENUM('low', 'normal', 'high') DEFAULT 'normal',
    status ENUM('queued', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'queued',
    
    -- Message details
    template_id INT,
    personalized_message TEXT,
    
    -- Processing metadata
    queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    
    -- Error handling
    error_message TEXT NULL,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    
    FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES sms_templates(id) ON DELETE SET NULL,
    
    -- Prevent duplicate queue entries
    UNIQUE KEY unique_member_queue_date (member_id, scheduled_for),
    
    INDEX idx_birthday_queue_scheduled (scheduled_for),
    INDEX idx_birthday_queue_status (status),
    INDEX idx_birthday_queue_priority (priority),
    INDEX idx_birthday_queue_member (member_id),
    INDEX idx_birthday_queue_processing (status, scheduled_for, priority)
);

-- Insert default birthday SMS configuration
INSERT INTO birthday_sms_config (
    is_enabled, 
    template_id, 
    send_time, 
    timezone,
    include_age,
    include_organization_name,
    max_daily_sends,
    created_by
) 
SELECT 
    TRUE,
    t.id,
    '09:00:00',
    'Africa/Johannesburg',
    TRUE,
    TRUE,
    1000,
    1
FROM sms_templates t 
WHERE t.name = 'Welcome Message' 
LIMIT 1;

-- If no welcome message template exists, create a birthday template
INSERT INTO sms_templates (name, description, content, variables, category, is_active, created_by)
SELECT 
    'Birthday Wishes',
    'Automated birthday message for organization members',
    'Happy Birthday {name}! 🎉 Wishing you a wonderful {age}th birthday! May this new year of life bring you joy, success, and happiness. Thank you for being a valued member of {organization}. Have a fantastic day! 🎂',
    '["name", "age", "organization", "ward", "municipality"]',
    'notification',
    TRUE,
    1
WHERE NOT EXISTS (
    SELECT 1 FROM sms_templates WHERE name = 'Birthday Wishes'
);

-- Update birthday configuration to use the birthday template if welcome message doesn't exist
UPDATE birthday_sms_config 
SET template_id = (
    SELECT id FROM sms_templates WHERE name = 'Birthday Wishes' LIMIT 1
)
WHERE template_id NOT IN (SELECT id FROM sms_templates);

-- Create indexes for birthday processing optimization (skip if exists)
-- CREATE INDEX IF NOT EXISTS idx_members_birthday_lookup ON members(date_of_birth, cell_number);

-- Create a view for today's birthdays
CREATE OR REPLACE VIEW todays_birthdays AS
SELECT
    m.member_id,
    CONCAT(m.firstname, ' ', COALESCE(m.middle_name, ''), ' ', COALESCE(m.surname, '')) as full_name,
    m.firstname,
    m.surname,
    m.middle_name,
    m.cell_number,
    m.date_of_birth,
    YEAR(CURDATE()) - YEAR(m.date_of_birth) -
    (DATE_FORMAT(CURDATE(), '%m%d') < DATE_FORMAT(m.date_of_birth, '%m%d')) as current_age,
    m.ward_code,
    w.ward_name,
    w.municipality_code,
    w.district_code,
    w.province_code
FROM members m
LEFT JOIN wards w ON m.ward_code = w.ward_code
WHERE m.date_of_birth IS NOT NULL
    AND m.cell_number IS NOT NULL
    AND m.cell_number != ''
    AND MONTH(m.date_of_birth) = MONTH(CURDATE())
    AND DAY(m.date_of_birth) = DAY(CURDATE());

-- Create a view for upcoming birthdays (next 7 days)
CREATE OR REPLACE VIEW upcoming_birthdays AS
SELECT
    m.member_id,
    CONCAT(m.firstname, ' ', COALESCE(m.middle_name, ''), ' ', COALESCE(m.surname, '')) as full_name,
    m.firstname,
    m.surname,
    m.cell_number,
    m.date_of_birth,
    YEAR(CURDATE()) - YEAR(m.date_of_birth) -
    (DATE_FORMAT(CURDATE(), '%m%d') < DATE_FORMAT(m.date_of_birth, '%m%d')) as current_age,
    m.ward_code,
    w.ward_name,
    w.municipality_code,
    CASE
        WHEN MONTH(m.date_of_birth) = MONTH(CURDATE()) AND DAY(m.date_of_birth) >= DAY(CURDATE()) THEN
            DATE(CONCAT(YEAR(CURDATE()), '-', LPAD(MONTH(m.date_of_birth), 2, '0'), '-', LPAD(DAY(m.date_of_birth), 2, '0')))
        ELSE
            DATE(CONCAT(YEAR(CURDATE()) + 1, '-', LPAD(MONTH(m.date_of_birth), 2, '0'), '-', LPAD(DAY(m.date_of_birth), 2, '0')))
    END as next_birthday_date,
    DATEDIFF(
        CASE
            WHEN MONTH(m.date_of_birth) = MONTH(CURDATE()) AND DAY(m.date_of_birth) >= DAY(CURDATE()) THEN
                DATE(CONCAT(YEAR(CURDATE()), '-', LPAD(MONTH(m.date_of_birth), 2, '0'), '-', LPAD(DAY(m.date_of_birth), 2, '0')))
            ELSE
                DATE(CONCAT(YEAR(CURDATE()) + 1, '-', LPAD(MONTH(m.date_of_birth), 2, '0'), '-', LPAD(DAY(m.date_of_birth), 2, '0')))
        END,
        CURDATE()
    ) as days_until_birthday
FROM members m
LEFT JOIN wards w ON m.ward_code = w.ward_code
WHERE m.date_of_birth IS NOT NULL
    AND m.cell_number IS NOT NULL
    AND m.cell_number != ''
    AND DATEDIFF(
        CASE
            WHEN MONTH(m.date_of_birth) = MONTH(CURDATE()) AND DAY(m.date_of_birth) >= DAY(CURDATE()) THEN
                DATE(CONCAT(YEAR(CURDATE()), '-', LPAD(MONTH(m.date_of_birth), 2, '0'), '-', LPAD(DAY(m.date_of_birth), 2, '0')))
            ELSE
                DATE(CONCAT(YEAR(CURDATE()) + 1, '-', LPAD(MONTH(m.date_of_birth), 2, '0'), '-', LPAD(DAY(m.date_of_birth), 2, '0')))
        END,
        CURDATE()
    ) BETWEEN 0 AND 7
ORDER BY days_until_birthday ASC;

COMMIT;
