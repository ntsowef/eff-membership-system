-- ============================================================================
-- Fix North West Province Geographic Data
-- ============================================================================
-- This script adds missing districts and municipalities for North West province
-- to resolve the Ward Audit System geographic filtering issue
--
-- Issue: When users select "North West" province, no sub-regions (districts/
-- municipalities) appear in the dropdown because the database is missing
-- this geographic hierarchy data.
--
-- Solution: Insert complete district and municipality data for North West
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. VERIFY NORTH WEST PROVINCE EXISTS
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM provinces WHERE province_code = 'NW') THEN
    RAISE EXCEPTION 'North West province (NW) not found in database!';
  END IF;
  RAISE NOTICE 'North West province verified';
END $$;

-- ============================================================================
-- 2. INSERT NORTH WEST DISTRICTS
-- ============================================================================
-- North West has 4 districts according to South African municipal demarcation

INSERT INTO districts (district_code, district_name, province_code, district_type, is_active)
VALUES
  ('DC37', 'Ngaka Modiri Molema', 'NW', 'District', TRUE),
  ('DC38', 'Dr Ruth Segomotsi Mompati', 'NW', 'District', TRUE),
  ('DC39', 'Dr Kenneth Kaunda', 'NW', 'District', TRUE),
  ('DC40', 'Bojanala Platinum', 'NW', 'District', TRUE)
ON CONFLICT (district_code) DO UPDATE SET
  district_name = EXCLUDED.district_name,
  province_code = EXCLUDED.province_code,
  district_type = EXCLUDED.district_type,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- 3. INSERT NORTH WEST MUNICIPALITIES
-- ============================================================================

-- DC37: Ngaka Modiri Molema District Municipalities
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('NW381', 'Ratlou', 'DC37', 'Local', TRUE),
  ('NW382', 'Tswaing', 'DC37', 'Local', TRUE),
  ('NW383', 'Mafikeng', 'DC37', 'Local', TRUE),
  ('NW384', 'Ditsobotla', 'DC37', 'Local', TRUE),
  ('NW385', 'Ramotshere Moiloa', 'DC37', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = EXCLUDED.municipality_type,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- DC38: Dr Ruth Segomotsi Mompati District Municipalities
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('NW391', 'Lekwa-Teemane', 'DC38', 'Local', TRUE),
  ('NW392', 'Greater Taung', 'DC38', 'Local', TRUE),
  ('NW393', 'Naledi', 'DC38', 'Local', TRUE),
  ('NW394', 'Mamusa', 'DC38', 'Local', TRUE),
  ('NW395', 'Kagisano-Molopo', 'DC38', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = EXCLUDED.municipality_type,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- DC39: Dr Kenneth Kaunda District Municipalities
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('NW401', 'Ventersdorp', 'DC39', 'Local', TRUE),
  ('NW402', 'Tlokwe', 'DC39', 'Local', TRUE),
  ('NW403', 'City of Matlosana', 'DC39', 'Local', TRUE),
  ('NW404', 'Maquassi Hills', 'DC39', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = EXCLUDED.municipality_type,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- DC40: Bojanala Platinum District Municipalities
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('NW371', 'Moretele', 'DC40', 'Local', TRUE),
  ('NW372', 'Madibeng', 'DC40', 'Local', TRUE),
  ('NW373', 'Rustenburg', 'DC40', 'Local', TRUE),
  ('NW374', 'Kgetlengrivier', 'DC40', 'Local', TRUE),
  ('NW375', 'Moses Kotane', 'DC40', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = EXCLUDED.municipality_type,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- 4. VERIFICATION QUERIES
-- ============================================================================

-- Count districts for North West
DO $$
DECLARE
  district_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO district_count
  FROM districts
  WHERE province_code = 'NW';
  
  RAISE NOTICE 'North West now has % districts', district_count;
  
  IF district_count = 0 THEN
    RAISE EXCEPTION 'No districts found for North West after insert!';
  END IF;
END $$;

-- Count municipalities for North West
DO $$
DECLARE
  municipality_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO municipality_count
  FROM municipalities m
  JOIN districts d ON m.district_code = d.district_code
  WHERE d.province_code = 'NW';
  
  RAISE NOTICE 'North West now has % municipalities', municipality_count;
  
  IF municipality_count = 0 THEN
    RAISE EXCEPTION 'No municipalities found for North West after insert!';
  END IF;
END $$;

-- Display summary
SELECT 
  'North West Geographic Data Summary' as summary,
  (SELECT COUNT(*) FROM districts WHERE province_code = 'NW') as districts,
  (SELECT COUNT(*) FROM municipalities m 
   JOIN districts d ON m.district_code = d.district_code 
   WHERE d.province_code = 'NW') as municipalities;

-- Display districts with municipality counts
SELECT 
  d.district_code,
  d.district_name,
  COUNT(m.municipality_id) as municipality_count
FROM districts d
LEFT JOIN municipalities m ON d.district_code = m.district_code
WHERE d.province_code = 'NW'
GROUP BY d.district_code, d.district_name
ORDER BY d.district_name;

-- Display all municipalities by district
SELECT 
  d.district_name,
  m.municipality_code,
  m.municipality_name,
  m.municipality_type
FROM municipalities m
JOIN districts d ON m.district_code = d.district_code
WHERE d.province_code = 'NW'
ORDER BY d.district_name, m.municipality_name;

COMMIT;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ North West province geographic data has been successfully populated!';
  RAISE NOTICE '   - 4 districts added';
  RAISE NOTICE '   - 19 municipalities added';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next Steps:';
  RAISE NOTICE '   1. Restart the backend server to clear any caches';
  RAISE NOTICE '   2. Test the Ward Audit System geographic filter';
  RAISE NOTICE '   3. Select "North West" province and verify districts appear';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 To verify the fix worked, run:';
  RAISE NOTICE '   SELECT d.district_name, COUNT(m.municipality_id) as munis';
  RAISE NOTICE '   FROM districts d';
  RAISE NOTICE '   LEFT JOIN municipalities m ON d.district_code = m.district_code';
  RAISE NOTICE '   WHERE d.province_code = ''NW''';
  RAISE NOTICE '   GROUP BY d.district_name;';
END $$;

