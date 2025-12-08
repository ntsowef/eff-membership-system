-- Migration: Create bulk_upload_jobs table
-- Description: Store bulk upload job history and results
-- Date: 2025-11-25

CREATE TABLE IF NOT EXISTS bulk_upload_jobs (
  job_id VARCHAR(100) PRIMARY KEY,
  file_name VARCHAR(255) NOT NULL,
  uploaded_by VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processing_start TIMESTAMP,
  processing_end TIMESTAMP,
  processing_duration_ms INTEGER,
  validation_stats JSONB,
  database_stats JSONB,
  report_path TEXT,
  report_filename VARCHAR(255),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bulk_upload_jobs_uploaded_by ON bulk_upload_jobs(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_bulk_upload_jobs_status ON bulk_upload_jobs(status);
CREATE INDEX IF NOT EXISTS idx_bulk_upload_jobs_uploaded_at ON bulk_upload_jobs(uploaded_at DESC);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bulk_upload_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bulk_upload_jobs_updated_at
  BEFORE UPDATE ON bulk_upload_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_bulk_upload_jobs_updated_at();

-- Add comments for documentation
COMMENT ON TABLE bulk_upload_jobs IS 'Stores bulk member upload job history and results';
COMMENT ON COLUMN bulk_upload_jobs.job_id IS 'Unique job identifier';
COMMENT ON COLUMN bulk_upload_jobs.file_name IS 'Original uploaded file name';
COMMENT ON COLUMN bulk_upload_jobs.uploaded_by IS 'Email of user who uploaded the file';
COMMENT ON COLUMN bulk_upload_jobs.status IS 'Job status: pending, processing, completed, failed, cancelled';
COMMENT ON COLUMN bulk_upload_jobs.validation_stats IS 'JSON object with validation statistics';
COMMENT ON COLUMN bulk_upload_jobs.database_stats IS 'JSON object with database operation statistics';
COMMENT ON COLUMN bulk_upload_jobs.report_path IS 'Full path to generated Excel report';
COMMENT ON COLUMN bulk_upload_jobs.report_filename IS 'Generated report filename';

