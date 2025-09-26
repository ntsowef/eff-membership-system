-- =====================================================================================
-- ADDITIONAL MISSING TABLES PART 1 - LEADERSHIP ENHANCEMENTS & BULK OPERATIONS
-- =====================================================================================
-- Purpose: Convert remaining MySQL migration tables (007-025) to PostgreSQL
-- Source: Sequential migration files analysis
-- =====================================================================================

-- =====================================================================================
-- 1. LEADERSHIP ENHANCEMENTS SYSTEM (007_leadership_enhancements.sql)
-- =====================================================================================

-- Election Candidates Table
CREATE TABLE IF NOT EXISTS election_candidates (
    id SERIAL PRIMARY KEY,
    election_id INTEGER NOT NULL REFERENCES leadership_elections(election_id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    nomination_date DATE NOT NULL,
    nomination_statement TEXT,
    candidate_status VARCHAR(20) CHECK (candidate_status IN ('Nominated', 'Approved', 'Rejected', 'Withdrawn')) DEFAULT 'Nominated',
    votes_received INTEGER DEFAULT 0,
    is_winner BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(election_id, member_id)
);

-- Create indexes for election candidates
CREATE INDEX IF NOT EXISTS idx_election_candidates_election ON election_candidates(election_id);
CREATE INDEX IF NOT EXISTS idx_election_candidates_member ON election_candidates(member_id);
CREATE INDEX IF NOT EXISTS idx_election_candidates_status ON election_candidates(candidate_status);
CREATE INDEX IF NOT EXISTS idx_election_candidates_winner ON election_candidates(is_winner);
CREATE INDEX IF NOT EXISTS idx_election_candidates_votes ON election_candidates(votes_received);

-- Election Votes Table
CREATE TABLE IF NOT EXISTS election_votes (
    id SERIAL PRIMARY KEY,
    election_id INTEGER NOT NULL REFERENCES leadership_elections(election_id) ON DELETE CASCADE,
    candidate_id INTEGER NOT NULL REFERENCES election_candidates(id) ON DELETE CASCADE,
    voter_member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    vote_datetime TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(election_id, voter_member_id)
);

-- Create indexes for election votes
CREATE INDEX IF NOT EXISTS idx_election_votes_election ON election_votes(election_id);
CREATE INDEX IF NOT EXISTS idx_election_votes_candidate ON election_votes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_election_votes_voter ON election_votes(voter_member_id);
CREATE INDEX IF NOT EXISTS idx_election_votes_datetime ON election_votes(vote_datetime);

-- Leadership Terms Table
CREATE TABLE IF NOT EXISTS leadership_terms (
    id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    position_id INTEGER NOT NULL REFERENCES leadership_positions(id) ON DELETE CASCADE,
    hierarchy_level VARCHAR(20) CHECK (hierarchy_level IN ('National', 'Province', 'Region', 'Municipality', 'Ward')) NOT NULL,
    entity_id INTEGER NOT NULL,
    term_number INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    term_status VARCHAR(20) CHECK (term_status IN ('Active', 'Completed', 'Terminated')) DEFAULT 'Active',
    appointment_id INTEGER REFERENCES leadership_appointments(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for leadership terms
CREATE INDEX IF NOT EXISTS idx_leadership_terms_member ON leadership_terms(member_id);
CREATE INDEX IF NOT EXISTS idx_leadership_terms_position ON leadership_terms(position_id);
CREATE INDEX IF NOT EXISTS idx_leadership_terms_hierarchy ON leadership_terms(hierarchy_level);
CREATE INDEX IF NOT EXISTS idx_leadership_terms_entity ON leadership_terms(entity_id);
CREATE INDEX IF NOT EXISTS idx_leadership_terms_status ON leadership_terms(term_status);
CREATE INDEX IF NOT EXISTS idx_leadership_terms_dates ON leadership_terms(start_date, end_date);

-- Leadership Succession Plans Table
CREATE TABLE IF NOT EXISTS leadership_succession_plans (
    id SERIAL PRIMARY KEY,
    position_id INTEGER NOT NULL REFERENCES leadership_positions(id) ON DELETE CASCADE,
    hierarchy_level VARCHAR(20) CHECK (hierarchy_level IN ('National', 'Province', 'Region', 'Municipality', 'Ward')) NOT NULL,
    entity_id INTEGER NOT NULL,
    successor_member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    succession_order INTEGER NOT NULL,
    succession_type VARCHAR(20) CHECK (succession_type IN ('Designated', 'Emergency', 'Interim')) DEFAULT 'Designated',
    effective_date DATE,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for succession plans
CREATE INDEX IF NOT EXISTS idx_succession_plans_position ON leadership_succession_plans(position_id);
CREATE INDEX IF NOT EXISTS idx_succession_plans_hierarchy ON leadership_succession_plans(hierarchy_level);
CREATE INDEX IF NOT EXISTS idx_succession_plans_entity ON leadership_succession_plans(entity_id);
CREATE INDEX IF NOT EXISTS idx_succession_plans_successor ON leadership_succession_plans(successor_member_id);
CREATE INDEX IF NOT EXISTS idx_succession_plans_order ON leadership_succession_plans(succession_order);
CREATE INDEX IF NOT EXISTS idx_succession_plans_active ON leadership_succession_plans(is_active);

-- Leadership Performance Reviews Table
CREATE TABLE IF NOT EXISTS leadership_performance_reviews (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER NOT NULL REFERENCES leadership_appointments(id) ON DELETE CASCADE,
    review_period_start DATE NOT NULL,
    review_period_end DATE NOT NULL,
    reviewer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    overall_rating VARCHAR(20) CHECK (overall_rating IN ('Excellent', 'Good', 'Satisfactory', 'Needs Improvement', 'Unsatisfactory')) NOT NULL,
    leadership_effectiveness INTEGER CHECK (leadership_effectiveness BETWEEN 1 AND 5),
    communication_skills INTEGER CHECK (communication_skills BETWEEN 1 AND 5),
    decision_making INTEGER CHECK (decision_making BETWEEN 1 AND 5),
    team_collaboration INTEGER CHECK (team_collaboration BETWEEN 1 AND 5),
    goal_achievement INTEGER CHECK (goal_achievement BETWEEN 1 AND 5),
    strengths TEXT,
    areas_for_improvement TEXT,
    development_recommendations TEXT,
    review_comments TEXT,
    review_status VARCHAR(20) CHECK (review_status IN ('Draft', 'Submitted', 'Approved', 'Rejected')) DEFAULT 'Draft',
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance reviews
CREATE INDEX IF NOT EXISTS idx_performance_reviews_appointment ON leadership_performance_reviews(appointment_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_reviewer ON leadership_performance_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_period ON leadership_performance_reviews(review_period_start, review_period_end);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_rating ON leadership_performance_reviews(overall_rating);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_status ON leadership_performance_reviews(review_status);

-- Leadership Goals Table
CREATE TABLE IF NOT EXISTS leadership_goals (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER NOT NULL REFERENCES leadership_appointments(id) ON DELETE CASCADE,
    goal_title VARCHAR(255) NOT NULL,
    goal_description TEXT NOT NULL,
    goal_category VARCHAR(20) CHECK (goal_category IN ('Strategic', 'Operational', 'Development', 'Community', 'Financial')) NOT NULL,
    priority_level VARCHAR(10) CHECK (priority_level IN ('High', 'Medium', 'Low')) DEFAULT 'Medium',
    target_date DATE NOT NULL,
    completion_date DATE,
    goal_status VARCHAR(20) CHECK (goal_status IN ('Not Started', 'In Progress', 'Completed', 'Cancelled', 'Overdue')) DEFAULT 'Not Started',
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    success_metrics TEXT,
    progress_notes TEXT,
    created_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for leadership goals
CREATE INDEX IF NOT EXISTS idx_leadership_goals_appointment ON leadership_goals(appointment_id);
CREATE INDEX IF NOT EXISTS idx_leadership_goals_category ON leadership_goals(goal_category);
CREATE INDEX IF NOT EXISTS idx_leadership_goals_priority ON leadership_goals(priority_level);
CREATE INDEX IF NOT EXISTS idx_leadership_goals_status ON leadership_goals(goal_status);
CREATE INDEX IF NOT EXISTS idx_leadership_goals_target_date ON leadership_goals(target_date);
CREATE INDEX IF NOT EXISTS idx_leadership_goals_progress ON leadership_goals(progress_percentage);

-- Leadership Meetings Table
CREATE TABLE IF NOT EXISTS leadership_meetings (
    id SERIAL PRIMARY KEY,
    meeting_title VARCHAR(255) NOT NULL,
    meeting_type VARCHAR(20) CHECK (meeting_type IN ('Regular', 'Emergency', 'Strategic', 'Review', 'Planning')) NOT NULL,
    hierarchy_level VARCHAR(20) CHECK (hierarchy_level IN ('National', 'Province', 'Region', 'Municipality', 'Ward')) NOT NULL,
    entity_id INTEGER NOT NULL,
    meeting_date DATE NOT NULL,
    meeting_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 120,
    location VARCHAR(255),
    virtual_meeting_link VARCHAR(500),
    agenda TEXT,
    meeting_status VARCHAR(20) CHECK (meeting_status IN ('Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Postponed')) DEFAULT 'Scheduled',
    minutes TEXT,
    action_items TEXT,
    next_meeting_date DATE,
    created_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for leadership meetings
CREATE INDEX IF NOT EXISTS idx_leadership_meetings_hierarchy ON leadership_meetings(hierarchy_level);
CREATE INDEX IF NOT EXISTS idx_leadership_meetings_entity ON leadership_meetings(entity_id);
CREATE INDEX IF NOT EXISTS idx_leadership_meetings_date ON leadership_meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_leadership_meetings_type ON leadership_meetings(meeting_type);
CREATE INDEX IF NOT EXISTS idx_leadership_meetings_status ON leadership_meetings(meeting_status);

-- Leadership Meeting Attendees Table
CREATE TABLE IF NOT EXISTS leadership_meeting_attendees (
    id SERIAL PRIMARY KEY,
    meeting_id INTEGER NOT NULL REFERENCES leadership_meetings(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    attendance_status VARCHAR(20) CHECK (attendance_status IN ('Invited', 'Confirmed', 'Attended', 'Absent', 'Excused')) DEFAULT 'Invited',
    role_in_meeting VARCHAR(20) CHECK (role_in_meeting IN ('Chairperson', 'Secretary', 'Member', 'Observer', 'Guest')) DEFAULT 'Member',
    attendance_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(meeting_id, member_id)
);

-- Create indexes for meeting attendees
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting ON leadership_meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_member ON leadership_meeting_attendees(member_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_status ON leadership_meeting_attendees(attendance_status);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_role ON leadership_meeting_attendees(role_in_meeting);

-- =====================================================================================
-- 2. BULK OPERATIONS SYSTEM (009_bulk_operations_system.sql)
-- =====================================================================================

-- Bulk Operations Table
CREATE TABLE IF NOT EXISTS bulk_operations (
    operation_id SERIAL PRIMARY KEY,
    operation_type VARCHAR(20) CHECK (operation_type IN ('member_update', 'member_delete', 'member_transfer', 'notification_send', 'document_process')) NOT NULL,
    operation_status VARCHAR(20) CHECK (operation_status IN ('Pending', 'In Progress', 'Completed', 'Failed', 'Cancelled')) DEFAULT 'Pending',
    total_records INTEGER NOT NULL DEFAULT 0,
    processed_records INTEGER NOT NULL DEFAULT 0,
    successful_records INTEGER NOT NULL DEFAULT 0,
    failed_records INTEGER NOT NULL DEFAULT 0,
    operation_data JSONB,
    error_log JSONB,
    created_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for bulk operations
CREATE INDEX IF NOT EXISTS idx_bulk_operations_type ON bulk_operations(operation_type);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_status ON bulk_operations(operation_status);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_created_by ON bulk_operations(created_by);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_created_at ON bulk_operations(created_at);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_status_created ON bulk_operations(operation_status, created_at);

-- Member Transfers Table
CREATE TABLE IF NOT EXISTS member_transfers (
    transfer_id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    from_hierarchy_level VARCHAR(20) CHECK (from_hierarchy_level IN ('National', 'Province', 'Region', 'Municipality', 'Ward', 'Branch')) NOT NULL,
    from_entity_id INTEGER NOT NULL,
    to_hierarchy_level VARCHAR(20) CHECK (to_hierarchy_level IN ('National', 'Province', 'Region', 'Municipality', 'Ward', 'Branch')) NOT NULL,
    to_entity_id INTEGER NOT NULL,
    transfer_reason TEXT NOT NULL,
    transfer_date DATE NOT NULL,
    transferred_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    transfer_status VARCHAR(20) CHECK (transfer_status IN ('Pending', 'Approved', 'Completed', 'Rejected')) DEFAULT 'Completed',
    approval_notes TEXT,
    approved_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for member transfers
CREATE INDEX IF NOT EXISTS idx_member_transfers_member ON member_transfers(member_id);
CREATE INDEX IF NOT EXISTS idx_member_transfers_from ON member_transfers(from_hierarchy_level, from_entity_id);
CREATE INDEX IF NOT EXISTS idx_member_transfers_to ON member_transfers(to_hierarchy_level, to_entity_id);
CREATE INDEX IF NOT EXISTS idx_member_transfers_date ON member_transfers(transfer_date);
CREATE INDEX IF NOT EXISTS idx_member_transfers_status ON member_transfers(transfer_status);
CREATE INDEX IF NOT EXISTS idx_member_transfers_transferred_by ON member_transfers(transferred_by);

-- Member Notes Table
CREATE TABLE IF NOT EXISTS member_notes (
    note_id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    note_type VARCHAR(20) CHECK (note_type IN ('General', 'Administrative', 'Disciplinary', 'Transfer', 'Status Change', 'Other')) DEFAULT 'General',
    is_internal BOOLEAN DEFAULT TRUE,
    created_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for member notes
CREATE INDEX IF NOT EXISTS idx_member_notes_member ON member_notes(member_id);
CREATE INDEX IF NOT EXISTS idx_member_notes_type ON member_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_member_notes_created_by ON member_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_member_notes_created_at ON member_notes(created_at);

-- Bulk Notification Recipients Table
CREATE TABLE IF NOT EXISTS bulk_notification_recipients (
    recipient_id SERIAL PRIMARY KEY,
    operation_id INTEGER NOT NULL REFERENCES bulk_operations(operation_id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    notification_id INTEGER REFERENCES notifications(notification_id) ON DELETE SET NULL,
    recipient_status VARCHAR(20) CHECK (recipient_status IN ('Pending', 'Sent', 'Delivered', 'Failed', 'Bounced')) DEFAULT 'Pending',
    delivery_channel VARCHAR(10) CHECK (delivery_channel IN ('email', 'sms', 'in_app')) NOT NULL,
    delivery_attempt INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    delivered_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for bulk notification recipients
CREATE INDEX IF NOT EXISTS idx_bulk_notification_recipients_operation ON bulk_notification_recipients(operation_id);
CREATE INDEX IF NOT EXISTS idx_bulk_notification_recipients_member ON bulk_notification_recipients(member_id);
CREATE INDEX IF NOT EXISTS idx_bulk_notification_recipients_status ON bulk_notification_recipients(recipient_status);
CREATE INDEX IF NOT EXISTS idx_bulk_notification_recipients_channel ON bulk_notification_recipients(delivery_channel);
CREATE INDEX IF NOT EXISTS idx_bulk_notification_recipients_attempt ON bulk_notification_recipients(last_attempt_at);

-- Scheduled Operations Table
CREATE TABLE IF NOT EXISTS scheduled_operations (
    schedule_id SERIAL PRIMARY KEY,
    operation_name VARCHAR(255) NOT NULL,
    operation_type VARCHAR(20) CHECK (operation_type IN ('member_update', 'member_delete', 'member_transfer', 'notification_send', 'document_process', 'report_generation')) NOT NULL,
    operation_config JSONB NOT NULL,
    schedule_pattern VARCHAR(100) NOT NULL, -- Cron-like pattern
    next_execution TIMESTAMP NOT NULL,
    last_execution TIMESTAMP,
    execution_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for scheduled operations
CREATE INDEX IF NOT EXISTS idx_scheduled_operations_type ON scheduled_operations(operation_type);
CREATE INDEX IF NOT EXISTS idx_scheduled_operations_next_execution ON scheduled_operations(next_execution);
CREATE INDEX IF NOT EXISTS idx_scheduled_operations_active ON scheduled_operations(is_active);
CREATE INDEX IF NOT EXISTS idx_scheduled_operations_created_by ON scheduled_operations(created_by);

-- Batch Processing Queue Table
CREATE TABLE IF NOT EXISTS batch_processing_queue (
    queue_id SERIAL PRIMARY KEY,
    operation_id INTEGER NOT NULL REFERENCES bulk_operations(operation_id) ON DELETE CASCADE,
    batch_number INTEGER NOT NULL,
    batch_data JSONB NOT NULL,
    batch_status VARCHAR(20) CHECK (batch_status IN ('Pending', 'Processing', 'Completed', 'Failed')) DEFAULT 'Pending',
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for batch processing queue
CREATE INDEX IF NOT EXISTS idx_batch_processing_queue_operation ON batch_processing_queue(operation_id);
CREATE INDEX IF NOT EXISTS idx_batch_processing_queue_status ON batch_processing_queue(batch_status);
CREATE INDEX IF NOT EXISTS idx_batch_processing_queue_batch_number ON batch_processing_queue(batch_number);
CREATE INDEX IF NOT EXISTS idx_batch_processing_queue_retry ON batch_processing_queue(retry_count);
CREATE INDEX IF NOT EXISTS idx_batch_processing_queue_created ON batch_processing_queue(created_at);

-- Operation Templates Table
CREATE TABLE IF NOT EXISTS operation_templates (
    template_id SERIAL PRIMARY KEY,
    template_name VARCHAR(255) NOT NULL,
    template_description TEXT,
    operation_type VARCHAR(20) CHECK (operation_type IN ('member_update', 'member_delete', 'member_transfer', 'notification_send', 'document_process')) NOT NULL,
    template_config JSONB NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    created_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for operation templates
CREATE INDEX IF NOT EXISTS idx_operation_templates_type ON operation_templates(operation_type);
CREATE INDEX IF NOT EXISTS idx_operation_templates_public ON operation_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_operation_templates_usage ON operation_templates(usage_count);
CREATE INDEX IF NOT EXISTS idx_operation_templates_created_by ON operation_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_operation_templates_name ON operation_templates(template_name);

SELECT 'Bulk Operations System Tables Created Successfully!' as result;
