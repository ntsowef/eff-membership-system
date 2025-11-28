-- Migration 025: Meeting Status Management Enhancements
-- Purpose: Add soft delete, postponement tracking, cancellation tracking, and status history
-- Date: 2025-09-30

-- ============================================================================
-- 1. Add soft delete and status tracking columns to meetings table
-- ============================================================================

ALTER TABLE meetings 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS postponement_reason TEXT NULL,
ADD COLUMN IF NOT EXISTS original_meeting_date DATE NULL,
ADD COLUMN IF NOT EXISTS original_meeting_time TIME NULL,
ADD COLUMN IF NOT EXISTS postponed_by INT NULL,
ADD COLUMN IF NOT EXISTS postponed_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT NULL,
ADD COLUMN IF NOT EXISTS cancelled_by INT NULL,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP NULL;

-- Add foreign key constraints (skip if users table doesn't have proper constraints)
DO $$
BEGIN
  -- Check if users table exists and has id column
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'users'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'id'
  ) THEN
    -- Add foreign key for postponed_by
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_meetings_postponed_by'
    ) THEN
      ALTER TABLE meetings
      ADD CONSTRAINT fk_meetings_postponed_by
        FOREIGN KEY (postponed_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    -- Add foreign key for cancelled_by
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_meetings_cancelled_by'
    ) THEN
      ALTER TABLE meetings
      ADD CONSTRAINT fk_meetings_cancelled_by
        FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_meetings_deleted_at ON meetings(deleted_at);
CREATE INDEX IF NOT EXISTS idx_meetings_postponed_at ON meetings(postponed_at);
CREATE INDEX IF NOT EXISTS idx_meetings_cancelled_at ON meetings(cancelled_at);
CREATE INDEX IF NOT EXISTS idx_meetings_status_date ON meetings(meeting_status, meeting_date);

-- ============================================================================
-- 2. Create meeting_status_history table
-- ============================================================================

-- Drop table if exists to recreate with proper structure
DROP TABLE IF EXISTS meeting_status_history CASCADE;

CREATE TABLE meeting_status_history (
  id SERIAL PRIMARY KEY,
  meeting_id INT NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  reason TEXT,
  changed_by INT NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,

  CONSTRAINT fk_status_history_meeting
    FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id) ON DELETE CASCADE
);

-- Add indexes for status history
CREATE INDEX IF NOT EXISTS idx_meeting_status_history_meeting ON meeting_status_history(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_status_history_changed_at ON meeting_status_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_meeting_status_history_new_status ON meeting_status_history(new_status);

-- Add comment
COMMENT ON TABLE meeting_status_history IS 'Tracks all status changes for meetings including automatic and manual updates';

-- ============================================================================
-- 3. Update meeting_status check constraint to include all statuses
-- ============================================================================

-- Drop existing constraint if it exists
ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_meeting_status_check;

-- Add updated constraint with all statuses
ALTER TABLE meetings
ADD CONSTRAINT meetings_meeting_status_check 
  CHECK (meeting_status IN ('Draft', 'Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Postponed'));

-- ============================================================================
-- 4. Create view for active meetings (excluding deleted)
-- ============================================================================

CREATE OR REPLACE VIEW vw_active_meetings AS
SELECT 
  m.*,
  u.name as creator_name,
  CASE 
    WHEN m.hierarchy_level = 'Province' THEN p.province_name
    WHEN m.hierarchy_level = 'Region' THEN d.district_name
    WHEN m.hierarchy_level = 'Municipality' THEN mu.municipality_name
    WHEN m.hierarchy_level = 'Ward' THEN w.ward_name
    ELSE 'National'
  END as entity_name,
  mt.type_name,
  COALESCE(attendance_stats.attendee_count, 0) as attendee_count,
  COALESCE(attendance_stats.present_count, 0) as present_count,
  COALESCE(attendance_stats.absent_count, 0) as absent_count,
  COALESCE(attendance_stats.excused_count, 0) as excused_count,
  COALESCE(attendance_stats.late_count, 0) as late_count
FROM meetings m
LEFT JOIN users u ON m.created_by = u.id
LEFT JOIN provinces p ON m.hierarchy_level = 'Province' AND m.entity_id = p.province_id
LEFT JOIN districts d ON m.hierarchy_level = 'Region' AND m.entity_id = d.district_id
LEFT JOIN municipalities mu ON m.hierarchy_level = 'Municipality' AND m.entity_id = mu.municipality_id
LEFT JOIN wards w ON m.hierarchy_level = 'Ward' AND m.entity_id = w.ward_id
LEFT JOIN meeting_types mt ON m.meeting_type_id = mt.type_id
LEFT JOIN (
  SELECT 
    meeting_id,
    COUNT(*) as attendee_count,
    SUM(CASE WHEN attendance_status = 'Present' THEN 1 ELSE 0 END) as present_count,
    SUM(CASE WHEN attendance_status = 'Absent' THEN 1 ELSE 0 END) as absent_count,
    SUM(CASE WHEN attendance_status = 'Excused' THEN 1 ELSE 0 END) as excused_count,
    SUM(CASE WHEN attendance_status = 'Late' THEN 1 ELSE 0 END) as late_count
  FROM meeting_attendance
  GROUP BY meeting_id
) attendance_stats ON m.meeting_id = attendance_stats.meeting_id
WHERE m.deleted_at IS NULL;

COMMENT ON VIEW vw_active_meetings IS 'View of all non-deleted meetings with related information';

-- ============================================================================
-- 5. Create function to automatically log status changes
-- ============================================================================

CREATE OR REPLACE FUNCTION log_meeting_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.meeting_status IS DISTINCT FROM NEW.meeting_status THEN
    INSERT INTO meeting_status_history (
      meeting_id,
      old_status,
      new_status,
      reason,
      changed_by,
      changed_at
    ) VALUES (
      NEW.meeting_id,
      OLD.meeting_status,
      NEW.meeting_status,
      CASE 
        WHEN NEW.meeting_status = 'Postponed' THEN NEW.postponement_reason
        WHEN NEW.meeting_status = 'Cancelled' THEN NEW.cancellation_reason
        ELSE 'Status updated'
      END,
      COALESCE(NEW.postponed_by, NEW.cancelled_by, NEW.created_by),
      CURRENT_TIMESTAMP
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_meeting_status_change ON meetings;
CREATE TRIGGER trg_meeting_status_change
  AFTER UPDATE ON meetings
  FOR EACH ROW
  WHEN (OLD.meeting_status IS DISTINCT FROM NEW.meeting_status)
  EXECUTE FUNCTION log_meeting_status_change();

COMMENT ON FUNCTION log_meeting_status_change() IS 'Automatically logs meeting status changes to history table';

-- ============================================================================
-- 6. Create function to check and update meeting statuses
-- ============================================================================

CREATE OR REPLACE FUNCTION update_meeting_statuses()
RETURNS TABLE(meeting_id INT, old_status VARCHAR, new_status VARCHAR) AS $$
BEGIN
  RETURN QUERY
  WITH status_updates AS (
    SELECT 
      m.meeting_id,
      m.meeting_status as old_status,
      CASE
        -- If meeting end time has passed, mark as Completed
        WHEN CURRENT_TIMESTAMP > (m.meeting_date + COALESCE(m.end_time, m.meeting_time + (m.duration_minutes || ' minutes')::INTERVAL))
          AND m.meeting_status IN ('Scheduled', 'In Progress')
        THEN 'Completed'
        
        -- If meeting start time has passed but not end time, mark as In Progress
        WHEN CURRENT_TIMESTAMP >= (m.meeting_date + m.meeting_time)
          AND CURRENT_TIMESTAMP <= (m.meeting_date + COALESCE(m.end_time, m.meeting_time + (m.duration_minutes || ' minutes')::INTERVAL))
          AND m.meeting_status = 'Scheduled'
        THEN 'In Progress'
        
        ELSE m.meeting_status
      END as new_status
    FROM meetings m
    WHERE m.deleted_at IS NULL
      AND m.meeting_status IN ('Scheduled', 'In Progress')
      AND m.meeting_date <= CURRENT_DATE + INTERVAL '1 day'
  )
  UPDATE meetings m
  SET 
    meeting_status = su.new_status,
    updated_at = CURRENT_TIMESTAMP
  FROM status_updates su
  WHERE m.meeting_id = su.meeting_id
    AND su.old_status != su.new_status
  RETURNING m.meeting_id, su.old_status::VARCHAR, su.new_status::VARCHAR;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_meeting_statuses() IS 'Batch updates meeting statuses based on current date/time';

-- ============================================================================
-- 7. Create indexes for foreign key relationships to improve delete performance
-- ============================================================================

-- Indexes for meeting_invitations
CREATE INDEX IF NOT EXISTS idx_meeting_invitations_meeting_id ON meeting_invitations(meeting_id);

-- Indexes for meeting_attendance
CREATE INDEX IF NOT EXISTS idx_meeting_attendance_meeting_id ON meeting_attendance(meeting_id);

-- Indexes for meeting_documents (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meeting_documents') THEN
    CREATE INDEX IF NOT EXISTS idx_meeting_documents_meeting_id ON meeting_documents(meeting_id);
  END IF;
END $$;

-- Indexes for meeting_notifications (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meeting_notifications') THEN
    CREATE INDEX IF NOT EXISTS idx_meeting_notifications_meeting_id ON meeting_notifications(meeting_id);
  END IF;
END $$;

-- ============================================================================
-- 8. Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN meetings.deleted_at IS 'Soft delete timestamp - NULL means not deleted';
COMMENT ON COLUMN meetings.postponement_reason IS 'Reason for postponing the meeting';
COMMENT ON COLUMN meetings.original_meeting_date IS 'Original date before postponement';
COMMENT ON COLUMN meetings.original_meeting_time IS 'Original time before postponement';
COMMENT ON COLUMN meetings.postponed_by IS 'User who postponed the meeting';
COMMENT ON COLUMN meetings.postponed_at IS 'Timestamp when meeting was postponed';
COMMENT ON COLUMN meetings.cancellation_reason IS 'Reason for cancelling the meeting';
COMMENT ON COLUMN meetings.cancelled_by IS 'User who cancelled the meeting';
COMMENT ON COLUMN meetings.cancelled_at IS 'Timestamp when meeting was cancelled';

-- ============================================================================
-- 9. Grant permissions (adjust as needed for your user roles)
-- ============================================================================

-- Grant permissions on new table
GRANT SELECT, INSERT ON meeting_status_history TO eff_admin;
GRANT USAGE, SELECT ON SEQUENCE meeting_status_history_id_seq TO eff_admin;

-- Grant permissions on view
GRANT SELECT ON vw_active_meetings TO eff_admin;

-- ============================================================================
-- 10. Insert initial status history for existing meetings
-- ============================================================================

INSERT INTO meeting_status_history (meeting_id, old_status, new_status, reason, changed_by, changed_at)
SELECT 
  meeting_id,
  NULL,
  meeting_status,
  'Initial status from migration',
  created_by,
  created_at
FROM meetings
WHERE deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 025 completed successfully';
  RAISE NOTICE 'Added soft delete support to meetings table';
  RAISE NOTICE 'Added postponement and cancellation tracking';
  RAISE NOTICE 'Created meeting_status_history table';
  RAISE NOTICE 'Created automatic status update function';
  RAISE NOTICE 'Created trigger for automatic status logging';
END $$;

