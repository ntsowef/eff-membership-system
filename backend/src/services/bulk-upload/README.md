# Bulk Upload Services

This directory contains the Node.js/TypeScript implementation of the bulk upload processor, migrated from the Python standalone processor.

## 📁 Directory Structure

```
bulk-upload/
├── README.md                           # This file
├── types.ts                            # Shared TypeScript interfaces
├── idValidationService.ts              # SA ID validation (Luhn algorithm)
├── preValidationService.ts             # Pre-validation (duplicates, existing members)
├── fileReaderService.ts                # Excel file reading and parsing
├── iecVerificationService.ts           # IEC API integration wrapper
├── databaseOperationsService.ts        # Database insert/update operations
├── excelReportService.ts               # 7-sheet Excel report generation
├── bulkUploadOrchestrator.ts           # Main coordinator service
├── processingQueueService.ts           # Bull job queue management
├── bulkUploadWebSocketService.ts       # WebSocket progress updates
└── __tests__/                          # Unit tests
    ├── idValidationService.test.ts
    ├── preValidationService.test.ts
    ├── fileReaderService.test.ts
    ├── databaseOperationsService.test.ts
    ├── excelReportService.test.ts
    └── bulkUploadOrchestrator.test.ts
```

## 🎯 Service Responsibilities

### 1. **idValidationService.ts**
- SA ID number validation using Luhn checksum algorithm
- ID number normalization (padding, cleaning)
- Date of birth extraction
- Gender detection
- Citizenship validation

### 2. **preValidationService.ts**
- Duplicate detection within uploaded file
- Existing member lookup in database
- Column name normalization
- Data quality checks

### 3. **fileReaderService.ts**
- Excel file reading (XLSX format)
- Column mapping and normalization
- Date parsing (Excel serial dates)
- Expiry date calculation (Last Payment + 24 months)
- Data type conversion

### 4. **iecVerificationService.ts**
- Wrapper around existing `iecApiService.ts`
- Batch processing (5 records at a time)
- Rate limiting (10,000 requests/hour)
- Retry logic for failed requests
- VD code mapping (222222222, 999999999)

### 5. **databaseOperationsService.ts**
- Member insert operations
- Member update operations
- Transaction management
- Metro-to-subregion code mapping
- Membership status assignment

### 6. **excelReportService.ts**
- 7-sheet Excel report generation:
  1. Summary
  2. All Uploaded Rows (with IEC status, existing member info)
  3. Invalid IDs (all original columns)
  4. Duplicates (all original columns)
  5. Not Registered with IEC
  6. New Members
  7. Existing Members (with ward/VD comparison)
- Cell styling and color coding
- Column formatting

### 7. **bulkUploadOrchestrator.ts**
- Main coordinator service
- Processing pipeline orchestration:
  1. File reading
  2. Pre-validation
  3. IEC verification
  4. Database operations
  5. Report generation
- Error handling and rollback
- Progress tracking
- Logging

### 8. **processingQueueService.ts**
- Bull job queue management
- Job creation and tracking
- Priority handling
- Concurrent processing limits
- Job status updates
- Retry logic for failed jobs

### 9. **bulkUploadWebSocketService.ts**
- Thin wrapper around `websocketService.ts`
- Real-time progress updates
- Stage-specific notifications
- Error notifications
- Completion notifications

## 🔗 Integration with Existing Services

### Reused Services
- **iecApiService.ts** - IEC API integration (100% reusable)
- **websocketService.ts** - WebSocket communication (100% reusable)
- **database-hybrid.ts** - Database connection pool (100% reusable)
- **redisService.ts** - Redis operations for queue (100% reusable)

### New Services
All services in this directory are new implementations, ported from Python.

## 📊 Processing Pipeline

```
Excel File Upload
    ↓
[fileReaderService] - Read and parse Excel
    ↓
[preValidationService] - Validate IDs, detect duplicates
    ↓
[iecVerificationService] - Verify with IEC API
    ↓
[databaseOperationsService] - Insert/update members
    ↓
[excelReportService] - Generate 7-sheet report
    ↓
Report Download
```

## 🧪 Testing

### Unit Tests
- Located in `__tests__/` directory
- Use Jest testing framework
- Mock external dependencies (database, IEC API, file system)
- Target: >80% code coverage

### Integration Tests
- Located in `test/bulk-upload-integration/`
- Test end-to-end processing
- Use test database
- Use mock IEC API server

### Comparison Tests
- Located in `test/bulk-upload-comparison/`
- Compare Python vs Node.js outputs
- Validate data accuracy
- Ensure feature parity

## 🚀 Usage

### Direct Service Usage
```typescript
import { bulkUploadOrchestrator } from './services/bulk-upload/bulkUploadOrchestrator';

const result = await bulkUploadOrchestrator.processFile({
  filePath: '/path/to/file.xlsx',
  uploadedBy: 'user@example.com',
  fileId: 123
});
```

### Queue-Based Processing
```typescript
import { processingQueueService } from './services/bulk-upload/processingQueueService';

const job = await processingQueueService.addJob({
  filePath: '/path/to/file.xlsx',
  uploadedBy: 'user@example.com',
  fileId: 123
});
```

## 📝 Migration Status

**Phase:** 1 - Preparation & Analysis  
**Status:** In Progress  
**Next Phase:** Core Services Implementation

See `test/bulk-upload-poc/MIGRATION_PLAN.md` for full migration plan.

## 📚 Documentation

- **Migration Plan:** `test/bulk-upload-poc/MIGRATION_PLAN.md`
- **Technical Specification:** `test/bulk-upload-poc/TECHNICAL_SPECIFICATION.md`
- **Python Codebase Analysis:** `test/bulk-upload-poc/PHASE1_PYTHON_CODEBASE_ANALYSIS.md`
- **Architecture Documentation:** `test/bulk-upload-poc/PHASE1_ARCHITECTURE_DOCUMENTATION.md`
- **Integration Points:** `test/bulk-upload-poc/PHASE1_INTEGRATION_POINTS.md`

---

**Created:** 2025-11-24  
**Version:** 1.0  
**Status:** Development Environment Setup Complete
