-- Migration: Create meeting_invitations table for tracking meeting invitations
-- This table is separate from meeting_attendance which tracks actual attendance

CREATE TABLE IF NOT EXISTS meeting_invitations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  meeting_id INT NOT NULL,
  member_id INT NOT NULL,
  invitation_status ENUM('Sent', 'Delivered', 'Read', 'Accepted', 'Declined', 'Pending') DEFAULT 'Pending',
  attendance_type ENUM('Required', 'Optional', 'Observer') DEFAULT 'Required',
  role_in_meeting VARCHAR(100) NULL,
  voting_rights BOOLEAN DEFAULT TRUE,
  invitation_method ENUM('Email', 'SMS', 'System', 'Manual') DEFAULT 'System',
  invitation_sent_at TIMESTAMP NULL,
  invitation_read_at TIMESTAMP NULL,
  response_received_at TIMESTAMP NULL,
  invitation_priority INT DEFAULT 1, -- Higher number = higher priority
  invitation_notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_meeting_invitations_meeting (meeting_id),
  INDEX idx_meeting_invitations_member (member_id),
  INDEX idx_meeting_invitations_status (invitation_status),
  INDEX idx_meeting_invitations_type (attendance_type),
  INDEX idx_meeting_invitations_sent (invitation_sent_at),
  
  -- Unique constraint to prevent duplicate invitations
  UNIQUE KEY unique_meeting_member_invitation (meeting_id, member_id)
);

-- Add some sample data for testing (optional)
-- This will be populated by the application when meetings are created
