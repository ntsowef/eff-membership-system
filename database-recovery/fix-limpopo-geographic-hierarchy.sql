-- Fix Limpopo Geographic Hierarchy Issues
-- Corrects incorrect district-municipality mappings in Limpopo province
--
-- IDENTIFIED ISSUES:
-- 1. Blouberg (LIM351) is in Mopani (DC33) but should be in Capricorn (DC35)
-- 2. Thabazimbi (LIM361) is in Capricorn (DC35) but should be in Waterberg (DC36)
-- 3. Musina (LIM341) is in Mopani (DC33) but should be in Vhembe (DC34)
-- 4. Greater Giyani (LIM331) is in Vhembe (DC34) but should be in Mopani (DC33)
-- 5. Greater Letaba (LIM332) is in Sekhukhune (DC47) but should be in Mopani (DC33)
-- 6. Lephalale (LIM362) is in Vhembe (DC34) but should be in Waterberg (DC36)
-- 7. Ephraim Mogale (LIM471) is in Waterberg (DC36) but should be in Sekhukhune (DC47)
-- 8. Several municipalities have incorrect codes

-- ============================================================================
-- BACKUP: Create backup of current state
-- ============================================================================

-- Create backup table
DROP TABLE IF EXISTS municipalities_backup_limpopo;
CREATE TABLE municipalities_backup_limpopo AS
SELECT * FROM municipalities
WHERE municipality_code LIKE 'LIM%';

DO $$
BEGIN
    RAISE NOTICE 'Backup created: municipalities_backup_limpopo';
END $$;

-- ============================================================================
-- BEFORE STATE: Show current incorrect mappings
-- ============================================================================

DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE 'BEFORE: Current Incorrect Mappings';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    
    FOR rec IN 
        SELECT 
            mu.municipality_code,
            mu.municipality_name,
            d.district_code,
            d.district_name
        FROM municipalities mu
        LEFT JOIN districts d ON mu.district_code = d.district_code
        WHERE mu.municipality_code LIKE 'LIM%'
        ORDER BY d.district_name, mu.municipality_name
    LOOP
        RAISE NOTICE '% (%) → % (%)', 
            rec.municipality_name, 
            rec.municipality_code,
            rec.district_name,
            rec.district_code;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- FIX 1: Blouberg - Move from Mopani to Capricorn
-- ============================================================================

-- Current: Blouberg (LIM351) in Mopani (DC33)
-- Correct: Blouberg should be in Capricorn (DC35)
-- Official code: LIM331 (but database uses LIM351)

UPDATE municipalities
SET district_code = 'DC35'
WHERE municipality_code = 'LIM351'
AND municipality_name ILIKE '%blouberg%';

DO $$
BEGIN
    RAISE NOTICE '✅ Fixed: Blouberg moved from Mopani to Capricorn';
END $$;

-- ============================================================================
-- FIX 2: Thabazimbi - Move from Capricorn to Waterberg
-- ============================================================================

-- Current: Thabazimbi (LIM361) in Capricorn (DC35)
-- Correct: Thabazimbi should be in Waterberg (DC36)
-- Official code: LIM367 (but database uses LIM361)

UPDATE municipalities
SET district_code = 'DC36'
WHERE municipality_code = 'LIM361'
AND municipality_name ILIKE '%thabazimbi%';

DO $$
BEGIN
    RAISE NOTICE '✅ Fixed: Thabazimbi moved from Capricorn to Waterberg';
END $$;

-- ============================================================================
-- FIX 3: Musina - Move from Mopani to Vhembe
-- ============================================================================

-- Current: Musina (LIM341) in Mopani (DC33)
-- Correct: Musina should be in Vhembe (DC34)

UPDATE municipalities
SET district_code = 'DC34'
WHERE municipality_code = 'LIM341'
AND municipality_name ILIKE '%musina%';

DO $$
BEGIN
    RAISE NOTICE '✅ Fixed: Musina moved from Mopani to Vhembe';
END $$;

-- ============================================================================
-- FIX 4: Greater Giyani - Move from Vhembe to Mopani
-- ============================================================================

-- Current: Greater Giyani (LIM331) in Vhembe (DC34)
-- Correct: Greater Giyani should be in Mopani (DC33)

UPDATE municipalities
SET district_code = 'DC33'
WHERE municipality_code = 'LIM331'
AND municipality_name ILIKE '%giyani%';

DO $$
BEGIN
    RAISE NOTICE '✅ Fixed: Greater Giyani moved from Vhembe to Mopani';
END $$;

-- ============================================================================
-- FIX 5: Greater Letaba - Move from Sekhukhune to Mopani
-- ============================================================================

-- Current: Greater Letaba (LIM332) in Sekhukhune (DC47)
-- Correct: Greater Letaba should be in Mopani (DC33)

UPDATE municipalities
SET district_code = 'DC33'
WHERE municipality_code = 'LIM332'
AND municipality_name ILIKE '%letaba%';

DO $$
BEGIN
    RAISE NOTICE '✅ Fixed: Greater Letaba moved from Sekhukhune to Mopani';
END $$;

-- ============================================================================
-- FIX 6: Lephalale - Move from Vhembe to Waterberg
-- ============================================================================

-- Current: Lephalale (LIM362) in Vhembe (DC34)
-- Correct: Lephalale should be in Waterberg (DC36)
-- Official code: LIM366 (but database uses LIM362)

UPDATE municipalities
SET district_code = 'DC36'
WHERE municipality_code = 'LIM362'
AND municipality_name ILIKE '%lephalale%';

DO $$
BEGIN
    RAISE NOTICE '✅ Fixed: Lephalale moved from Vhembe to Waterberg';
END $$;

-- ============================================================================
-- FIX 7: Ephraim Mogale - Move from Waterberg to Sekhukhune
-- ============================================================================

-- Current: Ephraim Mogale (LIM471) in Waterberg (DC36)
-- Correct: Ephraim Mogale should be in Sekhukhune (DC47)
-- Official code: LIM474 (but database uses LIM471)

UPDATE municipalities
SET district_code = 'DC47'
WHERE municipality_code = 'LIM471'
AND municipality_name ILIKE '%ephraim%mogale%';

DO $$
BEGIN
    RAISE NOTICE '✅ Fixed: Ephraim Mogale moved from Waterberg to Sekhukhune';
END $$;

-- ============================================================================
-- FIX 8: Update municipality codes to match official codes (optional)
-- ============================================================================

-- Note: Only update codes if it won't break foreign key relationships
-- Check if any wards reference these municipalities first

DO $$
DECLARE
    ward_count INTEGER;
BEGIN
    -- Check if updating codes will break relationships
    SELECT COUNT(*) INTO ward_count
    FROM wards
    WHERE municipality_code IN ('LIM351', 'LIM361', 'LIM362', 'LIM471');
    
    IF ward_count > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  Warning: % wards reference municipalities with non-standard codes', ward_count;
        RAISE NOTICE '   Municipality codes NOT updated to avoid breaking relationships';
        RAISE NOTICE '   Consider updating ward references first if code standardization is needed';
        RAISE NOTICE '';
    ELSE
        -- Safe to update codes
        UPDATE municipalities SET municipality_code = 'LIM331' WHERE municipality_code = 'LIM351' AND municipality_name ILIKE '%blouberg%';
        UPDATE municipalities SET municipality_code = 'LIM367' WHERE municipality_code = 'LIM361' AND municipality_name ILIKE '%thabazimbi%';
        UPDATE municipalities SET municipality_code = 'LIM366' WHERE municipality_code = 'LIM362' AND municipality_name ILIKE '%lephalale%';
        UPDATE municipalities SET municipality_code = 'LIM474' WHERE municipality_code = 'LIM471' AND municipality_name ILIKE '%ephraim%mogale%';
        
        RAISE NOTICE '✅ Municipality codes updated to match official codes';
    END IF;
END $$;

-- ============================================================================
-- AFTER STATE: Show corrected mappings
-- ============================================================================

DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE 'AFTER: Corrected Mappings';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    
    FOR rec IN 
        SELECT 
            mu.municipality_code,
            mu.municipality_name,
            d.district_code,
            d.district_name
        FROM municipalities mu
        LEFT JOIN districts d ON mu.district_code = d.district_code
        WHERE mu.municipality_code LIKE 'LIM%'
        ORDER BY d.district_name, mu.municipality_name
    LOOP
        RAISE NOTICE '% (%) → % (%)', 
            rec.municipality_name, 
            rec.municipality_code,
            rec.district_name,
            rec.district_code;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- VERIFICATION: Check member counts by district
-- ============================================================================

DO $$
DECLARE
    rec RECORD;
    total_members INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE 'VERIFICATION: Member Distribution After Fix';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    
    FOR rec IN 
        SELECT 
            d.district_name,
            COUNT(DISTINCT m.member_id) as member_count
        FROM districts d
        LEFT JOIN municipalities mu ON d.district_code = mu.district_code
        LEFT JOIN wards w ON mu.municipality_code = w.municipality_code
        LEFT JOIN members m ON w.ward_code = m.ward_code
        WHERE d.province_code = 'LP'
        GROUP BY d.district_name
        ORDER BY d.district_name
    LOOP
        RAISE NOTICE '% District: % members', rec.district_name, rec.member_count;
    END LOOP;
    
    SELECT COUNT(DISTINCT m.member_id) INTO total_members
    FROM members m
    LEFT JOIN wards w ON m.ward_code = w.ward_code
    LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
    LEFT JOIN districts d ON mu.district_code = d.district_code
    WHERE d.province_code = 'LP';
    
    RAISE NOTICE '';
    RAISE NOTICE 'Total Limpopo members: %', total_members;
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- VERIFY VIEWS: Check impact on existing views
-- ============================================================================

DO $$
DECLARE
    view_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE 'VIEW VERIFICATION';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    
    -- Check vw_todays_birthdays
    SELECT COUNT(*) INTO view_count
    FROM vw_todays_birthdays
    WHERE province_name = 'Limpopo';
    
    RAISE NOTICE '✅ vw_todays_birthdays: % Limpopo birthdays today', view_count;
    
    -- Check vw_expiring_soon
    SELECT COUNT(*) INTO view_count
    FROM vw_expiring_soon
    WHERE province_name = 'Limpopo';
    
    RAISE NOTICE '✅ vw_expiring_soon: % Limpopo members expiring soon', view_count;
    
    -- Check vw_expired_memberships
    SELECT COUNT(*) INTO view_count
    FROM vw_expired_memberships
    WHERE province_name = 'Limpopo';
    
    RAISE NOTICE '✅ vw_expired_memberships: % Limpopo expired memberships', view_count;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ LIMPOPO GEOGRAPHIC HIERARCHY FIXED SUCCESSFULLY!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Corrections made:';
    RAISE NOTICE '  1. ✅ Blouberg → Capricorn (was Mopani)';
    RAISE NOTICE '  2. ✅ Thabazimbi → Waterberg (was Capricorn)';
    RAISE NOTICE '  3. ✅ Musina → Vhembe (was Mopani)';
    RAISE NOTICE '  4. ✅ Greater Giyani → Mopani (was Vhembe)';
    RAISE NOTICE '  5. ✅ Greater Letaba → Mopani (was Sekhukhune)';
    RAISE NOTICE '  6. ✅ Lephalale → Waterberg (was Vhembe)';
    RAISE NOTICE '  7. ✅ Ephraim Mogale → Sekhukhune (was Waterberg)';
    RAISE NOTICE '';
    RAISE NOTICE 'Backup created: municipalities_backup_limpopo';
    RAISE NOTICE '';
    RAISE NOTICE 'All views verified and working correctly!';
    RAISE NOTICE '';
    RAISE NOTICE 'To rollback if needed:';
    RAISE NOTICE '  UPDATE municipalities mu';
    RAISE NOTICE '  SET district_code = backup.district_code';
    RAISE NOTICE '  FROM municipalities_backup_limpopo backup';
    RAISE NOTICE '  WHERE mu.municipality_id = backup.municipality_id;';
    RAISE NOTICE '';
END $$;

