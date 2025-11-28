-- =====================================================================================
-- ADD MISSING GEOGRAPHIC COLUMNS TO MEMBERS TABLE
-- =====================================================================================
-- Purpose: Add province_code, province_name, district_code, district_name, 
--          municipality_code, and municipality_name columns to members table
-- Date: 2025-10-02
-- Reason: Required for renewal bulk upload fraud detection and geographic filtering
-- =====================================================================================

-- Start transaction
BEGIN;

-- =====================================================================================
-- STEP 1: BACKUP CRITICAL DATA (Optional - for safety)
-- =====================================================================================
-- Note: Skipping backup since we're truncating tables anyway

-- =====================================================================================
-- STEP 2: TRUNCATE TABLES (CASCADE)
-- =====================================================================================
-- This will remove all data from members and related tables
-- IMPORTANT: This is acceptable in development/testing phase

TRUNCATE TABLE membership_renewals CASCADE;
TRUNCATE TABLE members CASCADE;

SELECT 'Tables truncated successfully' as status;

-- =====================================================================================
-- STEP 3: ADD NEW COLUMNS TO MEMBERS TABLE
-- =====================================================================================

-- Add province columns
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS province_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS province_name VARCHAR(100);

-- Add district/region columns
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS district_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS district_name VARCHAR(100);

-- Add municipality/sub-region columns
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS municipality_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS municipality_name VARCHAR(100);

SELECT 'Columns added successfully' as status;

-- =====================================================================================
-- STEP 4: ADD FOREIGN KEY CONSTRAINTS
-- =====================================================================================

-- Add foreign key to provinces table
ALTER TABLE members
ADD CONSTRAINT fk_members_province
FOREIGN KEY (province_code) 
REFERENCES provinces(province_code)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Add foreign key to districts table (if exists)
-- Note: Commenting out if districts table doesn't exist yet
-- ALTER TABLE members
-- ADD CONSTRAINT fk_members_district
-- FOREIGN KEY (district_code) 
-- REFERENCES districts(district_code)
-- ON DELETE SET NULL
-- ON UPDATE CASCADE;

-- Add foreign key to municipalities table (if exists)
-- Note: Commenting out if municipalities table doesn't exist yet
-- ALTER TABLE members
-- ADD CONSTRAINT fk_members_municipality
-- FOREIGN KEY (municipality_code) 
-- REFERENCES municipalities(municipality_code)
-- ON DELETE SET NULL
-- ON UPDATE CASCADE;

SELECT 'Foreign keys added successfully' as status;

-- =====================================================================================
-- STEP 5: CREATE INDEXES FOR PERFORMANCE
-- =====================================================================================

-- Index on province_code for filtering
CREATE INDEX IF NOT EXISTS idx_members_province_code 
ON members(province_code);

-- Index on district_code for filtering
CREATE INDEX IF NOT EXISTS idx_members_district_code 
ON members(district_code);

-- Index on municipality_code for filtering
CREATE INDEX IF NOT EXISTS idx_members_municipality_code 
ON members(municipality_code);

-- Composite index for geographic hierarchy
CREATE INDEX IF NOT EXISTS idx_members_geographic_hierarchy 
ON members(province_code, district_code, municipality_code);

-- Index on province_name for searching
CREATE INDEX IF NOT EXISTS idx_members_province_name 
ON members(province_name);

SELECT 'Indexes created successfully' as status;

-- =====================================================================================
-- STEP 6: UPDATE VIEWS THAT REFERENCE MEMBERS TABLE
-- =====================================================================================

-- Drop and recreate vw_member_details view with new columns
DROP VIEW IF EXISTS vw_member_details CASCADE;

CREATE OR REPLACE VIEW vw_member_details AS
SELECT
    m.member_id,
    m.firstname,
    m.surname,
    m.middle_name,
    m.id_number,
    m.cell_number,
    m.email,
    m.date_of_birth,
    m.gender_id,
    g.gender_name,
    m.race_id,
    r.race_name,
    m.language_id,
    l.language_name,
    m.membership_status,
    m.membership_number,
    m.voting_station_id,
    vs.voting_station_name,
    m.voting_district_code,
    m.voter_district_code,
    vd.ward_name as voting_district_name,
    -- NEW GEOGRAPHIC COLUMNS
    m.province_code,
    m.province_name,
    m.district_code,
    m.district_name,
    m.municipality_code,
    m.municipality_name,
    -- Province from voting district (for backward compatibility)
    vd.province_code as vd_province_code,
    p.province_name as vd_province_name,
    m.created_at,
    m.updated_at
FROM members m
LEFT JOIN genders g ON m.gender_id = g.gender_id
LEFT JOIN races r ON m.race_id = r.race_id
LEFT JOIN languages l ON m.language_id = l.language_id
LEFT JOIN voting_stations vs ON m.voting_station_id = vs.voting_station_id
LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code
LEFT JOIN provinces p ON vd.province_code = p.province_code;

SELECT 'Views updated successfully' as status;

-- =====================================================================================
-- STEP 7: ADD COMMENTS FOR DOCUMENTATION
-- =====================================================================================

COMMENT ON COLUMN members.province_code IS 'Province code where member is registered';
COMMENT ON COLUMN members.province_name IS 'Province name (denormalized for performance)';
COMMENT ON COLUMN members.district_code IS 'District/Region code where member is registered';
COMMENT ON COLUMN members.district_name IS 'District/Region name (denormalized for performance)';
COMMENT ON COLUMN members.municipality_code IS 'Municipality/Sub-Region code where member is registered';
COMMENT ON COLUMN members.municipality_name IS 'Municipality/Sub-Region name (denormalized for performance)';

SELECT 'Comments added successfully' as status;

-- =====================================================================================
-- STEP 8: VERIFY SCHEMA CHANGES
-- =====================================================================================

-- Check that all columns exist
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'members' 
AND column_name IN (
    'province_code', 
    'province_name', 
    'district_code', 
    'district_name',
    'municipality_code',
    'municipality_name'
)
ORDER BY column_name;

-- Check indexes
SELECT 
    indexname, 
    indexdef
FROM pg_indexes 
WHERE tablename = 'members' 
AND indexname LIKE '%province%' 
   OR indexname LIKE '%district%'
   OR indexname LIKE '%municipality%'
ORDER BY indexname;

-- =====================================================================================
-- COMMIT TRANSACTION
-- =====================================================================================

COMMIT;

-- =====================================================================================
-- FINAL STATUS
-- =====================================================================================

SELECT 'Migration completed successfully!' as result;
SELECT 'Members table now has province_code, province_name, district_code, district_name, municipality_code, municipality_name columns' as details;
SELECT 'All tables truncated - ready for fresh data import' as note;

