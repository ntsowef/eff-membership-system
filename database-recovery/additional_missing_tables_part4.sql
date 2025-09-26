-- =====================================================================================
-- ADDITIONAL MISSING TABLES PART 4 - IEC ELECTORAL EVENTS & PERFORMANCE OPTIMIZATION
-- =====================================================================================
-- Purpose: Convert IEC electoral events and performance optimization tables to PostgreSQL
-- Source: 024_iec_electoral_events_system.sql & performance_optimizations.sql
-- =====================================================================================

-- =====================================================================================
-- 9. IEC ELECTORAL EVENTS SYSTEM (024_iec_electoral_events_system.sql)
-- =====================================================================================

-- IEC Electoral Event Types Table
CREATE TABLE IF NOT EXISTS iec_electoral_event_types (
    id SERIAL PRIMARY KEY,
    iec_event_type_id INTEGER NOT NULL UNIQUE, -- Maps to IEC API ElectoralEventTypeID
    description VARCHAR(255) NOT NULL,
    is_municipal_election BOOLEAN DEFAULT FALSE, -- TRUE for Local Government Elections
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for IEC event types
CREATE INDEX IF NOT EXISTS idx_iec_event_type_id ON iec_electoral_event_types(iec_event_type_id);
CREATE INDEX IF NOT EXISTS idx_municipal_election ON iec_electoral_event_types(is_municipal_election);
CREATE INDEX IF NOT EXISTS idx_description ON iec_electoral_event_types(description);

-- IEC Electoral Events Table
CREATE TABLE IF NOT EXISTS iec_electoral_events (
    id SERIAL PRIMARY KEY,
    iec_event_id INTEGER NOT NULL UNIQUE, -- Maps to IEC API ElectoralEventID
    iec_event_type_id INTEGER NOT NULL REFERENCES iec_electoral_event_types(iec_event_type_id) ON DELETE RESTRICT,
    description VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    election_year INTEGER, -- Using INTEGER instead of YEAR for PostgreSQL
    election_date DATE, -- If available from API
    last_synced_at TIMESTAMP,
    sync_status VARCHAR(20) CHECK (sync_status IN ('pending', 'syncing', 'completed', 'failed')) DEFAULT 'pending',
    sync_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for IEC events
CREATE INDEX IF NOT EXISTS idx_iec_event_id ON iec_electoral_events(iec_event_id);
CREATE INDEX IF NOT EXISTS idx_iec_event_type_id ON iec_electoral_events(iec_event_type_id);
CREATE INDEX IF NOT EXISTS idx_is_active ON iec_electoral_events(is_active);
CREATE INDEX IF NOT EXISTS idx_election_year ON iec_electoral_events(election_year);
CREATE INDEX IF NOT EXISTS idx_sync_status ON iec_electoral_events(sync_status);
CREATE INDEX IF NOT EXISTS idx_last_synced ON iec_electoral_events(last_synced_at);

-- IEC Electoral Event Delimitations Table
CREATE TABLE IF NOT EXISTS iec_electoral_event_delimitations (
    id SERIAL PRIMARY KEY,
    iec_event_id INTEGER NOT NULL REFERENCES iec_electoral_events(iec_event_id) ON DELETE CASCADE,
    province_id INTEGER,
    province_name VARCHAR(255),
    municipality_id INTEGER,
    municipality_name VARCHAR(255),
    ward_id INTEGER,
    ward_number VARCHAR(50),
    voting_district_number VARCHAR(50),
    voting_district_name VARCHAR(255),
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for IEC delimitations
CREATE INDEX IF NOT EXISTS idx_iec_event_id ON iec_electoral_event_delimitations(iec_event_id);
CREATE INDEX IF NOT EXISTS idx_province_id ON iec_electoral_event_delimitations(province_id);
CREATE INDEX IF NOT EXISTS idx_municipality_id ON iec_electoral_event_delimitations(municipality_id);
CREATE INDEX IF NOT EXISTS idx_ward_id ON iec_electoral_event_delimitations(ward_id);
CREATE INDEX IF NOT EXISTS idx_voting_district ON iec_electoral_event_delimitations(voting_district_number);
CREATE INDEX IF NOT EXISTS idx_composite_location ON iec_electoral_event_delimitations(province_id, municipality_id, ward_id);

-- IEC Electoral Event Sync Logs Table
CREATE TABLE IF NOT EXISTS iec_electoral_event_sync_logs (
    id SERIAL PRIMARY KEY,
    sync_type VARCHAR(20) CHECK (sync_type IN ('event_types', 'events', 'delimitations', 'full_sync')) NOT NULL,
    sync_status VARCHAR(20) CHECK (sync_status IN ('started', 'completed', 'failed')) NOT NULL,
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    sync_duration_ms INTEGER,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    triggered_by VARCHAR(20) CHECK (triggered_by IN ('manual', 'scheduled', 'api_call')) DEFAULT 'manual',
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL
);

-- Create indexes for sync logs
CREATE INDEX IF NOT EXISTS idx_sync_type ON iec_electoral_event_sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_status ON iec_electoral_event_sync_logs(sync_status);
CREATE INDEX IF NOT EXISTS idx_started_at ON iec_electoral_event_sync_logs(started_at);
CREATE INDEX IF NOT EXISTS idx_triggered_by ON iec_electoral_event_sync_logs(triggered_by);

-- =====================================================================================
-- 10. PERFORMANCE OPTIMIZATION (performance_optimizations.sql)
-- =====================================================================================

-- Member Cache Summary Table (for high-performance member lookups)
CREATE TABLE IF NOT EXISTS member_cache_summary (
    member_id INTEGER PRIMARY KEY REFERENCES members(member_id) ON DELETE CASCADE,
    id_number VARCHAR(13) NOT NULL UNIQUE,
    membership_number VARCHAR(20) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    province_name VARCHAR(100),
    municipality_name VARCHAR(100),
    ward_number VARCHAR(10),
    voting_station_name VARCHAR(200),
    membership_status VARCHAR(20),
    join_date TIMESTAMP,
    expiry_date TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for member cache summary
CREATE INDEX IF NOT EXISTS idx_cache_id_number ON member_cache_summary(id_number);
CREATE INDEX IF NOT EXISTS idx_cache_member_id ON member_cache_summary(member_id);
CREATE INDEX IF NOT EXISTS idx_cache_membership_number ON member_cache_summary(membership_number);
CREATE INDEX IF NOT EXISTS idx_cache_status ON member_cache_summary(membership_status);
CREATE INDEX IF NOT EXISTS idx_cache_updated ON member_cache_summary(last_updated);

-- =====================================================================================
-- 11. INSERT DEFAULT DATA FOR NEW TABLES
-- =====================================================================================

-- Insert default IEC Electoral Event Types
INSERT INTO iec_electoral_event_types (iec_event_type_id, description, is_municipal_election) VALUES
(1, 'National Election', FALSE),
(2, 'Provincial Election', FALSE),
(3, 'Local Government Election', TRUE), -- This is Municipal Elections
(4, 'By-Election', FALSE)
ON CONFLICT (iec_event_type_id) DO UPDATE SET 
    description = EXCLUDED.description,
    is_municipal_election = EXCLUDED.is_municipal_election,
    updated_at = CURRENT_TIMESTAMP;

-- Insert known IEC Electoral Events
INSERT INTO iec_electoral_events (iec_event_id, iec_event_type_id, description, is_active, election_year) VALUES
-- Local Government Elections (Municipal Elections)
(1091, 3, 'LOCAL GOVERNMENT ELECTION 2021', TRUE, 2021),
(402, 3, 'LOCAL GOVERNMENT ELECTION 2016', FALSE, 2016),
(197, 3, 'LGE 2011', FALSE, 2011),
(95, 3, 'LGE 2006', FALSE, 2006),
(2, 3, 'LGE 2000', FALSE, 2000),
-- National Elections (for reference)
(1334, 1, '2024 NATIONAL ELECTION', TRUE, 2024),
(699, 1, '2019 NATIONAL ELECTION', FALSE, 2019),
(291, 1, '2014 National Election', FALSE, 2014),
(146, 1, '22 Apr 2009 National Election', FALSE, 2009),
(45, 1, '14 Apr 2004 National Election', FALSE, 2004),
(1, 1, 'National Elections 1999', FALSE, 1999)
ON CONFLICT (iec_event_id) DO UPDATE SET 
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    election_year = EXCLUDED.election_year,
    updated_at = CURRENT_TIMESTAMP;

-- Insert default renewal pricing tiers
INSERT INTO renewal_pricing_tiers (
    tier_name, tier_code, description, base_renewal_fee, 
    early_bird_discount_percent, early_bird_days, late_fee_percent, 
    grace_period_days, min_age, max_age, display_order
) VALUES
('Standard Membership', 'standard', 'Regular membership renewal for adult members', 500.00, 15.00, 60, 20.00, 30, 18, 64, 1),
('Student Membership', 'student', 'Discounted renewal for students and young adults', 250.00, 20.00, 60, 15.00, 45, 16, 25, 2),
('Senior Membership', 'senior', 'Special pricing for senior citizens', 300.00, 25.00, 90, 10.00, 60, 65, NULL, 3),
('Premium Membership', 'premium', 'Enhanced membership with additional benefits', 800.00, 10.00, 45, 25.00, 21, 18, NULL, 4),
('Complimentary Membership', 'complimentary', 'Free renewal for special cases', 0.00, 0.00, 0, 0.00, 90, NULL, NULL, 5)
ON CONFLICT (tier_code) DO NOTHING;

-- Insert War Council Structure
INSERT INTO leadership_structures (
    structure_name, 
    structure_code, 
    hierarchy_level, 
    total_positions, 
    description
) VALUES (
    'War Council Structure',
    'WCS',
    'National',
    15, -- 6 core positions + 9 CCT Deployees
    'National War Council Structure comprising President, Deputy President, Secretary General, Deputy Secretary General, National Chairperson, Treasurer General, and 9 CCT Deployees (one for each province)'
) ON CONFLICT (structure_code) DO NOTHING;

-- Insert default security policies
INSERT INTO security_policies (policy_name, policy_value, policy_type, description) VALUES
('max_failed_login_attempts', '5', 'number', 'Maximum failed login attempts before account lockout'),
('account_lockout_duration', '30', 'number', 'Account lockout duration in minutes'),
('session_timeout', '1440', 'number', 'Session timeout in minutes'),
('password_min_length', '8', 'number', 'Minimum password length'),
('password_require_uppercase', 'true', 'boolean', 'Require uppercase letters in password'),
('password_require_lowercase', 'true', 'boolean', 'Require lowercase letters in password'),
('password_require_numbers', 'true', 'boolean', 'Require numbers in password'),
('password_require_symbols', 'true', 'boolean', 'Require symbols in password'),
('password_expiry_days', '90', 'number', 'Password expiry in days'),
('password_history_count', '5', 'number', 'Number of previous passwords to remember'),
('mfa_required_for_admins', 'true', 'boolean', 'Require MFA for admin users'),
('api_rate_limit_per_minute', '100', 'number', 'API requests per minute per user'),
('suspicious_activity_threshold', '3', 'number', 'Number of different IPs to trigger suspicious activity alert')
ON CONFLICT (policy_name) DO UPDATE SET 
    policy_value = EXCLUDED.policy_value,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;

-- =====================================================================================
-- 12. CREATE TRIGGERS FOR UPDATED_AT COLUMNS
-- =====================================================================================

-- Create or replace trigger function for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all new tables with updated_at columns
CREATE TRIGGER update_election_candidates_updated_at BEFORE UPDATE ON election_candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leadership_terms_updated_at BEFORE UPDATE ON leadership_terms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leadership_succession_plans_updated_at BEFORE UPDATE ON leadership_succession_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leadership_performance_reviews_updated_at BEFORE UPDATE ON leadership_performance_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leadership_goals_updated_at BEFORE UPDATE ON leadership_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leadership_meetings_updated_at BEFORE UPDATE ON leadership_meetings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leadership_meeting_attendees_updated_at BEFORE UPDATE ON leadership_meeting_attendees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bulk_operations_updated_at BEFORE UPDATE ON bulk_operations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_member_notes_updated_at BEFORE UPDATE ON member_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bulk_notification_recipients_updated_at BEFORE UPDATE ON bulk_notification_recipients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scheduled_operations_updated_at BEFORE UPDATE ON scheduled_operations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_batch_processing_queue_updated_at BEFORE UPDATE ON batch_processing_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_operation_templates_updated_at BEFORE UPDATE ON operation_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_mfa_settings_updated_at BEFORE UPDATE ON user_mfa_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_security_settings_updated_at BEFORE UPDATE ON user_security_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_api_rate_limits_updated_at BEFORE UPDATE ON api_rate_limits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_security_policies_updated_at BEFORE UPDATE ON security_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_creation_workflow_updated_at BEFORE UPDATE ON user_creation_workflow FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_configuration_updated_at BEFORE UPDATE ON system_configuration FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sms_contact_lists_updated_at BEFORE UPDATE ON sms_contact_lists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sms_contact_list_members_updated_at BEFORE UPDATE ON sms_contact_list_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sms_provider_config_updated_at BEFORE UPDATE ON sms_provider_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_birthday_sms_config_updated_at BEFORE UPDATE ON birthday_sms_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_birthday_sms_history_updated_at BEFORE UPDATE ON birthday_sms_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_renewal_pricing_tiers_updated_at BEFORE UPDATE ON renewal_pricing_tiers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_renewal_pricing_rules_updated_at BEFORE UPDATE ON renewal_pricing_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_renewal_pricing_overrides_updated_at BEFORE UPDATE ON renewal_pricing_overrides FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leadership_structures_updated_at BEFORE UPDATE ON leadership_structures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_iec_electoral_event_types_updated_at BEFORE UPDATE ON iec_electoral_event_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_iec_electoral_events_updated_at BEFORE UPDATE ON iec_electoral_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_iec_electoral_event_delimitations_updated_at BEFORE UPDATE ON iec_electoral_event_delimitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT 'All Additional Missing Tables Created Successfully!' as result;
