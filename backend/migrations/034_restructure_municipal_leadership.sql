-- =====================================================================================
-- MIGRATION 034: RESTRUCTURE MUNICIPAL LEADERSHIP POSITIONS
-- =====================================================================================
-- Date:        2026-02-22
-- Author:      System Migration
-- Description: Restructures municipal leadership to exactly 18 positions per municipality:
--              - 3 Executive positions (Chairperson, Secretary, Treasurer)
--              - 15 Additional Member positions
--              Also removes Youth Leader and Women Leader from municipal level
--              (these positions already exist at ward level).
--
-- IMPORTANT: This migration clears ALL existing municipal leadership appointments.
--            Ensure you have a database backup before running in production.
--
-- Usage:
--   Development: node scripts/execute-sql-file.js migrations/034_restructure_municipal_leadership.sql
--   Production:  psql -h <host> -U <user> -d <database> -f migrations/034_restructure_municipal_leadership.sql
--
-- Rollback:
--   psql -h <host> -U <user> -d <database> -f migrations/034_restructure_municipal_leadership_rollback.sql
-- =====================================================================================

-- =====================================================================================
-- PHASE 0: PRE-FLIGHT CHECKS AND BACKUP
-- =====================================================================================

BEGIN;

-- Record migration start
DO $$
BEGIN
    RAISE NOTICE '=== MIGRATION 034: RESTRUCTURE MUNICIPAL LEADERSHIP ===';
    RAISE NOTICE 'Started at: %', NOW();
END $$;

-- Create backup tables to enable rollback
-- Backup leadership_appointments for municipal level
CREATE TABLE IF NOT EXISTS _backup_034_leadership_appointments AS
SELECT * FROM leadership_appointments
WHERE hierarchy_level = 'Municipality';

-- Backup leadership_positions for municipal level
CREATE TABLE IF NOT EXISTS _backup_034_leadership_positions AS
SELECT * FROM leadership_positions
WHERE hierarchy_level = 'Municipality';

-- Log pre-migration counts
DO $$
DECLARE
    v_appointment_count INTEGER;
    v_position_count INTEGER;
    v_municipality_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_appointment_count
    FROM leadership_appointments WHERE hierarchy_level = 'Municipality';

    SELECT COUNT(*) INTO v_position_count
    FROM leadership_positions WHERE hierarchy_level = 'Municipality' AND is_active = TRUE;

    SELECT COUNT(*) INTO v_municipality_count
    FROM municipalities WHERE is_active = TRUE;

    RAISE NOTICE 'PRE-MIGRATION STATE:';
    RAISE NOTICE '  Active municipal appointments: %', v_appointment_count;
    RAISE NOTICE '  Active municipal positions:    %', v_position_count;
    RAISE NOTICE '  Active municipalities:         %', v_municipality_count;
END $$;

-- =====================================================================================
-- PHASE 1: CLEAR ALL EXISTING MUNICIPAL LEADERSHIP APPOINTMENTS
-- =====================================================================================

DO $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '--- PHASE 1: Clearing all municipal leadership appointments ---';

    -- Terminate all active municipal appointments (soft delete - preserve history)
    UPDATE leadership_appointments
    SET appointment_status = 'Terminated',
        termination_reason = 'Municipal leadership restructure migration 034 - positions reorganized',
        terminated_at = NOW(),
        updated_at = NOW()
    WHERE hierarchy_level = 'Municipality'
      AND appointment_status = 'Active';

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RAISE NOTICE '  Terminated % active municipal appointments', v_deleted_count;

    -- Also mark any other non-terminated municipal appointments
    UPDATE leadership_appointments
    SET appointment_status = 'Terminated',
        termination_reason = 'Municipal leadership restructure migration 034 - positions reorganized',
        terminated_at = NOW(),
        updated_at = NOW()
    WHERE hierarchy_level = 'Municipality'
      AND appointment_status NOT IN ('Terminated', 'Completed');

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RAISE NOTICE '  Terminated % additional non-active municipal appointments', v_deleted_count;
END $$;

-- =====================================================================================
-- PHASE 2: DEACTIVATE ALL EXISTING MUNICIPAL POSITIONS
-- =====================================================================================

DO $$
DECLARE
    v_deactivated_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '--- PHASE 2: Deactivating all existing municipal positions ---';

    UPDATE leadership_positions
    SET is_active = FALSE,
        updated_at = NOW()
    WHERE hierarchy_level = 'Municipality'
      AND is_active = TRUE;

    GET DIAGNOSTICS v_deactivated_count = ROW_COUNT;
    RAISE NOTICE '  Deactivated % municipal positions', v_deactivated_count;
END $$;

-- =====================================================================================
-- PHASE 3: CREATE NEW MUNICIPAL LEADERSHIP POSITIONS (18 per municipality)
-- =====================================================================================
-- Structure per municipality:
--   Position 1:  Chairperson      (Executive)
--   Position 2:  Secretary         (Executive)
--   Position 3:  Treasurer         (Executive)
--   Positions 4-18: Additional Member 1-15 (Additional Member)
-- =====================================================================================

CREATE OR REPLACE FUNCTION _migrate_034_create_municipal_positions()
RETURNS void AS $$
DECLARE
    municipality_record RECORD;
    v_position_counter INTEGER := 0;
    v_municipality_counter INTEGER := 0;
    v_display_name VARCHAR(255);
    v_position_prefix VARCHAR(50);
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '--- PHASE 3: Creating new municipal positions (18 per municipality) ---';

    FOR municipality_record IN
        SELECT
            municipality_id,
            municipality_name,
            municipality_code,
            municipality_type
        FROM municipalities
        WHERE is_active = TRUE
        ORDER BY municipality_type DESC, municipality_name
    LOOP
        -- Determine display name and prefix based on municipality type
        IF municipality_record.municipality_type = 'Metropolitan' THEN
            v_display_name := municipality_record.municipality_name;
            v_position_prefix := 'Metro';
        ELSIF municipality_record.municipality_type = 'Metro Sub-Region' THEN
            v_display_name := municipality_record.municipality_name;
            v_position_prefix := 'Sub-Region';
        ELSE
            v_display_name := municipality_record.municipality_name;
            v_position_prefix := 'Municipal';
        END IF;

        -- === Position 1: Chairperson (Executive) ===
        INSERT INTO leadership_positions (
            position_name, position_code, position_description,
            hierarchy_level, position_category, is_core_position,
            requires_election, term_duration_months, max_concurrent_appointments,
            position_order, is_active, entity_id, entity_type
        ) VALUES (
            v_display_name || ' ' || v_position_prefix || ' Chairperson',
            'MCHAIR_' || municipality_record.municipality_code,
            v_position_prefix || ' Chairperson for ' || v_display_name,
            'Municipality', 'Executive', TRUE,
            TRUE, 60, 1,
            1, TRUE, municipality_record.municipality_id, municipality_record.municipality_type
        )
        ON CONFLICT (position_code) DO UPDATE SET
            is_active = TRUE,
            position_category = 'Executive',
            position_order = 1,
            position_name = EXCLUDED.position_name,
            position_description = EXCLUDED.position_description,
            updated_at = NOW();
        v_position_counter := v_position_counter + 1;

        -- === Position 2: Secretary (Executive) ===
        INSERT INTO leadership_positions (
            position_name, position_code, position_description,
            hierarchy_level, position_category, is_core_position,
            requires_election, term_duration_months, max_concurrent_appointments,
            position_order, is_active, entity_id, entity_type
        ) VALUES (
            v_display_name || ' ' || v_position_prefix || ' Secretary',
            'MSEC_' || municipality_record.municipality_code,
            v_position_prefix || ' Secretary for ' || v_display_name,
            'Municipality', 'Executive', TRUE,
            TRUE, 60, 1,
            2, TRUE, municipality_record.municipality_id, municipality_record.municipality_type
        )
        ON CONFLICT (position_code) DO UPDATE SET
            is_active = TRUE,
            position_category = 'Executive',
            position_order = 2,
            position_name = EXCLUDED.position_name,
            position_description = EXCLUDED.position_description,
            updated_at = NOW();
        v_position_counter := v_position_counter + 1;

        -- === Position 3: Treasurer (Executive) ===
        INSERT INTO leadership_positions (
            position_name, position_code, position_description,
            hierarchy_level, position_category, is_core_position,
            requires_election, term_duration_months, max_concurrent_appointments,
            position_order, is_active, entity_id, entity_type
        ) VALUES (
            v_display_name || ' ' || v_position_prefix || ' Treasurer',
            'MTREAS_' || municipality_record.municipality_code,
            v_position_prefix || ' Treasurer for ' || v_display_name,
            'Municipality', 'Executive', TRUE,
            TRUE, 60, 1,
            3, TRUE, municipality_record.municipality_id, municipality_record.municipality_type
        )
        ON CONFLICT (position_code) DO UPDATE SET
            is_active = TRUE,
            position_category = 'Executive',
            position_order = 3,
            position_name = EXCLUDED.position_name,
            position_description = EXCLUDED.position_description,
            updated_at = NOW();
        v_position_counter := v_position_counter + 1;

        -- === Positions 4-18: Additional Members 1-15 ===
        FOR i IN 1..15 LOOP
            INSERT INTO leadership_positions (
                position_name, position_code, position_description,
                hierarchy_level, position_category, is_core_position,
                requires_election, term_duration_months, max_concurrent_appointments,
                position_order, is_active, entity_id, entity_type
            ) VALUES (
                v_display_name || ' ' || v_position_prefix || ' Additional Member ' || i,
                'MADD' || LPAD(i::TEXT, 2, '0') || '_' || municipality_record.municipality_code,
                v_position_prefix || ' Additional Member ' || i || ' for ' || v_display_name,
                'Municipality', 'Additional Member', FALSE,
                TRUE, 60, 1,
                3 + i, TRUE, municipality_record.municipality_id, municipality_record.municipality_type
            )
            ON CONFLICT (position_code) DO UPDATE SET
                is_active = TRUE,
                position_category = 'Additional Member',
                position_order = 3 + i,
                position_name = EXCLUDED.position_name,
                position_description = EXCLUDED.position_description,
                updated_at = NOW();
            v_position_counter := v_position_counter + 1;
        END LOOP;

        v_municipality_counter := v_municipality_counter + 1;
    END LOOP;

    RAISE NOTICE '  Created/updated % positions across % municipalities',
        v_position_counter, v_municipality_counter;
    RAISE NOTICE '  Expected: % positions (18 x %)',
        v_municipality_counter * 18, v_municipality_counter;
END;
$$ LANGUAGE plpgsql;

-- Execute the position creation function
SELECT _migrate_034_create_municipal_positions();

-- Clean up the temporary function
DROP FUNCTION IF EXISTS _migrate_034_create_municipal_positions();

-- =====================================================================================
-- PHASE 4: ENSURE YOUTH & WOMEN LEADER POSITIONS EXIST AT WARD LEVEL
-- =====================================================================================
-- Youth Leader and Women Leader positions already exist at ward level (8956+ positions).
-- This phase verifies they exist and creates any missing ones.
-- =====================================================================================

DO $$
DECLARE
    v_ward_youth_count INTEGER;
    v_ward_women_count INTEGER;
    v_total_wards INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '--- PHASE 4: Verifying Youth & Women Leader positions at ward level ---';

    SELECT COUNT(*) INTO v_total_wards FROM wards WHERE is_active = TRUE;

    SELECT COUNT(*) INTO v_ward_youth_count
    FROM leadership_positions
    WHERE hierarchy_level = 'Ward'
      AND is_active = TRUE
      AND (position_code LIKE 'WYOUTH%' OR position_code LIKE 'BYOUTH%'
           OR position_name LIKE '%Youth Leader%');

    SELECT COUNT(*) INTO v_ward_women_count
    FROM leadership_positions
    WHERE hierarchy_level = 'Ward'
      AND is_active = TRUE
      AND (position_code LIKE 'WWOMEN%' OR position_code LIKE 'BWOMEN%'
           OR position_name LIKE '%Women Leader%');

    RAISE NOTICE '  Total active wards:              %', v_total_wards;
    RAISE NOTICE '  Ward Youth Leader positions:      %', v_ward_youth_count;
    RAISE NOTICE '  Ward Women Leader positions:      %', v_ward_women_count;

    IF v_ward_youth_count >= v_total_wards AND v_ward_women_count >= v_total_wards THEN
        RAISE NOTICE '  ✓ All wards have Youth and Women Leader positions';
    ELSE
        RAISE NOTICE '  ⚠ Some wards may be missing Youth/Women Leader positions';
        RAISE NOTICE '  Missing Youth Leader: ~%', GREATEST(v_total_wards - v_ward_youth_count, 0);
        RAISE NOTICE '  Missing Women Leader: ~%', GREATEST(v_total_wards - v_ward_women_count, 0);
    END IF;
END $$;

-- =====================================================================================
-- PHASE 5: UPDATE LEADERSHIP STRUCTURES TABLE
-- =====================================================================================

-- Update or insert the Municipal leadership structure definition
INSERT INTO leadership_structures (
    structure_name, structure_code, hierarchy_level, total_positions, description, is_active
) VALUES (
    'Municipal Leadership Structure',
    'MLS',
    'Municipality',
    18,
    'Municipal leadership structure comprising 3 Executive positions (Chairperson, Secretary, Treasurer) and 15 Additional Members. Youth Leader and Women Leader positions are managed at ward level.',
    TRUE
)
ON CONFLICT (structure_code) DO UPDATE SET
    total_positions = 18,
    description = EXCLUDED.description,
    is_active = TRUE,
    updated_at = NOW();

-- =====================================================================================
-- PHASE 6: RESET SEQUENCE
-- =====================================================================================

SELECT setval('leadership_positions_id_seq', (SELECT COALESCE(MAX(id), 1) FROM leadership_positions));

-- =====================================================================================
-- PHASE 7: POST-MIGRATION VERIFICATION
-- =====================================================================================

DO $$
DECLARE
    v_new_position_count INTEGER;
    v_exec_count INTEGER;
    v_addl_count INTEGER;
    v_municipality_count INTEGER;
    v_positions_per_muni NUMERIC;
    v_active_appointments INTEGER;
    v_youth_at_muni INTEGER;
    v_women_at_muni INTEGER;
    v_all_have_18 BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== POST-MIGRATION VERIFICATION ===';

    -- Count new active municipal positions
    SELECT COUNT(*) INTO v_new_position_count
    FROM leadership_positions
    WHERE hierarchy_level = 'Municipality' AND is_active = TRUE;

    -- Count by category
    SELECT COUNT(*) INTO v_exec_count
    FROM leadership_positions
    WHERE hierarchy_level = 'Municipality' AND is_active = TRUE AND position_category = 'Executive';

    SELECT COUNT(*) INTO v_addl_count
    FROM leadership_positions
    WHERE hierarchy_level = 'Municipality' AND is_active = TRUE AND position_category = 'Additional Member';

    -- Count municipalities
    SELECT COUNT(*) INTO v_municipality_count
    FROM municipalities WHERE is_active = TRUE;

    -- Positions per municipality
    v_positions_per_muni := CASE WHEN v_municipality_count > 0
        THEN v_new_position_count::NUMERIC / v_municipality_count
        ELSE 0 END;

    -- Check no active municipal appointments remain
    SELECT COUNT(*) INTO v_active_appointments
    FROM leadership_appointments
    WHERE hierarchy_level = 'Municipality' AND appointment_status = 'Active';

    -- Check Youth/Women Leader removed from municipal level
    SELECT COUNT(*) INTO v_youth_at_muni
    FROM leadership_positions
    WHERE hierarchy_level = 'Municipality' AND is_active = TRUE
      AND (position_code LIKE 'MYOUTH%' OR position_name LIKE '%Youth Leader%');

    SELECT COUNT(*) INTO v_women_at_muni
    FROM leadership_positions
    WHERE hierarchy_level = 'Municipality' AND is_active = TRUE
      AND (position_code LIKE 'MWOMEN%' OR position_name LIKE '%Women Leader%');

    -- Check all municipalities have exactly 18 positions
    SELECT NOT EXISTS (
        SELECT entity_id, COUNT(*) as cnt
        FROM leadership_positions
        WHERE hierarchy_level = 'Municipality' AND is_active = TRUE
        GROUP BY entity_id
        HAVING COUNT(*) != 18
    ) INTO v_all_have_18;

    RAISE NOTICE '  Total active municipal positions: %', v_new_position_count;
    RAISE NOTICE '  Executive positions:              %', v_exec_count;
    RAISE NOTICE '  Additional Member positions:      %', v_addl_count;
    RAISE NOTICE '  Active municipalities:            %', v_municipality_count;
    RAISE NOTICE '  Positions per municipality:       %', ROUND(v_positions_per_muni, 2);
    RAISE NOTICE '  Active municipal appointments:    % (should be 0)', v_active_appointments;
    RAISE NOTICE '  Youth Leader at municipal level:  % (should be 0)', v_youth_at_muni;
    RAISE NOTICE '  Women Leader at municipal level:  % (should be 0)', v_women_at_muni;
    RAISE NOTICE '  All municipalities have 18:       %', v_all_have_18;

    -- Validation assertions
    IF v_active_appointments > 0 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: % active municipal appointments still exist', v_active_appointments;
    END IF;

    IF v_youth_at_muni > 0 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: % Youth Leader positions still active at municipal level', v_youth_at_muni;
    END IF;

    IF v_women_at_muni > 0 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: % Women Leader positions still active at municipal level', v_women_at_muni;
    END IF;

    IF NOT v_all_have_18 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: Not all municipalities have exactly 18 positions';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '✓ ALL VERIFICATIONS PASSED';
    RAISE NOTICE '=== MIGRATION 034 COMPLETED SUCCESSFULLY at % ===', NOW();
END $$;

COMMIT;

