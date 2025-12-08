# Error Handling System - Quick Start Demo

## Quick Demo: See It In Action

### Prerequisites
- Both backend and frontend servers running
- Access to terminal/command prompt

---

## Demo 1: Backend Server Down (2 minutes)

**What you'll see**: Red error banner, offline indicator, retry functionality

### Steps:

1. **Open the application** in your browser: `http://localhost:3000`
   - Log in if needed
   - Notice the green "Online" indicator in the header

2. **Stop the backend server**:
   ```powershell
   # In the backend terminal, press Ctrl+C
   # Or in a new terminal:
   Get-Process -Name node | Where-Object {$_.Path -like "*backend*"} | Stop-Process -Force
   ```

3. **Wait 30 seconds** (or trigger an API call)
   - Watch the header indicator change to "Offline" (red)
   - A red banner appears at the top:
     ```
     Backend Server Unreachable
     Cannot connect to the backend server. Please check your internet connection or try again later.
     [Retry] [Refresh Page] [X]
     ```
   - A notification appears in the top-right corner

4. **Click the "Retry" button**
   - Loading indicator appears
   - After a moment, it confirms the server is still down

5. **Restart the backend server**:
   ```powershell
   cd backend
   npm run dev
   ```

6. **Wait for recovery** (or click Retry)
   - Header indicator changes to "Online" (green)
   - Banner automatically disappears
   - System is fully functional again

**Expected Time**: Connection detected down in ~30 seconds, recovery detected immediately

---

## Demo 2: Database Connection Failure (3 minutes)

**What you'll see**: Red error banner, service down indicator, database-specific message

### Steps:

1. **Ensure backend is running**

2. **Stop PostgreSQL**:
   ```powershell
   # Windows:
   net stop postgresql-x64-14
   
   # Or stop via Services app (services.msc)
   ```

3. **Wait 30 seconds** (or try to view members list)
   - Header indicator shows "Service Down" (red)
   - Red banner appears:
     ```
     Database Connection Failure
     The system cannot connect to the database. Data operations are temporarily unavailable.
     [Retry] [X]
     ```
   - Any data operations show error messages

4. **Try to perform a data operation**
   - Navigate to Members page
   - Error notification appears
   - Data cannot be loaded

5. **Restart PostgreSQL**:
   ```powershell
   # Windows:
   net start postgresql-x64-14
   ```

6. **Click Retry or wait**
   - System detects database is back
   - Banner disappears
   - Data operations work again

---

## Demo 3: Cache Service Failure (2 minutes)

**What you'll see**: Yellow warning banner, degraded indicator, system still works

### Steps:

1. **Ensure backend and database are running**

2. **Stop Redis**:
   ```powershell
   # Windows:
   net stop Redis
   ```

3. **Wait 30 seconds**
   - Header indicator shows "Degraded" (yellow)
   - Yellow warning banner appears:
     ```
     Reduced Performance
     The cache service is unavailable. The system may be slower than usual, but all features remain functional.
     [X]
     ```
   - Warning notification appears

4. **Try using the application**
   - All features still work
   - May be slightly slower
   - No blocking errors

5. **Restart Redis**:
   ```powershell
   # Windows:
   net start Redis
   ```

6. **Wait for recovery**
   - Indicator changes to "Online" (green)
   - Banner disappears
   - Performance returns to normal

---

## Demo 4: Network Timeout (1 minute)

**What you'll see**: Retry attempts with exponential backoff

### Steps:

1. **Open Browser DevTools** (F12)

2. **Go to Network tab**
   - Select "Slow 3G" from throttling dropdown

3. **Perform an API operation**
   - Navigate to a page that loads data
   - Watch the Network tab

4. **Observe retry behavior**:
   - Console shows: "Retrying request (1/3) after 1000ms"
   - Console shows: "Retrying request (2/3) after 2000ms"
   - Console shows: "Retrying request (3/3) after 4000ms"
   - After 3 attempts, error is shown

5. **Reset throttling** to "No throttling"
   - System recovers
   - Requests succeed

---

## Visual Indicators Reference

### Connection Status Indicator (Header)

| Status | Color | Icon | Meaning |
|--------|-------|------|---------|
| Online | Green | ✓ | All systems operational |
| Degraded | Yellow | ⚠ | Reduced performance (cache down) |
| Service Down | Red | ✕ | Critical service unavailable |
| Offline | Red | ☁✕ | Cannot reach backend |
| Checking | Blue | ⟳ | Checking connection status |

### Banner Severity

| Type | Color | When Shown |
|------|-------|------------|
| Error | Red | Backend down, database down |
| Warning | Yellow | Cache down, degraded performance |

### Notification Types

| Type | Auto-Dismiss | When Shown |
|------|--------------|------------|
| Error | 5 seconds | Critical errors, failed operations |
| Warning | 5 seconds | Non-critical issues, degraded performance |
| Success | 5 seconds | Successful operations |
| Info | 5 seconds | General information |

---

## Console Messages Reference

### Health Check Messages

```
🏥 Starting health monitor service
✅ Health check passed: healthy (45ms)
❌ Health check failed (1/3): Connection timeout - backend server not responding
🔔 Session extension event received, re-checking status immediately
```

### Retry Messages

```
Retrying request (1/3) after 1000ms
Retrying request (2/3) after 2000ms
Retrying request (3/3) after 4000ms
```

### API Error Messages

```
🚨 API Error: {
  url: '/api/v1/members',
  method: 'GET',
  status: 503,
  code: 'ERR_NETWORK',
  message: 'Network Error',
  retryCount: 0
}
```

---

## Troubleshooting Demo Issues

### Banner Not Appearing
- Check console for errors
- Verify `showConnectionBanner` state in Redux DevTools
- Ensure health monitor is running

### Indicator Not Updating
- Check if health monitor started successfully
- Look for subscription errors in console
- Verify state updates in Redux DevTools

### Retry Not Working
- Check console for retry messages
- Verify error type matches retry conditions
- Ensure interceptors are configured

---

## Tips for Best Demo Experience

1. **Use two browser windows**: One for the app, one for DevTools
2. **Keep console open**: Shows real-time status updates
3. **Use Redux DevTools**: Monitor state changes
4. **Test one scenario at a time**: Easier to observe behavior
5. **Wait for health checks**: Give system time to detect issues (30s)
6. **Use manual retry**: Faster than waiting for automatic checks

---

## Next Steps After Demo

1. Review the full test plan: `ERROR_HANDLING_TEST_PLAN.md`
2. Read the implementation guide: `ERROR_HANDLING_IMPLEMENTATION_GUIDE.md`
3. Check the summary: `IMPLEMENTATION_SUMMARY.md`
4. Run through all test scenarios
5. Customize messages and intervals as needed

