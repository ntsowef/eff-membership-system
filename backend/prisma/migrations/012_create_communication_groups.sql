-- Migration: Create Communication Groups tables
-- Date: 2026-02-02
-- Purpose: Support static and dynamic (leadership) contact groups for WhatsApp

-- 1. Communication Groups Table
CREATE TABLE IF NOT EXISTS communication_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    group_type VARCHAR(50) NOT NULL DEFAULT 'STATIC', -- 'STATIC' or 'DYNAMIC'
    query_config JSONB DEFAULT NULL, -- For DYNAMIC groups (e.g. { "role": "Ward Chairperson" })
    created_by INT REFERENCES users(user_id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Communication Group Members (Many-to-Many for Static Groups)
CREATE TABLE IF NOT EXISTS communication_group_members (
    id SERIAL PRIMARY KEY,
    group_id INT REFERENCES communication_groups(id) ON DELETE CASCADE,
    member_id INT REFERENCES members_consolidated(member_id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, member_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comm_groups_type ON communication_groups(group_type);
CREATE INDEX IF NOT EXISTS idx_comm_group_members_group ON communication_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_comm_group_members_member ON communication_group_members(member_id);

-- Comments
COMMENT ON TABLE communication_groups IS 'Stores definitions for contact groups (static lists or dynamic queries)';
COMMENT ON TABLE communication_group_members IS 'Stores membership for STATIC groups';
