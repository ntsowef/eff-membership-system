# 🚀 Comprehensive File Processing System

## Overview

This document describes the complete implementation of a background file processing system integrated with the existing membership management system. The system converts the original Python voter verification processor into a fully integrated Node.js service with real-time WebSocket communication, Redis queue management, and comprehensive frontend integration.

## 🏗️ Architecture

### System Components

1. **File Watcher Service** - Monitors upload directory for new Excel files
2. **WebSocket Service** - Real-time communication with frontend
3. **Voter Verification Service** - Processes Excel files and verifies voter data
4. **Queue Manager** - Manages job processing with Redis persistence
5. **API Routes** - RESTful endpoints for file management
6. **Frontend Components** - React dashboard for file processing management

### Technology Stack

- **Backend**: Node.js, TypeScript, Express.js
- **Database**: MySQL (existing schema + new file_processing_jobs table)
- **Cache/Queue**: Redis with ioredis
- **File Monitoring**: Chokidar
- **WebSocket**: Socket.IO
- **Excel Processing**: xlsx library
- **API Integration**: IEC South African Electoral Commission API
- **Frontend**: React 18+, TypeScript, Material-UI

## 📁 File Structure

```
backend/
├── src/
│   ├── services/
│   │   ├── fileWatcherService.ts          # File monitoring
│   │   ├── websocketService.ts            # Real-time communication
│   │   ├── voterVerificationService.ts    # Excel processing (converted from Python)
│   │   └── fileProcessingQueueManager.ts  # Queue management
│   └── routes/
│       └── fileProcessing.ts              # API endpoints
├── migrations/
│   └── create_file_processing_jobs_table.sql
└── run-file-processing-migration.js       # Database setup

frontend/
├── src/
│   ├── services/
│   │   └── fileProcessingService.ts       # Frontend service
│   ├── components/
│   │   └── file-processing/
│   │       └── FileProcessingDashboard.tsx
│   └── hooks/
│       └── useFileProcessing.ts           # React hook
```

## 🚀 Installation & Setup

### 1. Install Dependencies

```bash
cd backend
npm install chokidar socket.io @types/chokidar
```

### 2. Run Database Migration

```bash
cd backend
node run-file-processing-migration.js
```

### 3. Environment Variables

Add to your `.env` file:

```env
# Redis Configuration (if not already present)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=membership:

# File Processing
UPLOAD_DIR=uploads
MAX_FILE_SIZE=52428800  # 50MB
```

### 4. Start Services

The services will automatically start when you run your existing backend:

```bash
npm run dev
```

## 🔧 Core Features

### ✅ File Monitoring
- **Automatic Detection**: Monitors `uploads/excel-processing/` directory
- **File Validation**: Only processes `.xlsx` and `.xls` files
- **Ward Number Extraction**: Automatically extracts ward numbers from filenames
- **Stability Check**: Waits for files to finish uploading before processing

### ✅ Queue Management
- **Redis-based Queue**: Persistent job queue using Redis lists
- **Sequential Processing**: Processes one file at a time to avoid API rate limits
- **Job Persistence**: Jobs survive server restarts
- **Priority Support**: Configurable job priorities
- **Status Tracking**: Real-time status updates (queued → processing → completed/failed)

### ✅ Voter Verification (Converted from Python)
- **IEC API Integration**: Full integration with South African Electoral Commission API
- **Concurrent Processing**: Processes multiple ID numbers concurrently with rate limiting
- **Token Management**: Automatic token refresh and retry logic
- **Data Categorization**: Separates voters into categories (RegisteredInWard, NotRegisteredInWard, etc.)
- **Output Generation**: Creates Excel files with multiple sheets and summary reports

### ✅ Real-time Communication
- **WebSocket Support**: Real-time updates using Socket.IO
- **Authentication**: JWT-based WebSocket authentication
- **Event Broadcasting**: All connected users receive processing updates
- **Progress Tracking**: Live progress updates during file processing

### ✅ Frontend Integration
- **React Dashboard**: Complete file processing management interface
- **Drag & Drop Upload**: Easy file upload with validation
- **Real-time Updates**: Live progress bars and status updates
- **Job Management**: View history, cancel jobs, download results
- **Error Handling**: Comprehensive error reporting and user feedback

## 📊 API Endpoints

### File Processing Routes (`/api/v1/file-processing`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/queue/status` | Get current queue status |
| GET | `/jobs` | Get job history (with pagination) |
| GET | `/jobs/:jobId` | Get specific job details |
| POST | `/upload` | Upload Excel file for processing |
| POST | `/jobs/:jobId/cancel` | Cancel a queued job |
| GET | `/download/:jobId/:fileName` | Download processed files |
| GET | `/status` | Get service status |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `file_queued` | Server → Client | File added to processing queue |
| `job_started` | Server → Client | Job processing started |
| `job_progress` | Server → Client | Job progress update |
| `job_completed` | Server → Client | Job completed successfully |
| `job_failed` | Server → Client | Job failed with error |
| `job_cancelled` | Server → Client | Job was cancelled |
| `queue_status` | Server → Client | Current queue status |

## 🔄 Processing Workflow

1. **File Upload/Detection**
   - User uploads file via dashboard OR drops file in monitored directory
   - System validates file type and size
   - Ward number extracted from filename
   - Job created in database and Redis queue

2. **Queue Processing**
   - Queue manager picks up next job (FIFO)
   - Job status updated to "processing"
   - WebSocket notification sent to all connected clients

3. **Excel Processing**
   - File read and ID numbers extracted
   - Concurrent API calls to IEC voter verification service
   - Progress updates sent via WebSocket
   - Results categorized and output files generated

4. **Completion**
   - Job status updated to "completed" or "failed"
   - Results stored in database
   - WebSocket notification sent
   - Output files available for download

## 🛡️ Security & Error Handling

### Security Features
- **JWT Authentication**: All WebSocket connections require valid JWT tokens
- **Permission-based Access**: Uses existing permission system
- **File Validation**: Strict file type and size validation
- **Rate Limiting**: API calls to IEC service are rate-limited

### Error Handling
- **Comprehensive Logging**: All errors logged with context
- **Graceful Degradation**: System continues operating if individual jobs fail
- **Retry Logic**: Automatic retry for transient API failures
- **User Feedback**: Clear error messages displayed in frontend

## 📈 Performance & Scalability

### Performance Optimizations
- **Concurrent Processing**: Multiple ID numbers processed simultaneously
- **Connection Pooling**: Efficient database connection management
- **Redis Caching**: Fast queue operations and job status tracking
- **Streaming**: Large files processed in chunks

### Scalability Considerations
- **Horizontal Scaling**: Can be extended to multiple worker processes
- **Load Balancing**: WebSocket connections can be load-balanced
- **Database Indexing**: Proper indexes on job status and timestamps
- **File Storage**: Output files can be moved to cloud storage

## 🔧 Configuration

### File Watcher Configuration
```typescript
// Configurable in fileWatcherService.ts
const watcherOptions = {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true,
  ignoreInitial: false,
  awaitWriteFinish: {
    stabilityThreshold: 3000, // Wait 3 seconds
    pollInterval: 100
  }
};
```

### Queue Configuration
```typescript
// Configurable in fileProcessingQueueManager.ts
const processingOptions = {
  concurrency: 10, // Process 10 IDs concurrently
  batchDelay: 1000, // 1 second delay between batches
  maxRetries: 3, // Retry failed API calls
  retryDelay: 2000 // 2 second delay between retries
};
```

## 🧪 Testing

### Manual Testing
1. Upload an Excel file with member data
2. Monitor real-time progress in dashboard
3. Verify output files are generated correctly
4. Test job cancellation functionality
5. Verify WebSocket reconnection handling

### API Testing
```bash
# Test queue status
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/v1/file-processing/queue/status

# Test file upload
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.xlsx" -F "ward_number=93501016" \
  http://localhost:5000/api/v1/file-processing/upload
```

## 🚨 Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check JWT token validity
   - Verify CORS configuration
   - Check firewall settings

2. **Files Not Being Processed**
   - Verify file watcher is active
   - Check Redis connection
   - Ensure upload directory exists and is writable

3. **IEC API Errors**
   - Verify API credentials
   - Check network connectivity
   - Monitor rate limiting

4. **Database Errors**
   - Run migration script
   - Check database permissions
   - Verify table structure

### Monitoring

Check service status:
```bash
curl http://localhost:5000/api/v1/file-processing/status
```

Monitor logs for:
- File watcher events
- Queue processing status
- WebSocket connections
- API call failures

## 🎯 Usage Examples

### Frontend Integration

```typescript
import { useFileProcessing } from '../hooks/useFileProcessing';

const MyComponent = () => {
  const {
    uploadFile,
    queueStatus,
    jobHistory,
    onJobCompleted
  } = useFileProcessing();

  // Upload file
  const handleUpload = async (file: File) => {
    await uploadFile(file, 93501016);
  };

  // Listen for completion
  useEffect(() => {
    return onJobCompleted((data) => {
      console.log('Job completed:', data);
    });
  }, [onJobCompleted]);

  return (
    <div>
      <p>Queue Length: {queueStatus?.queueLength}</p>
      <p>Jobs: {jobHistory.length}</p>
    </div>
  );
};
```

### Backend Service Usage

```typescript
import { FileWatcherService } from './services/fileWatcherService';
import { FileProcessingQueueManager } from './services/fileProcessingQueueManager';

// Start services
const fileWatcher = FileWatcherService.getInstance();
await fileWatcher.start();

const queueManager = FileProcessingQueueManager.getInstance();
await queueManager.startProcessing();
```

## 🎉 Success Metrics

The implementation provides:

✅ **Complete Python Conversion**: All Python functionality converted to TypeScript
✅ **Real-time Updates**: Live progress tracking and status updates
✅ **Robust Queue Management**: Persistent, fault-tolerant job processing
✅ **Seamless Integration**: Works with existing authentication and permissions
✅ **Production Ready**: Comprehensive error handling and monitoring
✅ **User-Friendly**: Intuitive dashboard with drag-and-drop upload
✅ **Scalable Architecture**: Can handle high-volume processing

This system transforms the original Python processor into a fully integrated, production-ready service that provides real-time feedback and robust file processing capabilities within your existing membership management system.
