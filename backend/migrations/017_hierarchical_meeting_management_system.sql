-- Hierarchical Meeting Management System Migration
-- This migration creates a comprehensive hierarchical meeting system supporting organizational structure

START TRANSACTION;

-- 1. Create enhanced meeting_types table with hierarchical support
DROP TABLE IF EXISTS meeting_types;
CREATE TABLE meeting_types (
  type_id INT AUTO_INCREMENT PRIMARY KEY,
  type_name VARCHAR(100) NOT NULL UNIQUE,
  type_code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT NULL,
  hierarchy_level ENUM('National', 'Provincial', 'Regional', 'Municipal', 'Ward') NOT NULL,
  meeting_category ENUM('Regular', 'Assembly', 'Conference', 'Special', 'Emergency') DEFAULT 'Regular',
  default_duration_minutes INT DEFAULT 120,
  requires_quorum BOOLEAN DEFAULT TRUE,
  min_notice_days INT DEFAULT 7,
  max_notice_days INT DEFAULT 30,
  frequency_type ENUM('Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'Annually', 'Ad-hoc') DEFAULT 'Ad-hoc',
  auto_invite_rules JSON NULL, -- JSON structure for automatic invitation rules
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_meeting_types_code (type_code),
  INDEX idx_meeting_types_hierarchy (hierarchy_level),
  INDEX idx_meeting_types_category (meeting_category),
  INDEX idx_meeting_types_active (is_active)
);

-- Insert hierarchical meeting types
INSERT INTO meeting_types (type_name, type_code, description, hierarchy_level, meeting_category, default_duration_minutes, requires_quorum, min_notice_days, frequency_type, auto_invite_rules) VALUES
-- National Level Meetings
('War Council Meeting', 'war_council', 'Weekly/Bi-weekly strategic planning meetings for National Officials and NEC members', 'National', 'Regular', 180, TRUE, 3, 'Weekly', 
 JSON_OBJECT('roles', JSON_ARRAY('President', 'Deputy President', 'Secretary General', 'Deputy Secretary General', 'National Chairperson', 'Treasurer General'), 'groups', JSON_ARRAY('NEC', 'Central Command Team'))),

('National People\'s Assembly', 'npa', 'Convention with representatives from all branches across all nine provinces', 'National', 'Assembly', 480, TRUE, 30, 'Annually', 
 JSON_OBJECT('scope', 'all_branches', 'provinces', 'all', 'representation_type', 'branch_delegates')),

('National General Assembly', 'nga', 'Formal assembly meeting for national level governance', 'National', 'Assembly', 360, TRUE, 21, 'Annually', 
 JSON_OBJECT('scope', 'national_governance', 'attendee_type', 'national_delegates')),

('CCT/NEC Quarterly Meeting', 'cct_nec_quarterly', 'Central Command Team + National Youth/Women Leadership + Provincial Leadership', 'National', 'Regular', 240, TRUE, 14, 'Quarterly', 
 JSON_OBJECT('groups', JSON_ARRAY('CCT', 'NEC'), 'youth_leadership', JSON_ARRAY('National Youth President', 'National Youth Secretary General'), 'women_leadership', JSON_ARRAY('National Women President', 'National Women Secretary General'), 'provincial_roles', JSON_ARRAY('Provincial Chairperson', 'Provincial Secretary'))),

('Policy Conference', 'policy_conference', 'Special events for policy development', 'National', 'Conference', 720, TRUE, 45, 'Ad-hoc', 
 JSON_OBJECT('scope', 'policy_development', 'attendee_type', 'policy_delegates')),

('Elective Conference', 'elective_conference', 'Leadership election meetings at national level', 'National', 'Conference', 480, TRUE, 60, 'Ad-hoc', 
 JSON_OBJECT('scope', 'leadership_elections', 'attendee_type', 'voting_delegates')),

-- Provincial Level Meetings
('Provincial People\'s Assembly', 'ppa', 'All provincial branches within the specific province', 'Provincial', 'Assembly', 360, TRUE, 21, 'Annually', 
 JSON_OBJECT('scope', 'provincial_branches', 'province_specific', true)),

('Provincial Elective Conference', 'provincial_elective', 'Leadership election meetings at provincial level', 'Provincial', 'Conference', 300, TRUE, 30, 'Ad-hoc', 
 JSON_OBJECT('scope', 'provincial_elections', 'province_specific', true)),

('Provincial General Assembly', 'pga', 'Regular provincial governance meetings', 'Provincial', 'Assembly', 240, TRUE, 14, 'Quarterly', 
 JSON_OBJECT('scope', 'provincial_governance', 'province_specific', true)),

('Special Provincial General Assembly', 'special_pga', 'Special purpose provincial meetings with all branches', 'Provincial', 'Special', 180, TRUE, 7, 'Ad-hoc', 
 JSON_OBJECT('scope', 'all_provincial_branches', 'province_specific', true, 'includes_leadership', true)),

-- Regional/District Level Meetings
('Regional Coordination Meeting', 'regional_coord', 'District-level coordination and governance meetings', 'Regional', 'Regular', 120, TRUE, 7, 'Monthly', 
 JSON_OBJECT('scope', 'regional_coordination', 'region_specific', true)),

-- Municipal Level Meetings
('Sub-Regional Meeting', 'sub_regional', 'Municipal-level coordination meetings', 'Municipal', 'Regular', 90, TRUE, 5, 'Monthly', 
 JSON_OBJECT('scope', 'municipal_coordination', 'municipality_specific', true)),

-- Ward Level Meetings
('Branch Meeting', 'branch_meeting', 'Ward/local level grassroots governance meetings', 'Ward', 'Regular', 90, TRUE, 3, 'Weekly', 
 JSON_OBJECT('scope', 'ward_governance', 'ward_specific', true));

-- 2. Create meeting_invitation_rules table for complex invitation logic
CREATE TABLE IF NOT EXISTS meeting_invitation_rules (
  rule_id INT AUTO_INCREMENT PRIMARY KEY,
  meeting_type_id INT NOT NULL,
  rule_name VARCHAR(100) NOT NULL,
  rule_description TEXT NULL,
  rule_priority INT DEFAULT 1, -- Higher number = higher priority
  rule_conditions JSON NOT NULL, -- Conditions for applying this rule
  invitation_targets JSON NOT NULL, -- Who gets invited based on this rule
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (meeting_type_id) REFERENCES meeting_types(type_id) ON DELETE CASCADE,
  INDEX idx_invitation_rules_type (meeting_type_id),
  INDEX idx_invitation_rules_priority (rule_priority),
  INDEX idx_invitation_rules_active (is_active)
);

-- 3. Create organizational_roles table for hierarchical roles
CREATE TABLE IF NOT EXISTS organizational_roles (
  role_id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(100) NOT NULL UNIQUE,
  role_code VARCHAR(50) NOT NULL UNIQUE,
  hierarchy_level ENUM('National', 'Provincial', 'Regional', 'Municipal', 'Ward', 'Branch') NOT NULL,
  role_category ENUM('Executive', 'Leadership', 'Administrative', 'Representative', 'Member') DEFAULT 'Member',
  role_description TEXT NULL,
  has_voting_rights BOOLEAN DEFAULT TRUE,
  can_chair_meetings BOOLEAN DEFAULT FALSE,
  meeting_invitation_priority INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_org_roles_hierarchy (hierarchy_level),
  INDEX idx_org_roles_category (role_category),
  INDEX idx_org_roles_code (role_code),
  INDEX idx_org_roles_active (is_active)
);

-- Insert organizational roles
INSERT INTO organizational_roles (role_name, role_code, hierarchy_level, role_category, has_voting_rights, can_chair_meetings, meeting_invitation_priority) VALUES
-- National Level Roles
('President', 'president', 'National', 'Executive', TRUE, TRUE, 10),
('Deputy President', 'deputy_president', 'National', 'Executive', TRUE, TRUE, 9),
('Secretary General', 'secretary_general', 'National', 'Executive', TRUE, TRUE, 9),
('Deputy Secretary General', 'deputy_secretary_general', 'National', 'Executive', TRUE, TRUE, 8),
('National Chairperson', 'national_chairperson', 'National', 'Executive', TRUE, TRUE, 8),
('Treasurer General', 'treasurer_general', 'National', 'Executive', TRUE, TRUE, 7),
('NEC Member', 'nec_member', 'National', 'Leadership', TRUE, FALSE, 6),
('Central Command Team Member', 'cct_member', 'National', 'Leadership', TRUE, FALSE, 6),
('National Youth President', 'national_youth_president', 'National', 'Leadership', TRUE, TRUE, 7),
('National Youth Secretary General', 'national_youth_sg', 'National', 'Leadership', TRUE, FALSE, 6),
('National Women President', 'national_women_president', 'National', 'Leadership', TRUE, TRUE, 7),
('National Women Secretary General', 'national_women_sg', 'National', 'Leadership', TRUE, FALSE, 6),

-- Provincial Level Roles
('Provincial Chairperson', 'provincial_chairperson', 'Provincial', 'Executive', TRUE, TRUE, 8),
('Provincial Secretary', 'provincial_secretary', 'Provincial', 'Executive', TRUE, TRUE, 7),
('Provincial Deputy Chairperson', 'provincial_deputy_chairperson', 'Provincial', 'Leadership', TRUE, TRUE, 6),
('Provincial Treasurer', 'provincial_treasurer', 'Provincial', 'Leadership', TRUE, FALSE, 5),

-- Regional Level Roles
('Regional Chairperson', 'regional_chairperson', 'Regional', 'Executive', TRUE, TRUE, 6),
('Regional Secretary', 'regional_secretary', 'Regional', 'Leadership', TRUE, FALSE, 5),

-- Municipal Level Roles
('Municipal Chairperson', 'municipal_chairperson', 'Municipal', 'Executive', TRUE, TRUE, 5),
('Municipal Secretary', 'municipal_secretary', 'Municipal', 'Leadership', TRUE, FALSE, 4),

-- Ward Level Roles
('Ward Chairperson', 'ward_chairperson', 'Ward', 'Executive', TRUE, TRUE, 4),
('Ward Secretary', 'ward_secretary', 'Ward', 'Leadership', TRUE, FALSE, 3),
('Branch Delegate', 'branch_delegate', 'Ward', 'Representative', TRUE, FALSE, 2),
('Branch Member', 'branch_member', 'Ward', 'Member', TRUE, FALSE, 1);

-- 4. Create member_roles table to assign roles to members
CREATE TABLE IF NOT EXISTS member_roles (
  member_role_id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  role_id INT NOT NULL,
  entity_id INT NULL, -- Province/Region/Municipality/Ward ID depending on role level
  entity_type ENUM('Province', 'Region', 'Municipality', 'Ward', 'Branch') NULL,
  appointment_date DATE NOT NULL,
  termination_date DATE NULL,
  is_active BOOLEAN DEFAULT TRUE,
  appointed_by INT NULL,
  appointment_notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES organizational_roles(role_id) ON DELETE RESTRICT,
  FOREIGN KEY (appointed_by) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_member_roles_member (member_id),
  INDEX idx_member_roles_role (role_id),
  INDEX idx_member_roles_entity (entity_type, entity_id),
  INDEX idx_member_roles_active (is_active),
  INDEX idx_member_roles_appointment (appointment_date),
  
  -- Unique constraint to prevent duplicate active roles for same member/entity
  UNIQUE KEY unique_active_member_role (member_id, role_id, entity_id, entity_type, is_active)
);

COMMIT;
