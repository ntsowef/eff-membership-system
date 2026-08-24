-- Fix IEC Province ID mappings for Limpopo, Mpumalanga, and Northern Cape
-- Bug: The original seed data assumed alphabetical ordering (LP=5, MP=6, NC=7)
-- Reality: IEC API uses MP=5, NC=6, LP=7 (verified from iec_voting_stations data)
--
-- This caused:
--   - Northern Cape (IEC ID 6) to be mapped to MP (Mpumalanga)
--   - Mpumalanga (IEC ID 5) to be mapped to LP (Limpopo)
--   - Limpopo (IEC ID 7) to be mapped to NC (Northern Cape)

BEGIN;

-- ============================================================================
-- FIX 1: iec_province_mappings table
-- ============================================================================

-- Temporarily set affected rows to negative temp values to avoid unique constraint violations
UPDATE iec_province_mappings SET iec_province_id = -5 WHERE province_code = 'LP';
UPDATE iec_province_mappings SET iec_province_id = -6 WHERE province_code = 'MP';
UPDATE iec_province_mappings SET iec_province_id = -7 WHERE province_code = 'NC';

-- Set the correct IEC Province IDs
UPDATE iec_province_mappings SET iec_province_id = 5, iec_province_name = 'Mpumalanga', updated_at = NOW() WHERE province_code = 'MP';
UPDATE iec_province_mappings SET iec_province_id = 6, iec_province_name = 'Northern Cape', updated_at = NOW() WHERE province_code = 'NC';
UPDATE iec_province_mappings SET iec_province_id = 7, iec_province_name = 'Limpopo', updated_at = NOW() WHERE province_code = 'LP';

-- ============================================================================
-- FIX 2: iec_municipality_mappings table (province_code was derived from wrong mapping)
-- ============================================================================

-- Municipalities with iec_province_id=5 (Mpumalanga) had province_code=LP -> fix to MP
UPDATE iec_municipality_mappings SET province_code = 'MP' WHERE iec_province_id = 5 AND province_code = 'LP';

-- Municipalities with iec_province_id=6 (Northern Cape) had province_code=MP -> fix to NC
UPDATE iec_municipality_mappings SET province_code = 'NC' WHERE iec_province_id = 6 AND province_code = 'MP';

-- Municipalities with iec_province_id=7 (Limpopo) had province_code=NC -> fix to LP
UPDATE iec_municipality_mappings SET province_code = 'LP' WHERE iec_province_id = 7 AND province_code = 'NC';

COMMIT;

-- Verify the fixes
SELECT province_code, province_name, iec_province_id, iec_province_name 
FROM iec_province_mappings 
ORDER BY iec_province_id;
