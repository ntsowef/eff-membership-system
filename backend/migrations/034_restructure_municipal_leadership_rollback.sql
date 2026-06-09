-- =====================================================================================
-- ROLLBACK FOR MIGRATION 034: RESTRUCTURE MUNICIPAL LEADERSHIP POSITIONS
-- =====================================================================================
-- Date:        2026-02-22
-- Description: Reverts the municipal leadership restructure by restoring positions
--              and appointments from the backup tables created during migration.
--
-- PREREQUISITES: The backup tables _backup_034_leadership_positions and
--                _backup_034_leadership_appointments must exist (created by migration 034).
--
-- Usage:
--   psql -h <host> -U <user> -d <database> -f migrations/034_restructure_municipal_leadership_rollback.sql
-- =====================================================================================

BEGIN;

DO $$
BEGIN
    RAISE NOTICE '=== ROLLBACK: MIGRATION 034 ===';
    RAISE NOTICE 'Started at: %', NOW();
END $$;

-- =====================================================================================
-- STEP 1: Verify backup tables exist
-- =====================================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_backup_034_leadership_positions') THEN
        RAISE EXCEPTION 'Backup table _backup_034_leadership_positions does not exist. Cannot rollback.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_backup_034_leadership_appointments') THEN
        RAISE EXCEPTION 'Backup table _backup_034_leadership_appointments does not exist. Cannot rollback.';
    END IF;
    RAISE NOTICE '  ✓ Backup tables found';
END $$;

-- =====================================================================================
-- STEP 2: Remove all appointments created after migration (if any)
-- =====================================================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Delete any new municipal appointments that were created after the migration
    DELETE FROM leadership_appointments
    WHERE hierarchy_level = 'Municipality'
      AND id NOT IN (SELECT id FROM _backup_034_leadership_appointments);

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '  Removed % post-migration municipal appointments', v_count;
END $$;

-- =====================================================================================
-- STEP 3: Deactivate new positions created by migration 034
-- =====================================================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Deactivate Additional Member positions (these are new from migration 034)
    UPDATE leadership_positions
    SET is_active = FALSE, updated_at = NOW()
    WHERE hierarchy_level = 'Municipality'
      AND position_category = 'Additional Member'
      AND is_active = TRUE;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '  Deactivated % Additional Member positions', v_count;
END $$;

-- =====================================================================================
-- STEP 4: Restore original positions from backup
-- =====================================================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Restore original positions by updating from backup
    UPDATE leadership_positions lp
    SET is_active = bp.is_active,
        position_category = bp.position_category,
        position_order = bp.position_order,
        position_name = bp.position_name,
        position_description = bp.position_description,
        updated_at = NOW()
    FROM _backup_034_leadership_positions bp
    WHERE lp.id = bp.id;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '  Restored % original municipal positions', v_count;
END $$;

-- =====================================================================================
-- STEP 5: Restore original appointments from backup
-- =====================================================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Restore appointments that were terminated by the migration
    UPDATE leadership_appointments la
    SET appointment_status = ba.appointment_status,
        termination_reason = ba.termination_reason,
        terminated_at = ba.terminated_at,
        terminated_by = ba.terminated_by,
        updated_at = NOW()
    FROM _backup_034_leadership_appointments ba
    WHERE la.id = ba.id;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '  Restored % original municipal appointments', v_count;
END $$;

-- =====================================================================================
-- STEP 6: Remove the Municipal Leadership Structure entry (if created by migration)
-- =====================================================================================

DELETE FROM leadership_structures WHERE structure_code = 'MLS';

-- =====================================================================================
-- STEP 7: Reset sequence
-- =====================================================================================

SELECT setval('leadership_positions_id_seq', (SELECT COALESCE(MAX(id), 1) FROM leadership_positions));

-- =====================================================================================
-- STEP 8: Verification
-- =====================================================================================

DO $$
DECLARE
    v_pos_count INTEGER;
    v_appt_count INTEGER;
    v_backup_pos_count INTEGER;
    v_backup_appt_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_pos_count
    FROM leadership_positions WHERE hierarchy_level = 'Municipality' AND is_active = TRUE;

    SELECT COUNT(*) INTO v_appt_count
    FROM leadership_appointments WHERE hierarchy_level = 'Municipality' AND appointment_status = 'Active';

    SELECT COUNT(*) INTO v_backup_pos_count
    FROM _backup_034_leadership_positions WHERE is_active = TRUE;

    SELECT COUNT(*) INTO v_backup_appt_count
    FROM _backup_034_leadership_appointments WHERE appointment_status = 'Active';

    RAISE NOTICE '';
    RAISE NOTICE '=== ROLLBACK VERIFICATION ===';
    RAISE NOTICE '  Active municipal positions:    % (backup had: %)', v_pos_count, v_backup_pos_count;
    RAISE NOTICE '  Active municipal appointments: % (backup had: %)', v_appt_count, v_backup_appt_count;
    RAISE NOTICE '';
    RAISE NOTICE '✓ ROLLBACK COMPLETED SUCCESSFULLY at %', NOW();
    RAISE NOTICE 'NOTE: Backup tables (_backup_034_*) are preserved. Drop them manually when confirmed.';
END $$;

COMMIT;
