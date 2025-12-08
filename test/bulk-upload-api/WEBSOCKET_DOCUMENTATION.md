# Bulk Upload WebSocket Documentation

This document describes the WebSocket implementation for real-time bulk upload progress updates.

---

## Overview

The bulk upload system uses WebSocket (Socket.IO) to provide real-time progress updates to clients during file processing. This allows the frontend to display live progress bars, stage updates, and completion notifications without polling.

---

## Connection

### Endpoint
```
ws://localhost:5000
```

### Path
```
/socket.io
```

### Authentication

WebSocket connections require JWT authentication. Include the token in the connection handshake:

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  },
  path: '/socket.io',
  transports: ['websocket', 'polling']
});
```

---

## Events

### Client → Server Events

#### 1. `subscribe_bulk_upload_job`
Subscribe to progress updates for a specific job.

**Payload:**
```typescript
{
  job_id: string  // e.g., "job-1732531200000-1234"
}
```

**Example:**
```typescript
socket.emit('subscribe_bulk_upload_job', { job_id: 'job-1732531200000-1234' });
```

---

#### 2. `unsubscribe_bulk_upload_job`
Unsubscribe from progress updates for a specific job.

**Payload:**
```typescript
{
  job_id: string
}
```

**Example:**
```typescript
socket.emit('unsubscribe_bulk_upload_job', { job_id: 'job-1732531200000-1234' });
```

---

### Server → Client Events

#### 1. `bulk_upload_progress`
Real-time progress update during processing.

**Payload:**
```typescript
{
  job_id: string;           // Job identifier
  stage: string;            // Current processing stage
  progress: number;         // Progress percentage (0-100)
  message: string;          // Human-readable progress message
  status: string;           // "processing"
  timestamp: string;        // ISO 8601 timestamp
}
```

**Stages:**
- `initialization` (0%)
- `file_reading` (10-20%)
- `pre_validation` (25-40%)
- `iec_verification` (45-60%)
- `database_operations` (65-80%)
- `report_generation` (85-100%)

**Example:**
```typescript
socket.on('bulk_upload_progress', (data) => {
  console.log(`${data.stage}: ${data.progress}% - ${data.message}`);
  // Update progress bar in UI
});
```

---

#### 2. `bulk_upload_complete`
Notification when processing completes successfully.

**Payload:**
```typescript
{
  job_id: string;
  status: string;                    // "completed"
  validation_stats: {
    total_records: number;
    valid_records: number;
    invalid_ids: number;
    duplicates: number;
    not_registered: number;
  };
  database_stats: {
    inserts: number;
    updates: number;
    errors: number;
  };
  report_path: string;               // API path to download report
  processing_duration_ms: number;    // Total processing time
  timestamp: string;
}
```

**Example:**
```typescript
socket.on('bulk_upload_complete', (data) => {
  console.log('Upload complete!');
  console.log('Inserts:', data.database_stats.inserts);
  console.log('Updates:', data.database_stats.updates);
  console.log('Report:', data.report_path);
  // Show success notification
  // Redirect to report download
});
```

---

#### 3. `bulk_upload_failed`
Notification when processing fails.

**Payload:**
```typescript
{
  job_id: string;
  error: string;        // Error message
  stage?: string;       // Stage where failure occurred
  status: string;       // "failed"
  timestamp: string;
}
```

**Example:**
```typescript
socket.on('bulk_upload_failed', (data) => {
  console.error('Upload failed:', data.error);
  console.error('Failed at stage:', data.stage);
  // Show error notification
});
```

---

## Usage Examples

### Example 1: Simple Progress Tracking

```typescript
import { io } from 'socket.io-client';

const token = 'YOUR_JWT_TOKEN';
const jobId = 'job-1732531200000-1234';

const socket = io('http://localhost:5000', {
  auth: { token },
  path: '/socket.io'
});

socket.on('connect', () => {
  // Subscribe to job
  socket.emit('subscribe_bulk_upload_job', { job_id: jobId });
});

socket.on('bulk_upload_progress', (data) => {
  console.log(`Progress: ${data.progress}%`);
  updateProgressBar(data.progress);
});

socket.on('bulk_upload_complete', (data) => {
  console.log('Complete!');
  showSuccessMessage(data);
});

socket.on('bulk_upload_failed', (data) => {
  console.error('Failed:', data.error);
  showErrorMessage(data.error);
});
```

---

## See Also

- **WebSocket Client Example:** `test/bulk-upload-api/websocket-client-example.ts`
- **React Hook Example:** `test/bulk-upload-api/useBulkUploadWebSocket.example.tsx`
- **API Documentation:** `test/bulk-upload-api/README.md`

