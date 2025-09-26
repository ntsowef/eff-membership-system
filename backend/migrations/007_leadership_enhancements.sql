-- Leadership Management System Enhancements
-- This migration adds additional tables and features for comprehensive leadership management

START TRANSACTION;

-- 1. Create election_candidates table (if not exists)
CREATE TABLE IF NOT EXISTS election_candidates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  election_id INT NOT NULL,
  member_id INT NOT NULL,
  nomination_date DATE NOT NULL,
  nomination_statement TEXT NULL,
  candidate_status ENUM('Nominated', 'Approved', 'Rejected', 'Withdrawn') DEFAULT 'Nominated',
  votes_received INT DEFAULT 0,
  is_winner BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (election_id) REFERENCES leadership_elections(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_election_candidates_election (election_id),
  INDEX idx_election_candidates_member (member_id),
  INDEX idx_election_candidates_status (candidate_status),
  INDEX idx_election_candidates_winner (is_winner),
  INDEX idx_election_candidates_votes (votes_received),
  
  -- Unique constraint to prevent duplicate candidates
  UNIQUE KEY unique_candidate_per_election (election_id, member_id)
);

-- 2. Create election_votes table (if not exists)
CREATE TABLE IF NOT EXISTS election_votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  election_id INT NOT NULL,
  candidate_id INT NOT NULL,
  voter_member_id INT NOT NULL,
  vote_datetime DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (election_id) REFERENCES leadership_elections(id) ON DELETE CASCADE,
  FOREIGN KEY (candidate_id) REFERENCES election_candidates(id) ON DELETE CASCADE,
  FOREIGN KEY (voter_member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_election_votes_election (election_id),
  INDEX idx_election_votes_candidate (candidate_id),
  INDEX idx_election_votes_voter (voter_member_id),
  INDEX idx_election_votes_datetime (vote_datetime),
  
  -- Unique constraint to prevent multiple votes from same voter in same election
  UNIQUE KEY unique_vote_per_election (election_id, voter_member_id)
);

-- 3. Create leadership_terms table for tracking term limits
CREATE TABLE IF NOT EXISTS leadership_terms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  position_id INT NOT NULL,
  hierarchy_level ENUM('National', 'Province', 'Region', 'Municipality', 'Ward') NOT NULL,
  entity_id INT NOT NULL,
  term_number INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  term_status ENUM('Active', 'Completed', 'Terminated') DEFAULT 'Active',
  appointment_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  FOREIGN KEY (position_id) REFERENCES leadership_positions(id) ON DELETE CASCADE,
  FOREIGN KEY (appointment_id) REFERENCES leadership_appointments(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_leadership_terms_member (member_id),
  INDEX idx_leadership_terms_position (position_id),
  INDEX idx_leadership_terms_hierarchy (hierarchy_level),
  INDEX idx_leadership_terms_entity (entity_id),
  INDEX idx_leadership_terms_status (term_status),
  INDEX idx_leadership_terms_dates (start_date, end_date)
);

-- 4. Create leadership_succession_plans table
CREATE TABLE IF NOT EXISTS leadership_succession_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  position_id INT NOT NULL,
  hierarchy_level ENUM('National', 'Province', 'Region', 'Municipality', 'Ward') NOT NULL,
  entity_id INT NOT NULL,
  successor_member_id INT NOT NULL,
  succession_order INT NOT NULL,
  succession_type ENUM('Designated', 'Emergency', 'Interim') DEFAULT 'Designated',
  effective_date DATE NULL,
  expiry_date DATE NULL,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (position_id) REFERENCES leadership_positions(id) ON DELETE CASCADE,
  FOREIGN KEY (successor_member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Indexes
  INDEX idx_succession_plans_position (position_id),
  INDEX idx_succession_plans_hierarchy (hierarchy_level),
  INDEX idx_succession_plans_entity (entity_id),
  INDEX idx_succession_plans_successor (successor_member_id),
  INDEX idx_succession_plans_order (succession_order),
  INDEX idx_succession_plans_active (is_active)
);

-- 5. Create leadership_performance_reviews table
CREATE TABLE IF NOT EXISTS leadership_performance_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  appointment_id INT NOT NULL,
  review_period_start DATE NOT NULL,
  review_period_end DATE NOT NULL,
  reviewer_id INT NOT NULL,
  overall_rating ENUM('Excellent', 'Good', 'Satisfactory', 'Needs Improvement', 'Unsatisfactory') NOT NULL,
  leadership_effectiveness INT CHECK (leadership_effectiveness BETWEEN 1 AND 5),
  communication_skills INT CHECK (communication_skills BETWEEN 1 AND 5),
  decision_making INT CHECK (decision_making BETWEEN 1 AND 5),
  team_collaboration INT CHECK (team_collaboration BETWEEN 1 AND 5),
  goal_achievement INT CHECK (goal_achievement BETWEEN 1 AND 5),
  strengths TEXT NULL,
  areas_for_improvement TEXT NULL,
  development_recommendations TEXT NULL,
  review_comments TEXT NULL,
  review_status ENUM('Draft', 'Submitted', 'Approved', 'Rejected') DEFAULT 'Draft',
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (appointment_id) REFERENCES leadership_appointments(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Indexes
  INDEX idx_performance_reviews_appointment (appointment_id),
  INDEX idx_performance_reviews_reviewer (reviewer_id),
  INDEX idx_performance_reviews_period (review_period_start, review_period_end),
  INDEX idx_performance_reviews_rating (overall_rating),
  INDEX idx_performance_reviews_status (review_status)
);

-- 6. Create leadership_goals table
CREATE TABLE IF NOT EXISTS leadership_goals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  appointment_id INT NOT NULL,
  goal_title VARCHAR(255) NOT NULL,
  goal_description TEXT NOT NULL,
  goal_category ENUM('Strategic', 'Operational', 'Development', 'Community', 'Financial') NOT NULL,
  priority_level ENUM('High', 'Medium', 'Low') DEFAULT 'Medium',
  target_date DATE NOT NULL,
  completion_date DATE NULL,
  goal_status ENUM('Not Started', 'In Progress', 'Completed', 'Cancelled', 'Overdue') DEFAULT 'Not Started',
  progress_percentage INT DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  success_metrics TEXT NULL,
  progress_notes TEXT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (appointment_id) REFERENCES leadership_appointments(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Indexes
  INDEX idx_leadership_goals_appointment (appointment_id),
  INDEX idx_leadership_goals_category (goal_category),
  INDEX idx_leadership_goals_priority (priority_level),
  INDEX idx_leadership_goals_status (goal_status),
  INDEX idx_leadership_goals_target_date (target_date),
  INDEX idx_leadership_goals_progress (progress_percentage)
);

-- 7. Create leadership_meetings table
CREATE TABLE IF NOT EXISTS leadership_meetings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  meeting_title VARCHAR(255) NOT NULL,
  meeting_type ENUM('Regular', 'Emergency', 'Strategic', 'Review', 'Planning') NOT NULL,
  hierarchy_level ENUM('National', 'Province', 'Region', 'Municipality', 'Ward') NOT NULL,
  entity_id INT NOT NULL,
  meeting_date DATE NOT NULL,
  meeting_time TIME NOT NULL,
  duration_minutes INT DEFAULT 120,
  location VARCHAR(255) NULL,
  virtual_meeting_link VARCHAR(500) NULL,
  agenda TEXT NULL,
  meeting_status ENUM('Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Postponed') DEFAULT 'Scheduled',
  minutes TEXT NULL,
  action_items TEXT NULL,
  next_meeting_date DATE NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Indexes
  INDEX idx_leadership_meetings_hierarchy (hierarchy_level),
  INDEX idx_leadership_meetings_entity (entity_id),
  INDEX idx_leadership_meetings_date (meeting_date),
  INDEX idx_leadership_meetings_type (meeting_type),
  INDEX idx_leadership_meetings_status (meeting_status)
);

-- 8. Create leadership_meeting_attendees table
CREATE TABLE IF NOT EXISTS leadership_meeting_attendees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  meeting_id INT NOT NULL,
  member_id INT NOT NULL,
  attendance_status ENUM('Invited', 'Confirmed', 'Attended', 'Absent', 'Excused') DEFAULT 'Invited',
  role_in_meeting ENUM('Chairperson', 'Secretary', 'Member', 'Observer', 'Guest') DEFAULT 'Member',
  attendance_notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (meeting_id) REFERENCES leadership_meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_meeting_attendees_meeting (meeting_id),
  INDEX idx_meeting_attendees_member (member_id),
  INDEX idx_meeting_attendees_status (attendance_status),
  INDEX idx_meeting_attendees_role (role_in_meeting),
  
  -- Unique constraint to prevent duplicate attendees
  UNIQUE KEY unique_attendee_per_meeting (meeting_id, member_id)
);

-- 9. Update leadership_positions table with additional fields
ALTER TABLE leadership_positions 
ADD COLUMN IF NOT EXISTS salary_grade VARCHAR(10) NULL AFTER requirements,
ADD COLUMN IF NOT EXISTS reporting_to_position_id INT NULL AFTER salary_grade,
ADD COLUMN IF NOT EXISTS is_elected_position BOOLEAN DEFAULT TRUE AFTER reporting_to_position_id,
ADD COLUMN IF NOT EXISTS minimum_age INT DEFAULT 18 AFTER is_elected_position,
ADD COLUMN IF NOT EXISTS minimum_membership_months INT DEFAULT 12 AFTER minimum_age;

-- Add foreign key for reporting structure
ALTER TABLE leadership_positions 
ADD CONSTRAINT fk_leadership_positions_reporting_to 
FOREIGN KEY (reporting_to_position_id) REFERENCES leadership_positions(id) ON DELETE SET NULL;

-- 10. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leadership_appointments_dates ON leadership_appointments(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leadership_elections_dates ON leadership_elections(election_date, voting_start_datetime, voting_end_datetime);

-- 11. Create views for leadership analytics
CREATE OR REPLACE VIEW vw_leadership_statistics AS
SELECT 
  lp.hierarchy_level,
  COUNT(DISTINCT lp.id) as total_positions,
  COUNT(DISTINCT CASE WHEN la.appointment_status = 'Active' THEN la.id END) as filled_positions,
  COUNT(DISTINCT CASE WHEN la.appointment_status = 'Active' THEN NULL ELSE lp.id END) as vacant_positions,
  COUNT(DISTINCT CASE WHEN la.appointment_type = 'Elected' AND la.appointment_status = 'Active' THEN la.id END) as elected_positions,
  COUNT(DISTINCT CASE WHEN la.appointment_type = 'Appointed' AND la.appointment_status = 'Active' THEN la.id END) as appointed_positions,
  AVG(DATEDIFF(COALESCE(la.end_date, CURDATE()), la.start_date)) as avg_tenure_days
FROM leadership_positions lp
LEFT JOIN leadership_appointments la ON lp.id = la.position_id
WHERE lp.is_active = TRUE
GROUP BY lp.hierarchy_level
ORDER BY 
  CASE lp.hierarchy_level 
    WHEN 'National' THEN 1 
    WHEN 'Province' THEN 2 
    WHEN 'Region' THEN 3 
    WHEN 'Municipality' THEN 4 
    WHEN 'Ward' THEN 5 
  END;

-- 12. Create view for election statistics
CREATE OR REPLACE VIEW vw_election_statistics AS
SELECT 
  le.hierarchy_level,
  COUNT(*) as total_elections,
  COUNT(CASE WHEN le.election_status = 'Completed' THEN 1 END) as completed_elections,
  COUNT(CASE WHEN le.election_status IN ('Planned', 'Nominations Open', 'Nominations Closed', 'Voting Open', 'Voting Closed') THEN 1 END) as active_elections,
  AVG(le.total_votes_cast) as avg_votes_cast,
  AVG(CASE WHEN le.total_eligible_voters > 0 THEN (le.total_votes_cast / le.total_eligible_voters) * 100 ELSE 0 END) as avg_turnout_percentage,
  MAX(le.election_date) as last_election_date
FROM leadership_elections le
GROUP BY le.hierarchy_level
ORDER BY 
  CASE le.hierarchy_level 
    WHEN 'National' THEN 1 
    WHEN 'Province' THEN 2 
    WHEN 'Region' THEN 3 
    WHEN 'Municipality' THEN 4 
    WHEN 'Ward' THEN 5 
  END;

COMMIT;
