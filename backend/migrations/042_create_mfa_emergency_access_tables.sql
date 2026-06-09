-- Migration 042: Create MFA emergency access and bypass tables
-- Idempotent: safe to run multiple times

-- user_mfa_settings (TOTP/2FA settings per user)
CREATE TABLE IF NOT EXISTS public.user_mfa_settings (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL UNIQUE REFERENCES public.users(user_id) ON DELETE CASCADE,
    secret_key      VARCHAR(255) NOT NULL,
    backup_codes    JSONB,
    is_enabled      BOOLEAN DEFAULT FALSE,
    enabled_at      TIMESTAMP,
    disabled_at     TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_mfa_settings_user    ON public.user_mfa_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mfa_settings_enabled ON public.user_mfa_settings(is_enabled);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_mfa_settings_updated_at') THEN
        CREATE TRIGGER update_user_mfa_settings_updated_at
            BEFORE UPDATE ON public.user_mfa_settings
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- mfa_bypass_permissions (Option A: National Admin grants time-limited bypass)
CREATE TABLE IF NOT EXISTS public.mfa_bypass_permissions (
    bypass_id              SERIAL PRIMARY KEY,
    user_id                INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    granted_by_user_id     INTEGER NOT NULL REFERENCES public.users(user_id),
    reason                 TEXT NOT NULL,
    granted_at             TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at             TIMESTAMPTZ NOT NULL,
    revoked_at             TIMESTAMPTZ,
    revoked_by_user_id     INTEGER REFERENCES public.users(user_id),
    revocation_reason      TEXT,
    is_active              BOOLEAN DEFAULT TRUE,
    ip_address             VARCHAR(45),
    user_agent             TEXT,
    created_at             TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.mfa_bypass_permissions IS 'Stores time-limited MFA bypass permissions granted by National Admins';

CREATE INDEX IF NOT EXISTS idx_mfa_bypass_user_active ON public.mfa_bypass_permissions(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_mfa_bypass_expires_at  ON public.mfa_bypass_permissions(expires_at)         WHERE is_active = TRUE;

-- mfa_emergency_access_requests (Option B: Provincial Admin requests emergency access)
CREATE TABLE IF NOT EXISTS public.mfa_emergency_access_requests (
    request_id             SERIAL PRIMARY KEY,
    user_id                INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    reason                 TEXT NOT NULL,
    contact_phone          VARCHAR(20),
    contact_email          VARCHAR(255),
    urgency_level          VARCHAR(20) DEFAULT 'normal'
                              CHECK (urgency_level IN ('low','normal','high','critical')),
    status                 VARCHAR(20) DEFAULT 'pending'
                              CHECK (status IN ('pending','approved','denied','expired','cancelled')),
    requested_at           TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    reviewed_at            TIMESTAMPTZ,
    reviewed_by_user_id    INTEGER REFERENCES public.users(user_id),
    review_notes           TEXT,
    bypass_duration_hours  INTEGER DEFAULT 24,
    bypass_permission_id   INTEGER REFERENCES public.mfa_bypass_permissions(bypass_id),
    ip_address             VARCHAR(45),
    user_agent             TEXT,
    created_at             TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.mfa_emergency_access_requests IS 'Stores emergency access requests from Provincial Admins';

CREATE INDEX IF NOT EXISTS idx_emergency_requests_user   ON public.mfa_emergency_access_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_status ON public.mfa_emergency_access_requests(status) WHERE status = 'pending';

-- mfa_emergency_access_audit_log (audit trail for all bypass/emergency actions)
CREATE TABLE IF NOT EXISTS public.mfa_emergency_access_audit_log (
    audit_id        SERIAL PRIMARY KEY,
    action          VARCHAR(50) NOT NULL,
    user_id         INTEGER REFERENCES public.users(user_id),
    target_user_id  INTEGER REFERENCES public.users(user_id),
    bypass_id       INTEGER REFERENCES public.mfa_bypass_permissions(bypass_id),
    request_id      INTEGER REFERENCES public.mfa_emergency_access_requests(request_id),
    details         JSONB,
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.mfa_emergency_access_audit_log IS 'Audit trail for all MFA emergency access operations';

CREATE INDEX IF NOT EXISTS idx_emergency_audit_user    ON public.mfa_emergency_access_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_audit_target  ON public.mfa_emergency_access_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_audit_action  ON public.mfa_emergency_access_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_emergency_audit_created ON public.mfa_emergency_access_audit_log(created_at);
