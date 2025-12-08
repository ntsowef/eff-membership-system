-- ============================================================================
-- Fix Missing Geographic Data in members_consolidated
-- ============================================================================
-- This script updates members who have NULL municipality_code, district_code,
-- and province_code by resolving them from their ward_code.
--
-- SOUTH AFRICAN MUNICIPAL HIERARCHY:
-- ===================================
-- South Africa has two types of municipalities:
--
-- 1. REGULAR MUNICIPALITIES (Category B)
--    - These belong to a district (Category C)
--    - Example: Mogale City (GT481) belongs to West Rand District (DC48)
--    - In municipalities table: district_code is populated (e.g., 'DC48')
--    - Hierarchy: Province → District → Municipality → Ward → VD
--
-- 2. METRO MUNICIPALITIES (Category A)
--    - These ARE districts themselves (they don't belong to a district)
--    - They create sub-regions for administrative purposes
--    - Example: City of Johannesburg (JHB) has sub-regions JHB001-JHB007
--    - In municipalities table:
--      * Parent metro (JHB, TSH, EKU, etc.): district_code = their own code
--      * Sub-regions (JHB001, JHB005, etc.): district_code = NULL
--    - Hierarchy: Province → Metro (as district) → Sub-region → Ward → VD
--
-- METRO MUNICIPALITIES IN SOUTH AFRICA:
-- ======================================
-- Code  | Name                          | Province        | Province Code
-- ------|-------------------------------|-----------------|---------------
-- JHB   | City of Johannesburg          | Gauteng         | GP or GT
-- TSH   | City of Tshwane               | Gauteng         | GP or GT
-- EKU   | Ekurhuleni                    | Gauteng         | GP or GT
-- CPT   | City of Cape Town             | Western Cape    | WC
-- ETH   | eThekwini                     | KwaZulu-Natal   | KZN
-- NMA   | Nelson Mandela Bay            | Eastern Cape    | EC
-- BUF   | Buffalo City                  | Eastern Cape    | EC
-- MAN   | Mangaung                      | Free State      | FS
--
-- THE PROBLEM:
-- ============
-- When members were imported, the geographic resolution failed for:
-- 1. Regular municipalities where the JOIN to districts table failed
-- 2. Metro sub-regions where district_code is NULL in municipalities table
-- 3. Members where municipality_code itself is NULL
--
-- THE SOLUTION:
-- =============
-- This script uses a three-step approach:
-- Step 1: Fix regular municipalities (where district_code exists in municipalities table)
-- Step 2: Fix metro sub-regions (where municipality code matches metro patterns)
-- Step 3: Final cleanup using direct ward_code lookup
-- ============================================================================

BEGIN;

-- ============================================================================
-- DIAGNOSTIC: Show current state
-- ============================================================================
SELECT
    'BEFORE UPDATE' as status,
    COUNT(*) as total_members,
    COUNT(CASE WHEN municipality_code IS NULL THEN 1 END) as null_municipality,
    COUNT(CASE WHEN district_code IS NULL THEN 1 END) as null_district,
    COUNT(CASE WHEN province_code IS NULL THEN 1 END) as null_province
FROM members_consolidated;

-- Show NULL pattern breakdown
SELECT
    CASE
        WHEN municipality_code IS NULL AND district_code IS NULL AND province_code IS NULL THEN 'All NULL'
        WHEN municipality_code IS NULL AND district_code IS NULL THEN 'Muni & District NULL'
        WHEN municipality_code IS NULL AND province_code IS NULL THEN 'Muni & Province NULL'
        WHEN district_code IS NULL AND province_code IS NULL THEN 'District & Province NULL'
        WHEN municipality_code IS NULL THEN 'Only Muni NULL'
        WHEN district_code IS NULL THEN 'Only District NULL'
        WHEN province_code IS NULL THEN 'Only Province NULL'
    END as null_pattern,
    COUNT(*) as count
FROM members_consolidated
WHERE municipality_code IS NULL
    OR district_code IS NULL
    OR province_code IS NULL
GROUP BY null_pattern
ORDER BY count DESC;

-- ============================================================================
-- STEP 1: Fix Regular Municipalities
-- ============================================================================
-- This handles municipalities that have district_code in the municipalities table
-- (i.e., non-metro municipalities that belong to a district)
-- ============================================================================
UPDATE members_consolidated mc
SET
    municipality_code = w.municipality_code,
    municipality_name = m.municipality_name,
    district_code = m.district_code,
    district_name = d.district_name,
    province_code = d.province_code,
    province_name = p.province_name
FROM wards w
JOIN municipalities m ON w.municipality_code = m.municipality_code
LEFT JOIN districts d ON m.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
WHERE mc.ward_code = w.ward_code
  AND m.district_code IS NOT NULL  -- Only regular municipalities
  AND (
    mc.municipality_code IS NULL
    OR mc.district_code IS NULL
    OR mc.province_code IS NULL
  );

-- Show progress after Step 1
SELECT
    'AFTER STEP 1 (Regular Municipalities)' as status,
    COUNT(*) as remaining_nulls
FROM members_consolidated
WHERE municipality_code IS NULL
    OR district_code IS NULL
    OR province_code IS NULL;

-- ============================================================================
-- STEP 2: Fix Metro Municipality Sub-Regions
-- ============================================================================
-- This handles sub-regions of metro municipalities (JHB001, TSH003, EKU001, etc.)
-- These municipalities have NULL district_code in the municipalities table because
-- their parent metro (JHB, TSH, EKU) IS the district.
--
-- We need to:
-- 1. Extract the parent metro code (e.g., JHB from JHB005)
-- 2. Set district_code to the parent metro code
-- 3. Set district_name to the metro municipality name
-- 4. Set province_code and province_name based on the metro's province
-- ============================================================================
UPDATE members_consolidated mc
SET
    district_code = CASE
        WHEN m.municipality_code LIKE 'JHB%' THEN 'JHB'
        WHEN m.municipality_code LIKE 'TSH%' THEN 'TSH'
        WHEN m.municipality_code LIKE 'EKU%' THEN 'EKU'
        WHEN m.municipality_code LIKE 'CPT%' THEN 'CPT'
        WHEN m.municipality_code LIKE 'ETH%' THEN 'ETH'
        WHEN m.municipality_code LIKE 'NMA%' THEN 'NMA'
        WHEN m.municipality_code LIKE 'BUF%' THEN 'BUF'
        WHEN m.municipality_code LIKE 'MAN%' THEN 'MAN'
    END,
    district_name = CASE
        WHEN m.municipality_code LIKE 'JHB%' THEN 'City of Johannesburg'
        WHEN m.municipality_code LIKE 'TSH%' THEN 'City of Tshwane'
        WHEN m.municipality_code LIKE 'EKU%' THEN 'Ekurhuleni'
        WHEN m.municipality_code LIKE 'CPT%' THEN 'City of Cape Town'
        WHEN m.municipality_code LIKE 'ETH%' THEN 'eThekwini'
        WHEN m.municipality_code LIKE 'NMA%' THEN 'Nelson Mandela Bay'
        WHEN m.municipality_code LIKE 'BUF%' THEN 'Buffalo City'
        WHEN m.municipality_code LIKE 'MAN%' THEN 'Mangaung'
    END,
    province_code = CASE
        WHEN m.municipality_code LIKE 'JHB%' THEN 'GT'
        WHEN m.municipality_code LIKE 'TSH%' THEN 'GT'
        WHEN m.municipality_code LIKE 'EKU%' THEN 'GT'
        WHEN m.municipality_code LIKE 'CPT%' THEN 'WC'
        WHEN m.municipality_code LIKE 'ETH%' THEN 'KZN'
        WHEN m.municipality_code LIKE 'NMA%' THEN 'EC'
        WHEN m.municipality_code LIKE 'BUF%' THEN 'EC'
        WHEN m.municipality_code LIKE 'MAN%' THEN 'FS'
    END,
    province_name = CASE
        WHEN m.municipality_code LIKE 'JHB%' THEN 'Gauteng'
        WHEN m.municipality_code LIKE 'TSH%' THEN 'Gauteng'
        WHEN m.municipality_code LIKE 'EKU%' THEN 'Gauteng'
        WHEN m.municipality_code LIKE 'CPT%' THEN 'Western Cape'
        WHEN m.municipality_code LIKE 'ETH%' THEN 'KwaZulu-Natal'
        WHEN m.municipality_code LIKE 'NMA%' THEN 'Eastern Cape'
        WHEN m.municipality_code LIKE 'BUF%' THEN 'Eastern Cape'
        WHEN m.municipality_code LIKE 'MAN%' THEN 'Free State'
    END
FROM wards w
JOIN municipalities m ON w.municipality_code = m.municipality_code
WHERE mc.ward_code = w.ward_code
    AND (mc.district_code IS NULL OR mc.province_code IS NULL)
    AND (
        m.municipality_code LIKE 'JHB%'
        OR m.municipality_code LIKE 'TSH%'
        OR m.municipality_code LIKE 'EKU%'
        OR m.municipality_code LIKE 'CPT%'
        OR m.municipality_code LIKE 'ETH%'
        OR m.municipality_code LIKE 'NMA%'
        OR m.municipality_code LIKE 'BUF%'
        OR m.municipality_code LIKE 'MAN%'
    );

-- Show progress after Step 2
SELECT
    'AFTER STEP 2 (Metro Municipalities)' as status,
    COUNT(*) as remaining_nulls
FROM members_consolidated
WHERE municipality_code IS NULL
    OR district_code IS NULL
    OR province_code IS NULL;

-- ============================================================================
-- STEP 3: Final Cleanup - Direct Ward Lookup
-- ============================================================================
-- This handles any remaining records by doing a direct ward_code lookup
-- This catches edge cases where municipality_code might be NULL
-- ============================================================================
UPDATE members_consolidated mc
SET
    municipality_code = w.municipality_code,
    municipality_name = m.municipality_name,
    district_code = COALESCE(m.district_code,
        CASE
            WHEN m.municipality_code LIKE 'JHB%' THEN 'JHB'
            WHEN m.municipality_code LIKE 'TSH%' THEN 'TSH'
            WHEN m.municipality_code LIKE 'EKU%' THEN 'EKU'
            WHEN m.municipality_code LIKE 'CPT%' THEN 'CPT'
            WHEN m.municipality_code LIKE 'ETH%' THEN 'ETH'
            WHEN m.municipality_code LIKE 'NMA%' THEN 'NMA'
            WHEN m.municipality_code LIKE 'BUF%' THEN 'BUF'
            WHEN m.municipality_code LIKE 'MAN%' THEN 'MAN'
        END
    ),
    district_name = COALESCE(d.district_name,
        CASE
            WHEN m.municipality_code LIKE 'JHB%' THEN 'City of Johannesburg'
            WHEN m.municipality_code LIKE 'TSH%' THEN 'City of Tshwane'
            WHEN m.municipality_code LIKE 'EKU%' THEN 'Ekurhuleni'
            WHEN m.municipality_code LIKE 'CPT%' THEN 'City of Cape Town'
            WHEN m.municipality_code LIKE 'ETH%' THEN 'eThekwini'
            WHEN m.municipality_code LIKE 'NMA%' THEN 'Nelson Mandela Bay'
            WHEN m.municipality_code LIKE 'BUF%' THEN 'Buffalo City'
            WHEN m.municipality_code LIKE 'MAN%' THEN 'Mangaung'
        END
    ),
    province_code = COALESCE(d.province_code,
        CASE
            WHEN m.municipality_code LIKE 'JHB%' THEN 'GT'
            WHEN m.municipality_code LIKE 'TSH%' THEN 'GT'
            WHEN m.municipality_code LIKE 'EKU%' THEN 'GT'
            WHEN m.municipality_code LIKE 'CPT%' THEN 'WC'
            WHEN m.municipality_code LIKE 'ETH%' THEN 'KZN'
            WHEN m.municipality_code LIKE 'NMA%' THEN 'EC'
            WHEN m.municipality_code LIKE 'BUF%' THEN 'EC'
            WHEN m.municipality_code LIKE 'MAN%' THEN 'FS'
        END
    ),
    province_name = COALESCE(p.province_name,
        CASE
            WHEN m.municipality_code LIKE 'JHB%' THEN 'Gauteng'
            WHEN m.municipality_code LIKE 'TSH%' THEN 'Gauteng'
            WHEN m.municipality_code LIKE 'EKU%' THEN 'Gauteng'
            WHEN m.municipality_code LIKE 'CPT%' THEN 'Western Cape'
            WHEN m.municipality_code LIKE 'ETH%' THEN 'KwaZulu-Natal'
            WHEN m.municipality_code LIKE 'NMA%' THEN 'Eastern Cape'
            WHEN m.municipality_code LIKE 'BUF%' THEN 'Eastern Cape'
            WHEN m.municipality_code LIKE 'MAN%' THEN 'Free State'
        END
    )
FROM wards w
JOIN municipalities m ON w.municipality_code = m.municipality_code
LEFT JOIN districts d ON m.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
WHERE mc.ward_code = w.ward_code
    AND (
        mc.municipality_code IS NULL
        OR mc.district_code IS NULL
        OR mc.province_code IS NULL
    );

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================
SELECT
    'AFTER ALL UPDATES' as status,
    COUNT(*) as total_members,
    COUNT(CASE WHEN municipality_code IS NULL THEN 1 END) as null_municipality,
    COUNT(CASE WHEN district_code IS NULL THEN 1 END) as null_district,
    COUNT(CASE WHEN province_code IS NULL THEN 1 END) as null_province
FROM members_consolidated;

-- Show breakdown by province
SELECT
    province_code,
    province_name,
    COUNT(*) as member_count,
    COUNT(CASE WHEN municipality_code IS NULL THEN 1 END) as null_municipality,
    COUNT(CASE WHEN district_code IS NULL THEN 1 END) as null_district
FROM members_consolidated
WHERE province_code IS NOT NULL
GROUP BY province_code, province_name
ORDER BY province_code;

-- Show West Rand statistics (example of a regular district)
SELECT
    'West Rand (DC48)' as district,
    COUNT(*) as total_members,
    COUNT(DISTINCT municipality_code) as municipalities,
    COUNT(DISTINCT ward_code) as wards
FROM members_consolidated
WHERE district_code = 'DC48';

-- Show West Rand by municipality
SELECT
    municipality_code,
    municipality_name,
    COUNT(*) as member_count
FROM members_consolidated
WHERE district_code = 'DC48'
GROUP BY municipality_code, municipality_name
ORDER BY municipality_code;

-- Show Johannesburg statistics (example of a metro municipality)
SELECT
    'City of Johannesburg (JHB)' as metro,
    COUNT(*) as total_members,
    COUNT(DISTINCT municipality_code) as sub_regions,
    COUNT(DISTINCT ward_code) as wards
FROM members_consolidated
WHERE district_code = 'JHB';

-- Show Johannesburg by sub-region
SELECT
    municipality_code,
    municipality_name,
    COUNT(*) as member_count
FROM members_consolidated
WHERE district_code = 'JHB'
GROUP BY municipality_code, municipality_name
ORDER BY municipality_code;

COMMIT;

-- ============================================================================
-- POST-UPDATE VERIFICATION QUERIES
-- ============================================================================
-- Run these queries after the transaction commits to verify the fix

-- Check if there are still members with NULL geographic data
SELECT
    'Members with NULL municipality_code' as issue,
    COUNT(*) as count
FROM members_consolidated
WHERE municipality_code IS NULL AND ward_code IS NOT NULL;

SELECT
    'Members with NULL district_code' as issue,
    COUNT(*) as count
FROM members_consolidated
WHERE district_code IS NULL AND ward_code IS NOT NULL;

SELECT
    'Members with NULL province_code' as issue,
    COUNT(*) as count
FROM members_consolidated
WHERE province_code IS NULL AND ward_code IS NOT NULL;

-- Check members whose ward_code is not in the wards table
SELECT
    'Members with ward_code not in wards table' as issue,
    COUNT(*) as count
FROM members_consolidated mc
LEFT JOIN wards w ON mc.ward_code = w.ward_code
WHERE mc.ward_code IS NOT NULL AND w.ward_code IS NULL;

-- Show sample of metro municipality members
SELECT
    'Sample Metro Municipality Members' as description,
    member_id,
    ward_code,
    municipality_code,
    municipality_name,
    district_code,
    district_name,
    province_code,
    province_name
FROM members_consolidated
WHERE district_code IN ('JHB', 'TSH', 'EKU', 'CPT', 'ETH', 'NMA', 'BUF', 'MAN')
LIMIT 10;

