-- =====================================================================================
-- ADDITIONAL MISSING TABLES PART 2 - SECURITY & USER MANAGEMENT SYSTEMS
-- =====================================================================================
-- Purpose: Convert security and user management tables to PostgreSQL
-- Source: 010_advanced_security_features.sql & 011_complete_user_management_system.sql
-- =====================================================================================

-- =====================================================================================
-- 3. ADVANCED SECURITY FEATURES (010_advanced_security_features.sql)
-- =====================================================================================

-- User MFA Settings Table
CREATE TABLE IF NOT EXISTS user_mfa_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    secret_key VARCHAR(255) NOT NULL,
    backup_codes JSONB,
    is_enabled BOOLEAN DEFAULT FALSE,
    enabled_at TIMESTAMP,
    disabled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id)
);

-- Create indexes for user MFA settings
CREATE INDEX IF NOT EXISTS idx_user_mfa_settings_user ON user_mfa_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mfa_settings_enabled ON user_mfa_settings(is_enabled);

-- Login Attempts Table
CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    email VARCHAR(255),
    ip_address INET NOT NULL,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(100),
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for login attempts
CREATE INDEX IF NOT EXISTS idx_login_attempts_user ON login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_success ON login_attempts(success);
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON login_attempts(attempted_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_time ON login_attempts(user_id, attempted_at);

-- Security Events Table
CREATE TABLE IF NOT EXISTS security_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    event_type VARCHAR(20) CHECK (event_type IN ('login', 'logout', 'password_change', 'mfa_setup', 'account_locked', 'suspicious_activity', 'permission_change', 'data_access')) NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    details JSONB,
    severity VARCHAR(10) CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for security events
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_user_type ON security_events(user_id, event_type);

-- User Security Settings Table
CREATE TABLE IF NOT EXISTS user_security_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    session_timeout_minutes INTEGER DEFAULT 1440, -- 24 hours
    max_failed_attempts INTEGER DEFAULT 5,
    lockout_duration_minutes INTEGER DEFAULT 30,
    password_expiry_days INTEGER DEFAULT 90,
    require_password_change BOOLEAN DEFAULT FALSE,
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id)
);

-- Create indexes for user security settings
CREATE INDEX IF NOT EXISTS idx_user_security_settings_user ON user_security_settings(user_id);

-- Password History Table
CREATE TABLE IF NOT EXISTS password_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for password history
CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history(user_id);
CREATE INDEX IF NOT EXISTS idx_password_history_created_at ON password_history(created_at);

-- API Rate Limits Table
CREATE TABLE IF NOT EXISTS api_rate_limits (
    id SERIAL PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL, -- IP address or user ID
    identifier_type VARCHAR(10) CHECK (identifier_type IN ('ip', 'user')) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    requests_count INTEGER DEFAULT 1,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    window_end TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(identifier, identifier_type, endpoint, window_start)
);

-- Create indexes for API rate limits
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_identifier ON api_rate_limits(identifier, identifier_type);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_endpoint ON api_rate_limits(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window ON api_rate_limits(window_start, window_end);

-- Security Policies Table
CREATE TABLE IF NOT EXISTS security_policies (
    id SERIAL PRIMARY KEY,
    policy_name VARCHAR(100) NOT NULL UNIQUE,
    policy_value TEXT NOT NULL,
    policy_type VARCHAR(10) CHECK (policy_type IN ('string', 'number', 'boolean', 'json')) DEFAULT 'string',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for security policies
CREATE INDEX IF NOT EXISTS idx_security_policies_name ON security_policies(policy_name);
CREATE INDEX IF NOT EXISTS idx_security_policies_active ON security_policies(is_active);

-- Security Alerts Table
CREATE TABLE IF NOT EXISTS security_alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(20) CHECK (alert_type IN ('account_locked', 'suspicious_login', 'multiple_failed_attempts', 'password_expired', 'mfa_disabled', 'admin_action')) NOT NULL,
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(10) CHECK (severity IN ('info', 'warning', 'error', 'critical')) DEFAULT 'warning',
    is_read BOOLEAN DEFAULT FALSE,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    resolved_at TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for security alerts
CREATE INDEX IF NOT EXISTS idx_security_alerts_type ON security_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_security_alerts_user ON security_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_read ON security_alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved ON security_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at);

-- Trusted Devices Table
CREATE TABLE IF NOT EXISTS trusted_devices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    device_fingerprint VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    device_type VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    ip_address INET NOT NULL,
    is_trusted BOOLEAN DEFAULT FALSE,
    trusted_at TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, device_fingerprint)
);

-- Create indexes for trusted devices
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_fingerprint ON trusted_devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_trusted ON trusted_devices(is_trusted);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_expires ON trusted_devices(expires_at);

-- =====================================================================================
-- 4. COMPLETE USER MANAGEMENT SYSTEM (011_complete_user_management_system.sql)
-- =====================================================================================

-- Admin User Creation Log Table
CREATE TABLE IF NOT EXISTS admin_user_creation_log (
    id SERIAL PRIMARY KEY,
    created_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_by_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    admin_level VARCHAR(20) CHECK (admin_level IN ('national')) NOT NULL,
    geographic_scope JSONB, -- Store province_code, district_code, etc.
    permissions_granted JSONB,
    creation_reason TEXT,
    approved_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    approval_status VARCHAR(20) CHECK (approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'approved',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP
);

-- Create indexes for admin user creation log
CREATE INDEX IF NOT EXISTS idx_admin_creation_log_created_user ON admin_user_creation_log(created_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_creation_log_created_by ON admin_user_creation_log(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_creation_log_level ON admin_user_creation_log(admin_level);
CREATE INDEX IF NOT EXISTS idx_admin_creation_log_status ON admin_user_creation_log(approval_status);
CREATE INDEX IF NOT EXISTS idx_admin_creation_log_created_at ON admin_user_creation_log(created_at);

-- User Role History Table
CREATE TABLE IF NOT EXISTS user_role_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    old_role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    new_role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    old_admin_level VARCHAR(20) CHECK (old_admin_level IN ('national', 'province', 'district', 'municipality', 'ward', 'none')),
    new_admin_level VARCHAR(20) CHECK (new_admin_level IN ('national', 'province', 'district', 'municipality', 'ward', 'none')),
    changed_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    change_reason TEXT,
    effective_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for user role history
CREATE INDEX IF NOT EXISTS idx_user_role_history_user ON user_role_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_history_changed_by ON user_role_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_user_role_history_effective_date ON user_role_history(effective_date);

-- Concurrent Session Limits Table
CREATE TABLE IF NOT EXISTS concurrent_session_limits (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    admin_level VARCHAR(20) CHECK (admin_level IN ('national', 'province', 'district', 'municipality', 'ward', 'none')) NOT NULL,
    max_concurrent_sessions INTEGER DEFAULT 3,
    session_timeout_minutes INTEGER DEFAULT 1440, -- 24 hours
    force_single_session BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(role_id, admin_level)
);

-- Create indexes for concurrent session limits
CREATE INDEX IF NOT EXISTS idx_concurrent_session_limits_role ON concurrent_session_limits(role_id);
CREATE INDEX IF NOT EXISTS idx_concurrent_session_limits_admin_level ON concurrent_session_limits(admin_level);

-- User Creation Workflow Table
CREATE TABLE IF NOT EXISTS user_creation_workflow (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(50) NOT NULL UNIQUE,
    requested_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    user_data JSONB NOT NULL, -- Store the complete user creation data
    admin_level VARCHAR(20) CHECK (admin_level IN ('national')) NOT NULL,
    justification TEXT,
    status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'rejected', 'completed')) DEFAULT 'pending',
    reviewed_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    created_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL, -- Set when user is actually created
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for user creation workflow
CREATE INDEX IF NOT EXISTS idx_user_creation_workflow_requested_by ON user_creation_workflow(requested_by);
CREATE INDEX IF NOT EXISTS idx_user_creation_workflow_status ON user_creation_workflow(status);
CREATE INDEX IF NOT EXISTS idx_user_creation_workflow_admin_level ON user_creation_workflow(admin_level);
CREATE INDEX IF NOT EXISTS idx_user_creation_workflow_created_at ON user_creation_workflow(created_at);

-- System Configuration Table
CREATE TABLE IF NOT EXISTS system_configuration (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(20) CHECK (category IN ('authentication', 'authorization', 'security', 'user_management', 'system')) DEFAULT 'system',
    is_encrypted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for system configuration
CREATE INDEX IF NOT EXISTS idx_system_configuration_category ON system_configuration(category);
CREATE INDEX IF NOT EXISTS idx_system_configuration_key ON system_configuration(config_key);

SELECT 'Security and User Management Tables Created Successfully!' as result;
