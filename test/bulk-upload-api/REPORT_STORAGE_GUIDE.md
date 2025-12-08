# BULK UPLOAD REPORT STORAGE SYSTEM - COMPREHENSIVE GUIDE

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [API Endpoints](#api-endpoints)
4. [Service Methods](#service-methods)
5. [Usage Examples](#usage-examples)
6. [Configuration](#configuration)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)

---

## 📖 OVERVIEW

The Report Storage System provides comprehensive management of bulk upload Excel reports, including:

- **Metadata Tracking** - Track file size, creation date, access count
- **Storage Statistics** - Monitor total reports, storage size, date ranges
- **Retention Policies** - Automatic cleanup based on configurable retention period
- **Orphaned File Cleanup** - Remove files not tracked in database
- **Date Range Queries** - Query reports within specific date ranges
- **Report Deletion** - Delete individual reports with database cleanup

---

## 🏗️ ARCHITECTURE

### Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│                      REST API Layer                         │
│  GET  /reports/stats                                        │
│  GET  /reports/metadata                                     │
│  GET  /reports/:jobId/metadata                              │
│  DELETE /reports/:jobId                                     │
│  POST /reports/cleanup                                      │
│  POST /reports/cleanup-orphaned                             │
│  GET  /reports/date-range                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Controller Layer                          │
│  BulkUploadController                                       │
│  - getReportStorageStats()                                  │
│  - getReportMetadata()                                      │
│  - getAllReportMetadata()                                   │
│  - deleteReport()                                           │
│  - cleanupOldReports()                                      │
│  - cleanupOrphanedReports()                                 │
│  - getReportsByDateRange()                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                             │
│  BulkUploadReportStorage                                    │
│  - getReportMetadata()                                      │
│  - getAllReportMetadata()                                   │
│  - getStorageStats()                                        │
│  - deleteReport()                                           │
│  - cleanupOldReports()                                      │
│  - cleanupOrphanedReports()                                 │
│  - reportExists()                                           │
│  - getReportPath()                                          │
│  - getReportsByDateRange()                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ├──────────────────┬─────────────────┐
                         ▼                  ▼                 ▼
                  ┌─────────────┐   ┌─────────────┐  ┌─────────────┐
                  │  Database   │   │ File System │  │   Logger    │
                  │  (Postgres) │   │  (reports/) │  │             │
                  └─────────────┘   └─────────────┘  └─────────────┘
```

### Data Flow

```
1. Client Request
   ↓
2. Authentication & Authorization
   ↓
3. Controller Method
   ↓
4. Service Method
   ↓
5. Database Query + File System Check
   ↓
6. Response with Data/Statistics
```

---

## 🔌 API ENDPOINTS

### 1. Get Storage Statistics

**Endpoint:** `GET /api/v1/bulk-upload/reports/stats`

**Description:** Get overall storage statistics

**Authentication:** Required (Bearer token)

**Permission:** `members.read`

**Response:**
```json
{
  "success": true,
  "data": {
    "total_reports": 10,
    "total_size_bytes": 5242880,
    "total_size_mb": 5.0,
    "oldest_report_date": "2025-11-01T10:00:00.000Z",
    "newest_report_date": "2025-11-25T15:30:00.000Z",
    "archived_count": 0,
    "active_count": 10
  }
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:5000/api/v1/bulk-upload/reports/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 2. Get All Report Metadata

**Endpoint:** `GET /api/v1/bulk-upload/reports/metadata`

**Description:** Get metadata for all reports

**Authentication:** Required (Bearer token)

**Permission:** `members.read`

**Query Parameters:**
- `limit` (optional) - Number of reports to return (default: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "job_id": "job-1732543200000-1234",
        "report_path": "C:/Development/NewProj/Membership-newV2/reports/bulk-upload-report-2025-11-25T10-30-00.xlsx",
        "report_filename": "bulk-upload-report-2025-11-25T10-30-00.xlsx",
        "file_size_bytes": 524288,
        "created_at": "2025-11-25T10:30:00.000Z",
        "access_count": 0,
        "is_archived": false,
        "retention_days": 90
      }
    ],
    "count": 1
  }
}
```

**cURL Example:**
```bash
curl -X GET "http://localhost:5000/api/v1/bulk-upload/reports/metadata?limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 3. Get Specific Report Metadata

**Endpoint:** `GET /api/v1/bulk-upload/reports/:jobId/metadata`

**Description:** Get metadata for specific report

**Authentication:** Required (Bearer token)

**Permission:** `members.read`

**Path Parameters:**
- `jobId` - Job ID

**Response:**
```json
{
  "success": true,
  "data": {
    "job_id": "job-1732543200000-1234",
    "report_path": "C:/Development/NewProj/Membership-newV2/reports/bulk-upload-report-2025-11-25T10-30-00.xlsx",
    "report_filename": "bulk-upload-report-2025-11-25T10-30-00.xlsx",
    "file_size_bytes": 524288,
    "created_at": "2025-11-25T10:30:00.000Z",
    "access_count": 0,
    "is_archived": false,
    "retention_days": 90
  }
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:5000/api/v1/bulk-upload/reports/job-123/metadata \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 4. Delete Report

**Endpoint:** `DELETE /api/v1/bulk-upload/reports/:jobId`

**Description:** Delete report file and database entry

**Authentication:** Required (Bearer token)

**Permission:** `members.delete`

**Path Parameters:**
- `jobId` - Job ID

**Response:**
```json
{
  "success": true,
  "data": {
    "job_id": "job-1732543200000-1234"
  },
  "message": "Report deleted successfully"
}
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:5000/api/v1/bulk-upload/reports/job-123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 5. Cleanup Old Reports

**Endpoint:** `POST /api/v1/bulk-upload/reports/cleanup`

**Description:** Clean up reports older than retention period

**Authentication:** Required (Bearer token)

**Permission:** `members.delete`

**Request Body:**
```json
{
  "retention_days": 90
}
```

**Validation:**
- `retention_days` must be at least 7 days

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted_count": 5,
    "freed_space_bytes": 2621440,
    "freed_space_mb": 2.5,
    "errors": []
  },
  "message": "Cleaned up 5 old reports"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/v1/bulk-upload/reports/cleanup \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"retention_days": 90}'
```

---

### 6. Cleanup Orphaned Reports

**Endpoint:** `POST /api/v1/bulk-upload/reports/cleanup-orphaned`

**Description:** Clean up report files not tracked in database

**Authentication:** Required (Bearer token)

**Permission:** `members.delete`

**Request Body:**
```json
{
  "reports_dir": "reports"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted_count": 3,
    "freed_space_bytes": 1572864,
    "freed_space_mb": 1.5,
    "errors": []
  },
  "message": "Cleaned up 3 orphaned reports"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/v1/bulk-upload/reports/cleanup-orphaned \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reports_dir": "reports"}'
```

---

### 7. Get Reports by Date Range

**Endpoint:** `GET /api/v1/bulk-upload/reports/date-range`

**Description:** Get reports within specific date range

**Authentication:** Required (Bearer token)

**Permission:** `members.read`

**Query Parameters:**
- `start_date` - Start date (ISO 8601 format: YYYY-MM-DD)
- `end_date` - End date (ISO 8601 format: YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "job_id": "job-1732543200000-1234",
        "report_path": "C:/Development/NewProj/Membership-newV2/reports/bulk-upload-report-2025-11-25T10-30-00.xlsx",
        "report_filename": "bulk-upload-report-2025-11-25T10-30-00.xlsx",
        "file_size_bytes": 524288,
        "created_at": "2025-11-25T10:30:00.000Z",
        "access_count": 0,
        "is_archived": false,
        "retention_days": 90
      }
    ],
    "count": 1
  }
}
```

**cURL Example:**
```bash
curl -X GET "http://localhost:5000/api/v1/bulk-upload/reports/date-range?start_date=2025-11-01&end_date=2025-11-25" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔧 SERVICE METHODS

### BulkUploadReportStorage Class

Located in: `backend/src/services/bulk-upload/bulkUploadReportStorage.ts`

#### 1. getReportMetadata(jobId: string)

Get metadata for specific report.

**Parameters:**
- `jobId` - Job ID

**Returns:** `Promise<ReportMetadata | null>`

**Example:**
```typescript
const metadata = await BulkUploadReportStorage.getReportMetadata('job-123');
if (metadata) {
  console.log(`File Size: ${metadata.file_size_bytes} bytes`);
}
```

---

#### 2. getAllReportMetadata(limit: number = 100)

Get metadata for all reports.

**Parameters:**
- `limit` - Maximum number of reports to return (default: 100)

**Returns:** `Promise<ReportMetadata[]>`

**Example:**
```typescript
const reports = await BulkUploadReportStorage.getAllReportMetadata(50);
console.log(`Found ${reports.length} reports`);
```

---

#### 3. getStorageStats()

Get overall storage statistics.

**Returns:** `Promise<ReportStorageStats>`

**Example:**
```typescript
const stats = await BulkUploadReportStorage.getStorageStats();
console.log(`Total Reports: ${stats.total_reports}`);
console.log(`Total Size: ${stats.total_size_mb}MB`);
```

---

#### 4. deleteReport(jobId: string)

Delete report file and database entry.

**Parameters:**
- `jobId` - Job ID

**Returns:** `Promise<boolean>`

**Example:**
```typescript
const deleted = await BulkUploadReportStorage.deleteReport('job-123');
if (deleted) {
  console.log('Report deleted successfully');
}
```

---

#### 5. cleanupOldReports(retentionDays: number = 90)

Clean up reports older than retention period.

**Parameters:**
- `retentionDays` - Days to retain reports (default: 90)

**Returns:** `Promise<CleanupResult>`

**Example:**
```typescript
const result = await BulkUploadReportStorage.cleanupOldReports(90);
console.log(`Deleted ${result.deleted_count} reports`);
console.log(`Freed ${result.freed_space_mb}MB`);
```

---

#### 6. cleanupOrphanedReports(reportsDir: string)

Clean up report files not tracked in database.

**Parameters:**
- `reportsDir` - Reports directory path

**Returns:** `Promise<CleanupResult>`

**Example:**
```typescript
const result = await BulkUploadReportStorage.cleanupOrphanedReports('reports');
console.log(`Deleted ${result.deleted_count} orphaned files`);
```

---

#### 7. reportExists(jobId: string)

Check if report file exists.

**Parameters:**
- `jobId` - Job ID

**Returns:** `Promise<boolean>`

**Example:**
```typescript
const exists = await BulkUploadReportStorage.reportExists('job-123');
if (!exists) {
  console.log('Report not found');
}
```

---

#### 8. getReportPath(jobId: string)

Get report file path.

**Parameters:**
- `jobId` - Job ID

**Returns:** `Promise<string | null>`

**Example:**
```typescript
const path = await BulkUploadReportStorage.getReportPath('job-123');
if (path) {
  console.log(`Report Path: ${path}`);
}
```

---

#### 9. getReportsByDateRange(startDate: Date, endDate: Date)

Get reports within specific date range.

**Parameters:**
- `startDate` - Start date
- `endDate` - End date

**Returns:** `Promise<ReportMetadata[]>`

**Example:**
```typescript
const startDate = new Date('2025-11-01');
const endDate = new Date('2025-11-25');
const reports = await BulkUploadReportStorage.getReportsByDateRange(startDate, endDate);
console.log(`Found ${reports.length} reports`);
```

---

## 💡 USAGE EXAMPLES

### Example 1: Monitor Storage Usage

```typescript
import { BulkUploadReportStorage } from './services/bulk-upload/bulkUploadReportStorage';

async function monitorStorage() {
  const stats = await BulkUploadReportStorage.getStorageStats();
  
  console.log('=== Storage Statistics ===');
  console.log(`Total Reports: ${stats.total_reports}`);
  console.log(`Total Size: ${stats.total_size_mb}MB`);
  console.log(`Oldest Report: ${stats.oldest_report_date}`);
  console.log(`Newest Report: ${stats.newest_report_date}`);
  
  // Alert if storage exceeds 1GB
  if (stats.total_size_mb > 1024) {
    console.warn('⚠️  Storage exceeds 1GB! Consider cleanup.');
  }
}
```

### Example 2: Scheduled Cleanup

```typescript
import { BulkUploadReportStorage } from './services/bulk-upload/bulkUploadReportStorage';
import cron from 'node-cron';

// Run cleanup every day at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('🧹 Running scheduled report cleanup...');
  
  // Cleanup reports older than 90 days
  const result = await BulkUploadReportStorage.cleanupOldReports(90);
  
  console.log(`✅ Cleanup complete:`);
  console.log(`   Deleted: ${result.deleted_count} reports`);
  console.log(`   Freed: ${result.freed_space_mb}MB`);
  
  if (result.errors.length > 0) {
    console.error('❌ Errors:', result.errors);
  }
});
```

### Example 3: Generate Storage Report

```typescript
import { BulkUploadReportStorage } from './services/bulk-upload/bulkUploadReportStorage';

async function generateStorageReport() {
  const stats = await BulkUploadReportStorage.getStorageStats();
  const allReports = await BulkUploadReportStorage.getAllReportMetadata(1000);
  
  // Group by month
  const byMonth = allReports.reduce((acc, report) => {
    const month = report.created_at.toISOString().substring(0, 7);
    if (!acc[month]) {
      acc[month] = { count: 0, size: 0 };
    }
    acc[month].count++;
    acc[month].size += report.file_size_bytes;
    return acc;
  }, {} as Record<string, { count: number; size: number }>);
  
  console.log('=== Storage Report by Month ===');
  for (const [month, data] of Object.entries(byMonth)) {
    console.log(`${month}: ${data.count} reports, ${(data.size / 1024 / 1024).toFixed(2)}MB`);
  }
}
```

---

## ⚙️ CONFIGURATION

### Environment Variables

```bash
# Reports directory
REPORTS_DIR=reports

# Default retention period (days)
REPORT_RETENTION_DAYS=90

# Archive threshold (days)
REPORT_ARCHIVE_THRESHOLD=30
```

### Service Constants

Located in: `backend/src/services/bulk-upload/bulkUploadReportStorage.ts`

```typescript
private static readonly DEFAULT_RETENTION_DAYS = 90;
private static readonly ARCHIVE_THRESHOLD_DAYS = 30;
```

---

## 🚨 ERROR HANDLING

### Common Errors

#### 1. Report Not Found
```json
{
  "success": false,
  "error": "Report not found"
}
```

**Cause:** Job ID doesn't exist or report file was deleted

**Solution:** Verify job ID exists in database

---

#### 2. Invalid Date Format
```json
{
  "success": false,
  "error": "Invalid date format. Use ISO 8601 format (YYYY-MM-DD)"
}
```

**Cause:** Date parameters not in ISO 8601 format

**Solution:** Use format: `2025-11-25` or `2025-11-25T10:30:00.000Z`

---

#### 3. Retention Period Too Short
```json
{
  "success": false,
  "error": "Retention period must be at least 7 days"
}
```

**Cause:** Retention period less than 7 days

**Solution:** Use retention period >= 7 days

---

## ✅ BEST PRACTICES

### 1. Regular Cleanup

Run cleanup regularly to prevent storage bloat:

```typescript
// Daily cleanup at 2 AM
cron.schedule('0 2 * * *', async () => {
  await BulkUploadReportStorage.cleanupOldReports(90);
  await BulkUploadReportStorage.cleanupOrphanedReports('reports');
});
```

### 2. Monitor Storage

Monitor storage usage and alert when thresholds are exceeded:

```typescript
const stats = await BulkUploadReportStorage.getStorageStats();
if (stats.total_size_mb > 1024) {
  // Send alert
}
```

### 3. Backup Before Cleanup

Backup reports before running cleanup:

```typescript
// Backup reports older than 90 days
const oldReports = await BulkUploadReportStorage.getReportsByDateRange(
  new Date('2020-01-01'),
  new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
);

// Archive to backup location
for (const report of oldReports) {
  // Copy to backup
}

// Then cleanup
await BulkUploadReportStorage.cleanupOldReports(90);
```

### 4. Validate Before Delete

Always verify report exists before deletion:

```typescript
const exists = await BulkUploadReportStorage.reportExists(jobId);
if (exists) {
  await BulkUploadReportStorage.deleteReport(jobId);
}
```

### 5. Handle Errors Gracefully

Always handle errors in cleanup operations:

```typescript
const result = await BulkUploadReportStorage.cleanupOldReports(90);
if (result.errors.length > 0) {
  console.error('Cleanup errors:', result.errors);
  // Log to monitoring system
}
```

---

## 📞 SUPPORT

For issues or questions:
1. Check logs in console
2. Verify database connection
3. Check file system permissions
4. Review error messages

---

**Last Updated:** 2025-11-25  
**Version:** 1.0.0

