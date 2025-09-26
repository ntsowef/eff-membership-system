-- =====================================================================================
-- MISSING TABLES ANALYSIS - MYSQL TO POSTGRESQL MIGRATION
-- =====================================================================================
-- Purpose: Identify and convert missing MySQL tables to PostgreSQL
-- Based on analysis of backend/migrations/ and backend/database/migrations/ files
-- =====================================================================================

-- =====================================================================================
-- ANALYSIS RESULTS: MISSING TABLES FROM MYSQL MIGRATIONS
-- =====================================================================================

/*
CURRENT POSTGRESQL TABLES (45 tables):
✅ audit_logs, citizenships, districts, documents, genders, languages
✅ leadership_appointments, leadership_positions, members, membership_applications
✅ membership_renewals, membership_statuses, memberships, municipalities
✅ mv_* (7 materialized views), notifications, occupation_categories, occupations
✅ payments, permissions, provinces, qualifications, races, role_permissions, roles
✅ sms_campaigns, sms_delivery_reports, sms_messages, sms_providers, sms_queue, sms_templates
✅ subscription_types, user_activity_logs, user_sessions, users
✅ voter_statuses, voting_districts, voting_stations, wards

MISSING TABLES FROM MYSQL MIGRATIONS:

1. MEETING MANAGEMENT SYSTEM (8 tables):
❌ meetings
❌ meeting_types  
❌ meeting_agenda_items
❌ meeting_attendance
❌ meeting_minutes
❌ meeting_document_templates
❌ meeting_documents
❌ meeting_action_items
❌ meeting_decisions
❌ meeting_document_attachments
❌ meeting_document_versions

2. COMMUNICATION SYSTEM (4 tables):
❌ message_templates
❌ communication_campaigns
❌ messages
❌ communication_analytics

3. MAINTENANCE MODE SYSTEM (3 tables):
❌ maintenance_mode
❌ maintenance_mode_logs
❌ maintenance_notifications

4. FILE PROCESSING SYSTEM (1 table):
❌ file_processing_jobs

5. ADDITIONAL MISSING TABLES:
❌ meeting_invitations (from migration 018)
❌ leadership_elections (from migration 002)
❌ leadership_election_candidates (from migration 002)
❌ leadership_election_votes (from migration 002)

TOTAL MISSING TABLES: ~22 tables
*/

-- =====================================================================================
-- 1. MEETING MANAGEMENT SYSTEM TABLES
-- =====================================================================================

-- Meeting Types Table
CREATE TABLE IF NOT EXISTS meeting_types (
    type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(100) NOT NULL UNIQUE,
    type_code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    default_duration_minutes INTEGER DEFAULT 120,
    requires_quorum BOOLEAN DEFAULT TRUE,
    min_notice_days INTEGER DEFAULT 7,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_meeting_types_code ON meeting_types(type_code);
CREATE INDEX IF NOT EXISTS idx_meeting_types_active ON meeting_types(is_active);

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
('Conference', 'conference', 'Large conferences and conventions', 480, FALSE, 30)
ON CONFLICT (type_code) DO NOTHING;

-- Meetings Table
CREATE TABLE IF NOT EXISTS meetings (
    meeting_id SERIAL PRIMARY KEY,
    meeting_title VARCHAR(255) NOT NULL,
    meeting_type_id INTEGER NOT NULL REFERENCES meeting_types(type_id) ON DELETE RESTRICT,
    hierarchy_level VARCHAR(20) CHECK (hierarchy_level IN ('National', 'Province', 'Region', 'Municipality', 'Ward', 'Branch')) NOT NULL,
    entity_id INTEGER NOT NULL,
    meeting_date DATE NOT NULL,
    meeting_time TIME NOT NULL,
    end_time TIME,
    duration_minutes INTEGER DEFAULT 120,
    location VARCHAR(255),
    virtual_meeting_link VARCHAR(500),
    meeting_platform VARCHAR(20) CHECK (meeting_platform IN ('In-Person', 'Virtual', 'Hybrid')) DEFAULT 'In-Person',
    meeting_status VARCHAR(20) CHECK (meeting_status IN ('Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Postponed')) DEFAULT 'Scheduled',
    description TEXT,
    objectives TEXT,
    quorum_required INTEGER DEFAULT 0,
    quorum_achieved INTEGER DEFAULT 0,
    total_attendees INTEGER DEFAULT 0,
    meeting_chair_id INTEGER REFERENCES members(member_id) ON DELETE SET NULL,
    meeting_secretary_id INTEGER REFERENCES members(member_id) ON DELETE SET NULL,
    created_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for meetings
CREATE INDEX IF NOT EXISTS idx_meetings_type ON meetings(meeting_type_id);
CREATE INDEX IF NOT EXISTS idx_meetings_hierarchy ON meetings(hierarchy_level);
CREATE INDEX IF NOT EXISTS idx_meetings_entity ON meetings(entity_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(meeting_status);
CREATE INDEX IF NOT EXISTS idx_meetings_chair ON meetings(meeting_chair_id);
CREATE INDEX IF NOT EXISTS idx_meetings_secretary ON meetings(meeting_secretary_id);
CREATE INDEX IF NOT EXISTS idx_meetings_created_by ON meetings(created_by);

-- Meeting Agenda Items Table
CREATE TABLE IF NOT EXISTS meeting_agenda_items (
    agenda_item_id SERIAL PRIMARY KEY,
    meeting_id INTEGER NOT NULL REFERENCES meetings(meeting_id) ON DELETE CASCADE,
    item_number INTEGER NOT NULL,
    item_title VARCHAR(255) NOT NULL,
    item_description TEXT,
    item_type VARCHAR(20) CHECK (item_type IN ('Discussion', 'Decision', 'Information', 'Presentation', 'Report', 'Election', 'Other')) DEFAULT 'Discussion',
    presenter_id INTEGER REFERENCES members(member_id) ON DELETE SET NULL,
    allocated_minutes INTEGER DEFAULT 15,
    actual_minutes INTEGER,
    item_status VARCHAR(20) CHECK (item_status IN ('Pending', 'In Progress', 'Completed', 'Deferred', 'Cancelled')) DEFAULT 'Pending',
    discussion_summary TEXT,
    decision_made TEXT,
    action_required BOOLEAN DEFAULT FALSE,
    created_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for agenda items
CREATE INDEX IF NOT EXISTS idx_agenda_meeting ON meeting_agenda_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_agenda_presenter ON meeting_agenda_items(presenter_id);
CREATE INDEX IF NOT EXISTS idx_agenda_status ON meeting_agenda_items(item_status);
CREATE INDEX IF NOT EXISTS idx_agenda_order ON meeting_agenda_items(meeting_id, item_number);

-- Meeting Attendance Table
CREATE TABLE IF NOT EXISTS meeting_attendance (
    attendance_id SERIAL PRIMARY KEY,
    meeting_id INTEGER NOT NULL REFERENCES meetings(meeting_id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    attendance_status VARCHAR(20) CHECK (attendance_status IN ('Present', 'Absent', 'Excused', 'Late')) NOT NULL,
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    attendance_notes TEXT,
    recorded_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(meeting_id, member_id)
);

-- Create indexes for attendance
CREATE INDEX IF NOT EXISTS idx_attendance_meeting ON meeting_attendance(meeting_id);
CREATE INDEX IF NOT EXISTS idx_attendance_member ON meeting_attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON meeting_attendance(attendance_status);

-- Meeting Minutes Table
CREATE TABLE IF NOT EXISTS meeting_minutes (
    minutes_id SERIAL PRIMARY KEY,
    meeting_id INTEGER NOT NULL REFERENCES meetings(meeting_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    recorded_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    approval_status VARCHAR(20) CHECK (approval_status IN ('Draft', 'Pending Approval', 'Approved', 'Rejected')) NOT NULL DEFAULT 'Draft',
    approved_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for minutes
CREATE INDEX IF NOT EXISTS idx_minutes_meeting ON meeting_minutes(meeting_id);
CREATE INDEX IF NOT EXISTS idx_minutes_status ON meeting_minutes(approval_status);
CREATE INDEX IF NOT EXISTS idx_minutes_recorded_by ON meeting_minutes(recorded_by);
CREATE INDEX IF NOT EXISTS idx_minutes_approved_by ON meeting_minutes(approved_by);

-- Meeting Document Templates Table
CREATE TABLE IF NOT EXISTS meeting_document_templates (
    template_id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL,
    template_type VARCHAR(20) CHECK (template_type IN ('agenda', 'minutes', 'action_items', 'attendance')) NOT NULL,
    meeting_type_id INTEGER REFERENCES meeting_types(type_id) ON DELETE SET NULL,
    hierarchy_level VARCHAR(20) CHECK (hierarchy_level IN ('National', 'Provincial', 'Municipal', 'Ward')),
    template_content JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for document templates
CREATE INDEX IF NOT EXISTS idx_template_type ON meeting_document_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_template_meeting_type ON meeting_document_templates(meeting_type_id);
CREATE INDEX IF NOT EXISTS idx_template_hierarchy_level ON meeting_document_templates(hierarchy_level);

-- Meeting Documents Table
CREATE TABLE IF NOT EXISTS meeting_documents (
    document_id SERIAL PRIMARY KEY,
    meeting_id INTEGER NOT NULL REFERENCES meetings(meeting_id) ON DELETE CASCADE,
    document_type VARCHAR(20) CHECK (document_type IN ('agenda', 'minutes', 'action_items', 'attendance', 'other')) NOT NULL,
    document_title VARCHAR(200) NOT NULL,
    document_content JSONB NOT NULL,
    template_id INTEGER REFERENCES meeting_document_templates(template_id) ON DELETE SET NULL,
    version_number INTEGER DEFAULT 1,
    document_status VARCHAR(20) CHECK (document_status IN ('draft', 'review', 'approved', 'published')) DEFAULT 'draft',
    created_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    approved_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(meeting_id, document_type, version_number)
);

-- Create indexes for documents
CREATE INDEX IF NOT EXISTS idx_documents_meeting ON meeting_documents(meeting_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON meeting_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON meeting_documents(document_status);
CREATE INDEX IF NOT EXISTS idx_documents_version ON meeting_documents(meeting_id, document_type, version_number);

-- Meeting Action Items Table
CREATE TABLE IF NOT EXISTS meeting_action_items (
    action_item_id SERIAL PRIMARY KEY,
    meeting_id INTEGER NOT NULL REFERENCES meetings(meeting_id) ON DELETE CASCADE,
    document_id INTEGER REFERENCES meeting_documents(document_id) ON DELETE SET NULL,
    action_title VARCHAR(200) NOT NULL,
    action_description TEXT,
    assigned_to INTEGER REFERENCES members(member_id) ON DELETE SET NULL,
    assigned_role VARCHAR(100),
    due_date DATE,
    priority VARCHAR(10) CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    status VARCHAR(20) CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'overdue')) DEFAULT 'pending',
    completion_notes TEXT,
    created_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    completed_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for action items
CREATE INDEX IF NOT EXISTS idx_action_items_meeting ON meeting_action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_action_items_assigned_to ON meeting_action_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_action_items_status ON meeting_action_items(status);
CREATE INDEX IF NOT EXISTS idx_action_items_due_date ON meeting_action_items(due_date);
CREATE INDEX IF NOT EXISTS idx_action_items_priority ON meeting_action_items(priority);

-- Meeting Decisions Table
CREATE TABLE IF NOT EXISTS meeting_decisions (
    decision_id SERIAL PRIMARY KEY,
    meeting_id INTEGER NOT NULL REFERENCES meetings(meeting_id) ON DELETE CASCADE,
    document_id INTEGER REFERENCES meeting_documents(document_id) ON DELETE SET NULL,
    decision_title VARCHAR(200) NOT NULL,
    decision_description TEXT NOT NULL,
    decision_type VARCHAR(20) CHECK (decision_type IN ('resolution', 'motion', 'policy', 'appointment', 'other')) NOT NULL,
    voting_result JSONB,
    decision_status VARCHAR(20) CHECK (decision_status IN ('proposed', 'approved', 'rejected', 'deferred')) NOT NULL,
    proposed_by INTEGER REFERENCES members(member_id) ON DELETE SET NULL,
    seconded_by INTEGER REFERENCES members(member_id) ON DELETE SET NULL,
    created_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for decisions
CREATE INDEX IF NOT EXISTS idx_decisions_meeting ON meeting_decisions(meeting_id);
CREATE INDEX IF NOT EXISTS idx_decisions_type ON meeting_decisions(decision_type);
CREATE INDEX IF NOT EXISTS idx_decisions_status ON meeting_decisions(decision_status);

-- =====================================================================================
-- 2. COMMUNICATION SYSTEM TABLES
-- =====================================================================================

-- Message Templates Table
CREATE TABLE IF NOT EXISTS message_templates (
    template_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_type VARCHAR(20) CHECK (template_type IN ('Email', 'SMS', 'In-App', 'Push')) NOT NULL,
    category VARCHAR(20) CHECK (category IN ('System', 'Marketing', 'Announcement', 'Reminder', 'Welcome', 'Custom')) DEFAULT 'Custom',
    subject VARCHAR(500), -- For email templates
    content TEXT NOT NULL,
    variables JSONB, -- Template variables like {{member_name}}, {{expiry_date}}
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for message templates
CREATE INDEX IF NOT EXISTS idx_message_templates_type ON message_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_message_templates_category ON message_templates(category);
CREATE INDEX IF NOT EXISTS idx_message_templates_active ON message_templates(is_active);

-- Communication Campaigns Table
CREATE TABLE IF NOT EXISTS communication_campaigns (
    campaign_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    campaign_type VARCHAR(20) CHECK (campaign_type IN ('Mass', 'Targeted', 'Individual')) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('Draft', 'Scheduled', 'Sending', 'Completed', 'Cancelled', 'Failed')) DEFAULT 'Draft',
    template_id INTEGER REFERENCES message_templates(template_id) ON DELETE SET NULL,
    delivery_channels JSONB, -- ['Email', 'SMS', 'In-App']

    -- Targeting criteria
    target_criteria JSONB, -- Geographic, demographic, membership filters
    recipient_count INTEGER DEFAULT 0,

    -- Scheduling
    scheduled_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,

    -- Tracking
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0, -- Email tracking
    total_clicked INTEGER DEFAULT 0, -- Link tracking

    created_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON communication_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON communication_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON communication_campaigns(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON communication_campaigns(created_by);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
    message_id SERIAL PRIMARY KEY,
    conversation_id VARCHAR(50) NOT NULL, -- UUID for grouping related messages
    campaign_id INTEGER REFERENCES communication_campaigns(campaign_id) ON DELETE SET NULL,

    -- Sender/Recipient
    sender_type VARCHAR(20) CHECK (sender_type IN ('Admin', 'Member', 'System')) NOT NULL,
    sender_id INTEGER, -- user_id or member_id based on sender_type
    recipient_type VARCHAR(20) CHECK (recipient_type IN ('Admin', 'Member', 'All')) NOT NULL,
    recipient_id INTEGER, -- user_id or member_id based on recipient_type

    -- Message content
    subject VARCHAR(500),
    content TEXT NOT NULL,
    message_type VARCHAR(20) CHECK (message_type IN ('Text', 'HTML', 'Template')) DEFAULT 'Text',
    template_id INTEGER REFERENCES message_templates(template_id) ON DELETE SET NULL,
    template_data JSONB, -- Data for template variables

    -- Delivery
    delivery_channel VARCHAR(20) CHECK (delivery_channel IN ('Email', 'SMS', 'In-App', 'Push')) NOT NULL,
    delivery_status VARCHAR(20) CHECK (delivery_status IN ('Pending', 'Sent', 'Delivered', 'Failed', 'Bounced')) DEFAULT 'Pending',
    delivery_attempts INTEGER DEFAULT 0,
    delivered_at TIMESTAMP,
    failed_reason TEXT,

    -- Tracking
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    clicked_links JSONB, -- Track link clicks

    -- Priority and scheduling
    priority VARCHAR(10) CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
    scheduled_for TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_campaign ON messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_type, sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_delivery_status ON messages(delivery_status);
CREATE INDEX IF NOT EXISTS idx_messages_delivery_channel ON messages(delivery_channel);
CREATE INDEX IF NOT EXISTS idx_messages_scheduled ON messages(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_messages_priority ON messages(priority);

-- Communication Analytics Table
CREATE TABLE IF NOT EXISTS communication_analytics (
    analytics_id SERIAL PRIMARY KEY,
    date DATE NOT NULL,

    -- Campaign metrics
    campaigns_sent INTEGER DEFAULT 0,
    campaigns_completed INTEGER DEFAULT 0,
    campaigns_failed INTEGER DEFAULT 0,

    -- Message metrics by channel
    emails_sent INTEGER DEFAULT 0,
    emails_delivered INTEGER DEFAULT 0,
    emails_opened INTEGER DEFAULT 0,
    emails_clicked INTEGER DEFAULT 0,
    emails_bounced INTEGER DEFAULT 0,

    sms_sent INTEGER DEFAULT 0,
    sms_delivered INTEGER DEFAULT 0,
    sms_failed INTEGER DEFAULT 0,

    in_app_sent INTEGER DEFAULT 0,
    in_app_delivered INTEGER DEFAULT 0,
    in_app_read INTEGER DEFAULT 0,

    -- Geographic breakdown
    province_breakdown JSONB, -- {"GP": 150, "WC": 200, ...}
    municipality_breakdown JSONB,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(date)
);

-- Create indexes for analytics
CREATE INDEX IF NOT EXISTS idx_communication_analytics_date ON communication_analytics(date);

SELECT 'Communication System Tables Created Successfully!' as result;
