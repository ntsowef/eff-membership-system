# IEC API Rate Limit Testing

This directory contains test scripts and documentation for testing the IEC API rate limit handling system.

## Overview

The IEC API has a rate limit of **10,000 requests per hour**. The system implements:
- ✅ Rate limit tracking using Redis
- ✅ Warning notifications at 90% (9,000 requests)
- ✅ Graceful pause when limit exceeded
- ✅ User notifications via WebSocket
- ✅ Frontend UI indicators (red overlay)
- ✅ Resume capability after limit resets

---

## Files

### 1. `test_rate_limit_handling.md`
Comprehensive manual testing guide with step-by-step instructions for all test scenarios.

**Includes**:
- Rate limit counter increment tests
- Warning threshold tests (9,000 requests)
- Rate limit exceeded tests (10,000 requests)
- Multi-user concurrent upload tests
- Frontend UI verification
- Database status verification
- Excel report verification

### 2. `simulate_rate_limit.py`
Interactive Python script to simulate rate limit scenarios.

**Features**:
- View current rate limit status
- Increment counter
- Set counter to specific value (e.g., 9,999 to test limit)
- Reset counter
- Run predefined test scenarios
- Bulk request testing

---

## Quick Start

### Prerequisites

1. **Backend running** on port 5000
2. **Redis running** on localhost:6379
3. **Python processor** running (`bulk_upload_processor.py`)
4. **Database** with updated schema (rate_limited status)

### Run Database Migration

```bash
psql -U postgres -d membership_db -f backend/migrations/add_rate_limited_status.sql
```

### Install Python Dependencies

```bash
pip install requests redis
```

### Run Simulator

```bash
cd test/rate-limit
python simulate_rate_limit.py
```

---

## Test Scenarios

### Scenario 1: Normal Operation
- Counter starts at 0
- Increment 5 times
- Verify counter increases correctly

### Scenario 2: Warning Threshold
- Set counter to 8,999
- Upload file with 10+ records
- Verify warning notification appears
- Verify upload continues

### Scenario 3: Rate Limit Exceeded
- Set counter to 9,999
- Upload file with 10+ records
- Verify processing stops after 1 record
- Verify red overlay appears
- Verify upload button disabled
- Verify database status = 'rate_limited'

### Scenario 4: Multi-User Concurrent
- Set counter to 9,990
- Two users upload simultaneously
- Verify shared rate limit
- Verify both users see appropriate status

### Scenario 5: Rate Limit Reset
- Set counter to 10,000
- Wait 1 hour (or manually delete Redis key)
- Verify counter resets to 0
- Verify uploads work normally

---

## Using the Simulator

```bash
python simulate_rate_limit.py
```

**Menu Options**:
1. **Normal Operation** - Test 5 increments
2. **Warning Threshold** - Set to 8,999 and increment
3. **Rate Limit Exceeded** - Set to 9,999 and increment
4. **Bulk Requests** - Send 100 requests
5. **View Current Status** - Check current counter
6. **Reset Counter** - Delete Redis key
7. **Set Custom Value** - Set counter to any value
0. **Exit**

---

## Manual Testing Commands

### Check Rate Limit Status
```bash
curl http://localhost:5000/api/v1/iec/rate-limit/status
```

### Increment Counter
```bash
curl -X POST http://localhost:5000/api/v1/iec/rate-limit/increment
```

### Reset Counter (Admin Only)
```bash
curl -X POST http://localhost:5000/api/v1/iec/rate-limit/reset \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Check Redis Directly
```bash
redis-cli
GET "iec_api:rate_limit:2025-11-24:10"
TTL "iec_api:rate_limit:2025-11-24:10"
```

### Set Redis Counter Manually
```bash
redis-cli
SET "iec_api:rate_limit:2025-11-24:10" 9999
EXPIRE "iec_api:rate_limit:2025-11-24:10" 3600
```

### Query Database for Rate Limited Files
```sql
SELECT 
    file_id,
    filename,
    status,
    error_message,
    rows_processed,
    rows_total,
    upload_timestamp
FROM uploaded_files
WHERE status = 'rate_limited'
ORDER BY upload_timestamp DESC;
```

---

## Expected Behaviors

### When Warning Threshold Reached (9,000 requests)
- ⚠️ Warning snackbar appears
- 📊 Processing continues normally
- 🔔 WebSocket event: `iec_rate_limit_warning`

### When Rate Limit Exceeded (10,000 requests)
- 🚫 Processing stops immediately
- 🔴 Red overlay on upload section
- 🚫 Upload button disabled
- 📊 Database status: 'rate_limited'
- 📧 Error message with reset time
- 🔔 WebSocket event: `iec_rate_limit_exceeded`
- 📄 Excel report includes rate limit section

### After Rate Limit Resets (1 hour later)
- ✅ Counter resets to 0
- ✅ Red overlay disappears
- ✅ Upload button enabled
- ✅ Normal operation resumes

---

## Troubleshooting

### Counter Not Incrementing
```bash
# Check Redis is running
redis-cli ping

# Check backend logs
# Look for "IEC Rate Limit Service" messages
```

### No Frontend Overlay
```bash
# Check browser console for WebSocket events
# Look for: iec_rate_limit_exceeded

# Check React state in DevTools
# Component: BulkFileUploadTab
# State: rateLimitStatus
```

### Database Constraint Error
```bash
# Run migration
psql -U postgres -d membership_db -f backend/migrations/add_rate_limited_status.sql

# Verify constraint
psql -U postgres -d membership_db -c "
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'chk_status' 
AND conrelid = 'uploaded_files'::regclass;
"
```

---

## Reset Everything

```bash
# Reset Redis
redis-cli KEYS "iec_api:rate_limit:*" | xargs redis-cli DEL

# Reset database
psql -U postgres -d membership_db -c "
UPDATE uploaded_files 
SET status='pending' 
WHERE status='rate_limited';
"

# Restart services
# 1. Restart Node.js backend
# 2. Restart Python processor
```

---

## Success Criteria

- ✅ Counter increments correctly
- ✅ Warning appears at 9,000 requests
- ✅ Processing stops at 10,000 requests
- ✅ Red overlay appears on frontend
- ✅ Upload button disabled when limited
- ✅ Database status updates correctly
- ✅ Excel report includes rate limit info
- ✅ Multi-user uploads share counter
- ✅ Counter resets after 1 hour
- ✅ WebSocket notifications work
- ✅ Upload history shows correct status

