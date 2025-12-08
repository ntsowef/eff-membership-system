# IEC API Rate Limit Handling - Test Guide

## Overview
This guide provides comprehensive testing procedures for the IEC API rate limit handling system.

**Rate Limit**: 10,000 requests per hour  
**Warning Threshold**: 9,000 requests (90%)

---

## Prerequisites

1. **Backend Running**: Node.js backend on port 5000
2. **Python Processor Running**: `bulk_upload_processor.py`
3. **Redis Running**: For rate limit tracking
4. **Database**: PostgreSQL with updated schema (rate_limited status)

---

## Test Scenarios

### 1. Rate Limit Counter Increment

**Objective**: Verify that the rate limit counter increments correctly

**Steps**:
```bash
# Test rate limit status endpoint
curl http://localhost:5000/api/v1/iec/rate-limit/status

# Expected Response:
{
  "success": true,
  "data": {
    "current_count": 0,
    "max_limit": 10000,
    "remaining": 10000,
    "reset_time": <timestamp>,
    "is_limited": false,
    "is_warning": false,
    "percentage_used": 0
  }
}

# Increment counter
curl -X POST http://localhost:5000/api/v1/iec/rate-limit/increment

# Check status again - should show current_count: 1
curl http://localhost:5000/api/v1/iec/rate-limit/status
```

---

### 2. Warning Threshold (9,000 requests)

**Objective**: Verify warning notification at 90% threshold

**Steps**:
1. Manually set Redis counter to 8,999:
```bash
redis-cli
SET "iec_api:rate_limit:2025-11-24:10" 8999
EXPIRE "iec_api:rate_limit:2025-11-24:10" 3600
```

2. Upload a file with at least 10 records
3. **Expected Behavior**:
   - Warning notification appears after first request
   - Upload continues processing
   - Snackbar shows: "⚠️ Approaching IEC API rate limit: 9000/10000 requests (1000 remaining)"

---

### 3. Rate Limit Exceeded (10,000 requests)

**Objective**: Verify system behavior when rate limit is exceeded

**Steps**:
1. Set Redis counter to 9,999:
```bash
redis-cli
SET "iec_api:rate_limit:2025-11-24:10" 9999
EXPIRE "iec_api:rate_limit:2025-11-24:10" 3600
```

2. Upload a file with at least 10 records
3. **Expected Behavior**:
   - Processing stops after 1 record
   - File status changes to 'rate_limited'
   - Red overlay appears on upload section
   - Error banner shows rate limit message
   - Upload button is disabled
   - Snackbar shows: "🚫 IEC API rate limit exceeded. Processed X/Y records. Resets at HH:MM:SS."

---

### 4. Multi-User Concurrent Uploads

**Objective**: Verify rate limit is shared across all users

**Steps**:
1. Set Redis counter to 9,990
2. Have User A upload file with 20 records
3. Simultaneously, have User B upload file with 20 records
4. **Expected Behavior**:
   - Combined requests count toward same limit
   - One or both uploads will hit rate limit
   - Each user sees their own upload status
   - Rate limit affects all users globally

---

### 5. Rate Limit Reset After 1 Hour

**Objective**: Verify counter resets after 1 hour

**Steps**:
1. Set Redis counter to 10,000 (limit exceeded)
2. Wait for Redis key to expire (or manually delete):
```bash
redis-cli
DEL "iec_api:rate_limit:2025-11-24:10"
```

3. Check status endpoint - should show current_count: 0
4. Upload new file - should process normally

---

### 6. Excel Report with Rate Limit Info

**Objective**: Verify rate limit information appears in Excel report

**Steps**:
1. Trigger rate limit exceeded scenario (Test #3)
2. Download generated Excel report
3. **Expected in Summary Sheet**:
   - "=== IEC API RATE LIMIT ===" section
   - Rate Limit Status: EXCEEDED
   - Records Processed Before Limit: X
   - Rate Limit Message with reset time

---

### 7. Frontend UI - Red Overlay

**Objective**: Verify red transparent overlay appears when rate limited

**Steps**:
1. Trigger rate limit exceeded
2. **Expected UI Changes**:
   - Red transparent overlay (rgba(211, 47, 47, 0.15)) on upload section
   - Text: "Upload Disabled - Rate Limit Exceeded"
   - Upload border changes to red (error.main)
   - CloudUpload icon changes to red
   - Upload section opacity: 0.6
   - Cursor: not-allowed

---

### 8. Database Status Update

**Objective**: Verify database correctly stores rate_limited status

**Steps**:
1. Trigger rate limit exceeded
2. Query database:
```sql
SELECT file_id, status, error_message, rows_processed, rows_total
FROM uploaded_files
WHERE status = 'rate_limited'
ORDER BY upload_timestamp DESC
LIMIT 1;
```

3. **Expected**:
   - status = 'rate_limited'
   - error_message contains rate limit info and reset time
   - rows_processed shows partial progress
   - rows_total shows total records

---

## Manual Testing Checklist

- [ ] Rate limit counter increments correctly
- [ ] Warning appears at 9,000 requests
- [ ] Processing stops at 10,000 requests
- [ ] Red overlay appears on frontend
- [ ] Upload button is disabled when limited
- [ ] Error message shows reset time
- [ ] Database status updates to 'rate_limited'
- [ ] Excel report includes rate limit section
- [ ] Multi-user uploads share same counter
- [ ] Counter resets after 1 hour
- [ ] WebSocket notifications work correctly
- [ ] Upload history shows rate_limited status with red chip

---

## Troubleshooting

### Counter Not Incrementing
- Check Redis is running: `redis-cli ping`
- Check backend logs for rate limit service errors
- Verify IEC verifier is calling rate limit tracker

### No Red Overlay
- Check browser console for WebSocket events
- Verify frontend received `iec_rate_limit_exceeded` event
- Check rateLimitStatus state in React DevTools

### Database Constraint Error
- Run migration: `backend/migrations/add_rate_limited_status.sql`
- Verify constraint includes 'rate_limited' status

---

## Reset Commands

```bash
# Reset Redis counter
redis-cli DEL "iec_api:rate_limit:2025-11-24:10"

# Reset all rate limit keys
redis-cli KEYS "iec_api:rate_limit:*" | xargs redis-cli DEL

# Reset test file status in database
psql -U postgres -d membership_db -c "UPDATE uploaded_files SET status='pending' WHERE status='rate_limited';"
```

