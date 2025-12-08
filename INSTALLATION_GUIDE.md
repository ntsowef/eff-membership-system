# Installation Guide: High-Volume Concurrent File Upload System

## 📋 Prerequisites

Before starting, ensure you have:

- ✅ **Node.js** v16 or higher installed
- ✅ **PostgreSQL** database running on localhost:5432
- ✅ **Redis** server running on localhost:6379
- ✅ **npm** or **yarn** package manager
- ✅ At least **5GB free disk space**

## 🚀 Step-by-Step Installation

### Step 1: Install Backend Dependencies

```bash
cd backend
npm install bull @types/bull check-disk-space
```

**What this does:**
- `bull` - Job queue system with Redis backend
- `@types/bull` - TypeScript type definitions for Bull
- `check-disk-space` - Disk space monitoring utility

### Step 2: Update Environment Variables

Edit `backend/.env` and add/update the following variables:

```env
# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================
DB_CONNECTION_LIMIT=50                    # Increased from 20 to 50

# ============================================================================
# FILE UPLOAD CONFIGURATION
# ============================================================================
MAX_UPLOAD_SIZE_MB=50                     # Maximum file size (50MB)
UPLOAD_FREQUENCY_LIMIT=5                  # Max uploads per 15 minutes per user
MAX_CONCURRENT_UPLOADS_PER_USER=2         # Max concurrent uploads per user
MAX_SYSTEM_CONCURRENT_UPLOADS=20          # Max concurrent uploads system-wide

# ============================================================================
# JOB QUEUE CONFIGURATION (Bull/Redis)
# ============================================================================
QUEUE_CONCURRENCY=5                       # Number of concurrent jobs to process
QUEUE_MAX_RETRIES=3                       # Number of retry attempts for failed jobs
QUEUE_RETRY_DELAY=5000                    # Initial retry delay in milliseconds

# ============================================================================
# REDIS CONFIGURATION (if not already present)
# ============================================================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
# REDIS_PASSWORD=                         # Uncomment if Redis has password
```

### Step 3: Verify Redis is Running

```bash
# Test Redis connection
redis-cli ping
```

**Expected output:** `PONG`

If Redis is not running:

**Windows:**
```bash
# Download Redis for Windows from: https://github.com/microsoftarchive/redis/releases
# Or use WSL2 with Ubuntu and install Redis
```

**Linux/Mac:**
```bash
# Start Redis
redis-server

# Or if installed as service
sudo systemctl start redis
```

### Step 4: Verify PostgreSQL is Running

```bash
# Test PostgreSQL connection
psql -h localhost -U your_username -d your_database -c "SELECT 1;"
```

**Expected output:** Should return `1` without errors

### Step 5: Start the Backend Server

```bash
cd backend
npm run dev
```

**Expected console output:**
```
✅ Redis connected successfully
✅ Queue service initialized
✅ Upload directories ensured
✅ Upload queue workers started
✅ Performance monitoring started
🚀 Server started successfully!
📍 Server running on port 5000
🔄 Upload queue worker started with concurrency: 5
🔄 Renewal queue worker started with concurrency: 5
🧹 File Cleanup Job: Active (daily at 2 AM)
🧹 Queue Cleanup Job: Active (daily at 3 AM)
```

### Step 6: Verify Queue System is Working

Open a new terminal and test the queue endpoints:

```bash
# Get upload queue statistics
curl http://localhost:5000/api/v1/member-application-bulk-upload/queue/status

# Get renewal queue statistics
curl http://localhost:5000/api/v1/renewal-bulk-upload/queue/status
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "waiting": 0,
    "active": 0,
    "completed": 0,
    "failed": 0,
    "delayed": 0,
    "paused": 0
  }
}
```

### Step 7: Install Test Dependencies

```bash
cd test
npm install
```

**What this installs:**
- `axios` - HTTP client for API requests
- `exceljs` - Excel file generation
- `form-data` - Multipart form data for file uploads

### Step 8: Generate Test Data

```bash
cd test
npm run generate:applications
```

**Expected output:**
```
🚀 Starting member application file generation...

📝 Generating 100 member application records...
✅ File saved: test/sample-data/output/member-applications-100.xlsx

📝 Generating 1000 member application records...
  Generated 1000/1000 records...
✅ File saved: test/sample-data/output/member-applications-1000.xlsx

📝 Generating 5000 member application records...
  Generated 1000/5000 records...
  Generated 2000/5000 records...
  Generated 3000/5000 records...
  Generated 4000/5000 records...
  Generated 5000/5000 records...
✅ File saved: test/sample-data/output/member-applications-5000.xlsx

📝 Generating 10000 member application records...
  Generated 1000/10000 records...
  ...
  Generated 10000/10000 records...
✅ File saved: test/sample-data/output/member-applications-10000.xlsx

✅ All files generated successfully!
📁 Output directory: test/sample-data/output
```

### Step 9: Run Your First Test

```bash
cd test
npm run test:5-concurrent
```

**Expected output:**
```
🚀 Starting 5 Concurrent Upload Test

API URL: http://localhost:5000/api/v1/member-application-bulk-upload
Concurrent uploads: 5

📤 [Upload 1] Starting upload: member-applications-100.xlsx
📤 [Upload 2] Starting upload: member-applications-1000.xlsx
📤 [Upload 3] Starting upload: member-applications-100.xlsx
📤 [Upload 4] Starting upload: member-applications-1000.xlsx
📤 [Upload 5] Starting upload: member-applications-100.xlsx
✅ [Upload 1] File uploaded in 234ms - UUID: abc123...
✅ [Upload 2] File uploaded in 456ms - UUID: def456...
...
================================================================================
📊 TEST SUMMARY
================================================================================
Total test duration: 45.2s
Successful uploads: 5/5
Failed uploads: 0/5

Average upload time: 345ms
Average processing time: 8500ms
Average total time: 8845ms

Total records processed: 2200
Successful records: 2200
Processing rate: 48.67 records/second
================================================================================
```

## ✅ Verification Checklist

After installation, verify the following:

- [ ] Backend server starts without errors
- [ ] Redis connection successful
- [ ] PostgreSQL connection successful
- [ ] Queue workers started (check console logs)
- [ ] File cleanup job scheduled (check console logs)
- [ ] Queue cleanup job scheduled (check console logs)
- [ ] Queue statistics endpoint returns data
- [ ] Test data generated successfully
- [ ] First test runs successfully

## 🐛 Troubleshooting

### Issue: "Redis connection failed"

**Solution:**
1. Verify Redis is running: `redis-cli ping`
2. Check Redis host/port in `.env`
3. Check firewall settings
4. Try connecting manually: `redis-cli -h localhost -p 6379`

### Issue: "Database connection pool exhausted"

**Solution:**
1. Verify `DB_CONNECTION_LIMIT=50` in `.env`
2. Restart backend server
3. Check PostgreSQL max_connections setting
4. Monitor active connections: `SELECT count(*) FROM pg_stat_activity;`

### Issue: "Insufficient disk space"

**Solution:**
1. Check free disk space: `df -h` (Linux/Mac) or `Get-PSDrive` (Windows)
2. Ensure at least 5GB free space
3. Run manual cleanup: Delete old files in `uploads/` directories
4. Adjust retention period in `fileStorageService.ts` if needed

### Issue: "Queue not processing jobs"

**Solution:**
1. Check Redis connection
2. Verify queue workers started (check console logs)
3. Check for errors in backend logs
4. Restart backend server
5. Check queue statistics endpoint

### Issue: "Rate limit exceeded"

**Solution:**
1. This is expected behavior during testing
2. Wait 15 minutes for rate limit to reset
3. Or temporarily increase limits in `.env`:
   ```env
   UPLOAD_FREQUENCY_LIMIT=20
   MAX_CONCURRENT_UPLOADS_PER_USER=10
   ```
4. Restart backend server

### Issue: "Test files not found"

**Solution:**
1. Ensure you ran: `npm run generate:applications`
2. Check `test/sample-data/output/` directory exists
3. Verify files were created successfully
4. Check file permissions

## 📚 Next Steps

After successful installation:

1. **Review Implementation Summary**: Read `IMPLEMENTATION_SUMMARY.md`
2. **Explore Test Scripts**: Check `test/README.md` for all available tests
3. **Run More Tests**: Try `npm run test:10-concurrent`, `npm run test:15-concurrent`
4. **Monitor Performance**: Watch backend logs and queue statistics
5. **Adjust Configuration**: Tune concurrency and rate limits based on your server capacity

## 🆘 Getting Help

If you encounter issues not covered in this guide:

1. Check backend server logs for detailed error messages
2. Check Redis logs: `redis-cli MONITOR`
3. Check PostgreSQL logs
4. Review the implementation files for configuration options
5. Consult the test README: `test/README.md`

## 🎉 Success!

If all steps completed successfully, you now have:

- ✅ A robust job queue system with Bull/Redis
- ✅ Three-layer rate limiting to prevent abuse
- ✅ Batch processing for 10x performance improvement
- ✅ Automatic file cleanup and disk space monitoring
- ✅ Comprehensive testing infrastructure
- ✅ Monitoring endpoints for queue statistics

Your system is now ready to handle high-volume concurrent file uploads! 🚀

