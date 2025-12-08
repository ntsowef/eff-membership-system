# BULK UPLOAD LOGGING SYSTEM - COMPREHENSIVE GUIDE

## 📋 OVERVIEW

The Bulk Upload Logging System provides comprehensive audit trail and performance tracking for all bulk upload operations.

**Key Features:**
- ✅ Dual logging (audit_logs + bulk_upload_logs)
- ✅ Performance metrics tracking
- ✅ Real-time progress logging
- ✅ Error tracking and reporting
- ✅ User action audit trail
- ✅ IP address and user agent tracking
- ✅ Log retention and cleanup

---

## 🗄️ DATABASE SCHEMA

### Table: `bulk_upload_logs`

Stores detailed logs of all bulk upload actions.

```sql
CREATE TABLE bulk_upload_logs (
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
```

**Indexes:**
- `idx_bulk_upload_logs_job_id` - Fast job lookup
- `idx_bulk_upload_logs_action` - Filter by action type
- `idx_bulk_upload_logs_user_id` - User activity tracking
- `idx_bulk_upload_logs_status` - Filter by status
- `idx_bulk_upload_logs_created_at` - Time-based queries
- `idx_bulk_upload_logs_user_email` - Email-based queries

---

### Table: `bulk_upload_performance_metrics`

Stores performance metrics for analysis and optimization.

```sql
CREATE TABLE bulk_upload_performance_metrics (
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
```

**Indexes:**
- `idx_bulk_upload_perf_job_id` - Fast job lookup
- `idx_bulk_upload_perf_recorded_at` - Time-based queries
- `idx_bulk_upload_perf_throughput` - Performance analysis

---

## 📝 ACTION TYPES

### 1. `bulk_upload.file_uploaded`
File uploaded via REST API

**Logged Data:**
- Job ID
- File name and size
- User ID and email
- IP address and user agent
- Timestamp

**Example:**
```typescript
await BulkUploadLogger.logFileUpload(
  'job-123',
  'members.xlsx',
  1048576,
  'admin@example.com',
  '1',
  req
);
```

---

### 2. `bulk_upload.file_detected`
File detected by file monitor

**Logged Data:**
- Job ID
- File name and size
- Watch directory
- Timestamp

**Example:**
```typescript
await BulkUploadLogger.logFileDetection(
  'job-123',
  'members.xlsx',
  1048576,
  '/path/to/watch/dir'
);
```

---

### 3. `bulk_upload.processing_started`
Processing started

**Logged Data:**
- Job ID
- File name
- User ID
- Timestamp

**Example:**
```typescript
await BulkUploadLogger.logProcessingStarted(
  'job-123',
  'members.xlsx',
  '1'
);
```

---

### 4. `bulk_upload.processing_stage`
Processing stage update

**Logged Data:**
- Job ID
- Stage name (file_reading, validation, etc.)
- Progress (0-100%)
- Message
- Timestamp

**Example:**
```typescript
await BulkUploadLogger.logProcessingStage(
  'job-123',
  'file_reading',
  15,
  'Reading Excel file...'
);
```

---

### 5. `bulk_upload.processing_completed`
Processing completed successfully

**Logged Data:**
- Job ID
- File name
- User ID
- Validation stats (JSONB)
- Database stats (JSONB)
- Processing duration (ms)
- Timestamp

**Example:**
```typescript
await BulkUploadLogger.logProcessingCompleted(
  'job-123',
  'members.xlsx',
  '1',
  { total_records: 1000, valid_ids: 950, invalid_ids: 50 },
  { inserts: 800, updates: 150, errors: 0 },
  5000
);
```

---

### 6. `bulk_upload.processing_failed`
Processing failed

**Logged Data:**
- Job ID
- File name
- User ID
- Stage where failure occurred
- Error message
- Timestamp

**Example:**
```typescript
await BulkUploadLogger.logProcessingFailed(
  'job-123',
  'members.xlsx',
  '1',
  'validation',
  'Invalid file format'
);
```

---

### 7. `bulk_upload.job_cancelled`
Job cancelled by user

**Logged Data:**
- Job ID
- User ID and email
- IP address and user agent
- Timestamp

**Example:**
```typescript
await BulkUploadLogger.logJobCancelled(
  'job-123',
  '1',
  'admin@example.com',
  req
);
```

---

### 8. `bulk_upload.job_retried`
Job retried by user

**Logged Data:**
- Job ID
- User ID and email
- IP address and user agent
- Timestamp

**Example:**
```typescript
await BulkUploadLogger.logJobRetried(
  'job-123',
  '1',
  'admin@example.com',
  req
);
```

---

### 9. `bulk_upload.report_downloaded`
Report downloaded by user

**Logged Data:**
- Job ID
- User ID and email
- Report path
- IP address and user agent
- Timestamp

**Example:**
```typescript
await BulkUploadLogger.logReportDownloaded(
  'job-123',
  '1',
  'admin@example.com',
  '/reports/job-123.xlsx',
  req
);
```

---

### 10. `bulk_upload.file_validation_failed`
File validation failed

**Logged Data:**
- File name
- Validation error
- Timestamp

**Example:**
```typescript
await BulkUploadLogger.logFileValidationFailed(
  'members.xlsx',
  'File too large (max 50MB)'
);
```

---

### 11. `bulk_upload.duplicate_detected`
Duplicate file detected

**Logged Data:**
- File name
- Original job ID
- Timestamp

**Example:**
```typescript
await BulkUploadLogger.logDuplicateDetected(
  'members.xlsx',
  'job-123'
);
```

---

### 12. `bulk_upload.monitor_started`
File monitor started

**Logged Data:**
- User ID and email
- Watch directory
- IP address and user agent
- Timestamp

**Example:**
```typescript
await BulkUploadLogger.logMonitorStarted(
  '1',
  'admin@example.com',
  '/path/to/watch/dir',
  req
);
```

---

### 13. `bulk_upload.monitor_stopped`
File monitor stopped

**Logged Data:**
- User ID and email
- IP address and user agent
- Timestamp

**Example:**
```typescript
await BulkUploadLogger.logMonitorStopped(
  '1',
  'admin@example.com',
  req
);
```

---

### 14. `bulk_upload.queue_cleaned`
Queue cleaned

**Logged Data:**
- User ID and email
- Number of jobs removed
- IP address and user agent
- Timestamp

**Example:**
```typescript
await BulkUploadLogger.logQueueCleaned(
  '1',
  'admin@example.com',
  25,
  req
);
```

---

## 📊 PERFORMANCE METRICS

### Log Performance Metrics

```typescript
await BulkUploadLogger.logPerformanceMetrics({
  job_id: 'job-123',
  file_size_bytes: 1048576,
  total_rows: 1000,
  valid_rows: 950,
  invalid_rows: 50,
  processing_duration_ms: 5000,
  file_reading_ms: 500,
  validation_ms: 1500,
  iec_verification_ms: 2000,
  database_operations_ms: 800,
  report_generation_ms: 200,
  throughput_rows_per_second: 200
});
```

**Metrics Tracked:**
- File size (bytes)
- Row counts (total, valid, invalid)
- Processing duration (total and per stage)
- Throughput (rows/second)

---

## 🔍 QUERY METHODS

### Get Logs for Specific Job

```typescript
const logs = await BulkUploadLogger.getJobLogs('job-123');
```

**Returns:** Array of log entries for the job

---

### Get Recent Logs

```typescript
const logs = await BulkUploadLogger.getRecentLogs(100);
```

**Returns:** Last 100 log entries

---

### Get Logs by Action Type

```typescript
const logs = await BulkUploadLogger.getLogsByAction(
  BulkUploadAction.FILE_UPLOADED,
  50
);
```

**Returns:** Last 50 logs of specified action type

---

### Get Logs by User

```typescript
const logs = await BulkUploadLogger.getLogsByUser('1', 50);
```

**Returns:** Last 50 logs for specified user

---

### Clean Old Logs

```typescript
const deletedCount = await BulkUploadLogger.cleanOldLogs(90);
```

**Parameters:**
- `retentionDays` - Number of days to retain logs (default: 90)

**Returns:** Number of logs deleted

---

## 📈 SAMPLE QUERIES

### Get Upload Activity by User

```sql
SELECT 
  user_email,
  COUNT(*) AS total_uploads,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) AS successful,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed,
  MAX(created_at) AS last_upload
FROM bulk_upload_logs
WHERE action = 'bulk_upload.file_uploaded'
GROUP BY user_email
ORDER BY total_uploads DESC;
```

---

### Get Failed Uploads with Errors

```sql
SELECT 
  job_id,
  file_name,
  user_email,
  stage,
  error_message,
  created_at
FROM bulk_upload_logs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 50;
```

---

### Get Performance Metrics Summary

```sql
SELECT 
  COUNT(*) AS total_jobs,
  AVG(processing_duration_ms / 1000.0) AS avg_processing_seconds,
  AVG(throughput_rows_per_second) AS avg_throughput,
  MAX(throughput_rows_per_second) AS max_throughput,
  MIN(throughput_rows_per_second) AS min_throughput
FROM bulk_upload_performance_metrics
WHERE recorded_at >= NOW() - INTERVAL '7 days';
```

---

### Get Processing Time by File Size

```sql
SELECT 
  CASE 
    WHEN file_size_bytes < 1048576 THEN '< 1MB'
    WHEN file_size_bytes < 10485760 THEN '1-10MB'
    WHEN file_size_bytes < 52428800 THEN '10-50MB'
    ELSE '> 50MB'
  END AS file_size_range,
  COUNT(*) AS count,
  AVG(processing_duration_ms / 1000.0) AS avg_processing_seconds,
  AVG(throughput_rows_per_second) AS avg_throughput
FROM bulk_upload_performance_metrics
GROUP BY file_size_range
ORDER BY MIN(file_size_bytes);
```

---

### Get Daily Upload Statistics

```sql
SELECT 
  DATE(created_at) AS upload_date,
  COUNT(*) AS total_uploads,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) AS successful,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed,
  AVG(file_size) / 1024 / 1024 AS avg_file_size_mb
FROM bulk_upload_logs
WHERE action = 'bulk_upload.file_uploaded'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY upload_date DESC;
```

---

## 🔧 MAINTENANCE

### Log Retention

**Default:** 90 days

**Manual Cleanup:**
```typescript
// Clean logs older than 90 days
const deletedCount = await BulkUploadLogger.cleanOldLogs(90);
console.log(`Deleted ${deletedCount} old logs`);
```

**Automated Cleanup (Cron Job):**
```typescript
// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  const deletedCount = await BulkUploadLogger.cleanOldLogs(90);
  console.log(`[Cron] Deleted ${deletedCount} old bulk upload logs`);
});
```

---

### Database Maintenance

**Vacuum Tables:**
```sql
VACUUM ANALYZE bulk_upload_logs;
VACUUM ANALYZE bulk_upload_performance_metrics;
```

**Reindex Tables:**
```sql
REINDEX TABLE bulk_upload_logs;
REINDEX TABLE bulk_upload_performance_metrics;
```

---

## 🎯 BEST PRACTICES

### 1. **Always Log User Actions**
```typescript
// ✅ Good
await BulkUploadLogger.logFileUpload(jobId, fileName, fileSize, userEmail, userId, req);

// ❌ Bad
// No logging
```

### 2. **Log Processing Stages**
```typescript
// ✅ Good
progressCallback: (stage, progress, message) => {
  BulkUploadLogger.logProcessingStage(jobId, stage, progress, message);
}

// ❌ Bad
// No stage logging
```

### 3. **Log Errors with Context**
```typescript
// ✅ Good
await BulkUploadLogger.logProcessingFailed(jobId, fileName, userId, stage, error.message);

// ❌ Bad
console.error(error); // Only console log
```

### 4. **Log Performance Metrics**
```typescript
// ✅ Good
await BulkUploadLogger.logPerformanceMetrics({
  job_id: jobId,
  file_size_bytes: fileSize,
  total_rows: totalRows,
  processing_duration_ms: duration,
  throughput_rows_per_second: throughput
});

// ❌ Bad
// No performance tracking
```

### 5. **Don't Throw Errors in Logging**
```typescript
// ✅ Good (already implemented)
try {
  await logAudit(...);
  await createLogEntry(...);
} catch (error) {
  logger.error('Logging failed:', error.message);
  // Don't throw - logging failures shouldn't disrupt main operations
}
```

---

## 🚀 GETTING STARTED

### 1. Run Migration

```bash
# Option 1: Using ts-node
npx ts-node scripts/run-bulk-upload-logging-migration.ts

# Option 2: Using psql
psql -h localhost -U postgres -d eff_membership -f migrations/create_bulk_upload_logging_tables.sql
```

### 2. Verify Tables

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('bulk_upload_logs', 'bulk_upload_performance_metrics');
```

### 3. Test Logging

```typescript
import { BulkUploadLogger } from './services/bulk-upload/bulkUploadLogger';

// Log a test upload
await BulkUploadLogger.logFileUpload(
  'test-job-123',
  'test.xlsx',
  1024,
  'test@example.com',
  '1'
);

// Query logs
const logs = await BulkUploadLogger.getRecentLogs(10);
console.log(logs);
```

---

## 📞 SUPPORT

For issues or questions:
1. Check the completion report: `test/bulk-upload-poc/PHASE3_TASK3.6_COMPLETION_REPORT.md`
2. Review the logger service: `backend/src/services/bulk-upload/bulkUploadLogger.ts`
3. Check database schema: `backend/migrations/create_bulk_upload_logging_tables.sql`

---

**Last Updated:** 2025-11-25  
**Version:** 1.0.0

