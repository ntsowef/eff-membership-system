# Phase 1: Migration Checklist

## 📋 Feature Parity Checklist

This document ensures 100% feature parity between Python and Node.js/TypeScript bulk upload processors.

---

## 1️⃣ SA ID Validation (Luhn Algorithm)

### Python Implementation
**File:** `upload_validation_utils.py`  
**Function:** `validate_sa_id_number(id_number)`

### Features to Migrate
- [ ] **ID Format Validation**
  - [ ] Must be exactly 13 digits
  - [ ] Must contain only numeric characters
  - [ ] Handle leading zeros (pad if necessary)
  
- [ ] **Luhn Checksum Algorithm**
  - [ ] Sum odd positions (0, 2, 4, 6, 8, 10, 12)
  - [ ] Double even positions (1, 3, 5, 7, 9, 11)
  - [ ] Subtract 9 if doubled value > 9
  - [ ] Validate checksum % 10 == 0
  
- [ ] **ID Normalization**
  - [ ] Remove spaces, dashes, special characters
  - [ ] Pad with leading zeros to 13 digits
  - [ ] Convert to string format
  
- [ ] **Date of Birth Extraction**
  - [ ] Extract YYMMDD from first 6 digits
  - [ ] Handle century (19xx vs 20xx)
  - [ ] Validate date is valid
  
- [ ] **Gender Detection**
  - [ ] Extract gender digit (position 6)
  - [ ] 0-4999 = Female
  - [ ] 5000-9999 = Male
  
- [ ] **Citizenship Validation**
  - [ ] Extract citizenship digit (position 10)
  - [ ] 0 = SA Citizen
  - [ ] 1 = Permanent Resident

**Target File:** `backend/src/services/bulk-upload/idValidationService.ts`

---

## 2️⃣ Duplicate Detection

### Python Implementation
**File:** `pre_validation_processor.py`  
**Function:** `detect_duplicates_in_dataframe(df, id_column)`

### Features to Migrate
- [ ] **Within-File Duplicates**
  - [ ] Detect duplicate ID numbers in uploaded file
  - [ ] Track all row numbers for each duplicate
  - [ ] Identify first occurrence row
  - [ ] Count total occurrences
  
- [ ] **Database Duplicates**
  - [ ] Query existing members by ID numbers
  - [ ] Retrieve member details (name, ward, VD)
  - [ ] Compare uploaded ward vs existing ward
  - [ ] Flag ward/VD changes
  
- [ ] **Duplicate Reporting**
  - [ ] Include all original columns
  - [ ] Show all duplicate row numbers
  - [ ] Highlight first occurrence
  - [ ] Color code in Excel report (light yellow)

**Target File:** `backend/src/services/bulk-upload/preValidationService.ts`

---

## 3️⃣ IEC Verification

### Python Implementation
**File:** `iec_verification_module.py`  
**Function:** `verify_dataframe(df, id_column, ward_column)`

### Features to Migrate
- [ ] **IEC API Integration**
  - [ ] OAuth 2.0 authentication
  - [ ] Token caching and refresh
  - [ ] Voter verification by ID number
  - [ ] Voting district lookup
  
- [ ] **Batch Processing**
  - [ ] Process in batches (default: 5 records)
  - [ ] Concurrent workers (default: 15)
  - [ ] Progress tracking
  - [ ] Error handling per record
  
- [ ] **Rate Limiting**
  - [ ] Track requests per hour (limit: 10,000)
  - [ ] Pause when limit reached
  - [ ] Resume after cooldown
  - [ ] WebSocket notifications
  
- [ ] **Retry Logic**
  - [ ] Retry failed requests (max: 3 attempts)
  - [ ] Exponential backoff
  - [ ] Handle timeouts
  - [ ] Handle API errors
  
- [ ] **VD Code Mapping**
  - [ ] `222222222` for registered voters without VD code
  - [ ] `999999999` for non-registered voters
  - [ ] Preserve original VD code if available
  
- [ ] **Result Mapping**
  - [ ] Map IEC response to internal format
  - [ ] Extract province, municipality, ward, VD
  - [ ] Store verification timestamp
  - [ ] Store error messages

**Target File:** `backend/src/services/bulk-upload/iecVerificationService.ts`  
**Reuse:** `backend/src/services/iecApiService.ts` (existing)

---

## 4️⃣ Excel File Reading

### Python Implementation
**File:** `bulk_upload_processor.py`  
**Library:** `pandas.read_excel()`

### Features to Migrate
- [ ] **File Reading**
  - [ ] Support .xlsx format
  - [ ] Support .xls format (if needed)
  - [ ] Handle large files (10,000+ rows)
  - [ ] Memory-efficient reading
  
- [ ] **Column Mapping**
  - [ ] Normalize column names (case-insensitive)
  - [ ] Handle variations: 'Name' vs 'Firstname'
  - [ ] Handle missing columns
  - [ ] Map to standard field names
  
- [ ] **Date Parsing**
  - [ ] Parse Excel serial dates
  - [ ] Parse string dates (multiple formats)
  - [ ] Handle 'Last Payment' date
  - [ ] Handle 'Date Joined' date
  - [ ] Handle 'Expiry Date' date
  
- [ ] **Expiry Date Calculation**
  - [ ] If 'Expiry Date' missing, calculate from 'Last Payment'
  - [ ] Formula: Last Payment + 24 months
  - [ ] Handle invalid dates
  - [ ] Default to null if cannot calculate
  
- [ ] **Data Type Conversion**
  - [ ] Convert ID numbers to strings
  - [ ] Preserve leading zeros
  - [ ] Convert dates to Date objects
  - [ ] Handle null/undefined values
  
- [ ] **Row Numbering**
  - [ ] Add row_number field (1-based, excluding header)
  - [ ] Track original row for error reporting

**Target File:** `backend/src/services/bulk-upload/fileReaderService.ts`

---

## 5️⃣ Database Operations

### Python Implementation
**File:** `flexible_membership_ingestionV2.py`

### Features to Migrate
- [ ] **Member Insert**
  - [ ] Insert new members with all fields
  - [ ] Set `membership_status_id = 1` (Good Standing)
  - [ ] Set `date_joined` from upload or current date
  - [ ] Set `last_payment_date` from upload
  - [ ] Set `expiry_date` (calculated or from upload)
  - [ ] Set ward and VD codes
  - [ ] Set province, municipality, sub-region
  
- [ ] **Member Update**
  - [ ] Update existing members
  - [ ] Update ward/VD if changed
  - [ ] Update payment dates
  - [ ] Update expiry date
  - [ ] Preserve original `date_joined`
  - [ ] Update `updated_at` timestamp
  
- [ ] **Metro-to-Subregion Mapping**
  - [ ] Map metro municipality codes to sub-region codes
  - [ ] Query mapping table
  - [ ] Handle unmapped codes
  - [ ] Log mapping errors
  
- [ ] **Transaction Management**
  - [ ] Wrap operations in transaction
  - [ ] Rollback on any failure
  - [ ] Commit only if all succeed
  - [ ] Log transaction details
  
- [ ] **Error Handling**
  - [ ] Catch constraint violations
  - [ ] Catch foreign key errors
  - [ ] Log detailed error messages
  - [ ] Continue processing other records

**Target File:** `backend/src/services/bulk-upload/databaseOperationsService.ts`

---

## 6️⃣ Excel Report Generation

### Python Implementation
**File:** `excel_report_generator.py`

### Features to Migrate
- [ ] **7-Sheet Report Structure**
  1. [ ] **Summary Sheet**
     - [ ] Total uploaded
     - [ ] Valid IDs
     - [ ] Invalid IDs
     - [ ] Duplicates
     - [ ] Existing members
     - [ ] New members
     - [ ] IEC registered
     - [ ] IEC not registered
     - [ ] Successfully processed
     - [ ] Failed
  
  2. [ ] **All Uploaded Rows Sheet**
     - [ ] All original columns
     - [ ] IEC Registered (YES/NO)
     - [ ] IEC Ward
     - [ ] IEC VD Code
     - [ ] Already Exists (YES/NO)
     - [ ] Existing Member Name
     - [ ] Existing Ward
     - [ ] Existing VD
     - [ ] Color coding: Red (not registered), Yellow (existing)
  
  3. [ ] **Invalid IDs Sheet**
     - [ ] All original columns
     - [ ] Error message
     - [ ] Validation type
     - [ ] Color coding: Light red background
  
  4. [ ] **Duplicates Sheet**
     - [ ] All original columns
     - [ ] Duplicate count
     - [ ] All row numbers
     - [ ] First occurrence row
     - [ ] Color coding: Light yellow background
  
  5. [ ] **Not Registered with IEC Sheet**
     - [ ] All records not registered with IEC
     - [ ] All original columns
     - [ ] IEC error message (if any)
  
  6. [ ] **New Members Sheet**
     - [ ] Records not in database
     - [ ] All original columns
     - [ ] IEC verification status
  
  7. [ ] **Existing Members Sheet**
     - [ ] Records already in database
     - [ ] All original columns
     - [ ] Existing member details
     - [ ] Ward/VD comparison
     - [ ] Change indicators

**Target File:** `backend/src/services/bulk-upload/excelReportService.ts`

- [ ] **Cell Styling**
  - [ ] Bold headers with blue background
  - [ ] Auto-fit column widths
  - [ ] Freeze header row
  - [ ] Number formatting for dates
  - [ ] Text wrapping for long content

- [ ] **Color Coding**
  - [ ] Light red: Invalid IDs, Not registered
  - [ ] Light yellow: Duplicates, Existing members
  - [ ] White: Valid new members

- [ ] **File Naming**
  - [ ] Format: `bulk-upload-report-YYYY-MM-DDTHH-mm-ss.xlsx`
  - [ ] Save to reports directory
  - [ ] Return file path

---

## 7️⃣ WebSocket Communication

### Python Implementation
**File:** `bulk_upload_processor.py`
**Library:** `socketio` (Python client)

### Features to Migrate
- [ ] **Progress Updates**
  - [ ] Stage: reading (0-10%)
  - [ ] Stage: validating (10-20%)
  - [ ] Stage: verifying (20-80%)
  - [ ] Stage: processing (80-90%)
  - [ ] Stage: reporting (90-100%)
  - [ ] Stage: complete (100%)

- [ ] **Event Types**
  - [ ] `bulk-upload:progress` - Progress updates
  - [ ] `bulk-upload:complete` - Completion notification
  - [ ] `bulk-upload:error` - Error notification
  - [ ] `bulk-upload:rows` - Row data updates

- [ ] **Progress Data**
  - [ ] file_id
  - [ ] status (stage name)
  - [ ] progress (percentage)
  - [ ] rows_processed
  - [ ] rows_total
  - [ ] message (optional)

- [ ] **Error Handling**
  - [ ] Send error events on failure
  - [ ] Include error message
  - [ ] Include stack trace (dev mode)
  - [ ] Continue processing if possible

**Target File:** `backend/src/services/bulk-upload/bulkUploadWebSocketService.ts`
**Reuse:** `backend/src/services/websocketService.ts` (existing)

---

## 8️⃣ Processing Orchestration

### Python Implementation
**File:** `bulk_upload_processor.py`
**Function:** `process_bulk_upload(file_path, file_id, uploaded_by)`

### Features to Migrate
- [ ] **Processing Pipeline**
  - [ ] Step 0: File reading (10%)
  - [ ] Step 1: Pre-validation (20%)
  - [ ] Step 2: IEC verification (80%)
  - [ ] Step 3: Database operations (90%)
  - [ ] Step 4: Report generation (100%)

- [ ] **Error Handling**
  - [ ] Try-catch for each step
  - [ ] Rollback database on failure
  - [ ] Generate error report
  - [ ] Send error notification
  - [ ] Log detailed errors

- [ ] **Progress Tracking**
  - [ ] Update progress after each step
  - [ ] Send WebSocket updates
  - [ ] Log progress to database
  - [ ] Track processing duration

- [ ] **Logging**
  - [ ] Log start time
  - [ ] Log each step completion
  - [ ] Log errors and warnings
  - [ ] Log end time and duration
  - [ ] Log statistics

**Target File:** `backend/src/services/bulk-upload/bulkUploadOrchestrator.ts`

---

## 9️⃣ Job Queue Management

### Python Implementation
**Not implemented in Python** (processes files directly)

### Features to Implement (New)
- [ ] **Job Creation**
  - [ ] Create job with file metadata
  - [ ] Set job priority
  - [ ] Set job timeout
  - [ ] Store job in Redis queue

- [ ] **Job Processing**
  - [ ] Process jobs from queue
  - [ ] Concurrent processing (limit: 3)
  - [ ] Job status tracking
  - [ ] Job progress updates

- [ ] **Job Retry**
  - [ ] Retry failed jobs (max: 3 attempts)
  - [ ] Exponential backoff
  - [ ] Track retry count
  - [ ] Move to failed queue after max retries

- [ ] **Job Monitoring**
  - [ ] Track active jobs
  - [ ] Track completed jobs
  - [ ] Track failed jobs
  - [ ] Job history (last 100)

**Target File:** `backend/src/services/bulk-upload/processingQueueService.ts`

---

## 🔟 Edge Cases & Business Rules

### Edge Cases to Handle
- [ ] **Invalid ID Numbers**
  - [ ] Empty/null ID numbers
  - [ ] Non-numeric characters
  - [ ] Wrong length (< 13 or > 13 digits)
  - [ ] Invalid checksum

- [ ] **Duplicate IDs**
  - [ ] Multiple occurrences in file
  - [ ] Already exists in database
  - [ ] Different ward/VD than existing

- [ ] **IEC API Failures**
  - [ ] API timeout
  - [ ] API rate limit exceeded
  - [ ] Invalid response format
  - [ ] Network errors

- [ ] **Database Failures**
  - [ ] Connection timeout
  - [ ] Constraint violations
  - [ ] Foreign key errors
  - [ ] Transaction rollback

- [ ] **File Issues**
  - [ ] Corrupted Excel file
  - [ ] Missing required columns
  - [ ] Empty file
  - [ ] File too large

### Business Rules to Preserve
- [ ] **VD Code Mapping**
  - [ ] `222222222` for registered voters without VD code
  - [ ] `999999999` for non-registered voters

- [ ] **Expiry Date Calculation**
  - [ ] Last Payment Date + 24 months
  - [ ] Only if 'Expiry Date' column missing

- [ ] **Membership Status**
  - [ ] All approved members get `membership_status_id = 1`

- [ ] **Metro Municipality Mapping**
  - [ ] Map metro codes to sub-region codes
  - [ ] Query mapping table before insert

- [ ] **Date Joined**
  - [ ] Use from upload if available
  - [ ] Use current date if missing
  - [ ] Never update for existing members

---

## 📊 Testing Checklist

### Unit Tests
- [ ] ID Validation Service
  - [ ] Valid IDs pass
  - [ ] Invalid IDs fail
  - [ ] Luhn algorithm correct
  - [ ] Edge cases handled

- [ ] Pre-Validation Service
  - [ ] Duplicates detected
  - [ ] Existing members found
  - [ ] Statistics accurate

- [ ] File Reader Service
  - [ ] Excel files read correctly
  - [ ] Dates parsed correctly
  - [ ] Expiry dates calculated
  - [ ] Column mapping works

- [ ] Database Operations Service
  - [ ] Inserts work
  - [ ] Updates work
  - [ ] Transactions work
  - [ ] Rollback works

- [ ] Excel Report Service
  - [ ] All 7 sheets generated
  - [ ] Styling applied
  - [ ] Data accurate

### Integration Tests
- [ ] End-to-end processing
- [ ] Database integration
- [ ] IEC API integration (mock)
- [ ] WebSocket communication
- [ ] Queue processing

### Comparison Tests
- [ ] Process same file with Python and Node.js
- [ ] Compare validation results
- [ ] Compare IEC verification results
- [ ] Compare database operations
- [ ] Compare Excel reports

---

## 🚀 Deployment Checklist

- [ ] Environment variables configured
- [ ] Database connections tested
- [ ] IEC API credentials configured
- [ ] File storage directories created
- [ ] Redis connection configured
- [ ] WebSocket endpoints configured
- [ ] Logging configured
- [ ] Monitoring configured
- [ ] Error alerting configured

---

## ✅ Completion Criteria

**Phase 1 Complete When:**
- [x] Python codebase analyzed
- [x] Architecture documented
- [x] Integration points identified
- [x] Technical specification created
- [x] Development environment set up
- [x] Migration checklist created

**Migration Complete When:**
- [ ] All features migrated (100% parity)
- [ ] All tests passing (>80% coverage)
- [ ] Performance targets met (<60s for 500 records)
- [ ] Comparison tests pass (<0.1% discrepancy)
- [ ] UAT sign-off received
- [ ] Production deployment successful
- [ ] Python processor deprecated

---

**Document Version:** 1.0
**Date:** 2025-11-24
**Status:** ✅ Complete - Phase 1 Checklist Ready
