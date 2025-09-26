-- Meeting Management System Migration
-- This migration creates comprehensive meeting management functionality

START TRANSACTION;

-- 1. Create meeting_types table for categorizing meetings
CREATE TABLE IF NOT EXISTS meeting_types (
  type_id INT AUTO_INCREMENT PRIMARY KEY,
  type_name VARCHAR(100) NOT NULL UNIQUE,
  type_code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT NULL,
  default_duration_minutes INT DEFAULT 120,
  requires_quorum BOOLEAN DEFAULT TRUE,
  min_notice_days INT DEFAULT 7,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_meeting_types_code (type_code),
  INDEX idx_meeting_types_active (is_active)
);

-- Insert default meeting types
INSERT INTO meeting_types (type_name, type_code, description, default_duration_minutes, requires_quorum, min_notice_days) VALUES
('General Meeting', 'general', 'Regular general meetings for all members', 180, TRUE, 14),
('Executive Meeting', 'executive', 'Executive committee meetings', 120, TRUE, 7),
('Emergency Meeting', 'emergency', 'Emergency meetings for urgent matters', 90, TRUE, 1),
('Branch Meeting', 'branch', 'Local branch meetings', 120, TRUE, 7),
('Annual General Meeting', 'agm', 'Annual general meeting', 240, TRUE, 30),
('Special Meeting', 'special', 'Special purpose meetings', 150, TRUE, 10),
('Committee Meeting', 'committee', 'Committee-specific meetings', 90, FALSE, 5),
('Training Session', 'training', 'Training and development sessions', 180, FALSE, 7),
('Workshop', 'workshop', 'Interactive workshops', 240, FALSE, 14),
('Conference', 'conference', 'Large conferences and conventions', 480, FALSE, 30);

-- 2. Enhance existing meetings table (if it exists) or create new one
CREATE TABLE IF NOT EXISTS meetings (
  meeting_id INT AUTO_INCREMENT PRIMARY KEY,
  meeting_title VARCHAR(255) NOT NULL,
  meeting_type_id INT NOT NULL,
  hierarchy_level ENUM('National', 'Province', 'Region', 'Municipality', 'Ward', 'Branch') NOT NULL,
  entity_id INT NOT NULL,
  meeting_date DATE NOT NULL,
  meeting_time TIME NOT NULL,
  end_time TIME NULL,
  duration_minutes INT DEFAULT 120,
  location VARCHAR(255) NULL,
  virtual_meeting_link VARCHAR(500) NULL,
  meeting_platform ENUM('In-Person', 'Virtual', 'Hybrid') DEFAULT 'In-Person',
  meeting_status ENUM('Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Postponed') DEFAULT 'Scheduled',
  description TEXT NULL,
  objectives TEXT NULL,
  quorum_required INT DEFAULT 0,
  quorum_achieved INT DEFAULT 0,
  total_attendees INT DEFAULT 0,
  meeting_chair_id INT NULL,
  meeting_secretary_id INT NULL,
  created_by INT NOT NULL,
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
  INDEX idx_meetings_entity (entity_id),
  INDEX idx_meetings_date (meeting_date),
  INDEX idx_meetings_status (meeting_status),
  INDEX idx_meetings_chair (meeting_chair_id),
  INDEX idx_meetings_secretary (meeting_secretary_id),
  INDEX idx_meetings_created_by (created_by)
);

-- 3. Create meeting_agenda_items table
CREATE TABLE IF NOT EXISTS meeting_agenda_items (
  agenda_item_id INT AUTO_INCREMENT PRIMARY KEY,
  meeting_id INT NOT NULL,
  item_number INT NOT NULL,
  item_title VARCHAR(255) NOT NULL,
  item_description TEXT NULL,
  item_type ENUM('Discussion', 'Decision', 'Information', 'Presentation', 'Report', 'Election', 'Other') DEFAULT 'Discussion',
  presenter_id INT NULL,
  allocated_minutes INT DEFAULT 15,
  actual_minutes INT NULL,
  item_status ENUM('Pending', 'In Progress', 'Completed', 'Deferred', 'Cancelled') DEFAULT 'Pending',
  discussion_summary TEXT NULL,
  decision_made TEXT NULL,
  action_required BOOLEAN DEFAULT FALSE,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id) ON DELETE CASCADE,
  FOREIGN KEY (presenter_id) REFERENCES members(member_id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Indexes
  INDEX idx_agenda_items_meeting (meeting_id),
  INDEX idx_agenda_items_number (meeting_id, item_number),
  INDEX idx_agenda_items_presenter (presenter_id),
  INDEX idx_agenda_items_status (item_status),
  INDEX idx_agenda_items_type (item_type),
  
  -- Unique constraint for item numbering within meeting
  UNIQUE KEY unique_item_number_per_meeting (meeting_id, item_number)
);

-- 4. Create meeting_attendance table
CREATE TABLE IF NOT EXISTS meeting_attendance (
  attendance_id INT AUTO_INCREMENT PRIMARY KEY,
  meeting_id INT NOT NULL,
  member_id INT NOT NULL,
  attendance_status ENUM('Invited', 'Confirmed', 'Attended', 'Absent', 'Excused', 'Late') DEFAULT 'Invited',
  attendance_type ENUM('Required', 'Optional', 'Observer', 'Guest') DEFAULT 'Required',
  check_in_time DATETIME NULL,
  check_out_time DATETIME NULL,
  attendance_notes TEXT NULL,
  voting_rights BOOLEAN DEFAULT TRUE,
  proxy_for_member_id INT NULL,
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
  INDEX idx_attendance_status (attendance_status),
  INDEX idx_attendance_type (attendance_type),
  INDEX idx_attendance_proxy (proxy_for_member_id),
  INDEX idx_attendance_checkin (check_in_time),
  
  -- Unique constraint to prevent duplicate attendance records
  UNIQUE KEY unique_attendance_per_meeting (meeting_id, member_id)
);

-- 5. Create meeting_minutes table
CREATE TABLE IF NOT EXISTS meeting_minutes (
  minutes_id INT AUTO_INCREMENT PRIMARY KEY,
  meeting_id INT NOT NULL,
  minutes_title VARCHAR(255) NOT NULL,
  opening_remarks TEXT NULL,
  attendance_summary TEXT NULL,
  key_discussions TEXT NULL,
  decisions_made TEXT NULL,
  action_items TEXT NULL,
  closing_remarks TEXT NULL,
  next_meeting_date DATE NULL,
  next_meeting_agenda TEXT NULL,
  minutes_status ENUM('Draft', 'Under Review', 'Approved', 'Published') DEFAULT 'Draft',
  prepared_by INT NOT NULL,
  reviewed_by INT NULL,
  approved_by INT NULL,
  approved_at TIMESTAMP NULL,
  published_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id) ON DELETE CASCADE,
  FOREIGN KEY (prepared_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_minutes_meeting (meeting_id),
  INDEX idx_minutes_status (minutes_status),
  INDEX idx_minutes_prepared_by (prepared_by),
  INDEX idx_minutes_approved_by (approved_by),
  INDEX idx_minutes_approved_at (approved_at)
);

-- 6. Create meeting_action_items table
CREATE TABLE IF NOT EXISTS meeting_action_items (
  action_item_id INT AUTO_INCREMENT PRIMARY KEY,
  meeting_id INT NOT NULL,
  agenda_item_id INT NULL,
  action_title VARCHAR(255) NOT NULL,
  action_description TEXT NOT NULL,
  assigned_to_member_id INT NOT NULL,
  priority_level ENUM('High', 'Medium', 'Low') DEFAULT 'Medium',
  due_date DATE NOT NULL,
  completion_date DATE NULL,
  action_status ENUM('Assigned', 'In Progress', 'Completed', 'Overdue', 'Cancelled') DEFAULT 'Assigned',
  progress_notes TEXT NULL,
  completion_notes TEXT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id) ON DELETE CASCADE,
  FOREIGN KEY (agenda_item_id) REFERENCES meeting_agenda_items(agenda_item_id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to_member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Indexes
  INDEX idx_action_items_meeting (meeting_id),
  INDEX idx_action_items_agenda (agenda_item_id),
  INDEX idx_action_items_assigned_to (assigned_to_member_id),
  INDEX idx_action_items_status (action_status),
  INDEX idx_action_items_priority (priority_level),
  INDEX idx_action_items_due_date (due_date)
);

-- 7. Create meeting_documents table for meeting-related documents
CREATE TABLE IF NOT EXISTS meeting_documents (
  document_id INT AUTO_INCREMENT PRIMARY KEY,
  meeting_id INT NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  document_type ENUM('Agenda', 'Minutes', 'Presentation', 'Report', 'Supporting Document', 'Other') NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  file_type VARCHAR(10) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  uploaded_by INT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Indexes
  INDEX idx_meeting_documents_meeting (meeting_id),
  INDEX idx_meeting_documents_type (document_type),
  INDEX idx_meeting_documents_public (is_public),
  INDEX idx_meeting_documents_uploaded_by (uploaded_by)
);

-- 8. Create meeting_votes table for formal voting during meetings
CREATE TABLE IF NOT EXISTS meeting_votes (
  vote_id INT AUTO_INCREMENT PRIMARY KEY,
  meeting_id INT NOT NULL,
  agenda_item_id INT NOT NULL,
  vote_title VARCHAR(255) NOT NULL,
  vote_description TEXT NULL,
  vote_type ENUM('Simple Majority', 'Two-Thirds Majority', 'Unanimous', 'Show of Hands', 'Secret Ballot') DEFAULT 'Simple Majority',
  total_eligible_voters INT NOT NULL,
  votes_for INT DEFAULT 0,
  votes_against INT DEFAULT 0,
  votes_abstain INT DEFAULT 0,
  vote_result ENUM('Passed', 'Failed', 'Tied', 'No Quorum') NULL,
  vote_status ENUM('Pending', 'In Progress', 'Completed', 'Cancelled') DEFAULT 'Pending',
  conducted_by INT NOT NULL,
  conducted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id) ON DELETE CASCADE,
  FOREIGN KEY (agenda_item_id) REFERENCES meeting_agenda_items(agenda_item_id) ON DELETE CASCADE,
  FOREIGN KEY (conducted_by) REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Indexes
  INDEX idx_meeting_votes_meeting (meeting_id),
  INDEX idx_meeting_votes_agenda (agenda_item_id),
  INDEX idx_meeting_votes_status (vote_status),
  INDEX idx_meeting_votes_result (vote_result)
);

-- 9. Create meeting_vote_records table for individual vote tracking
CREATE TABLE IF NOT EXISTS meeting_vote_records (
  record_id INT AUTO_INCREMENT PRIMARY KEY,
  vote_id INT NOT NULL,
  member_id INT NOT NULL,
  vote_choice ENUM('For', 'Against', 'Abstain') NOT NULL,
  vote_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (vote_id) REFERENCES meeting_votes(vote_id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_vote_records_vote (vote_id),
  INDEX idx_vote_records_member (member_id),
  INDEX idx_vote_records_choice (vote_choice),
  
  -- Unique constraint to prevent duplicate votes
  UNIQUE KEY unique_vote_per_member (vote_id, member_id)
);

-- 10. Create views for meeting analytics
CREATE OR REPLACE VIEW vw_meeting_statistics AS
SELECT 
  mt.type_name,
  COUNT(m.meeting_id) as total_meetings,
  COUNT(CASE WHEN m.meeting_status = 'Completed' THEN 1 END) as completed_meetings,
  COUNT(CASE WHEN m.meeting_status = 'Scheduled' THEN 1 END) as scheduled_meetings,
  COUNT(CASE WHEN m.meeting_status = 'Cancelled' THEN 1 END) as cancelled_meetings,
  AVG(m.total_attendees) as avg_attendance,
  AVG(m.duration_minutes) as avg_duration_minutes,
  COUNT(CASE WHEN m.meeting_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as recent_meetings
FROM meeting_types mt
LEFT JOIN meetings m ON mt.type_id = m.meeting_type_id
GROUP BY mt.type_id, mt.type_name
ORDER BY total_meetings DESC;

-- 11. Create view for attendance statistics
CREATE OR REPLACE VIEW vw_attendance_statistics AS
SELECT 
  m.hierarchy_level,
  COUNT(DISTINCT m.meeting_id) as total_meetings,
  COUNT(ma.attendance_id) as total_invitations,
  COUNT(CASE WHEN ma.attendance_status = 'Attended' THEN 1 END) as total_attended,
  COUNT(CASE WHEN ma.attendance_status = 'Absent' THEN 1 END) as total_absent,
  ROUND(
    (COUNT(CASE WHEN ma.attendance_status = 'Attended' THEN 1 END) / 
     NULLIF(COUNT(CASE WHEN ma.attendance_status IN ('Attended', 'Absent') THEN 1 END), 0)) * 100, 2
  ) as attendance_percentage
FROM meetings m
LEFT JOIN meeting_attendance ma ON m.meeting_id = ma.meeting_id
WHERE m.meeting_status = 'Completed'
GROUP BY m.hierarchy_level
ORDER BY 
  CASE m.hierarchy_level 
    WHEN 'National' THEN 1 
    WHEN 'Province' THEN 2 
    WHEN 'Region' THEN 3 
    WHEN 'Municipality' THEN 4 
    WHEN 'Ward' THEN 5 
    WHEN 'Branch' THEN 6
  END;

COMMIT;
