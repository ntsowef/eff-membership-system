-- Meeting and Leadership Management Tables Migration
-- This migration adds meeting and leadership management tables according to PRD requirements

-- Enable foreign key constraints
SET FOREIGN_KEY_CHECKS = 1;

-- Start transaction
START TRANSACTION;

-- 1. Create Meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  hierarchy_level ENUM('National', 'Province', 'Region', 'Municipality', 'Ward') NOT NULL,
  entity_id INT NOT NULL,
  meeting_type ENUM('Regular', 'Special', 'Emergency', 'Annual') NOT NULL DEFAULT 'Regular',
  start_datetime DATETIME NOT NULL,
  end_datetime DATETIME NOT NULL,
  location VARCHAR(255),
  virtual_meeting_link VARCHAR(500),
  meeting_status ENUM('Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Postponed') NOT NULL DEFAULT 'Scheduled',
  max_attendees INT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_meeting_hierarchy (hierarchy_level, entity_id),
  INDEX idx_meeting_datetime (start_datetime),
  INDEX idx_meeting_status (meeting_status),
  INDEX idx_meeting_created_by (created_by)
);

-- 2. Create MeetingAgendaItems table
CREATE TABLE IF NOT EXISTS meeting_agenda_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  meeting_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration_minutes INT DEFAULT 15,
  presenter_id INT NULL,
  order_index INT NOT NULL DEFAULT 1,
  agenda_status ENUM('Pending', 'Discussed', 'Deferred', 'Cancelled') NOT NULL DEFAULT 'Pending',
  discussion_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (presenter_id) REFERENCES members(member_id) ON DELETE SET NULL,
  INDEX idx_agenda_meeting (meeting_id),
  INDEX idx_agenda_order (meeting_id, order_index),
  INDEX idx_agenda_presenter (presenter_id),
  INDEX idx_agenda_status (agenda_status)
);

-- 3. Create MeetingAttendance table
CREATE TABLE IF NOT EXISTS meeting_attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  meeting_id INT NOT NULL,
  member_id INT NOT NULL,
  attendance_status ENUM('Present', 'Absent', 'Excused', 'Late') NOT NULL,
  check_in_time DATETIME NULL,
  check_out_time DATETIME NULL,
  attendance_notes TEXT,
  recorded_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_meeting_member (meeting_id, member_id),
  INDEX idx_attendance_meeting (meeting_id),
  INDEX idx_attendance_member (member_id),
  INDEX idx_attendance_status (attendance_status)
);

-- 4. Create MeetingMinutes table
CREATE TABLE IF NOT EXISTS meeting_minutes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  meeting_id INT NOT NULL,
  content LONGTEXT NOT NULL,
  recorded_by INT NOT NULL,
  approval_status ENUM('Draft', 'Pending Approval', 'Approved', 'Rejected') NOT NULL DEFAULT 'Draft',
  approved_by INT NULL,
  approved_at TIMESTAMP NULL,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_minutes_meeting (meeting_id),
  INDEX idx_minutes_status (approval_status),
  INDEX idx_minutes_recorded_by (recorded_by),
  INDEX idx_minutes_approved_by (approved_by)
);

-- 5. Create LeadershipPositions table
CREATE TABLE IF NOT EXISTS leadership_positions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  position_name VARCHAR(100) NOT NULL,
  position_code VARCHAR(20) NOT NULL,
  hierarchy_level ENUM('National', 'Province', 'Region', 'Municipality', 'Ward') NOT NULL,
  description TEXT,
  responsibilities TEXT,
  requirements TEXT,
  term_duration_months INT DEFAULT 24,
  max_consecutive_terms INT DEFAULT 2,
  order_index INT NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_position_level (position_code, hierarchy_level),
  INDEX idx_position_hierarchy (hierarchy_level),
  INDEX idx_position_active (is_active),
  INDEX idx_position_order (hierarchy_level, order_index)
);

-- Insert default leadership positions
INSERT IGNORE INTO leadership_positions (position_name, position_code, hierarchy_level, description, order_index) VALUES
-- National Level
('National Chairperson', 'NC', 'National', 'National organization chairperson', 1),
('National Deputy Chairperson', 'NDC', 'National', 'National organization deputy chairperson', 2),
('National Secretary General', 'NSG', 'National', 'National organization secretary general', 3),
('National Treasurer', 'NT', 'National', 'National organization treasurer', 4),
-- Provincial Level
('Provincial Chairperson', 'PC', 'Province', 'Provincial organization chairperson', 1),
('Provincial Deputy Chairperson', 'PDC', 'Province', 'Provincial organization deputy chairperson', 2),
('Provincial Secretary', 'PS', 'Province', 'Provincial organization secretary', 3),
('Provincial Treasurer', 'PT', 'Province', 'Provincial organization treasurer', 4),
-- Regional Level
('Regional Chairperson', 'RC', 'Region', 'Regional organization chairperson', 1),
('Regional Deputy Chairperson', 'RDC', 'Region', 'Regional organization deputy chairperson', 2),
('Regional Secretary', 'RS', 'Region', 'Regional organization secretary', 3),
('Regional Treasurer', 'RT', 'Region', 'Regional organization treasurer', 4),
-- Municipal Level
('Municipal Chairperson', 'MC', 'Municipality', 'Municipal organization chairperson', 1),
('Municipal Deputy Chairperson', 'MDC', 'Municipality', 'Municipal organization deputy chairperson', 2),
('Municipal Secretary', 'MS', 'Municipality', 'Municipal organization secretary', 3),
('Municipal Treasurer', 'MT', 'Municipality', 'Municipal organization treasurer', 4),
-- Ward Level
('Ward Chairperson', 'WC', 'Ward', 'Ward organization chairperson', 1),
('Ward Deputy Chairperson', 'WDC', 'Ward', 'Ward organization deputy chairperson', 2),
('Ward Secretary', 'WS', 'Ward', 'Ward organization secretary', 3),
('Ward Treasurer', 'WT', 'Ward', 'Ward organization treasurer', 4);

-- 6. Create LeadershipAppointments table
CREATE TABLE IF NOT EXISTS leadership_appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  position_id INT NOT NULL,
  member_id INT NOT NULL,
  hierarchy_level ENUM('National', 'Province', 'Region', 'Municipality', 'Ward') NOT NULL,
  entity_id INT NOT NULL,
  appointment_type ENUM('Elected', 'Appointed', 'Acting', 'Interim') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  appointment_status ENUM('Active', 'Inactive', 'Completed', 'Terminated') NOT NULL DEFAULT 'Active',
  appointed_by INT NOT NULL,
  appointment_notes TEXT,
  termination_reason TEXT,
  terminated_by INT NULL,
  terminated_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (position_id) REFERENCES leadership_positions(id) ON DELETE RESTRICT,
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE RESTRICT,
  FOREIGN KEY (appointed_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (terminated_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_appointment_position (position_id),
  INDEX idx_appointment_member (member_id),
  INDEX idx_appointment_entity (hierarchy_level, entity_id),
  INDEX idx_appointment_status (appointment_status),
  INDEX idx_appointment_dates (start_date, end_date)
);

-- 7. Create LeadershipElections table
CREATE TABLE IF NOT EXISTS leadership_elections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  election_name VARCHAR(255) NOT NULL,
  position_id INT NOT NULL,
  hierarchy_level ENUM('National', 'Province', 'Region', 'Municipality', 'Ward') NOT NULL,
  entity_id INT NOT NULL,
  election_date DATE NOT NULL,
  nomination_start_date DATE NOT NULL,
  nomination_end_date DATE NOT NULL,
  voting_start_datetime DATETIME NOT NULL,
  voting_end_datetime DATETIME NOT NULL,
  election_status ENUM('Planned', 'Nominations Open', 'Nominations Closed', 'Voting Open', 'Voting Closed', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Planned',
  total_eligible_voters INT DEFAULT 0,
  total_votes_cast INT DEFAULT 0,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (position_id) REFERENCES leadership_positions(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_election_position (position_id),
  INDEX idx_election_entity (hierarchy_level, entity_id),
  INDEX idx_election_status (election_status),
  INDEX idx_election_dates (election_date, voting_start_datetime)
);

-- 8. Create LeadershipElectionCandidates table
CREATE TABLE IF NOT EXISTS leadership_election_candidates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  election_id INT NOT NULL,
  member_id INT NOT NULL,
  nomination_date DATE NOT NULL,
  nominated_by INT NOT NULL,
  candidate_status ENUM('Nominated', 'Accepted', 'Declined', 'Disqualified', 'Withdrawn') NOT NULL DEFAULT 'Nominated',
  votes_received INT DEFAULT 0,
  candidate_statement TEXT,
  disqualification_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (election_id) REFERENCES leadership_elections(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE RESTRICT,
  FOREIGN KEY (nominated_by) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE KEY unique_election_candidate (election_id, member_id),
  INDEX idx_candidate_election (election_id),
  INDEX idx_candidate_member (member_id),
  INDEX idx_candidate_status (candidate_status),
  INDEX idx_candidate_votes (votes_received DESC)
);

-- 9. Create LeadershipElectionVotes table
CREATE TABLE IF NOT EXISTS leadership_election_votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  election_id INT NOT NULL,
  voter_member_id INT NOT NULL,
  candidate_id INT NOT NULL,
  vote_datetime DATETIME NOT NULL,
  vote_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (election_id) REFERENCES leadership_elections(id) ON DELETE CASCADE,
  FOREIGN KEY (voter_member_id) REFERENCES members(member_id) ON DELETE RESTRICT,
  FOREIGN KEY (candidate_id) REFERENCES leadership_election_candidates(id) ON DELETE RESTRICT,
  UNIQUE KEY unique_voter_election (election_id, voter_member_id),
  INDEX idx_vote_election (election_id),
  INDEX idx_vote_candidate (candidate_id),
  INDEX idx_vote_datetime (vote_datetime)
);

-- Commit the transaction
COMMIT;

-- Display completion message
SELECT 'Meeting and Leadership management tables created successfully!' as message;
