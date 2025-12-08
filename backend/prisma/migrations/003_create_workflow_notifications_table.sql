-- Migration: Create workflow_notifications table
-- Date: 2025-10-21
-- Purpose: Store notifications for workflow transitions

CREATE TABLE IF NOT EXISTS workflow_notifications (
    id SERIAL PRIMARY KEY,
    application_id INT REFERENCES membership_applications(application_id) ON DELETE CASCADE,
    renewal_id INT REFERENCES membership_renewals(renewal_id) ON DELETE CASCADE,
    from_user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    to_role VARCHAR(50) NOT NULL,
    notification_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_to_role CHECK (to_role IN ('financial_reviewer', 'membership_approver', 'system', 'admin', 'member')),
    CONSTRAINT chk_notification_type CHECK (notification_type IN (
        'financial_review_required', 'financial_approved', 'financial_rejected',
        'final_review_required', 'final_approved', 'final_rejected',
        'payment_received', 'document_required', 'status_update',
        'workflow_transition', 'system_notification'
    )),
    -- At least one of application_id or renewal_id must be set
    CONSTRAINT chk_notification_entity_id CHECK (
        (application_id IS NOT NULL AND renewal_id IS NULL) OR
        (application_id IS NULL AND renewal_id IS NOT NULL)
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_application_id ON workflow_notifications(application_id);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_renewal_id ON workflow_notifications(renewal_id);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_from_user_id ON workflow_notifications(from_user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_to_role ON workflow_notifications(to_role);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_is_read ON workflow_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_created_at ON workflow_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_notification_type ON workflow_notifications(notification_type);

-- Add comments
COMMENT ON TABLE workflow_notifications IS 'Notifications for workflow transitions and actions';
COMMENT ON COLUMN workflow_notifications.application_id IS 'Foreign key to membership_applications (nullable)';
COMMENT ON COLUMN workflow_notifications.renewal_id IS 'Foreign key to membership_renewals (nullable)';
COMMENT ON COLUMN workflow_notifications.from_user_id IS 'User who triggered the notification';
COMMENT ON COLUMN workflow_notifications.to_role IS 'Target role for the notification';
COMMENT ON COLUMN workflow_notifications.notification_type IS 'Type of notification';
COMMENT ON COLUMN workflow_notifications.title IS 'Notification title';
COMMENT ON COLUMN workflow_notifications.message IS 'Notification message';
COMMENT ON COLUMN workflow_notifications.is_read IS 'Whether the notification has been read';
COMMENT ON COLUMN workflow_notifications.read_at IS 'Timestamp when notification was read';

