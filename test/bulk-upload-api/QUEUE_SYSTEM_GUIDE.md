# Bulk Upload Queue System Guide

## Overview

The bulk upload queue system provides asynchronous processing of bulk member uploads using Bull queue with Redis backend. This enables:

- **Non-blocking API responses** - Upload endpoint returns immediately
- **Controlled concurrency** - Process 2 jobs simultaneously
- **Automatic retry** - Failed jobs retry automatically
- **Priority processing** - Role-based job prioritization
- **Real-time updates** - WebSocket progress notifications
- **Queue monitoring** - Statistics and job tracking

---

## Architecture

```
Client → API → Queue → Worker → Orchestrator → Database
                ↓
              Redis
                ↓
           WebSocket → Client
```

### Components

1. **Queue Service** (`bulkUploadQueueService.ts`)
   - Manages Bull queue with Redis
   - Job lifecycle management
   - Queue statistics and monitoring

2. **Queue Worker** (`bulkUploadQueueWorker.ts`)
   - Processes jobs from queue
   - Controlled concurrency (2 jobs)
   - Progress tracking via WebSocket

3. **Controller** (`bulkUploadController.ts`)
   - API endpoints for queue operations
   - Job submission and monitoring

4. **Routes** (`bulkUploadRoutes.ts`)
   - REST API endpoints
   - Authentication and authorization

---

## API Endpoints

### 1. Submit Upload Job
```http
POST /api/v1/bulk-upload/process
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <Excel file>
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk upload queued successfully",
  "data": {
    "job_id": "job-1732550400000-1234",
    "status": "pending",
    "file_name": "bulk-upload-sample.xlsx",
    "message": "File uploaded successfully. Processing will begin shortly."
  }
}
```

### 2. Get Job Status
```http
GET /api/v1/bulk-upload/status/:jobId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "job_id": "job-1732550400000-1234",
    "status": "completed",
    "file_name": "bulk-upload-sample.xlsx",
    "uploaded_by": "admin@example.com",
    "processing_duration_ms": 45000,
    "validation_stats": { ... },
    "database_stats": { ... }
  }
}
```

### 3. Get Queue Statistics
```http
GET /api/v1/bulk-upload/queue/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "waiting": 3,
    "active": 2,
    "completed": 150,
    "failed": 5,
    "delayed": 0,
    "paused": 0,
    "total": 160
  }
}
```

### 4. Get Recent Jobs
```http
GET /api/v1/bulk-upload/queue/jobs?limit=10
Authorization: Bearer <token>
```

### 5. Retry Failed Job
```http
POST /api/v1/bulk-upload/queue/retry/:jobId
Authorization: Bearer <token>
```

### 6. Cancel Job
```http
POST /api/v1/bulk-upload/cancel/:jobId
Authorization: Bearer <token>
```

### 7. Clean Old Jobs
```http
POST /api/v1/bulk-upload/queue/clean
Authorization: Bearer <token>
Content-Type: application/json

{
  "gracePeriodHours": 24
}
```

---

## Job Lifecycle

```
┌─────────┐
│ Pending │ ← Job added to queue
└────┬────┘
     │
     ▼
┌─────────┐
│ Waiting │ ← Waiting for worker
└────┬────┘
     │
     ▼
┌─────────┐
│ Active  │ ← Worker processing
└────┬────┘
     │
     ├─────────────┐
     ▼             ▼
┌───────────┐  ┌────────┐
│ Completed │  │ Failed │ ← Can retry
└───────────┘  └────────┘
```

---

## Priority Levels

| Role               | Priority | Description      |
|--------------------|----------|------------------|
| super_admin        | 1        | Highest priority |
| national_admin     | 3        | High priority    |
| province_admin     | 5        | Medium priority  |
| municipality_admin | 10       | Normal priority  |

---

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Queue Configuration
IEC_VERIFICATION_ENABLED=true
```

### Queue Settings

```typescript
{
  maxStalledCount: 3,        // Retry stalled jobs 3 times
  stalledInterval: 30000,    // Check every 30 seconds
  lockDuration: 600000,      // Lock for 10 minutes
  attempts: 2,               // Retry failed jobs once
  backoff: {
    type: 'exponential',
    delay: 10000             // 10s, 20s
  },
  timeout: 600000            // 10 minute timeout
}
```

---

## WebSocket Events

### Client → Server

```javascript
// Subscribe to job updates
socket.emit('subscribe_bulk_upload_job', { job_id: 'job-123' });

// Unsubscribe from job updates
socket.emit('unsubscribe_bulk_upload_job', { job_id: 'job-123' });
```

### Server → Client

```javascript
// Progress update
socket.on('bulk_upload_progress', (data) => {
  console.log(data.stage, data.progress, data.message);
});

// Completion notification
socket.on('bulk_upload_complete', (data) => {
  console.log('Job completed:', data.job_id);
});

// Failure notification
socket.on('bulk_upload_failed', (data) => {
  console.error('Job failed:', data.error);
});
```

---

## Testing

### Prerequisites

1. Redis server running on localhost:6379
2. Backend server running on http://localhost:5000
3. Sample Excel file

### Run Tests

```bash
# Test queue functionality
npx ts-node test/bulk-upload-api/test-bulk-upload-queue.ts

# Test with WebSocket monitoring
npx ts-node test/bulk-upload-api/websocket-client-example.ts
```

---

## Monitoring

### Queue Dashboard (Future)

- Real-time queue statistics
- Job list with filtering
- Job details and logs
- Retry/cancel actions
- Performance metrics

### Logs

```bash
# Worker logs
📥 Added bulk upload job to queue: job-123
🔄 Processing bulk upload job: job-123
✅ Bulk upload job completed: job-123

# Queue event logs
⏳ Job job-123 is waiting to be processed
🔄 Processing bulk upload job 1: file.xlsx
✅ Bulk upload job 1 completed successfully
❌ Bulk upload job 2 failed: Error message
```

---

## Troubleshooting

### Redis Connection Issues

```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Check Redis connection
redis-cli -h localhost -p 6379
```

### Queue Not Processing

1. Check worker is initialized in `app.ts`
2. Check Redis connection
3. Check queue stats: `GET /api/v1/bulk-upload/queue/stats`
4. Check server logs for errors

### Job Stuck in Active State

- Jobs timeout after 10 minutes
- Stalled jobs retry automatically
- Check worker logs for errors

---

## Best Practices

1. **Monitor queue regularly** - Check stats and clean old jobs
2. **Set appropriate priorities** - Use role-based priorities
3. **Handle failures gracefully** - Implement retry logic
4. **Use WebSocket for updates** - Real-time progress tracking
5. **Clean old jobs periodically** - Prevent queue bloat

---

## Future Enhancements

- [ ] Queue dashboard UI
- [ ] Job scheduling (delayed jobs)
- [ ] Batch job submission
- [ ] Job dependencies
- [ ] Advanced retry strategies
- [ ] Queue metrics and analytics

