-- Create concurrent_session_limits table for advanced session management
-- This table defines session limits based on user roles and admin levels

CREATE TABLE IF NOT EXISTS concurrent_session_limits (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL,
    admin_level VARCHAR(50) NOT NULL,
    max_concurrent_sessions INTEGER NOT NULL DEFAULT 3,
    session_timeout_minutes INTEGER NOT NULL DEFAULT 1440, -- 24 hours
    force_single_session BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique combination of role and admin level
    UNIQUE(role_id, admin_level),
    
    -- Foreign key constraint (assuming roles table exists)
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_concurrent_session_limits_role_admin 
ON concurrent_session_limits(role_id, admin_level);

-- Insert default session limits for different admin levels
INSERT INTO concurrent_session_limits (role_id, admin_level, max_concurrent_sessions, session_timeout_minutes, force_single_session)
VALUES 
    -- National level administrators (assuming role_id 1 is admin)
    (1, 'national', 5, 480, FALSE),  -- 8 hours, up to 5 sessions
    
    -- Provincial level administrators  
    (1, 'province', 3, 480, FALSE),  -- 8 hours, up to 3 sessions
    
    -- District level administrators
    (1, 'district', 3, 240, FALSE),  -- 4 hours, up to 3 sessions
    
    -- Municipal level administrators
    (1, 'municipal', 2, 240, FALSE), -- 4 hours, up to 2 sessions
    
    -- Ward level administrators
    (1, 'ward', 2, 120, FALSE)       -- 2 hours, up to 2 sessions
ON CONFLICT (role_id, admin_level) DO NOTHING;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_concurrent_session_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_concurrent_session_limits_updated_at
    BEFORE UPDATE ON concurrent_session_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_concurrent_session_limits_updated_at();

-- Display the created table structure
\d concurrent_session_limits;

-- Show the inserted data
SELECT * FROM concurrent_session_limits ORDER BY admin_level;
