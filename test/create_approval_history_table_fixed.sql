-- Create application_approval_history table with correct foreign key
-- This table tracks approval/rejection actions on membership applications

CREATE TABLE IF NOT EXISTS application_approval_history (
    id SERIAL PRIMARY KEY,
    application_id INT NOT NULL,
    member_id INT NULL,
    action VARCHAR(50) CHECK (action IN ('approved', 'rejected', 'under_review')) NOT NULL,
    performed_by INT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys - FIXED to reference members_consolidated
    FOREIGN KEY (application_id) REFERENCES membership_applications(application_id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE SET NULL,
    FOREIGN KEY (performed_by) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_application_history_application ON application_approval_history(application_id);
CREATE INDEX IF NOT EXISTS idx_application_history_member ON application_approval_history(member_id);
CREATE INDEX IF NOT EXISTS idx_application_history_performed_by ON application_approval_history(performed_by);
CREATE INDEX IF NOT EXISTS idx_application_history_action ON application_approval_history(action);
CREATE INDEX IF NOT EXISTS idx_application_history_created_at ON application_approval_history(created_at);

-- Add comment
COMMENT ON TABLE application_approval_history IS 'Tracks all approval/rejection actions on membership applications. References members_consolidated for member_id.';

SELECT '✅ application_approval_history table created successfully with correct foreign keys' as result;

