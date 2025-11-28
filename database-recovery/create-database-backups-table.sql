-- Database Backups Table
-- Stores information about database backups

CREATE TABLE IF NOT EXISTS database_backups (
  backup_id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  filepath TEXT NOT NULL,
  size BIGINT DEFAULT 0,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'in_progress')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  created_by INTEGER REFERENCES users(user_id),
  
  -- Indexes
  CONSTRAINT idx_backups_status CHECK (status IN ('success', 'failed', 'in_progress'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_database_backups_status ON database_backups(status);
CREATE INDEX IF NOT EXISTS idx_database_backups_created_at ON database_backups(created_at DESC);

-- Add comment
COMMENT ON TABLE database_backups IS 'Stores information about database backups';
COMMENT ON COLUMN database_backups.filename IS 'Backup file name';
COMMENT ON COLUMN database_backups.filepath IS 'Full path to backup file';
COMMENT ON COLUMN database_backups.size IS 'Backup file size in bytes';
COMMENT ON COLUMN database_backups.status IS 'Backup status: success, failed, in_progress';
COMMENT ON COLUMN database_backups.created_at IS 'When backup was started';
COMMENT ON COLUMN database_backups.completed_at IS 'When backup was completed';
COMMENT ON COLUMN database_backups.error_message IS 'Error message if backup failed';

