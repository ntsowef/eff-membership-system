-- =====================================================
-- Bulk Upload Logging Tables Migration
-- =====================================================
-- Creates tables for comprehensive logging and audit trail
-- of bulk upload operations
-- =====================================================

-- 1. Bulk Upload Logs Table
-- Stores detailed logs of all bulk upload actions
CREATE TABLE IF NOT EXISTS bulk_upload_logs (
    id SERIAL PRIMARY KEY,
    job_id VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    user_id VARCHAR(50),
    user_email VARCHAR(255),
    file_name VARCHAR(255),
    file_size BIGINT,
    stage VARCHAR(50),
    progress INTEGER CHECK (progress >= 0 AND progress <= 100),
    status VARCHAR(50),
    error_message TEXT,
    validation_stats JSONB,
    database_stats JSONB,
    processing_duration_ms INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for bulk_upload_logs
CREATE INDEX IF NOT EXISTS idx_bulk_upload_logs_job_id ON bulk_upload_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_bulk_upload_logs_action ON bulk_upload_logs(action);
CREATE INDEX IF NOT EXISTS idx_bulk_upload_logs_user_id ON bulk_upload_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_bulk_upload_logs_status ON bulk_upload_logs(status);
CREATE INDEX IF NOT EXISTS idx_bulk_upload_logs_created_at ON bulk_upload_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulk_upload_logs_user_email ON bulk_upload_logs(user_email);

-- 2. Bulk Upload Performance Metrics Table
-- Stores performance metrics for analysis and optimization
CREATE TABLE IF NOT EXISTS bulk_upload_performance_metrics (
    id SERIAL PRIMARY KEY,
    job_id VARCHAR(100) NOT NULL UNIQUE,
    file_size_bytes BIGINT NOT NULL,
    total_rows INTEGER NOT NULL,
    valid_rows INTEGER NOT NULL,
    invalid_rows INTEGER NOT NULL,
    processing_duration_ms INTEGER NOT NULL,
    file_reading_ms INTEGER,
    validation_ms INTEGER,
    iec_verification_ms INTEGER,
    database_operations_ms INTEGER,
    report_generation_ms INTEGER,
    throughput_rows_per_second DECIMAL(10, 2),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for bulk_upload_performance_metrics
CREATE INDEX IF NOT EXISTS idx_bulk_upload_perf_job_id ON bulk_upload_performance_metrics(job_id);
CREATE INDEX IF NOT EXISTS idx_bulk_upload_perf_recorded_at ON bulk_upload_performance_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulk_upload_perf_throughput ON bulk_upload_performance_metrics(throughput_rows_per_second DESC);

-- 3. Comments for documentation
COMMENT ON TABLE bulk_upload_logs IS 'Comprehensive audit trail for all bulk upload operations';
COMMENT ON COLUMN bulk_upload_logs.job_id IS 'Unique job identifier';
COMMENT ON COLUMN bulk_upload_logs.action IS 'Action type (e.g., file_uploaded, processing_started)';
COMMENT ON COLUMN bulk_upload_logs.user_id IS 'User ID who performed the action';
COMMENT ON COLUMN bulk_upload_logs.user_email IS 'Email of user who performed the action';
COMMENT ON COLUMN bulk_upload_logs.file_name IS 'Name of the uploaded file';
COMMENT ON COLUMN bulk_upload_logs.file_size IS 'Size of the file in bytes';
COMMENT ON COLUMN bulk_upload_logs.stage IS 'Processing stage (e.g., file_reading, validation)';
COMMENT ON COLUMN bulk_upload_logs.progress IS 'Progress percentage (0-100)';
COMMENT ON COLUMN bulk_upload_logs.status IS 'Current status (pending, processing, completed, failed)';
COMMENT ON COLUMN bulk_upload_logs.error_message IS 'Error message if action failed';
COMMENT ON COLUMN bulk_upload_logs.validation_stats IS 'JSON object with validation statistics';
COMMENT ON COLUMN bulk_upload_logs.database_stats IS 'JSON object with database operation statistics';
COMMENT ON COLUMN bulk_upload_logs.processing_duration_ms IS 'Total processing duration in milliseconds';
COMMENT ON COLUMN bulk_upload_logs.ip_address IS 'IP address of the client';
COMMENT ON COLUMN bulk_upload_logs.user_agent IS 'User agent string from the request';
COMMENT ON COLUMN bulk_upload_logs.metadata IS 'Additional metadata as JSON';

COMMENT ON TABLE bulk_upload_performance_metrics IS 'Performance metrics for bulk upload operations';
COMMENT ON COLUMN bulk_upload_performance_metrics.job_id IS 'Unique job identifier';
COMMENT ON COLUMN bulk_upload_performance_metrics.file_size_bytes IS 'Size of the processed file in bytes';
COMMENT ON COLUMN bulk_upload_performance_metrics.total_rows IS 'Total number of rows in the file';
COMMENT ON COLUMN bulk_upload_performance_metrics.valid_rows IS 'Number of valid rows';
COMMENT ON COLUMN bulk_upload_performance_metrics.invalid_rows IS 'Number of invalid rows';
COMMENT ON COLUMN bulk_upload_performance_metrics.processing_duration_ms IS 'Total processing time in milliseconds';
COMMENT ON COLUMN bulk_upload_performance_metrics.file_reading_ms IS 'Time spent reading file';
COMMENT ON COLUMN bulk_upload_performance_metrics.validation_ms IS 'Time spent on validation';
COMMENT ON COLUMN bulk_upload_performance_metrics.iec_verification_ms IS 'Time spent on IEC verification';
COMMENT ON COLUMN bulk_upload_performance_metrics.database_operations_ms IS 'Time spent on database operations';
COMMENT ON COLUMN bulk_upload_performance_metrics.report_generation_ms IS 'Time spent generating report';
COMMENT ON COLUMN bulk_upload_performance_metrics.throughput_rows_per_second IS 'Processing throughput (rows per second)';

-- 4. Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT ON bulk_upload_logs TO your_app_user;
-- GRANT SELECT, INSERT ON bulk_upload_performance_metrics TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE bulk_upload_logs_id_seq TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE bulk_upload_performance_metrics_id_seq TO your_app_user;

-- 5. Sample queries for monitoring

-- Get recent logs
-- SELECT * FROM bulk_upload_logs ORDER BY created_at DESC LIMIT 100;

-- Get logs for specific job
-- SELECT * FROM bulk_upload_logs WHERE job_id = 'job-123' ORDER BY created_at ASC;

-- Get failed uploads
-- SELECT * FROM bulk_upload_logs WHERE status = 'failed' ORDER BY created_at DESC;

-- Get performance metrics
-- SELECT 
--   job_id,
--   file_size_bytes / 1024 / 1024 AS file_size_mb,
--   total_rows,
--   processing_duration_ms / 1000.0 AS processing_seconds,
--   throughput_rows_per_second
-- FROM bulk_upload_performance_metrics
-- ORDER BY recorded_at DESC
-- LIMIT 20;

-- Get average processing time by file size
-- SELECT 
--   CASE 
--     WHEN file_size_bytes < 1048576 THEN '< 1MB'
--     WHEN file_size_bytes < 10485760 THEN '1-10MB'
--     WHEN file_size_bytes < 52428800 THEN '10-50MB'
--     ELSE '> 50MB'
--   END AS file_size_range,
--   COUNT(*) AS count,
--   AVG(processing_duration_ms / 1000.0) AS avg_processing_seconds,
--   AVG(throughput_rows_per_second) AS avg_throughput
-- FROM bulk_upload_performance_metrics
-- GROUP BY file_size_range
-- ORDER BY MIN(file_size_bytes);

-- Get user activity summary
-- SELECT 
--   user_email,
--   COUNT(*) AS total_uploads,
--   COUNT(CASE WHEN status = 'completed' THEN 1 END) AS successful,
--   COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed,
--   MAX(created_at) AS last_upload
-- FROM bulk_upload_logs
-- WHERE action = 'bulk_upload.file_uploaded'
-- GROUP BY user_email
-- ORDER BY total_uploads DESC;

-- =====================================================
-- Migration Complete
-- =====================================================

