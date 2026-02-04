-- ============================================================================
-- PRODUCTION SQL SCRIPT: Create expelled_suspended_members table
-- ============================================================================
-- Purpose: Archive table for expelled, suspended, or terminated members
-- Date: 2026-01-29
-- 
-- INSTRUCTIONS:
-- 1. Review this script before running
-- 2. Run on production database during maintenance window
-- 3. Verify table creation and indexes
-- ============================================================================

BEGIN;

-- Create expelled_suspended_members table
CREATE TABLE IF NOT EXISTS expelled_suspended_members (
    id SERIAL PRIMARY KEY,
    
    -- Original Excel columns (matching TERMINATION_OF_MEMBERSHIP.xlsx)
    row_number INTEGER,
    subregion VARCHAR(100),
    ward_no VARCHAR(20),
    name_and_surname VARCHAR(200),
    id_number VARCHAR(13),
    
    -- Parsed/normalized fields
    firstname VARCHAR(100),
    surname VARCHAR(100),
    
    -- Original member data (backup)
    original_member_id INTEGER,
    original_member_data JSONB,
    
    -- Geographic data from original member
    province_code VARCHAR(10),
    province_name VARCHAR(100),
    municipality_code VARCHAR(20),
    municipality_name VARCHAR(200),
    ward_code VARCHAR(20),
    ward_name VARCHAR(200),
    
    -- Contact info from original member
    cell_number VARCHAR(20),
    email VARCHAR(255),
    
    -- Removal/termination details
    removal_reason VARCHAR(100) DEFAULT 'Termination of Membership',
    removal_type VARCHAR(50) DEFAULT 'terminated',
    removal_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    removed_by_user_id INTEGER,
    removal_notes TEXT,
    
    -- Search method used
    search_method VARCHAR(50),
    match_confidence VARCHAR(20),
    
    -- Batch tracking
    batch_id VARCHAR(50),
    source_file VARCHAR(255),
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_expelled_id_number ON expelled_suspended_members(id_number);
CREATE INDEX IF NOT EXISTS idx_expelled_original_member_id ON expelled_suspended_members(original_member_id);
CREATE INDEX IF NOT EXISTS idx_expelled_removal_date ON expelled_suspended_members(removal_date);
CREATE INDEX IF NOT EXISTS idx_expelled_batch_id ON expelled_suspended_members(batch_id);
CREATE INDEX IF NOT EXISTS idx_expelled_province ON expelled_suspended_members(province_code);
CREATE INDEX IF NOT EXISTS idx_expelled_name ON expelled_suspended_members(firstname, surname);
CREATE INDEX IF NOT EXISTS idx_expelled_subregion ON expelled_suspended_members(subregion);

-- Create timestamp trigger
CREATE OR REPLACE FUNCTION update_expelled_suspended_members_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_expelled_suspended_members_updated_at ON expelled_suspended_members;
CREATE TRIGGER trg_expelled_suspended_members_updated_at
    BEFORE UPDATE ON expelled_suspended_members
    FOR EACH ROW
    EXECUTE FUNCTION update_expelled_suspended_members_timestamp();

COMMENT ON TABLE expelled_suspended_members IS 'Archive table for expelled, suspended, or terminated members';

COMMIT;

-- Verification query (run after migration)
-- SELECT COUNT(*) FROM expelled_suspended_members;
-- \d expelled_suspended_members;

