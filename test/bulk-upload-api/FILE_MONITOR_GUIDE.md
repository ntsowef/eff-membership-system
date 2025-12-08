# Bulk Upload File Monitor Guide

## Overview

The bulk upload file monitor automatically watches a directory for new Excel files and queues them for processing. This enables:

- **Automatic file detection** - No manual upload required
- **Drop-and-go workflow** - Simply copy files to watch directory
- **Validation and filtering** - Only valid Excel files processed
- **Duplicate prevention** - Prevents processing same file twice
- **Error handling** - Failed files moved to failed/ directory
- **Real-time notifications** - WebSocket updates on file detection

---

## Quick Start

### 1. Enable File Monitor

Set environment variable:
```bash
BULK_UPLOAD_MONITOR_ENABLED=true
BULK_UPLOAD_WATCH_DIR=_bulk_upload_watch
```

### 2. Start Backend Server

The monitor starts automatically when the server starts:
```bash
npm run dev
```

### 3. Drop Files

Copy Excel files to the watch directory:
```bash
cp your-file.xlsx _bulk_upload_watch/
```

### 4. Monitor Progress

Files are automatically detected, validated, and queued for processing.

---

## Directory Structure

```
_bulk_upload_watch/
├── file1.xlsx              # Files to process
├── file2.xlsx
├── failed/                 # Failed files
│   ├── 1732550400000_invalid.xlsx
│   └── 1732550400000_invalid.xlsx.error.txt
├── processed/              # Optional: Processed files
└── archive/                # Optional: Archived files
```

---

## File Validation

### Accepted Files
- **Extensions:** `.xlsx`, `.xls`
- **Size:** 1KB - 50MB
- **Status:** Readable, not locked

### Rejected Files
- Non-Excel files (ignored)
- Files > 50MB (moved to failed/)
- Files < 1KB (moved to failed/)
- Duplicate files (moved to failed/)
- Unreadable files (moved to failed/)

### Duplicate Detection
- Checks for files with same name in last 24 hours
- Prevents accidental reprocessing
- Duplicate files moved to failed/ directory

---

## API Endpoints

### 1. Get Monitor Status
```http
GET /api/v1/bulk-upload/monitor/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isRunning": true,
    "watchDir": "C:/path/to/_bulk_upload_watch",
    "enabled": true
  }
}
```

### 2. Start Monitor
```http
POST /api/v1/bulk-upload/monitor/start
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "File monitor started successfully",
  "data": {
    "isRunning": true
  }
}
```

### 3. Stop Monitor
```http
POST /api/v1/bulk-upload/monitor/stop
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "File monitor stopped successfully",
  "data": {
    "isRunning": false
  }
}
```

### 4. Manually Process File
```http
POST /api/v1/bulk-upload/monitor/process
Authorization: Bearer <token>
Content-Type: application/json

{
  "fileName": "bulk-upload-sample.xlsx"
}
```

**Response:**
```json
{
  "success": true,
  "message": "File queued for processing",
  "data": {
    "job_id": "job-1732550400000-1234",
    "file_name": "bulk-upload-sample.xlsx"
  }
}
```

---

## Configuration

### Environment Variables

```bash
# Enable/disable file monitor
BULK_UPLOAD_MONITOR_ENABLED=true

# Watch directory path (relative to project root)
BULK_UPLOAD_WATCH_DIR=_bulk_upload_watch
```

### Monitor Settings

```typescript
{
  stabilityThreshold: 5000,  // Wait 5 seconds for file to stabilize
  pollInterval: 100,         // Check every 100ms
  filePatterns: ['*.xlsx', '*.xls'],
  ignorePatterns: [
    '**/.DS_Store',
    '**/Thumbs.db',
    '**/*~',
    '**/*.tmp',
    '**/~$*',           // Excel temp files
    '**/processed/**',
    '**/failed/**',
    '**/archive/**'
  ]
}
```

---

## Workflow

### Automatic Processing

1. **File Dropped**
   - User copies Excel file to watch directory
   - Monitor detects new file

2. **Stabilization**
   - Monitor waits 5 seconds for file to stabilize
   - Ensures file is fully written

3. **Validation**
   - Check file extension (.xlsx, .xls)
   - Check file size (1KB - 50MB)
   - Check file is readable
   - Check for duplicates (24-hour window)

4. **Queue**
   - Generate job ID
   - Add to Bull queue (priority: 5)
   - Create database record (status: 'pending')
   - Send WebSocket notification

5. **Processing**
   - Worker picks up job from queue
   - Processes file with BulkUploadOrchestrator
   - Sends real-time progress updates
   - Stores results in database

6. **Cleanup**
   - Worker deletes original file after processing
   - Report saved to reports/ directory

### Manual Processing

1. **Copy File**
   - Copy file to watch directory
   - Wait for file to stabilize

2. **Trigger Processing**
   ```bash
   curl -X POST http://localhost:5000/api/v1/bulk-upload/monitor/process \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"fileName": "your-file.xlsx"}'
   ```

3. **Monitor Progress**
   - Use WebSocket for real-time updates
   - Or poll job status endpoint

---

## Error Handling

### Failed Files

When a file fails validation:
1. File moved to `failed/` subdirectory
2. Timestamp prefix added: `1732550400000_filename.xlsx`
3. Error log created: `1732550400000_filename.xlsx.error.txt`

**Error Log Example:**
```
Error: File too large: 52.5MB (max 50MB)
Timestamp: 2025-11-25T10:30:00.000Z
```

### Common Errors

| Error                     | Reason                          | Solution                        |
|---------------------------|----------------------------------|----------------------------------|
| File too large            | Size > 50MB                     | Split file or compress          |
| File too small            | Size < 1KB                      | Check file is not empty         |
| Duplicate file            | Same name in last 24 hours      | Rename file or wait 24 hours    |
| Invalid extension         | Not .xlsx or .xls               | Convert to Excel format         |
| File not readable         | Locked or permissions issue     | Close file and check permissions|

---

## Monitoring

### Logs

```bash
# Monitor startup
📁 Created watch directory: _bulk_upload_watch
📁 Bulk upload file monitor started
   Watch directory: _bulk_upload_watch
   File patterns: *.xlsx, *.xls
📁 Bulk upload file monitor ready

# File detection
📄 New file detected: bulk-upload-sample.xlsx
✅ File queued for processing: bulk-upload-sample.xlsx (Job ID: job-123)

# File rejection
📄 Ignoring non-Excel file: document.pdf
⚠️ Duplicate file detected: bulk-upload-sample.xlsx
❌ File validation failed: large-file.xlsx - File too large: 52.5MB (max 50MB)
📁 Moved failed file to: _bulk_upload_watch/failed/1732550400000_large-file.xlsx
```

### WebSocket Events

```javascript
// File detected
socket.on('bulk_upload_progress', (data) => {
  if (data.stage === 'file_detected') {
    console.log('File detected:', data.message);
  }
});

// Processing started
socket.on('bulk_upload_progress', (data) => {
  if (data.stage === 'file_reading') {
    console.log('Processing started:', data.progress + '%');
  }
});

// Processing complete
socket.on('bulk_upload_complete', (data) => {
  console.log('Processing complete:', data.job_id);
});
```

---

## Best Practices

1. **File Naming**
   - Use descriptive names
   - Include date/timestamp if needed
   - Avoid special characters

2. **File Size**
   - Keep files under 50MB
   - Split large files if necessary
   - Compress if possible

3. **Monitoring**
   - Check monitor status regularly
   - Review failed/ directory periodically
   - Clean up old files

4. **Testing**
   - Test with small files first
   - Verify file format before dropping
   - Monitor queue stats

5. **Security**
   - Restrict access to watch directory
   - Use appropriate file permissions
   - Monitor for unauthorized files

---

## Troubleshooting

### Monitor Not Starting

**Check:**
1. Environment variable: `BULK_UPLOAD_MONITOR_ENABLED=true`
2. Watch directory exists and is writable
3. Server logs for errors

**Solution:**
```bash
# Check status
curl http://localhost:5000/api/v1/bulk-upload/monitor/status \
  -H "Authorization: Bearer YOUR_TOKEN"

# Start manually
curl -X POST http://localhost:5000/api/v1/bulk-upload/monitor/start \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Files Not Being Detected

**Check:**
1. File is in correct directory
2. File extension is .xlsx or .xls
3. File is not locked by another program
4. Monitor is running

**Solution:**
- Close file in Excel
- Check file permissions
- Manually trigger processing

### Duplicate Detection Issues

**Check:**
1. File name matches existing file
2. Existing file processed in last 24 hours

**Solution:**
- Rename file
- Wait 24 hours
- Check database for existing records

---

## Advanced Usage

### Custom Watch Directory

```bash
# Set custom directory
export BULK_UPLOAD_WATCH_DIR=/path/to/custom/directory

# Restart server
npm run dev
```

### Disable Monitor

```bash
# Disable monitor
export BULK_UPLOAD_MONITOR_ENABLED=false

# Restart server
npm run dev
```

### Manual File Processing

```typescript
import { BulkUploadFileMonitor } from './services/bulk-upload/bulkUploadFileMonitor';

const monitor = BulkUploadFileMonitor.getInstance();
const jobId = await monitor.processFile(
  '/path/to/file.xlsx',
  'user@example.com',
  'user-id'
);
```

---

## Integration

### With Queue System

- Auto-detected files: Priority 5 (medium)
- Manually triggered files: Priority 1 (high)
- System user: 'file-monitor'

### With WebSocket

- File detection notifications
- Progress updates during processing
- Completion/failure notifications

### With Database

- Creates record with status 'pending'
- Tracks uploaded_by as 'file-monitor'
- Stores processing results

---

## Future Enhancements

- [ ] File archiving after processing
- [ ] Scheduled processing windows
- [ ] File pattern matching (e.g., *-members-*.xlsx)
- [ ] Email notifications on file detection
- [ ] Batch file processing
- [ ] File preprocessing (validation before queue)

