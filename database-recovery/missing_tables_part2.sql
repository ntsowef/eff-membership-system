-- =====================================================================================
-- MISSING TABLES PART 2 - MAINTENANCE, FILE PROCESSING, AND ADDITIONAL SYSTEMS
-- =====================================================================================

-- =====================================================================================
-- 3. MAINTENANCE MODE SYSTEM TABLES
-- =====================================================================================

-- Maintenance Mode Table
CREATE TABLE IF NOT EXISTS maintenance_mode (
    maintenance_id SERIAL PRIMARY KEY,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    maintenance_message TEXT,
    maintenance_level VARCHAR(20) CHECK (maintenance_level IN ('full_system', 'api_only', 'frontend_only', 'specific_modules')) NOT NULL DEFAULT 'full_system',
    affected_modules JSONB, -- For specific module maintenance
    
    -- Scheduling
    scheduled_start TIMESTAMP,
    scheduled_end TIMESTAMP,
    auto_enable BOOLEAN NOT NULL DEFAULT FALSE,
    auto_disable BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Bypass settings
    bypass_admin_users BOOLEAN NOT NULL DEFAULT TRUE,
    bypass_roles JSONB, -- Array of role names that can bypass
    bypass_ip_addresses JSONB, -- Array of IP addresses that can bypass
    bypass_user_ids JSONB, -- Array of specific user IDs that can bypass
    
    -- Metadata
    enabled_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    disabled_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    enabled_at TIMESTAMP,
    disabled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for maintenance mode
CREATE INDEX IF NOT EXISTS idx_maintenance_enabled ON maintenance_mode(is_enabled);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedule ON maintenance_mode(scheduled_start, scheduled_end);
CREATE INDEX IF NOT EXISTS idx_maintenance_level ON maintenance_mode(maintenance_level);

-- Maintenance Mode Logs Table
CREATE TABLE IF NOT EXISTS maintenance_mode_logs (
    log_id SERIAL PRIMARY KEY,
    action VARCHAR(20) CHECK (action IN ('enabled', 'disabled', 'scheduled', 'auto_enabled', 'auto_disabled', 'updated')) NOT NULL,
    maintenance_level VARCHAR(50),
    message TEXT,
    scheduled_start TIMESTAMP,
    scheduled_end TIMESTAMP,
    bypass_settings JSONB,
    
    -- User context
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for maintenance logs
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_action ON maintenance_mode_logs(action);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_user ON maintenance_mode_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_created ON maintenance_mode_logs(created_at);

-- Maintenance Notifications Table
CREATE TABLE IF NOT EXISTS maintenance_notifications (
    notification_id SERIAL PRIMARY KEY,
    notification_type VARCHAR(20) CHECK (notification_type IN ('warning', 'immediate', 'completed')) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    scheduled_maintenance_start TIMESTAMP,
    
    -- Targeting
    target_all_users BOOLEAN NOT NULL DEFAULT TRUE,
    target_roles JSONB, -- Array of role names to notify
    target_user_ids JSONB, -- Array of specific user IDs to notify
    
    -- Status
    is_sent BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at TIMESTAMP,
    
    -- Metadata
    created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for maintenance notifications
CREATE INDEX IF NOT EXISTS idx_maintenance_notifications_type ON maintenance_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_notifications_sent ON maintenance_notifications(is_sent);
CREATE INDEX IF NOT EXISTS idx_maintenance_notifications_schedule ON maintenance_notifications(scheduled_maintenance_start);

-- Insert default maintenance mode record
INSERT INTO maintenance_mode (
    is_enabled, 
    maintenance_message, 
    maintenance_level,
    bypass_admin_users,
    bypass_roles,
    bypass_ip_addresses,
    bypass_user_ids
) VALUES (
    FALSE,
    'The system is currently under maintenance. Please check back shortly.',
    'full_system',
    TRUE,
    '["super_admin", "system_admin"]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
) ON CONFLICT DO NOTHING;

-- =====================================================================================
-- 4. FILE PROCESSING SYSTEM TABLE
-- =====================================================================================

-- File Processing Jobs Table
CREATE TABLE IF NOT EXISTS file_processing_jobs (
    job_id SERIAL PRIMARY KEY,
    job_uuid VARCHAR(100) UNIQUE NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    ward_number INTEGER,
    status VARCHAR(20) CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')) DEFAULT 'queued',
    progress INTEGER DEFAULT 0,
    error TEXT,
    result JSONB,
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for file processing jobs
CREATE INDEX IF NOT EXISTS idx_file_jobs_uuid ON file_processing_jobs(job_uuid);
CREATE INDEX IF NOT EXISTS idx_file_jobs_status ON file_processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_file_jobs_created ON file_processing_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_file_jobs_ward ON file_processing_jobs(ward_number);
CREATE INDEX IF NOT EXISTS idx_file_jobs_user ON file_processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_file_jobs_priority ON file_processing_jobs(priority, created_at);

-- =====================================================================================
-- 5. LEADERSHIP ELECTIONS SYSTEM TABLES
-- =====================================================================================

-- Leadership Elections Table
CREATE TABLE IF NOT EXISTS leadership_elections (
    election_id SERIAL PRIMARY KEY,
    election_name VARCHAR(255) NOT NULL,
    hierarchy_level VARCHAR(20) CHECK (hierarchy_level IN ('National', 'Province', 'Region', 'Municipality', 'Ward')) NOT NULL,
    entity_id INTEGER NOT NULL,
    election_type VARCHAR(20) CHECK (election_type IN ('Regular', 'By-Election', 'Special')) NOT NULL DEFAULT 'Regular',
    election_status VARCHAR(20) CHECK (election_status IN ('Planned', 'Nominations Open', 'Nominations Closed', 'Voting Open', 'Voting Closed', 'Results Published', 'Completed', 'Cancelled')) NOT NULL DEFAULT 'Planned',
    
    -- Dates
    nomination_start_date DATE NOT NULL,
    nomination_end_date DATE NOT NULL,
    voting_start_date DATE NOT NULL,
    voting_end_date DATE NOT NULL,
    
    -- Settings
    max_nominations_per_position INTEGER DEFAULT 1,
    requires_seconder BOOLEAN DEFAULT TRUE,
    voting_method VARCHAR(20) CHECK (voting_method IN ('Secret Ballot', 'Show of Hands', 'Electronic')) DEFAULT 'Secret Ballot',
    
    -- Results
    total_eligible_voters INTEGER DEFAULT 0,
    total_votes_cast INTEGER DEFAULT 0,
    results_published_at TIMESTAMP,
    
    created_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for elections
CREATE INDEX IF NOT EXISTS idx_elections_hierarchy ON leadership_elections(hierarchy_level, entity_id);
CREATE INDEX IF NOT EXISTS idx_elections_status ON leadership_elections(election_status);
CREATE INDEX IF NOT EXISTS idx_elections_dates ON leadership_elections(voting_start_date, voting_end_date);

-- Leadership Election Candidates Table
CREATE TABLE IF NOT EXISTS leadership_election_candidates (
    candidate_id SERIAL PRIMARY KEY,
    election_id INTEGER NOT NULL REFERENCES leadership_elections(election_id) ON DELETE CASCADE,
    position_id INTEGER NOT NULL REFERENCES leadership_positions(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    
    -- Nomination details
    nominated_by INTEGER REFERENCES members(member_id) ON DELETE SET NULL,
    seconded_by INTEGER REFERENCES members(member_id) ON DELETE SET NULL,
    nomination_statement TEXT,
    candidate_status VARCHAR(20) CHECK (candidate_status IN ('Nominated', 'Accepted', 'Declined', 'Withdrawn', 'Disqualified')) NOT NULL DEFAULT 'Nominated',
    
    -- Results
    votes_received INTEGER DEFAULT 0,
    is_winner BOOLEAN DEFAULT FALSE,
    
    nominated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(election_id, position_id, member_id)
);

-- Create indexes for candidates
CREATE INDEX IF NOT EXISTS idx_candidates_election ON leadership_election_candidates(election_id);
CREATE INDEX IF NOT EXISTS idx_candidates_position ON leadership_election_candidates(position_id);
CREATE INDEX IF NOT EXISTS idx_candidates_member ON leadership_election_candidates(member_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON leadership_election_candidates(candidate_status);

-- Leadership Election Votes Table
CREATE TABLE IF NOT EXISTS leadership_election_votes (
    vote_id SERIAL PRIMARY KEY,
    election_id INTEGER NOT NULL REFERENCES leadership_elections(election_id) ON DELETE CASCADE,
    position_id INTEGER NOT NULL REFERENCES leadership_positions(id) ON DELETE CASCADE,
    voter_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    candidate_id INTEGER NOT NULL REFERENCES leadership_election_candidates(candidate_id) ON DELETE CASCADE,
    
    -- Vote details
    vote_value INTEGER DEFAULT 1, -- For ranked voting systems
    vote_rank INTEGER, -- For ranked choice voting
    
    -- Audit
    vote_cast_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    
    UNIQUE(election_id, position_id, voter_id, candidate_id)
);

-- Create indexes for votes
CREATE INDEX IF NOT EXISTS idx_votes_election ON leadership_election_votes(election_id);
CREATE INDEX IF NOT EXISTS idx_votes_position ON leadership_election_votes(position_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter ON leadership_election_votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_votes_candidate ON leadership_election_votes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_votes_cast_time ON leadership_election_votes(vote_cast_at);

-- =====================================================================================
-- 6. MEETING INVITATIONS TABLE
-- =====================================================================================

-- Meeting Invitations Table
CREATE TABLE IF NOT EXISTS meeting_invitations (
    invitation_id SERIAL PRIMARY KEY,
    meeting_id INTEGER NOT NULL REFERENCES meetings(meeting_id) ON DELETE CASCADE,
    invitee_type VARCHAR(20) CHECK (invitee_type IN ('Member', 'User', 'External')) NOT NULL,
    invitee_id INTEGER, -- member_id or user_id based on invitee_type
    invitee_email VARCHAR(255), -- For external invitees
    invitee_name VARCHAR(255), -- For external invitees
    
    -- Invitation details
    invitation_status VARCHAR(20) CHECK (invitation_status IN ('Sent', 'Delivered', 'Opened', 'Accepted', 'Declined', 'Tentative', 'No Response')) DEFAULT 'Sent',
    response_message TEXT,
    
    -- Tracking
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    responded_at TIMESTAMP,
    
    -- Metadata
    created_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for invitations
CREATE INDEX IF NOT EXISTS idx_invitations_meeting ON meeting_invitations(meeting_id);
CREATE INDEX IF NOT EXISTS idx_invitations_invitee ON meeting_invitations(invitee_type, invitee_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON meeting_invitations(invitation_status);
CREATE INDEX IF NOT EXISTS idx_invitations_sent ON meeting_invitations(sent_at);

-- =====================================================================================
-- 7. TRIGGERS FOR UPDATED_AT COLUMNS
-- =====================================================================================

-- Create trigger function for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all new tables
CREATE TRIGGER update_meeting_types_updated_at BEFORE UPDATE ON meeting_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meeting_agenda_items_updated_at BEFORE UPDATE ON meeting_agenda_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meeting_attendance_updated_at BEFORE UPDATE ON meeting_attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meeting_minutes_updated_at BEFORE UPDATE ON meeting_minutes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meeting_document_templates_updated_at BEFORE UPDATE ON meeting_document_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meeting_documents_updated_at BEFORE UPDATE ON meeting_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meeting_action_items_updated_at BEFORE UPDATE ON meeting_action_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meeting_decisions_updated_at BEFORE UPDATE ON meeting_decisions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_message_templates_updated_at BEFORE UPDATE ON message_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_communication_campaigns_updated_at BEFORE UPDATE ON communication_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_communication_analytics_updated_at BEFORE UPDATE ON communication_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_maintenance_mode_updated_at BEFORE UPDATE ON maintenance_mode FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_maintenance_notifications_updated_at BEFORE UPDATE ON maintenance_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_file_processing_jobs_updated_at BEFORE UPDATE ON file_processing_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leadership_elections_updated_at BEFORE UPDATE ON leadership_elections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leadership_election_candidates_updated_at BEFORE UPDATE ON leadership_election_candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meeting_invitations_updated_at BEFORE UPDATE ON meeting_invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT 'All Missing Tables Created Successfully!' as result;
