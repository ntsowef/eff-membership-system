# Technical Specification: Bulk Upload Processor
## Node.js/TypeScript Implementation

---

## 📋 Overview

**Purpose:** Process bulk member uploads from Excel files with validation, IEC verification, database operations, and comprehensive reporting.

**Technology Stack:**
- **Language:** TypeScript (Node.js 18+)
- **Database:** PostgreSQL 14+
- **Queue:** Bull (Redis-backed)
- **Excel:** xlsx (reading), exceljs (writing)
- **WebSocket:** Socket.io or existing infrastructure
- **Testing:** Jest, Supertest

---

## 🏗️ Architecture

### Service Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     API Layer (Express)                      │
│  POST /api/bulk-upload/process                              │
│  GET  /api/bulk-upload/status/:jobId                        │
│  GET  /api/bulk-upload/report/:jobId                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Bulk Upload Orchestrator Service                │
│  - Coordinates all processing steps                         │
│  - Manages job lifecycle                                    │
│  - Handles errors and rollback                              │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│ File Reader  │    │ Pre-Validation   │    │ IEC Verify   │
│ Service      │───▶│ Service          │───▶│ Service      │
└──────────────┘    └──────────────────┘    └──────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Database Ops     │
                    │ Service          │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Excel Report     │
                    │ Service          │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ WebSocket        │
                    │ Notifications    │
                    └──────────────────┘
```

---

## 📦 Service Specifications

### 1. File Reader Service

**File:** `src/services/bulk-upload/fileReaderService.ts`

**Responsibilities:**
- Read Excel files (.xlsx, .xls)
- Parse and normalize data
- Handle date conversions (Excel serial dates)
- Calculate expiry dates (Last Payment + 24 months)
- Normalize column names

**Interface:**

```typescript
interface FileReaderService {
  readExcelFile(filePath: string): Promise<BulkUploadRecord[]>;
  validateFileFormat(filePath: string): Promise<boolean>;
  getColumnMapping(headers: string[]): ColumnMapping;
}

interface BulkUploadRecord {
  row_number: number;
  'ID Number': string;
  Name?: string;
  Firstname?: string;
  Surname?: string;
  'Cell Number'?: string;
  Email?: string;
  Province?: string;
  Region?: string;
  Municipality?: string;
  Ward?: string;
  'Voting Station'?: string;
  'Date Joined'?: Date;
  'Last Payment'?: Date;
  'Expiry Date'?: Date;
  [key: string]: any;
}
```

**Key Functions:**

```typescript
// Parse Excel serial date to JavaScript Date
function excelSerialToDate(serial: number): Date;

// Add months to a date
function addMonths(date: Date, months: number): Date;

// Calculate expiry date (Last Payment + 24 months)
function calculateExpiryDate(paymentDate: any): Date | null;

// Normalize column names (handle variations)
function normalizeColumnName(name: string): string;
```

**Error Handling:**
- Invalid file format → throw `InvalidFileFormatError`
- Missing required columns → throw `MissingColumnsError`
- Corrupted file → throw `CorruptedFileError`

---

### 2. ID Validation Service

**File:** `src/services/bulk-upload/idValidationService.ts`

**Responsibilities:**
- Validate South African ID numbers
- Implement Luhn checksum algorithm
- Extract date of birth, gender, citizenship
- Detect invalid formats

**Interface:**

```typescript
interface IdValidationService {
  validateSAIdNumber(idNumber: string): ValidationResult;
  normalizeSAIdNumber(idNumber: string): string;
  extractDateOfBirth(idNumber: string): Date | null;
  extractGender(idNumber: string): 'Male' | 'Female' | null;
  extractCitizenship(idNumber: string): 'SA Citizen' | 'Permanent Resident' | null;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
  dateOfBirth?: Date;
  gender?: string;
  citizenship?: string;
}
```

**Luhn Algorithm Implementation:**

```typescript
function calculateLuhnChecksum(idNumber: string): number {
  const digits = idNumber.slice(0, 12).split('').map(Number);
  let sum = 0;
  
  for (let i = 0; i < digits.length; i++) {
    let digit = digits[i];
    
    // Double every second digit
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
  }
  
  return (10 - (sum % 10)) % 10;
}

function validateLuhnChecksum(idNumber: string): boolean {
  const checksum = parseInt(idNumber[12]);
  const calculated = calculateLuhnChecksum(idNumber);
  return checksum === calculated;
}
```

**Validation Rules:**
- Must be exactly 13 digits
- Date of birth must be valid (YYMMDD format)
- Luhn checksum must be correct
- Gender digit must be 0-9
- Citizenship digit must be 0 or 1

---

### 3. Pre-Validation Service

**File:** `src/services/bulk-upload/preValidationService.ts`

**Responsibilities:**
- Validate all ID numbers
- Detect duplicates within file
- Check for existing members in database
- Fetch existing member details (ward, VD)

**Interface:**

```typescript
interface PreValidationService {
  validateRecords(records: BulkUploadRecord[]): Promise<ValidationResult>;
}

interface ValidationResult {
  valid_records: BulkUploadRecord[];
  invalid_ids: InvalidIdRecord[];
  duplicates: DuplicateRecord[];
  existing_members: ExistingMemberRecord[];
  new_members: BulkUploadRecord[];
  validation_stats: ValidationStats;
}

interface ExistingMemberRecord extends BulkUploadRecord {
  member_id: number;
  created_at: Date;
  updated_at: Date;
  existing_ward_code?: string;
  existing_ward_name?: string;
  existing_vd_code?: string;
  existing_vd_name?: string;
  existing_firstname?: string;
  existing_surname?: string;
}
```

**Database Query for Existing Members:**

```sql
SELECT 
  m.id_number, 
  m.member_id, 
  m.created_at, 
  m.updated_at,
  m.firstname,
  m.surname,
  m.ward_code,
  w.ward_name,
  m.voting_district_code,
  vd.voting_district_name
FROM members_consolidated m
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code
WHERE m.id_number = ANY($1)
```

---

### 4. IEC Verification Service

**File:** `src/services/bulk-upload/iecVerificationService.ts`

**Responsibilities:**
- Verify voter registration with IEC API
- Batch processing (5 records at a time)
- Rate limiting and retry logic
- Map VD codes (222222222, 999999999)

**Interface:**

```typescript
interface IECVerificationService {
  verifyVoters(records: BulkUploadRecord[]): Promise<Map<string, IECVoterDetails>>;
  verifyBatch(batch: BulkUploadRecord[]): Promise<IECVoterDetails[]>;
}

interface IECVoterDetails {
  id_number: string;
  is_registered: boolean;
  voting_district_code: string;
  ward_code: string;
  municipality_code: string;
  province_code: string;
  registration_date?: Date;
  error?: string;
}
```

**VD Code Mapping Rules:**

```typescript
function mapVDCode(iecDetails: IECVoterDetails): string {
  if (!iecDetails.is_registered) {
    return '99999999'; // Non-registered voter (8 digits)
  }

  if (!iecDetails.voting_district_code || iecDetails.voting_district_code === '') {
    return '22222222'; // Registered but no VD code (8 digits)
  }

  return iecDetails.voting_district_code;
}
```

**Rate Limiting:**
- 5 records per batch
- 1 second delay between batches
- Exponential backoff on errors (1s, 2s, 4s, 8s)
- Maximum 3 retries per batch

---

### 5. Database Operations Service

**File:** `src/services/bulk-upload/databaseOperationsService.ts`

**Responsibilities:**
- Insert new members
- Update existing members
- Handle transactions
- Map metro codes to sub-region codes

**Interface:**

```typescript
interface DatabaseOperationsService {
  insertMember(record: BulkUploadRecord, iecDetails: IECVoterDetails): Promise<number>;
  updateMember(memberId: number, record: BulkUploadRecord, iecDetails: IECVoterDetails): Promise<boolean>;
  processRecords(records: BulkUploadRecord[], iecResults: Map<string, IECVoterDetails>): Promise<ProcessingResult>;
}

interface ProcessingResult {
  inserts: number;
  updates: number;
  failures: number;
  registered_voters: number;
  not_registered: number;
}
```

**Insert Member Query:**

```sql
INSERT INTO members_consolidated (
  id_number, firstname, surname, cell_number, email,
  voter_district_code, ward_code, membership_status_id,
  date_joined, last_payment_date, expiry_date,
  created_at, updated_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
RETURNING member_id
```

**Update Member Query:**

```sql
UPDATE members_consolidated
SET
  firstname = COALESCE($1, firstname),
  surname = COALESCE($2, surname),
  cell_number = COALESCE($3, cell_number),
  email = COALESCE($4, email),
  voter_district_code = COALESCE($5, voter_district_code),
  ward_code = COALESCE($6, ward_code),
  last_payment_date = COALESCE($7, last_payment_date),
  expiry_date = COALESCE($8, expiry_date),
  updated_at = NOW()
WHERE member_id = $9
```

**Business Rules:**
- All approved members get `membership_status_id = 1` (Good Standing)
- Registered voters without VD get `voter_district_code = '22222222'` (8 digits)
- Non-registered voters get `voter_district_code = '99999999'` (8 digits)
- Metro municipality codes must be mapped to sub-region codes
- Expiry date = Last Payment Date + 24 months

---

### 6. Excel Report Service

**File:** `src/services/bulk-upload/excelReportService.ts`

**Responsibilities:**
- Generate 7-sheet Excel reports
- Apply styling and color coding
- Include IEC status and existing member info
- Save reports to designated directory

**Interface:**

```typescript
interface ExcelReportService {
  generateReport(
    originalData: BulkUploadRecord[],
    validationResult: ValidationResult,
    processingResult: ProcessingResult,
    iecResults: Map<string, IECVoterDetails>
  ): Promise<string>;
}
```

**Report Structure:**

**Sheet 1: Summary**
- Total records uploaded
- Validation statistics (valid/invalid IDs, duplicates)
- Processing results (inserts/updates/failures)
- IEC verification statistics
- Processing duration

**Sheet 2: All Uploaded Rows** ✨
- All original columns from upload file
- **IEC Registered** (YES/NO)
- **IEC Ward** (ward code from IEC)
- **IEC VD Code** (voting district from IEC)
- **Already Exists** (YES/NO)
- **Existing Member Name** (name in database)
- **Existing Ward** (ward in database)
- **Existing VD** (VD in database)
- Color coding: Red (not registered), Yellow (existing member)

**Sheet 3: Invalid IDs**
- All original columns from upload file
- Row Number
- Error message
- Color: Red header

**Sheet 4: Duplicates**
- All original columns from upload file
- Row Number
- Duplicate Of Row
- Color: Yellow header

**Sheet 5: Not Registered Voters**
- ID Number
- Name
- Surname
- IEC Status

**Sheet 6: New Members**
- ID Number
- Name
- Surname
- Cell Number
- Email

**Sheet 7: Existing Members (Updated)**
- ID Number
- Name (from upload)
- Surname (from upload)
- Member ID
- Existing Name in DB
- Existing Ward
- Existing VD
- Last Updated

**Styling:**

```typescript
// Header styling
const headerStyle = {
  font: { bold: true, color: { argb: 'FFFFFFFF' } },
  fill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' } // Blue
  }
};

// Error row styling (not registered)
const errorRowStyle = {
  fill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFC7CE' } // Light red
  }
};

// Warning row styling (existing member)
const warningRowStyle = {
  fill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFEB9C' } // Light yellow
  }
};
```

---

### 7. Bulk Upload Orchestrator

**File:** `src/services/bulk-upload/bulkUploadOrchestrator.ts`

**Responsibilities:**
- Coordinate all processing steps
- Manage job lifecycle
- Handle errors and rollback
- Track progress
- Send WebSocket updates

**Interface:**

```typescript
interface BulkUploadOrchestrator {
  processUpload(
    filePath: string,
    userId: string,
    jobId: string
  ): Promise<ProcessingResult>;
}
```

**Processing Flow:**

```typescript
async function processUpload(filePath: string, userId: string, jobId: string) {
  try {
    // 1. Read file
    updateProgress(jobId, 'reading', 10);
    const records = await fileReaderService.readExcelFile(filePath);

    // 2. Pre-validation
    updateProgress(jobId, 'validating', 20);
    const validationResult = await preValidationService.validateRecords(records);

    // 3. IEC verification
    updateProgress(jobId, 'verifying', 40);
    const iecResults = await iecVerificationService.verifyVoters(
      validationResult.valid_records
    );

    // 4. Database operations
    updateProgress(jobId, 'processing', 70);
    const processingResult = await databaseOperationsService.processRecords(
      validationResult.valid_records,
      iecResults
    );

    // 5. Generate report
    updateProgress(jobId, 'reporting', 90);
    const reportPath = await excelReportService.generateReport(
      records,
      validationResult,
      processingResult,
      iecResults
    );

    // 6. Complete
    updateProgress(jobId, 'complete', 100);

    return {
      success: true,
      reportPath,
      validationResult,
      processingResult
    };

  } catch (error) {
    // Rollback on error
    await rollbackTransaction(jobId);
    updateProgress(jobId, 'failed', 0);
    throw error;
  }
}
```

---

### 8. WebSocket Service

**File:** `src/services/bulk-upload/bulkUploadWebSocketService.ts`

**Responsibilities:**
- Send real-time progress updates
- Notify on completion
- Send error notifications

**Interface:**

```typescript
interface BulkUploadWebSocketService {
  sendProgress(jobId: string, stage: string, percentage: number): void;
  sendComplete(jobId: string, result: ProcessingResult): void;
  sendError(jobId: string, error: Error): void;
}
```

**WebSocket Events:**

```typescript
// Progress update
socket.emit('bulk-upload:progress', {
  jobId: 'job-123',
  stage: 'validating', // reading, validating, verifying, processing, reporting, complete
  percentage: 20,
  message: 'Validating 214 records...'
});

// Completion
socket.emit('bulk-upload:complete', {
  jobId: 'job-123',
  success: true,
  inserts: 0,
  updates: 214,
  failures: 0,
  reportPath: '/reports/bulk-upload-report-2025-11-24T20-21-08.xlsx'
});

// Error
socket.emit('bulk-upload:error', {
  jobId: 'job-123',
  error: 'Database connection failed',
  stage: 'processing'
});
```

---

### 9. Processing Queue Service

**File:** `src/services/bulk-upload/processingQueueService.ts`

**Responsibilities:**
- Manage job queue with Bull
- Handle concurrent processing limits
- Retry failed jobs
- Track job status

**Interface:**

```typescript
interface ProcessingQueueService {
  addJob(filePath: string, userId: string): Promise<string>;
  getJobStatus(jobId: string): Promise<JobStatus>;
  cancelJob(jobId: string): Promise<boolean>;
  getJobHistory(userId: string): Promise<Job[]>;
}

interface JobStatus {
  jobId: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  progress: number;
  stage: string;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}
```

**Queue Configuration:**

```typescript
const bulkUploadQueue = new Bull('bulk-upload', {
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379')
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: false,
    removeOnFail: false
  }
});

// Limit concurrent processing
bulkUploadQueue.process(5, async (job) => {
  return await bulkUploadOrchestrator.processUpload(
    job.data.filePath,
    job.data.userId,
    job.id
  );
});
```

---

## 🔌 API Endpoints

### POST /api/bulk-upload/process

**Description:** Initiate bulk upload processing

**Request:**
```typescript
POST /api/bulk-upload/process
Content-Type: multipart/form-data

{
  file: File, // Excel file
  userId: string
}
```

**Response:**
```typescript
{
  success: true,
  jobId: "job-123",
  message: "Upload queued for processing"
}
```

---

### GET /api/bulk-upload/status/:jobId

**Description:** Get job status and progress

**Response:**
```typescript
{
  jobId: "job-123",
  status: "processing",
  progress: 45,
  stage: "verifying",
  message: "Verifying 100/214 records...",
  createdAt: "2025-11-24T20:21:08Z"
}
```

---

### GET /api/bulk-upload/report/:jobId

**Description:** Download generated Excel report

**Response:** Excel file download

---

### POST /api/bulk-upload/cancel/:jobId

**Description:** Cancel processing job

**Response:**
```typescript
{
  success: true,
  message: "Job cancelled"
}
```

---

## 🗄️ Database Schema

### bulk_upload_logs Table

```sql
CREATE TABLE bulk_upload_logs (
  log_id SERIAL PRIMARY KEY,
  job_id VARCHAR(100) NOT NULL,
  user_id INTEGER REFERENCES users(user_id),
  file_name VARCHAR(255),
  file_path VARCHAR(500),
  total_records INTEGER,
  valid_records INTEGER,
  invalid_records INTEGER,
  duplicates INTEGER,
  inserts INTEGER,
  updates INTEGER,
  failures INTEGER,
  processing_duration_seconds INTEGER,
  status VARCHAR(50), -- queued, processing, complete, failed
  error_message TEXT,
  report_path VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  INDEX idx_job_id (job_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

---

## 🔒 Security Considerations

### Authentication & Authorization
- All endpoints require authentication
- User must have `bulk_upload` permission
- File uploads limited to authenticated users
- Job status only visible to job owner or admin

### File Upload Security
- Validate file type (only .xlsx, .xls)
- Limit file size (max 10MB)
- Scan for malicious content
- Store in secure temporary directory
- Clean up files after processing

### Data Privacy
- Audit trail for all operations
- Sensitive data (ID numbers) logged securely
- Reports stored with access controls
- Automatic cleanup of old reports (>30 days)

---

## 📊 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Processing Speed | 500 records in <60s | End-to-end time |
| Concurrent Uploads | 5+ simultaneous | Queue depth |
| Memory Usage | <500MB per job | Process memory |
| Database Connections | <10 per job | Connection pool |
| Error Rate | <1% | Failed records / total |
| Report Generation | <5s | Report creation time |
| API Response Time | <200ms | Endpoint latency |

---

## 🧪 Testing Requirements

### Unit Tests
- All services have >80% code coverage
- Test all business logic functions
- Test error handling
- Test edge cases

### Integration Tests
- End-to-end file processing
- Database integration
- IEC API integration (mock)
- WebSocket communication
- Queue processing

### Performance Tests
- 100, 500, 1000, 5000 record files
- Concurrent upload scenarios
- Memory leak detection
- Database connection pool limits

---

**Document Version:** 1.0
**Last Updated:** 2025-11-24
**Status:** Draft


