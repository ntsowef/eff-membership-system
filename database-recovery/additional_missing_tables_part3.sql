-- =====================================================================================
-- ADDITIONAL MISSING TABLES PART 3 - SMS, PRICING, STRUCTURES & IEC SYSTEMS
-- =====================================================================================
-- Purpose: Convert SMS, pricing, leadership structures, and IEC tables to PostgreSQL
-- Source: 012_sms_management, 013_birthday_sms, 016_renewal_pricing, 020_war_council, 024_iec_electoral
-- =====================================================================================

-- =====================================================================================
-- 5. SMS MANAGEMENT SYSTEM (012_sms_management_system.sql)
-- =====================================================================================

-- SMS Contact Lists Table
CREATE TABLE IF NOT EXISTS sms_contact_lists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    total_contacts INTEGER DEFAULT 0,
    active_contacts INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    allow_duplicates BOOLEAN DEFAULT FALSE,
    created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for SMS contact lists
CREATE INDEX IF NOT EXISTS idx_sms_contact_lists_active ON sms_contact_lists(is_active);
CREATE INDEX IF NOT EXISTS idx_sms_contact_lists_created_by ON sms_contact_lists(created_by);

-- SMS Contact List Members Table
CREATE TABLE IF NOT EXISTS sms_contact_list_members (
    id SERIAL PRIMARY KEY,
    list_id INTEGER NOT NULL REFERENCES sms_contact_lists(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    member_id INTEGER REFERENCES members(member_id) ON DELETE SET NULL,
    metadata JSONB, -- Store additional contact information
    is_active BOOLEAN DEFAULT TRUE,
    opted_out BOOLEAN DEFAULT FALSE,
    opted_out_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(list_id, phone_number)
);

-- Create indexes for SMS contact list members
CREATE INDEX IF NOT EXISTS idx_sms_contact_list_members_list ON sms_contact_list_members(list_id);
CREATE INDEX IF NOT EXISTS idx_sms_contact_list_members_phone ON sms_contact_list_members(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_contact_list_members_member ON sms_contact_list_members(member_id);
CREATE INDEX IF NOT EXISTS idx_sms_contact_list_members_active ON sms_contact_list_members(is_active);

-- SMS Provider Config Table
CREATE TABLE IF NOT EXISTS sms_provider_config (
    id SERIAL PRIMARY KEY,
    provider_name VARCHAR(100) NOT NULL UNIQUE,
    api_endpoint VARCHAR(500),
    api_key VARCHAR(500),
    api_secret VARCHAR(500),
    sender_id VARCHAR(50),
    supports_delivery_reports BOOLEAN DEFAULT FALSE,
    supports_unicode BOOLEAN DEFAULT FALSE,
    max_message_length INTEGER DEFAULT 160,
    rate_limit_per_minute INTEGER DEFAULT 100,
    rate_limit_per_hour INTEGER DEFAULT 1000,
    cost_per_sms DECIMAL(10, 4) DEFAULT 0.0000,
    is_active BOOLEAN DEFAULT FALSE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for SMS provider config
CREATE INDEX IF NOT EXISTS idx_sms_provider_config_active ON sms_provider_config(is_active);
CREATE INDEX IF NOT EXISTS idx_sms_provider_config_primary ON sms_provider_config(is_primary);

-- SMS Campaign Recipients Table
CREATE TABLE IF NOT EXISTS sms_campaign_recipients (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES sms_campaigns(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    member_id INTEGER REFERENCES members(member_id) ON DELETE SET NULL,
    personalization_data JSONB,
    status VARCHAR(20) CHECK (status IN ('pending', 'processed', 'excluded', 'failed')) DEFAULT 'pending',
    exclusion_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(campaign_id, phone_number)
);

-- Create indexes for SMS campaign recipients
CREATE INDEX IF NOT EXISTS idx_sms_campaign_recipients_campaign ON sms_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sms_campaign_recipients_phone ON sms_campaign_recipients(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_campaign_recipients_member ON sms_campaign_recipients(member_id);
CREATE INDEX IF NOT EXISTS idx_sms_campaign_recipients_status ON sms_campaign_recipients(status);

-- =====================================================================================
-- 6. BIRTHDAY SMS SYSTEM (013_birthday_sms_system.sql)
-- =====================================================================================

-- Birthday SMS Config Table
CREATE TABLE IF NOT EXISTS birthday_sms_config (
    id SERIAL PRIMARY KEY,
    is_enabled BOOLEAN DEFAULT TRUE,
    template_id INTEGER NOT NULL REFERENCES sms_templates(id) ON DELETE RESTRICT,
    send_time TIME DEFAULT '09:00:00', -- Time to send birthday messages
    timezone VARCHAR(50) DEFAULT 'Africa/Johannesburg',
    days_before_reminder INTEGER DEFAULT 0, -- Send reminder X days before birthday
    include_age BOOLEAN DEFAULT TRUE,
    include_organization_name BOOLEAN DEFAULT TRUE,
    max_daily_sends INTEGER DEFAULT 1000, -- Rate limiting
    retry_failed_sends BOOLEAN DEFAULT TRUE,
    max_retries INTEGER DEFAULT 3,
    created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for birthday SMS config
CREATE INDEX IF NOT EXISTS idx_birthday_config_enabled ON birthday_sms_config(is_enabled);
CREATE INDEX IF NOT EXISTS idx_birthday_config_template ON birthday_sms_config(template_id);

-- Birthday SMS History Table
CREATE TABLE IF NOT EXISTS birthday_sms_history (
    id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    member_name VARCHAR(255) NOT NULL,
    member_phone VARCHAR(20) NOT NULL,
    birth_date DATE NOT NULL,
    age_at_birthday INTEGER,
    template_id INTEGER REFERENCES sms_templates(id) ON DELETE SET NULL,
    message_content TEXT NOT NULL,
    campaign_id INTEGER REFERENCES sms_campaigns(id) ON DELETE SET NULL,
    message_id INTEGER REFERENCES sms_messages(id) ON DELETE SET NULL,
    scheduled_date DATE NOT NULL,
    sent_at TIMESTAMP,
    delivery_status VARCHAR(20) CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'cancelled')) DEFAULT 'pending',
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(member_id, scheduled_date)
);

-- Create indexes for birthday SMS history
CREATE INDEX IF NOT EXISTS idx_birthday_history_member ON birthday_sms_history(member_id);
CREATE INDEX IF NOT EXISTS idx_birthday_history_scheduled ON birthday_sms_history(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_birthday_history_status ON birthday_sms_history(delivery_status);
CREATE INDEX IF NOT EXISTS idx_birthday_history_sent ON birthday_sms_history(sent_at);
CREATE INDEX IF NOT EXISTS idx_birthday_history_birth_date ON birthday_sms_history(birth_date);

-- Birthday SMS Queue Table
CREATE TABLE IF NOT EXISTS birthday_sms_queue (
    id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    member_name VARCHAR(255) NOT NULL,
    member_phone VARCHAR(20) NOT NULL,
    birth_date DATE NOT NULL,
    age_at_birthday INTEGER,
    scheduled_for DATE NOT NULL,
    priority VARCHAR(10) CHECK (priority IN ('low', 'normal', 'high')) DEFAULT 'normal',
    status VARCHAR(20) CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')) DEFAULT 'queued',
    template_id INTEGER REFERENCES sms_templates(id) ON DELETE SET NULL,
    personalized_message TEXT,
    queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    UNIQUE(member_id, scheduled_for)
);

-- Create indexes for birthday SMS queue
CREATE INDEX IF NOT EXISTS idx_birthday_queue_scheduled ON birthday_sms_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_birthday_queue_status ON birthday_sms_queue(status);
CREATE INDEX IF NOT EXISTS idx_birthday_queue_priority ON birthday_sms_queue(priority);
CREATE INDEX IF NOT EXISTS idx_birthday_queue_member ON birthday_sms_queue(member_id);
CREATE INDEX IF NOT EXISTS idx_birthday_queue_processing ON birthday_sms_queue(status, scheduled_for, priority);

-- =====================================================================================
-- 7. RENEWAL PRICING SYSTEM (016_renewal_pricing_system.sql)
-- =====================================================================================

-- Renewal Pricing Tiers Table
CREATE TABLE IF NOT EXISTS renewal_pricing_tiers (
    tier_id SERIAL PRIMARY KEY,
    tier_name VARCHAR(100) NOT NULL UNIQUE,
    tier_code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    base_renewal_fee DECIMAL(10,2) NOT NULL DEFAULT 500.00,
    early_bird_discount_percent DECIMAL(5,2) DEFAULT 15.00,
    early_bird_days INTEGER DEFAULT 60,
    late_fee_percent DECIMAL(5,2) DEFAULT 20.00,
    grace_period_days INTEGER DEFAULT 30,
    min_age INTEGER,
    max_age INTEGER,
    requires_verification BOOLEAN DEFAULT FALSE,
    membership_duration_months INTEGER DEFAULT 12,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for pricing tiers
CREATE INDEX IF NOT EXISTS idx_pricing_tier_code ON renewal_pricing_tiers(tier_code);
CREATE INDEX IF NOT EXISTS idx_pricing_tier_active ON renewal_pricing_tiers(is_active);
CREATE INDEX IF NOT EXISTS idx_pricing_tier_order ON renewal_pricing_tiers(display_order);

-- Renewal Pricing Rules Table
CREATE TABLE IF NOT EXISTS renewal_pricing_rules (
    rule_id SERIAL PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(10) CHECK (rule_type IN ('discount', 'surcharge', 'override')) NOT NULL,
    condition_type VARCHAR(20) CHECK (condition_type IN ('age_range', 'province', 'membership_duration', 'payment_history', 'custom')) NOT NULL,
    condition_value JSONB,
    adjustment_type VARCHAR(15) CHECK (adjustment_type IN ('percentage', 'fixed_amount')) NOT NULL,
    adjustment_value DECIMAL(10,2) NOT NULL,
    max_adjustment DECIMAL(10,2),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,
    valid_from DATE,
    valid_until DATE,
    created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for pricing rules
CREATE INDEX IF NOT EXISTS idx_pricing_rule_type ON renewal_pricing_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_pricing_rule_active ON renewal_pricing_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_pricing_rule_priority ON renewal_pricing_rules(priority);

-- Renewal Pricing Overrides Table
CREATE TABLE IF NOT EXISTS renewal_pricing_overrides (
    override_id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    renewal_year INTEGER NOT NULL, -- Using INTEGER instead of YEAR for PostgreSQL
    original_amount DECIMAL(10,2) NOT NULL,
    override_amount DECIMAL(10,2) NOT NULL,
    override_reason TEXT NOT NULL,
    override_type VARCHAR(15) CHECK (override_type IN ('discount', 'waiver', 'adjustment', 'special_rate')) NOT NULL,
    requested_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    approved_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    approval_status VARCHAR(10) CHECK (approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    approval_date TIMESTAMP,
    approval_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(member_id, renewal_year)
);

-- Create indexes for pricing overrides
CREATE INDEX IF NOT EXISTS idx_override_member ON renewal_pricing_overrides(member_id);
CREATE INDEX IF NOT EXISTS idx_override_year ON renewal_pricing_overrides(renewal_year);
CREATE INDEX IF NOT EXISTS idx_override_status ON renewal_pricing_overrides(approval_status);
CREATE INDEX IF NOT EXISTS idx_override_requested_by ON renewal_pricing_overrides(requested_by);

-- =====================================================================================
-- 8. LEADERSHIP STRUCTURES (020_war_council_structure.sql)
-- =====================================================================================

-- Leadership Structures Table
CREATE TABLE IF NOT EXISTS leadership_structures (
    id SERIAL PRIMARY KEY,
    structure_name VARCHAR(100) NOT NULL,
    structure_code VARCHAR(20) NOT NULL UNIQUE,
    hierarchy_level VARCHAR(20) CHECK (hierarchy_level IN ('National', 'Province', 'Region', 'Municipality', 'Ward')) NOT NULL,
    total_positions INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for leadership structures
CREATE INDEX IF NOT EXISTS idx_structure_hierarchy ON leadership_structures(hierarchy_level);
CREATE INDEX IF NOT EXISTS idx_structure_active ON leadership_structures(is_active);
CREATE INDEX IF NOT EXISTS idx_structure_code ON leadership_structures(structure_code);

SELECT 'SMS, Pricing, and Leadership Structure Tables Created Successfully!' as result;
