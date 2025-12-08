-- Fix missing municipality_code in members_consolidated table
-- Problem: Many members have ward_code but NULL municipality_code
-- Solution: Update municipality_code from wards table based on ward_code

-- Step 1: Update municipality_code for members with ward_code but NULL municipality_code
UPDATE members_consolidated mc
SET municipality_code = w.municipality_code
FROM wards w
WHERE mc.ward_code = w.ward_code
  AND mc.municipality_code IS NULL
  AND w.municipality_code IS NOT NULL;

-- Step 2: Verify the fix
SELECT 
  'After Fix' as status,
  province_code,
  COUNT(*) as total_members,
  COUNT(municipality_code) as with_muni_code,
  COUNT(*) - COUNT(municipality_code) as null_muni_code,
  ROUND(100.0 * COUNT(municipality_code) / COUNT(*), 2) as percentage_with_muni
FROM members_consolidated
WHERE province_code IN ('KZN', 'EC', 'FS')
GROUP BY province_code
ORDER BY province_code;

