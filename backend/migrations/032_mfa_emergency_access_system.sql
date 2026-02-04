-- MFA Emergency Access System Migration
-- Purpose: Create tables for MFA bypass permissions (Option A) and emergency access requests (Option B)
-- Date: 2026-02-04

-- ============================================
-- Table 1: mfa_bypass_permissions (Option A)
-- Allows National Admins to grant time-limited OTP bypass to specific users
-- ============================================

CREATE TABLE IF NOT EXISTS mfa_bypass_permissions (
    bypass_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    granted_by_user_id INTEGER NOT NULL REFERENCES users(user_id),
    reason TEXT NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by_user_id INTEGER REFERENCES users(user_id),
    revocation_reason TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick lookup of active bypass permissions
CREATE INDEX idx_mfa_bypass_user_active ON mfa_bypass_permissions(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_mfa_bypass_expires_at ON mfa_bypass_permissions(expires_at) WHERE is_active = TRUE;

-- ============================================
-- Table 2: mfa_emergency_access_requests (Option B)
-- Allows Provincial Admins to request emergency OTP bypass
-- ============================================

CREATE TABLE IF NOT EXISTS mfa_emergency_access_requests (
    request_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    urgency_level VARCHAR(20) DEFAULT 'normal' CHECK (urgency_level IN ('low', 'normal', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired', 'cancelled')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by_user_id INTEGER REFERENCES users(user_id),
    review_notes TEXT,
    bypass_duration_hours INTEGER DEFAULT 24,
    bypass_permission_id INTEGER REFERENCES mfa_bypass_permissions(bypass_id),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick lookup of pending requests
CREATE INDEX idx_emergency_requests_status ON mfa_emergency_access_requests(status) WHERE status = 'pending';
CREATE INDEX idx_emergency_requests_user ON mfa_emergency_access_requests(user_id);

-- ============================================
-- Table 3: mfa_emergency_access_audit_log
-- Complete audit trail for all emergency access operations
-- ============================================

CREATE TABLE IF NOT EXISTS mfa_emergency_access_audit_log (
    audit_id SERIAL PRIMARY KEY,
    action VARCHAR(50) NOT NULL,
    user_id INTEGER REFERENCES users(user_id),
    target_user_id INTEGER REFERENCES users(user_id),
    bypass_id INTEGER REFERENCES mfa_bypass_permissions(bypass_id),
    request_id INTEGER REFERENCES mfa_emergency_access_requests(request_id),
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for audit log queries
CREATE INDEX idx_emergency_audit_user ON mfa_emergency_access_audit_log(user_id);
CREATE INDEX idx_emergency_audit_target ON mfa_emergency_access_audit_log(target_user_id);
CREATE INDEX idx_emergency_audit_action ON mfa_emergency_access_audit_log(action);
CREATE INDEX idx_emergency_audit_created ON mfa_emergency_access_audit_log(created_at);

-- ============================================
-- Function to auto-expire bypass permissions
-- ============================================

CREATE OR REPLACE FUNCTION expire_mfa_bypass_permissions()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE mfa_bypass_permissions
    SET is_active = FALSE,
        updated_at = CURRENT_TIMESTAMP
    WHERE expires_at < CURRENT_TIMESTAMP
      AND is_active = TRUE;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function to auto-expire pending requests (after 72 hours)
-- ============================================

CREATE OR REPLACE FUNCTION expire_pending_emergency_requests()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE mfa_emergency_access_requests
    SET status = 'expired',
        updated_at = CURRENT_TIMESTAMP
    WHERE status = 'pending'
      AND requested_at < CURRENT_TIMESTAMP - INTERVAL '72 hours';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Grant permissions
-- ============================================

COMMENT ON TABLE mfa_bypass_permissions IS 'Stores time-limited MFA bypass permissions granted by National Admins';
COMMENT ON TABLE mfa_emergency_access_requests IS 'Stores emergency access requests from Provincial Admins';
COMMENT ON TABLE mfa_emergency_access_audit_log IS 'Audit trail for all MFA emergency access operations';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'MFA Emergency Access System tables created successfully';
END $$;

