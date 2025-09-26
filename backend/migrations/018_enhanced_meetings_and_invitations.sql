-- Enhanced Meetings and Invitations System Migration
-- Part 2 of hierarchical meeting management system

START TRANSACTION;

-- 1. Drop and recreate meetings table with enhanced structure
DROP TABLE IF EXISTS meetings;
CREATE TABLE meetings (
  meeting_id INT AUTO_INCREMENT PRIMARY KEY,
  meeting_title VARCHAR(255) NOT NULL,
  meeting_type_id INT NOT NULL,
  hierarchy_level ENUM('National', 'Provincial', 'Regional', 'Municipal', 'Ward') NOT NULL,
  entity_id INT NULL, -- Province/Region/Municipality/Ward ID (NULL for National)
  entity_type ENUM('Province', 'Region', 'Municipality', 'Ward') NULL,
  meeting_date DATE NOT NULL,
  meeting_time TIME NOT NULL,
  end_time TIME NULL,
  duration_minutes INT DEFAULT 120,
  location VARCHAR(255) NULL,
  virtual_meeting_link VARCHAR(500) NULL,
  meeting_platform ENUM('In-Person', 'Virtual', 'Hybrid') DEFAULT 'In-Person',
  meeting_status ENUM('Draft', 'Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Postponed') DEFAULT 'Draft',
  description TEXT NULL,
  objectives TEXT NULL,
  agenda_summary TEXT NULL,
  quorum_required INT DEFAULT 0,
  quorum_achieved INT DEFAULT 0,
  total_attendees INT DEFAULT 0,
  total_invited INT DEFAULT 0,
  meeting_chair_id INT NULL,
  meeting_secretary_id INT NULL,
  created_by INT NOT NULL,
  scheduled_at TIMESTAMP NULL, -- When meeting was officially scheduled
  invitations_sent_at TIMESTAMP NULL, -- When invitations were sent
  reminder_sent_at TIMESTAMP NULL, -- When reminders were sent
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (meeting_type_id) REFERENCES meeting_types(type_id) ON DELETE RESTRICT,
  FOREIGN KEY (meeting_chair_id) REFERENCES members(member_id) ON DELETE SET NULL,
  FOREIGN KEY (meeting_secretary_id) REFERENCES members(member_id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Indexes
  INDEX idx_meetings_type (meeting_type_id),
  INDEX idx_meetings_hierarchy (hierarchy_level),
  INDEX idx_meetings_entity (entity_type, entity_id),
  INDEX idx_meetings_date (meeting_date),
  INDEX idx_meetings_status (meeting_status),
  INDEX idx_meetings_chair (meeting_chair_id),
  INDEX idx_meetings_secretary (meeting_secretary_id),
  INDEX idx_meetings_created_by (created_by),
  INDEX idx_meetings_scheduled (scheduled_at)
);

-- 2. Enhanced meeting_attendance table with invitation tracking
DROP TABLE IF EXISTS meeting_attendance;
CREATE TABLE meeting_attendance (
  attendance_id INT AUTO_INCREMENT PRIMARY KEY,
  meeting_id INT NOT NULL,
  member_id INT NOT NULL,
  invitation_status ENUM('Not Sent', 'Sent', 'Delivered', 'Opened', 'Failed') DEFAULT 'Not Sent',
  attendance_status ENUM('Invited', 'Confirmed', 'Declined', 'Attended', 'Absent', 'Excused', 'Late') DEFAULT 'Invited',
  attendance_type ENUM('Required', 'Optional', 'Observer', 'Guest', 'Delegate') DEFAULT 'Required',
  invitation_method ENUM('Email', 'SMS', 'System', 'Manual') DEFAULT 'System',
  role_in_meeting VARCHAR(100) NULL, -- Role for this specific meeting
  check_in_time DATETIME NULL,
  check_out_time DATETIME NULL,
  attendance_notes TEXT NULL,
  voting_rights BOOLEAN DEFAULT TRUE,
  proxy_for_member_id INT NULL,
  invitation_sent_at TIMESTAMP NULL,
  response_received_at TIMESTAMP NULL,
  recorded_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  FOREIGN KEY (proxy_for_member_id) REFERENCES members(member_id) ON DELETE SET NULL,
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_attendance_meeting (meeting_id),
  INDEX idx_attendance_member (member_id),
  INDEX idx_attendance_invitation_status (invitation_status),
  INDEX idx_attendance_status (attendance_status),
  INDEX idx_attendance_type (attendance_type),
  INDEX idx_attendance_proxy (proxy_for_member_id),
  INDEX idx_attendance_checkin (check_in_time),
  INDEX idx_attendance_sent (invitation_sent_at),
  
  -- Unique constraint to prevent duplicate attendance records
  UNIQUE KEY unique_attendance_per_meeting (meeting_id, member_id)
);

-- 3. Create meeting_invitation_log table for tracking invitation history
CREATE TABLE IF NOT EXISTS meeting_invitation_log (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  meeting_id INT NOT NULL,
  member_id INT NOT NULL,
  invitation_type ENUM('Initial', 'Reminder', 'Update', 'Cancellation') DEFAULT 'Initial',
  invitation_method ENUM('Email', 'SMS', 'System', 'Manual') DEFAULT 'System',
  invitation_status ENUM('Queued', 'Sent', 'Delivered', 'Failed', 'Bounced') DEFAULT 'Queued',
  invitation_content TEXT NULL,
  sent_at TIMESTAMP NULL,
  delivered_at TIMESTAMP NULL,
  opened_at TIMESTAMP NULL,
  error_message TEXT NULL,
  sent_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  FOREIGN KEY (sent_by) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_invitation_log_meeting (meeting_id),
  INDEX idx_invitation_log_member (member_id),
  INDEX idx_invitation_log_type (invitation_type),
  INDEX idx_invitation_log_status (invitation_status),
  INDEX idx_invitation_log_sent (sent_at)
);

-- 4. Create meeting_recurring_schedule table for recurring meetings
CREATE TABLE IF NOT EXISTS meeting_recurring_schedule (
  schedule_id INT AUTO_INCREMENT PRIMARY KEY,
  meeting_type_id INT NOT NULL,
  schedule_name VARCHAR(255) NOT NULL,
  hierarchy_level ENUM('National', 'Provincial', 'Regional', 'Municipal', 'Ward') NOT NULL,
  entity_id INT NULL,
  entity_type ENUM('Province', 'Region', 'Municipality', 'Ward') NULL,
  recurrence_pattern ENUM('Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'Annually') NOT NULL,
  recurrence_interval INT DEFAULT 1, -- Every X weeks/months/etc
  days_of_week JSON NULL, -- For weekly patterns: [1,3,5] for Mon,Wed,Fri
  day_of_month INT NULL, -- For monthly patterns: 15 for 15th of month
  month_of_year INT NULL, -- For annual patterns: 6 for June
  start_date DATE NOT NULL,
  end_date DATE NULL,
  start_time TIME NOT NULL,
  duration_minutes INT DEFAULT 120,
  location VARCHAR(255) NULL,
  virtual_meeting_link VARCHAR(500) NULL,
  meeting_platform ENUM('In-Person', 'Virtual', 'Hybrid') DEFAULT 'In-Person',
  auto_create_meetings BOOLEAN DEFAULT TRUE,
  auto_send_invitations BOOLEAN DEFAULT TRUE,
  advance_creation_days INT DEFAULT 14, -- Create meetings X days in advance
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (meeting_type_id) REFERENCES meeting_types(type_id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  
  INDEX idx_recurring_schedule_type (meeting_type_id),
  INDEX idx_recurring_schedule_hierarchy (hierarchy_level),
  INDEX idx_recurring_schedule_entity (entity_type, entity_id),
  INDEX idx_recurring_schedule_pattern (recurrence_pattern),
  INDEX idx_recurring_schedule_active (is_active),
  INDEX idx_recurring_schedule_dates (start_date, end_date)
);

-- 5. Create meeting_templates table for standardized meeting setups
CREATE TABLE IF NOT EXISTS meeting_templates (
  template_id INT AUTO_INCREMENT PRIMARY KEY,
  template_name VARCHAR(255) NOT NULL,
  meeting_type_id INT NOT NULL,
  hierarchy_level ENUM('National', 'Provincial', 'Regional', 'Municipal', 'Ward') NOT NULL,
  template_description TEXT NULL,
  default_duration_minutes INT DEFAULT 120,
  default_location VARCHAR(255) NULL,
  default_virtual_link VARCHAR(500) NULL,
  default_platform ENUM('In-Person', 'Virtual', 'Hybrid') DEFAULT 'In-Person',
  agenda_template JSON NULL, -- Standardized agenda items
  invitation_template TEXT NULL, -- Email/SMS template
  required_roles JSON NULL, -- Roles that must be invited
  optional_roles JSON NULL, -- Roles that can be invited
  auto_assign_chair BOOLEAN DEFAULT FALSE,
  auto_assign_secretary BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (meeting_type_id) REFERENCES meeting_types(type_id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  
  INDEX idx_meeting_templates_type (meeting_type_id),
  INDEX idx_meeting_templates_hierarchy (hierarchy_level),
  INDEX idx_meeting_templates_active (is_active)
);

-- 6. Create views for meeting analytics and reporting
CREATE OR REPLACE VIEW vw_hierarchical_meeting_statistics AS
SELECT 
  mt.hierarchy_level,
  mt.type_name,
  mt.meeting_category,
  COUNT(m.meeting_id) as total_meetings,
  COUNT(CASE WHEN m.meeting_status = 'Completed' THEN 1 END) as completed_meetings,
  COUNT(CASE WHEN m.meeting_status = 'Scheduled' THEN 1 END) as scheduled_meetings,
  COUNT(CASE WHEN m.meeting_status = 'Cancelled' THEN 1 END) as cancelled_meetings,
  AVG(m.total_attendees) as avg_attendance,
  AVG(m.duration_minutes) as avg_duration_minutes,
  AVG(CASE WHEN m.quorum_required > 0 THEN (m.quorum_achieved / m.quorum_required) * 100 END) as avg_quorum_percentage,
  COUNT(CASE WHEN m.meeting_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as recent_meetings,
  COUNT(CASE WHEN m.meeting_date >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as this_week_meetings
FROM meeting_types mt
LEFT JOIN meetings m ON mt.type_id = m.meeting_type_id
GROUP BY mt.hierarchy_level, mt.type_id, mt.type_name, mt.meeting_category
ORDER BY 
  CASE mt.hierarchy_level 
    WHEN 'National' THEN 1 
    WHEN 'Provincial' THEN 2 
    WHEN 'Regional' THEN 3 
    WHEN 'Municipal' THEN 4 
    WHEN 'Ward' THEN 5 
  END,
  total_meetings DESC;

-- 7. Create view for attendance analytics by hierarchy
CREATE OR REPLACE VIEW vw_hierarchical_attendance_statistics AS
SELECT 
  m.hierarchy_level,
  m.entity_type,
  m.entity_id,
  mt.type_name,
  COUNT(DISTINCT m.meeting_id) as total_meetings,
  COUNT(ma.attendance_id) as total_invitations,
  COUNT(CASE WHEN ma.attendance_status = 'Attended' THEN 1 END) as total_attended,
  COUNT(CASE WHEN ma.attendance_status = 'Absent' THEN 1 END) as total_absent,
  COUNT(CASE WHEN ma.attendance_status = 'Excused' THEN 1 END) as total_excused,
  ROUND(
    (COUNT(CASE WHEN ma.attendance_status = 'Attended' THEN 1 END) / 
     NULLIF(COUNT(CASE WHEN ma.attendance_status IN ('Attended', 'Absent', 'Excused') THEN 1 END), 0)) * 100, 2
  ) as attendance_percentage,
  ROUND(
    (COUNT(CASE WHEN ma.invitation_status = 'Delivered' THEN 1 END) / 
     NULLIF(COUNT(CASE WHEN ma.invitation_status IN ('Sent', 'Delivered', 'Failed') THEN 1 END), 0)) * 100, 2
  ) as invitation_delivery_percentage
FROM meetings m
LEFT JOIN meeting_attendance ma ON m.meeting_id = ma.meeting_id
LEFT JOIN meeting_types mt ON m.meeting_type_id = mt.type_id
WHERE m.meeting_status = 'Completed'
GROUP BY m.hierarchy_level, m.entity_type, m.entity_id, mt.type_name
ORDER BY 
  CASE m.hierarchy_level 
    WHEN 'National' THEN 1 
    WHEN 'Provincial' THEN 2 
    WHEN 'Regional' THEN 3 
    WHEN 'Municipal' THEN 4 
    WHEN 'Ward' THEN 5 
  END,
  attendance_percentage DESC;

COMMIT;
