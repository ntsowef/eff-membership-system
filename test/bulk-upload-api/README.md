# Bulk Upload API Integration Tests

This directory contains integration tests for the Bulk Upload API endpoints.

## Prerequisites

1. **Backend server must be running** on `http://localhost:5000`
2. **Database must be initialized** with the `bulk_upload_jobs` table
3. **Sample Excel file** must exist at `test/sample-data/bulk-upload-sample.xlsx`
4. **Valid credentials** for authentication (default: `national.admin@eff.org.za` / `Admin@123`)

## Running the Tests

### Option 1: Using ts-node (Recommended)

```bash
cd C:/Development/NewProj/Membership-newV2
npx ts-node test/bulk-upload-api/test-bulk-upload-api.ts
```

### Option 2: Compile and run

```bash
cd C:/Development/NewProj/Membership-newV2/backend
npx tsc test/bulk-upload-api/test-bulk-upload-api.ts
node test/bulk-upload-api/test-bulk-upload-api.js
```

## Test Coverage

The test suite covers all 6 bulk upload API endpoints:

### 1. POST /api/v1/bulk-upload/process
- **Purpose:** Upload and process an Excel file
- **Authentication:** Required (Bearer token)
- **Permission:** `members.create`
- **Request:** Multipart form data with `file` field
- **Response:** Job ID, status, validation stats, database stats, report path

### 2. GET /api/v1/bulk-upload/status/:jobId
- **Purpose:** Get the status of a bulk upload job
- **Authentication:** Required (Bearer token)
- **Permission:** `members.read`
- **Response:** Job details including status, file name, processing duration, stats

### 3. GET /api/v1/bulk-upload/report/:jobId
- **Purpose:** Download the Excel report for a completed job
- **Authentication:** Required (Bearer token)
- **Permission:** `members.read`
- **Response:** Excel file (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)

### 4. GET /api/v1/bulk-upload/history
- **Purpose:** Get paginated upload history for the authenticated user
- **Authentication:** Required (Bearer token)
- **Permission:** `members.read`
- **Query Params:** `page` (default: 1), `limit` (default: 20)
- **Response:** Paginated list of jobs with pagination metadata

### 5. GET /api/v1/bulk-upload/stats
- **Purpose:** Get upload statistics for the authenticated user
- **Authentication:** Required (Bearer token)
- **Permission:** `members.read`
- **Response:** Aggregate statistics (total uploads, success rate, avg processing time, etc.)

### 6. POST /api/v1/bulk-upload/cancel/:jobId
- **Purpose:** Cancel a running job
- **Authentication:** Required (Bearer token)
- **Permission:** `members.create`
- **Response:** Updated job status
- **Note:** Can only cancel jobs that are in 'pending' or 'processing' status

## Expected Output

```
================================================================================
BULK UPLOAD API INTEGRATION TESTS
================================================================================

🔐 Authenticating...
✅ Authentication successful
   User: National Admin
   Email: national.admin@eff.org.za

📤 Test 1: POST /bulk-upload/process
   Uploading file: test/sample-data/bulk-upload-sample.xlsx
✅ Upload successful!
   Job ID: job-1732531200000-1234
   Status: completed
   File: bulk-upload-sample.xlsx
   Processing Time: 5432 ms
   Validation Stats: { ... }
   Database Stats: { ... }
   Report: /api/v1/bulk-upload/report/job-1732531200000-1234

⏳ Waiting 2 seconds for processing to complete...

📊 Test 2: GET /bulk-upload/status/job-1732531200000-1234
✅ Job status retrieved!
   Job ID: job-1732531200000-1234
   Status: completed
   File: bulk-upload-sample.xlsx
   ...

📥 Test 3: GET /bulk-upload/report/job-1732531200000-1234
✅ Report downloaded!
   Content Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
   Content Length: 45678 bytes
   Saved to: test/bulk-upload-api/report-job-1732531200000-1234.xlsx

📜 Test 4: GET /bulk-upload/history
✅ Upload history retrieved!
   Total Jobs: 5
   Page: 1
   Total Pages: 1
   Jobs on this page: 5
   ...

📈 Test 5: GET /bulk-upload/stats
✅ Upload statistics retrieved!
   Total Uploads: 5
   Successful: 4
   Failed: 1
   Success Rate: 80.00%
   ...

================================================================================
✅ ALL TESTS COMPLETED!
================================================================================
```

## Troubleshooting

### Error: "Authentication failed"
- Check that the backend server is running
- Verify credentials in the test file
- Ensure the user exists in the database

### Error: "Test file not found"
- Create a sample Excel file at `test/sample-data/bulk-upload-sample.xlsx`
- Use the format specified in Phase 1 documentation

### Error: "Table bulk_upload_jobs does not exist"
- Run the migration: `npx ts-node backend/scripts/run-bulk-upload-migration.ts`

### Error: "Permission denied"
- Ensure the authenticated user has the required permissions
- Check role-based access control settings

## Notes

- The test creates real database records
- Downloaded reports are saved to the test directory
- Tests run sequentially to avoid race conditions
- Processing time depends on file size and IEC verification settings

