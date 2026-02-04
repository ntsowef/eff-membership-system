-- Migration: Create expelled_suspended_members table
-- Description: Table to archive members who have been expelled, suspended, or terminated
-- Date: 2026-01-29

-- Create expelled_suspended_members table
CREATE TABLE IF NOT EXISTS expelled_suspended_members (
    id SERIAL PRIMARY KEY,
    
    -- Original Excel columns (matching TERMINATION_OF_MEMBERSHIP.xlsx)
    row_number INTEGER,
    subregion VARCHAR(100),           -- Province/Subregion name from Excel
    ward_no VARCHAR(20),              -- Ward number from Excel
    name_and_surname VARCHAR(200),    -- Combined name from Excel
    id_number VARCHAR(13),            -- SA ID number
    
    -- Parsed/normalized fields
    firstname VARCHAR(100),
    surname VARCHAR(100),
    
    -- Original member data (backup)
    original_member_id INTEGER,
    original_member_data JSONB,       -- Full member record backup
    
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
    removal_type VARCHAR(50) DEFAULT 'terminated',  -- expelled, suspended, terminated, deceased
    removal_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    removed_by_user_id INTEGER,
    removal_notes TEXT,
    
    -- Search method used to find this member
    search_method VARCHAR(50),        -- 'id_number', 'name_province', 'manual'
    match_confidence VARCHAR(20),     -- 'exact', 'partial', 'fuzzy'
    
    -- Batch tracking
    batch_id VARCHAR(50),             -- Links records from same upload/operation
    source_file VARCHAR(255),         -- Original filename if from Excel
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    
    -- Foreign key constraints
    CONSTRAINT fk_removed_by_user FOREIGN KEY (removed_by_user_id) 
        REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_created_by_user FOREIGN KEY (created_by) 
        REFERENCES users(user_id) ON DELETE SET NULL
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_expelled_id_number ON expelled_suspended_members(id_number);
CREATE INDEX IF NOT EXISTS idx_expelled_original_member_id ON expelled_suspended_members(original_member_id);
CREATE INDEX IF NOT EXISTS idx_expelled_removal_date ON expelled_suspended_members(removal_date);
CREATE INDEX IF NOT EXISTS idx_expelled_batch_id ON expelled_suspended_members(batch_id);
CREATE INDEX IF NOT EXISTS idx_expelled_province ON expelled_suspended_members(province_code);
CREATE INDEX IF NOT EXISTS idx_expelled_name ON expelled_suspended_members(firstname, surname);
CREATE INDEX IF NOT EXISTS idx_expelled_subregion ON expelled_suspended_members(subregion);

-- Add trigger for updated_at
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

-- Add comment to table
COMMENT ON TABLE expelled_suspended_members IS 'Archive table for expelled, suspended, or terminated members. Records are moved here when members are removed from members_consolidated.';








