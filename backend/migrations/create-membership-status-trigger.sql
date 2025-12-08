-- ============================================================================
-- Membership Status Automation Trigger
-- ============================================================================

-- ============================================================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS tr_auto_update_membership_status ON members_consolidated;
DROP FUNCTION IF EXISTS fn_auto_update_membership_status();

-- Create the trigger function
CREATE OR REPLACE FUNCTION fn_auto_update_membership_status()
RETURNS TRIGGER AS $$
DECLARE
  v_new_status_id INT;
BEGIN
  -- Only auto-update if the status is not manually set to Suspended, Cancelled, or Pending
  -- These statuses should be manually managed and not overridden by the trigger
  IF NEW.membership_status_id IN (3, 4, 5) THEN
    -- Don't override manual status changes
    RETURN NEW;
  END IF;

  -- Calculate the appropriate status based on expiry_date
  IF NEW.expiry_date IS NULL THEN
    -- No expiry date: set to Inactive
    v_new_status_id := 6; -- Inactive
  ELSIF NEW.expiry_date >= CURRENT_DATE THEN
    -- Expiry date is in the future or today: Active
    v_new_status_id := 1; -- Active
  ELSIF NEW.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN
    -- Expiry date is within the last 90 days: Grace Period
    v_new_status_id := 7; -- Grace Period
  ELSE
    -- Expiry date is more than 90 days ago: Expired
    v_new_status_id := 2; -- Expired
  END IF;

  -- Only update if the status has changed
  IF NEW.membership_status_id IS DISTINCT FROM v_new_status_id THEN
    -- Update the status
    NEW.membership_status_id := v_new_status_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER tr_auto_update_membership_status
  BEFORE INSERT OR UPDATE OF expiry_date, membership_status_id
  ON members_consolidated
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_update_membership_status();

-- Add comment to the trigger
COMMENT ON TRIGGER tr_auto_update_membership_status ON members_consolidated IS
'Automatically updates membership_status_id based on expiry_date. Does not override manual statuses (Suspended, Cancelled, Pending).';

COMMENT ON FUNCTION fn_auto_update_membership_status() IS
'Trigger function to auto-update membership status based on expiry date. Business rules: Active (>=today), Grace Period (0-90 days past), Expired (>90 days past), Inactive (null).';

-- Display success message
DO $$
BEGIN
  RAISE NOTICE '✅ Membership status automation trigger created successfully!';
  RAISE NOTICE '   - Trigger: tr_auto_update_membership_status';
  RAISE NOTICE '   - Function: fn_auto_update_membership_status()';
  RAISE NOTICE '   - Table: members_consolidated';
  RAISE NOTICE '   - Fires on: INSERT or UPDATE of expiry_date or membership_status_id';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Business Rules:';
  RAISE NOTICE '   - Active (1): expiry_date >= CURRENT_DATE';
  RAISE NOTICE '   - Grace Period (7): expiry_date between CURRENT_DATE-90 days and CURRENT_DATE';
  RAISE NOTICE '   - Expired (2): expiry_date < CURRENT_DATE-90 days';
  RAISE NOTICE '   - Inactive (6): expiry_date IS NULL';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Note: Does NOT override Suspended (3), Cancelled (4), or Pending (5) statuses';
END $$;

