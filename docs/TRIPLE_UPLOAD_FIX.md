# Triple Upload Issue Fix

## Problem Description
When uploading a file in the Self-Data Management module (`localhost:3000/admin/self-data-management`), the system was creating **three entries** in the upload history and displaying the error message "Failed to upload file".

## Root Cause Analysis

The issue was caused by **multiple layers of retry logic** in the frontend:

### 1. Axios Interceptor Retries
- **Location**: `frontend/src/services/apiInterceptors.ts`
- **Behavior**: Automatically retries failed requests **3 times** for 5xx server errors
- **Impact**: Each failed upload attempt was retried 3 times (1 original + 2 retries = 3 total)

### 2. React Query Retries
- **Location**: `frontend/src/lib/queryClient.ts`
- **Behavior**: Configured to retry mutations **2 times** for server errors
- **Impact**: Could potentially multiply the axios retries

### 3. Backend Database Entry Timing
- **Location**: `backend/src/routes/selfDataManagement.ts`
- **Behavior**: Database entry was created **before** verifying Python process could start
- **Impact**: Each retry created a new database entry, even if the upload ultimately failed

## Solution Implemented

### Frontend Changes

#### 1. Disabled React Query Retries for Upload Mutation
**File**: `frontend/src/pages/selfDataManagement/BulkFileUploadTab.tsx`

```typescript
const uploadMutation = useMutation({
  mutationFn: uploadBulkFile,
  retry: false, // IMPORTANT: Disable retries to prevent duplicate database entries
  // ... rest of config
});
```

#### 2. Added X-No-Retry Header to Upload Request
**File**: `frontend/src/services/selfDataManagementApi.ts`

```typescript
const response = await api.post<ApiResponse<UploadedFile>>(
  '/self-data-management/bulk-upload',
  formData,
  {
    headers: {
      'Content-Type': undefined,
      'X-No-Retry': 'true', // Disable axios interceptor retries for file uploads
    },
    transformRequest: [(data) => data],
  }
);
```

#### 3. Updated Axios Interceptor to Respect X-No-Retry Header
**File**: `frontend/src/services/apiInterceptors.ts`

```typescript
// Skip retry for requests with X-No-Retry header (e.g., file uploads)
if (config?.headers?.['X-No-Retry']) {
  return Promise.reject(error);
}
```

### Backend Changes

#### 1. Added Try-Catch Block with Cleanup Logic
**File**: `backend/src/routes/selfDataManagement.ts`

- Wrapped file registration and Python process spawn in try-catch
- Added error handling for Python process spawn failures
- Implemented cleanup logic to delete database entry if Python process fails to start
- Added file deletion from disk if upload fails after database entry

#### 2. Added Python Process Error Handler
```typescript
pythonProcess.on('error', async (error) => {
  console.error(`❌ Failed to start Python process for file_id ${uploadedFile.file_id}:`, error);
  await SelfDataManagementModel.updateFileStatus(
    uploadedFile.file_id,
    'failed',
    0, 0, 0, 0,
    `Failed to start processing: ${error.message}`
  );
});
```

#### 3. Added Python Script Existence Check
```typescript
// Verify Python script exists
if (!fs.existsSync(pythonScript)) {
  throw new Error(`Python script not found: ${pythonScript}`);
}
```

## Testing Instructions

1. **Start the application**:
   ```bash
   # Backend
   cd backend
   npm run dev

   # Frontend
   cd frontend
   npm run dev
   ```

2. **Navigate to Self-Data Management**:
   - Go to `http://localhost:3000/admin/self-data-management`
   - Log in with appropriate credentials

3. **Test File Upload**:
   - Upload a valid Excel file
   - Verify only **ONE entry** appears in the upload history
   - Verify success message appears

4. **Test Error Handling**:
   - Upload an invalid file or trigger an error
   - Verify only **ONE entry** appears in the upload history
   - Verify error message is displayed
   - Verify database entry is cleaned up if Python process fails to start

## Files Modified

### Frontend
- `frontend/src/pages/selfDataManagement/BulkFileUploadTab.tsx`
- `frontend/src/services/selfDataManagementApi.ts`
- `frontend/src/services/apiInterceptors.ts`

### Backend
- `backend/src/routes/selfDataManagement.ts`

## Additional Notes

- The fix ensures that file uploads are **never retried automatically**
- Database entries are only created when the upload is successful
- Failed uploads are properly cleaned up to prevent orphaned database records
- The `X-No-Retry` header can be used for other endpoints that should not be retried
- Error messages are now more descriptive and help with debugging

## Prevention

To prevent similar issues in the future:

1. **Always disable retries for mutations that create database records**
2. **Use the `X-No-Retry` header for file uploads and other non-idempotent operations**
3. **Implement proper error handling and cleanup logic in the backend**
4. **Test error scenarios to ensure cleanup logic works correctly**
5. **Monitor upload history for duplicate entries during testing**

