-- Migration: Add voter registration tracking to members_consolidated table
-- This migration adds:
--   1. voter_registration_statuses lookup table (1 = Registered, 2 = Not Registered)
--   2. voter_registration_id column to members_consolidated
--   3. is_registered_voter boolean column to members_consolidated

-- =============================================================================
-- Step 1: Create the voter_registration_statuses lookup table
-- =============================================================================
CREATE TABLE IF NOT EXISTS voter_registration_statuses (
    registration_status_id SERIAL PRIMARY KEY,
    status_name VARCHAR(50) NOT NULL UNIQUE,
    status_code VARCHAR(10) UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for active status lookups
CREATE INDEX IF NOT EXISTS idx_voter_registration_statuses_active 
ON voter_registration_statuses(is_active);

-- Insert default registration statuses
INSERT INTO voter_registration_statuses (registration_status_id, status_name, status_code, description) 
VALUES 
    (1, 'Registered', 'REG', 'Member is registered to vote with a valid VD code from IEC'),
    (2, 'Not Registered', 'NOTREG', 'Member is not registered to vote with IEC'),
    (3, 'Unknown', 'UNKNOWN', 'Voter registration status has not been verified'),
    (4, 'Verification Failed', 'FAILED', 'IEC API verification failed - status unknown')
ON CONFLICT (registration_status_id) DO NOTHING;

-- =============================================================================
-- Step 2: Add columns to members_consolidated table
-- =============================================================================

-- Add voter_registration_id column (references voter_registration_statuses)
ALTER TABLE members_consolidated 
ADD COLUMN IF NOT EXISTS voter_registration_id INTEGER DEFAULT 3;

-- Add is_registered_voter boolean column
ALTER TABLE members_consolidated 
ADD COLUMN IF NOT EXISTS is_registered_voter BOOLEAN DEFAULT NULL;

-- Add last_voter_verification_date to track when the status was last checked
ALTER TABLE members_consolidated 
ADD COLUMN IF NOT EXISTS last_voter_verification_date TIMESTAMP DEFAULT NULL;

-- =============================================================================
-- Step 3: Add foreign key constraint
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_members_consolidated_voter_registration'
    ) THEN
        ALTER TABLE members_consolidated 
        ADD CONSTRAINT fk_members_consolidated_voter_registration 
        FOREIGN KEY (voter_registration_id) 
        REFERENCES voter_registration_statuses(registration_status_id);
    END IF;
END $$;

-- =============================================================================
-- Step 4: Create indexes for performance
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_members_consolidated_voter_registration_id 
ON members_consolidated(voter_registration_id);

CREATE INDEX IF NOT EXISTS idx_members_consolidated_is_registered_voter 
ON members_consolidated(is_registered_voter);

CREATE INDEX IF NOT EXISTS idx_members_consolidated_last_voter_verification 
ON members_consolidated(last_voter_verification_date);

-- Composite index for filtering by registration status and VD code
CREATE INDEX IF NOT EXISTS idx_members_consolidated_voter_reg_vd 
ON members_consolidated(voter_registration_id, voting_district_code);

-- =============================================================================
-- Step 5: Add comments for documentation
-- =============================================================================
COMMENT ON TABLE voter_registration_statuses IS 'Lookup table for voter registration status values';
COMMENT ON COLUMN members_consolidated.voter_registration_id IS 'Foreign key to voter_registration_statuses: 1=Registered, 2=Not Registered, 3=Unknown, 4=Verification Failed';
COMMENT ON COLUMN members_consolidated.is_registered_voter IS 'Boolean indicating if member is registered to vote (true=registered, false=not registered, null=unknown)';
COMMENT ON COLUMN members_consolidated.last_voter_verification_date IS 'Timestamp of last IEC API verification check';

-- =============================================================================
-- Verification
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Migration 011_add_voter_registration_tracking completed successfully';
    RAISE NOTICE 'New columns added: voter_registration_id, is_registered_voter, last_voter_verification_date';
END $$;

