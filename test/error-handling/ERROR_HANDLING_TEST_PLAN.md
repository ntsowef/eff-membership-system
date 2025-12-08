# Error Handling and Service Health Monitoring - Test Plan

## Overview
This document outlines comprehensive test scenarios for the error handling and service health monitoring system.

## Test Environment Setup

### Prerequisites
- Backend server running on `http://localhost:5000`
- Frontend application running on `http://localhost:3000`
- PostgreSQL database accessible
- Redis cache service accessible

## Test Scenarios

### 1. Backend Server Unreachable

**Objective**: Verify that the frontend properly detects and notifies users when the backend server is down or unreachable.

**Steps**:
1. Start the frontend application
2. Stop the backend server (kill the process)
3. Wait for health check to detect the issue (max 30 seconds)

**Expected Results**:
- ✅ Connection status indicator shows "Offline" with red error icon
- ✅ Connection status banner appears at the top with error severity
- ✅ Banner displays: "Backend Server Unreachable"
- ✅ Banner message: "Cannot connect to the backend server. Please check your internet connection or try again later."
- ✅ "Retry" button is available
- ✅ "Refresh Page" button is available
- ✅ Error notification appears: "Unable to connect to the server..."
- ✅ Any API calls show retry attempts with exponential backoff
- ✅ After 3 retry attempts, error is shown to user

**Test Commands**:
```bash
# Stop backend
# On Windows PowerShell:
Get-Process -Name node | Where-Object {$_.Path -like "*backend*"} | Stop-Process -Force

# On Linux/Mac:
pkill -f "backend.*node"
```

---

### 2. Database Connection Failure

**Objective**: Verify proper handling when the backend cannot connect to the database.

**Steps**:
1. Ensure frontend and backend are running
2. Stop the PostgreSQL database service
3. Wait for health check to detect the issue
4. Try to perform a data operation (e.g., view members list)

**Expected Results**:
- ✅ Connection status indicator shows "Service Down" with red error icon
- ✅ Connection status banner appears with error severity
- ✅ Banner displays: "Database Connection Failure"
- ✅ Banner message: "The system cannot connect to the database. Data operations are temporarily unavailable."
- ✅ "Retry" button is available
- ✅ Health endpoint returns 503 status code
- ✅ Health data shows database status as "unhealthy"
- ✅ API calls that require database return appropriate error messages
- ✅ Error notification: "Database connection issue. Some features may be temporarily unavailable."

**Test Commands**:
```bash
# Stop PostgreSQL
# On Windows:
net stop postgresql-x64-14

# On Linux:
sudo systemctl stop postgresql

# On Mac:
brew services stop postgresql
```

---

### 3. Cache Service Failure (Redis)

**Objective**: Verify graceful degradation when Redis cache is unavailable.

**Steps**:
1. Ensure frontend and backend are running
2. Stop the Redis service
3. Wait for health check to detect the issue
4. Perform operations that use caching

**Expected Results**:
- ✅ Connection status indicator shows "Degraded" with yellow warning icon
- ✅ Connection status banner appears with warning severity
- ✅ Banner displays: "Reduced Performance"
- ✅ Banner message: "The cache service is unavailable. The system may be slower than usual, but all features remain functional."
- ✅ No "Retry" button (cache failure is non-critical)
- ✅ Health endpoint returns 200 status code with "degraded" status
- ✅ Health data shows cache status as "unhealthy"
- ✅ Application continues to function (reads from database)
- ✅ Warning notification: "System is running with reduced performance..."
- ✅ No blocking errors for users

**Test Commands**:
```bash
# Stop Redis
# On Windows:
net stop Redis

# On Linux:
sudo systemctl stop redis

# On Mac:
brew services stop redis
```

---

### 4. Network Timeout

**Objective**: Verify handling of slow network connections and timeouts.

**Steps**:
1. Use browser DevTools to throttle network to "Slow 3G"
2. Perform API operations
3. Observe retry behavior

**Expected Results**:
- ✅ Requests show retry attempts (up to 3 times)
- ✅ Exponential backoff delays: 1s, 2s, 4s
- ✅ Loading indicators remain visible during retries
- ✅ After max retries, appropriate error message is shown
- ✅ Console logs show retry attempts

**Browser DevTools**:
1. Open DevTools (F12)
2. Go to Network tab
3. Select "Slow 3G" from throttling dropdown

---

### 5. Service Recovery

**Objective**: Verify that the system properly detects when services are restored.

**Steps**:
1. Trigger any error scenario (backend down, database down, etc.)
2. Wait for error banner to appear
3. Restore the service
4. Wait for health check or click "Retry"

**Expected Results**:
- ✅ Connection status indicator updates to "Online" with green check icon
- ✅ Connection status banner automatically disappears
- ✅ Success notification: "Connection restored" (optional)
- ✅ Health check shows all services as "healthy"
- ✅ Application functionality is fully restored
- ✅ No manual page refresh required

---

### 6. Partial Service Degradation

**Objective**: Test scenario where some services are healthy and others are not.

**Steps**:
1. Keep backend and database running
2. Stop Redis cache
3. Observe system behavior

**Expected Results**:
- ✅ Overall status shows "degraded"
- ✅ Warning banner appears (not error)
- ✅ Database operations work normally
- ✅ Cache-dependent operations fall back to database
- ✅ Performance may be slower but no data loss

---

### 7. Health Check Monitoring

**Objective**: Verify that periodic health checks work correctly.

**Steps**:
1. Start frontend with all services running
2. Monitor console logs for health check activity
3. Observe health check interval (30 seconds)

**Expected Results**:
- ✅ Health checks run every 30 seconds
- ✅ Console shows: "✅ Health check passed: healthy (XXms)"
- ✅ Connection status indicator shows "Online"
- ✅ No error banners or notifications
- ✅ Health data includes all service statuses

---

### 8. API Error Handling

**Objective**: Test handling of various HTTP error codes.

**Test Cases**:

#### 8.1 - 401 Unauthorized
- ✅ User is redirected to login page
- ✅ Auth tokens are cleared
- ✅ No error notification shown (handled by auth flow)

#### 8.2 - 403 Forbidden
- ✅ Error notification: "You do not have permission to perform this action."
- ✅ User remains on current page
- ✅ No retry attempts

#### 8.3 - 404 Not Found
- ✅ Error notification: "The requested resource was not found."
- ✅ No retry attempts

#### 8.4 - 500 Internal Server Error
- ✅ Error notification: "A server error occurred. Our team has been notified."
- ✅ Retry attempts (up to 3 times)
- ✅ Exponential backoff

#### 8.5 - 503 Service Unavailable
- ✅ Error notification: "Service is temporarily unavailable..."
- ✅ Connection status shows service as unhealthy
- ✅ Retry attempts
- ✅ Banner appears

---

## Manual Testing Checklist

### Visual Verification
- [ ] Connection status indicator is visible in header
- [ ] Indicator shows correct icon for each status
- [ ] Indicator tooltip shows helpful information
- [ ] Banner appears at the top of the page
- [ ] Banner has correct severity color (red for error, yellow for warning)
- [ ] Banner message is clear and user-friendly
- [ ] Banner buttons work correctly
- [ ] Notifications appear in top-right corner
- [ ] Notifications auto-dismiss after 5 seconds

### Functional Verification
- [ ] Health monitoring starts automatically on app load
- [ ] Health checks run periodically (every 30 seconds)
- [ ] Manual retry button triggers immediate health check
- [ ] Refresh button reloads the page
- [ ] Banner can be manually dismissed
- [ ] Banner reappears if issue persists
- [ ] Connection status updates in real-time
- [ ] Multiple error types are handled correctly
- [ ] System recovers automatically when services restore

### Performance Verification
- [ ] Health checks don't impact app performance
- [ ] Retry logic doesn't cause excessive API calls
- [ ] Exponential backoff prevents server overload
- [ ] UI remains responsive during error states
- [ ] No memory leaks from health monitoring

---

## Automated Testing (Future)

### Unit Tests
- Test health monitor service
- Test API interceptors
- Test retry logic
- Test error message generation

### Integration Tests
- Test health check endpoint
- Test service status detection
- Test error propagation

### E2E Tests
- Test complete error scenarios
- Test user workflows during errors
- Test recovery scenarios

---

## Success Criteria

All test scenarios must pass with expected results. The system should:
1. ✅ Detect all types of service failures
2. ✅ Display clear, user-friendly error messages
3. ✅ Provide actionable recovery options
4. ✅ Automatically recover when services restore
5. ✅ Maintain application stability during errors
6. ✅ Log errors appropriately for debugging
7. ✅ Not overwhelm users with excessive notifications
8. ✅ Gracefully degrade for non-critical failures

