# Export Authentication Issue - Diagnosis & Fix

## Issue Summary

**Error:** `Authorization header is required` when clicking the export button in Ward Membership Audit page.

**Endpoint:** `GET /api/v1/audit/ward-membership/export?format=excel`

**Status:** The user is logged in, but the export request is not including the Authorization header.

---

## Root Cause Analysis

### Potential Issues Identified:

1. **Headers Not Initialized for Blob Requests**
   - When `responseType: 'blob'` is set, the `config.headers` object might not be properly initialized
   - The axios interceptor tries to set `config.headers.Authorization` but fails if headers is undefined

2. **Token Not Found in localStorage**
   - The axios interceptor reads from `localStorage.getItem('auth-storage')`
   - If the token is missing or the storage is corrupted, the header won't be added

3. **Timing Issue**
   - The export might be triggered before the auth state is fully persisted to localStorage

---

## Fixes Applied

### Fix 1: Enhanced Axios Interceptor (frontend/src/lib/api.ts)

**Changes:**
- Added check to ensure `config.headers` exists before setting Authorization
- Added more detailed console logging for debugging
- Added logging of localStorage keys when token is not found

**Code:**
```typescript
// Ensure headers object exists (important for blob requests)
if (!config.headers) {
  config.headers = {} as any;
}

// ... rest of interceptor code
```

### Fix 2: Better Error Handling (frontend/src/components/audit/WardAuditTable.tsx)

**Changes:**
- Added console logging when export starts
- Added specific error message for 401 authentication errors
- Instructs user to log out and log back in

**Code:**
```typescript
catch (error: any) {
  console.error('❌ Export failed:', error);
  
  // Check if it's an authentication error
  if (error.response?.status === 401) {
    onExportError('Authentication failed. Please log out and log back in, then try again.');
  } else {
    onExportError(error.message || 'Export failed');
  }
}
```

---

## Diagnostic Tools Created

### Tool 1: Auth Token Checker
**File:** `frontend/check-auth-token.html`

**Purpose:** Check if the authentication token is properly stored in localStorage

**How to use:**
1. Navigate to: `http://localhost:3000/check-auth-token.html`
2. Click "🔄 Refresh Check"
3. Verify that the token is present and valid

### Tool 2: Export Authentication Tester
**File:** `frontend/test-export-auth.html`

**Purpose:** Test if the export endpoint can be called with proper authentication

**How to use:**
1. Navigate to: `http://localhost:3000/test-export-auth.html`
2. Click "1️⃣ Check Auth Token" to verify token exists
3. Click "2️⃣ Test Export Endpoint" to test the actual export call
4. Check if the export succeeds or fails with specific error details

---

## Testing Steps

### Step 1: Check Browser Console
1. Open browser console (F12)
2. Click the export button
3. Look for these log messages:
   - `🔑 Axios Interceptor - Token from auth-storage:`
   - `✅ Axios Interceptor - Authorization header added` (should see this)
   - `❌ Axios Interceptor - NO TOKEN FOUND in auth-storage!` (should NOT see this)

### Step 2: Verify Token in localStorage
1. Open browser console (F12)
2. Go to Application tab → Local Storage
3. Find `auth-storage` key
4. Verify it contains:
   ```json
   {
     "state": {
       "token": "eyJ...",
       "user": {...},
       "isAuthenticated": true
     }
   }
   ```

### Step 3: Test with Diagnostic Tools
1. Use `check-auth-token.html` to verify token exists
2. Use `test-export-auth.html` to test the export endpoint directly

---

## Solutions for User

### Solution 1: Log Out and Log Back In (Recommended)
1. Click logout button
2. Clear browser cache (Ctrl+Shift+Delete)
3. Log back in
4. Try export again

### Solution 2: Clear Auth Storage Manually
1. Open browser console (F12)
2. Run: `localStorage.removeItem('auth-storage')`
3. Refresh page
4. Log in again

### Solution 3: Check Token Expiration
1. Open `check-auth-token.html`
2. Check if token is expired
3. If expired, log out and log back in

---

## Expected Console Output (Success)

When export works correctly, you should see:
```
🔑 Axios Interceptor - Token from auth-storage: eyJhbGciOiJIUzI1NiIs...
🔑 Axios Interceptor - Request URL: /audit/ward-membership/export
🔑 Axios Interceptor - Response Type: blob
✅ Axios Interceptor - Authorization header added
📤 Axios Interceptor - Request config: {
  url: '/audit/ward-membership/export',
  method: 'get',
  responseType: 'blob',
  hasAuthHeader: true,
  authHeaderValue: 'Bearer eyJhbGciOiJI...'
}
🔄 Starting PDF export with filters: {...}
```

## Expected Console Output (Failure)

When export fails due to missing token:
```
🔑 Axios Interceptor - Token from auth-storage: NULL
❌ Axios Interceptor - NO TOKEN FOUND in auth-storage!
❌ Axios Interceptor - localStorage keys: ['ui-storage', 'ward-membership-audit-store', ...]
📤 Axios Interceptor - Request config: {
  url: '/audit/ward-membership/export',
  method: 'get',
  responseType: 'blob',
  hasAuthHeader: false,
  authHeaderValue: 'NONE'
}
❌ Export failed: Request failed with status code 401
```

---

## Next Steps

1. **Ask user to check browser console** when clicking export
2. **Share console logs** to identify exact issue
3. **Try diagnostic tools** to isolate the problem
4. **Log out and log back in** as first solution attempt

---

## Related Files Modified

1. ✅ `frontend/src/lib/api.ts` - Enhanced axios interceptor
2. ✅ `frontend/src/components/audit/WardAuditTable.tsx` - Better error handling
3. ✅ `frontend/check-auth-token.html` - Diagnostic tool
4. ✅ `frontend/test-export-auth.html` - Export test tool

---

**Date:** 2025-11-07  
**Status:** ✅ FIXES APPLIED - AWAITING USER TESTING  
**Priority:** HIGH - Affects export functionality

