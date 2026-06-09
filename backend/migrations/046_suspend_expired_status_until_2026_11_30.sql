-- ============================================================================
-- Suspend automatic transition to "Expired" (status_id = 2) until 2026-11-30
-- ============================================================================
-- Business decision: No member may be moved to Expired (status_id = 2) on or
-- before 30 November 2026. Members can only expire AFTER 30 November 2026, i.e.
-- from 1 December 2026 onwards. Until and including 2026-11-30, any row that
-- would otherwise be set to Expired is kept in Grace Period (status_id = 7).
--
-- This supersedes migration 044 (which used a 2026-11-04 cut-off).
--
-- From 2026-12-01 onwards the original behaviour resumes automatically (no
-- further migration needed). To change/extend the suspension window, update
-- the constant date below and re-run this migration.
-- ============================================================================

DROP TRIGGER IF EXISTS tr_auto_update_membership_status ON members_consolidated;
DROP FUNCTION IF EXISTS fn_auto_update_membership_status();

CREATE OR REPLACE FUNCTION fn_auto_update_membership_status()
RETURNS TRIGGER AS $$
DECLARE
  v_new_status_id INT;
  -- Suspension cut-off (inclusive). The "→ Expired" transition is suppressed
  -- while CURRENT_DATE <= v_expired_suspend_until.
  v_expired_suspend_until CONSTANT DATE := DATE '2026-11-30';
BEGIN
  -- Don't override manual statuses (Suspended, Cancelled, Pending)
  IF NEW.membership_status_id IN (3, 4, 5) THEN
    RETURN NEW;
  END IF;

  IF NEW.expiry_date IS NULL THEN
    v_new_status_id := 6; -- Inactive
  ELSIF NEW.expiry_date >= CURRENT_DATE THEN
    v_new_status_id := 1; -- Active
  ELSIF NEW.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN
    v_new_status_id := 7; -- Grace Period
  ELSE
    -- Would normally be Expired (2). Suspend that transition until cut-off:
    -- keep the member in Grace Period (7) instead.
    IF CURRENT_DATE <= v_expired_suspend_until THEN
      v_new_status_id := 7; -- Grace Period (suspension active)
    ELSE
      v_new_status_id := 2; -- Expired (suspension lifted)
    END IF;
  END IF;

  IF NEW.membership_status_id IS DISTINCT FROM v_new_status_id THEN
    NEW.membership_status_id := v_new_status_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_auto_update_membership_status
  BEFORE INSERT OR UPDATE OF expiry_date, membership_status_id
  ON members_consolidated
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_update_membership_status();

COMMENT ON TRIGGER tr_auto_update_membership_status ON members_consolidated IS
'Auto-updates membership_status_id based on expiry_date. The "→ Expired" branch is suspended until 2026-11-30 (inclusive); affected rows are kept in Grace Period until then. Manual statuses (Suspended, Cancelled, Pending) are never overridden.';

COMMENT ON FUNCTION fn_auto_update_membership_status() IS
'Trigger function for membership status auto-update. Rules: Active (>=today), Grace Period (0-90 days past expiry), Expired (>90 days past expiry, but suspended until 2026-11-30), Inactive (null expiry).';

-- ----------------------------------------------------------------------------
-- One-off cleanup: any row currently sitting in Expired (2) whose expiry is
-- more than 90 days ago is moved back to Grace Period (7) for the duration of
-- the suspension. We only touch rows that the trigger itself would manage
-- (i.e. NOT in Suspended/Cancelled/Pending). After 2026-11-30 the regular
-- cron job / next update will move them back to Expired.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_moved INT := 0;
BEGIN
  IF CURRENT_DATE <= DATE '2026-11-30' THEN
    UPDATE members_consolidated
    SET membership_status_id = 7,
        updated_at = CURRENT_TIMESTAMP
    WHERE membership_status_id = 2
      AND expiry_date IS NOT NULL
      AND expiry_date < CURRENT_DATE - INTERVAL '90 days';
    GET DIAGNOSTICS v_moved = ROW_COUNT;
    RAISE NOTICE 'Moved % previously-Expired rows back to Grace Period for the suspension window.', v_moved;
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE '✅ Membership status trigger updated: "→ Expired" suspended until 2026-11-30 (inclusive).';
END $$;
