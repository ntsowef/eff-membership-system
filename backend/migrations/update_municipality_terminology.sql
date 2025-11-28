-- =====================================================
-- Migration: Update Municipality Terminology
-- Description: Replace "Local Municipality" with "Sub-Region" in municipality names
-- Date: 2025-10-01
-- Author: System Migration
-- =====================================================

-- Start transaction
BEGIN;

-- Create backup table before making changes
CREATE TABLE IF NOT EXISTS municipalities_backup_20251001 AS 
SELECT * FROM municipalities;

-- Log the number of records to be updated
DO $$
DECLARE
    record_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO record_count
    FROM municipalities
    WHERE municipality_name LIKE '%Local Municipality%';
    
    RAISE NOTICE 'Found % municipalities with "Local Municipality" in their names', record_count;
END $$;

-- Update municipality names: Replace "Local Municipality" with "Sub-Region"
UPDATE municipalities
SET municipality_name = REPLACE(municipality_name, 'Local Municipality', 'Sub-Region')
WHERE municipality_name LIKE '%Local Municipality%';

-- Log the results
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM municipalities
    WHERE municipality_name LIKE '%Sub-Region%';
    
    RAISE NOTICE 'Updated % municipalities to use "Sub-Region" terminology', updated_count;
END $$;

-- Display sample of updated records
SELECT 
    municipality_code,
    municipality_name,
    municipality_type
FROM municipalities
WHERE municipality_name LIKE '%Sub-Region%'
ORDER BY municipality_name
LIMIT 10;

-- Commit the transaction
COMMIT;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check for any remaining "Local Municipality" references
SELECT COUNT(*) as remaining_local_municipality_count
FROM municipalities
WHERE municipality_name LIKE '%Local Municipality%';

-- Show all municipalities with "Sub-Region" in their names
SELECT 
    municipality_code,
    municipality_name,
    municipality_type,
    district_code
FROM municipalities
WHERE municipality_name LIKE '%Sub-Region%'
ORDER BY municipality_name;

-- =====================================================
-- Rollback Script (if needed)
-- =====================================================
-- To rollback this migration, run:
-- 
-- BEGIN;
-- 
-- UPDATE municipalities
-- SET municipality_name = REPLACE(municipality_name, 'Sub-Region', 'Local Municipality')
-- WHERE municipality_name LIKE '%Sub-Region%';
-- 
-- COMMIT;
-- 
-- Or restore from backup:
-- 
-- BEGIN;
-- 
-- TRUNCATE TABLE municipalities;
-- 
-- INSERT INTO municipalities
-- SELECT * FROM municipalities_backup_20251001;
-- 
-- COMMIT;
-- =====================================================

