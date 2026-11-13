# Phase 1: Architecture Documentation

## 📐 Current Python Architecture

### System Overview

The current bulk upload system is a **standalone Python application** that:
- Polls the database for pending files
- Processes files through 3 main steps (pre-validation, IEC verification, database ingestion)
- Communicates with the Node.js backend via WebSocket for progress updates
- Generates comprehensive Excel reports
- Updates file status in the database

### Architecture Diagrams

**See rendered Mermaid diagrams:**
1. **Bulk Upload Processing Architecture - Current Python System**
2. **Processing Flow Sequence - Python System**
3. **Future Node.js/TypeScript Architecture**

---

## 🔄 Processing Pipeline

### Step-by-Step Flow

#### **1. File Upload (Frontend → Backend API)**
```
User uploads Excel file
  ↓
Frontend sends file to Node.js API
  ↓
API stores file in _upload_file_directory
  ↓
API creates database record (status='pending')
  ↓
API returns success to frontend
```

#### **2. File Detection (Python Processor)**
```
Python processor polls database every N seconds
  ↓
Queries: SELECT * FROM uploaded_files WHERE status='pending'
  ↓
Picks up pending file for processing
```

#### **3. STEP 0: Pre-Validation**
```
Load Excel file → pandas DataFrame
  ↓
Validate ID Numbers (Luhn algorithm)
  ├→ Valid IDs: Continue
  └→ Invalid IDs: Add to invalid_ids list
  ↓
Detect Duplicates within file
  ├→ Keep first occurrence
  └→ Mark duplicates
  ↓
Query Database for Existing Members
  ├→ SELECT id_number FROM members_consolidated WHERE id_number = ANY($1)
  └→ Categorize: existing_members vs new_members
  ↓
Output: ValidationResult
  ├→ valid_records (DataFrame)
  ├→ invalid_ids (List)
  ├→ duplicates (List)
  ├→ existing_members (List)
  └→ new_members (List)
```

**WebSocket Update:** `progress: 20%, stage: 'validated'`

#### **4. STEP 1: IEC Verification**
```
For each valid record (threaded, 15 workers):
  ↓
Authenticate with IEC API (OAuth)
  ↓
Call IEC API: POST /verify-voter
  ├→ Request: { id_number: "1234567890123" }
  └→ Response: { voter_status, ward, vd_number, voting_station }
  ↓
Check Rate Limit (10,000 requests/hour)
  ├→ If limit reached: Pause processing
  └→ If OK: Continue
  ↓
Map VD Code:
  ├→ Registered with VD → Use IEC VD code
  ├→ Registered without VD → "222222222"
  └→ Not registered → "999999999"
  ↓
Add IEC data to DataFrame:
  ├→ iec_registered (bool)
  ├→ iec_ward (string)
  ├→ iec_vd_number (string)
  └→ iec_voting_station (string)
```

**WebSocket Update:** `progress: 60%, stage: 'verified'`

#### **5. STEP 2: Database Ingestion**
```
BEGIN TRANSACTION
  ↓
For each verified record:
  ↓
Check if member exists (by ID number)
  ├→ EXISTS: UPDATE members_consolidated
  │   ├→ Update: last_payment_date, expiry_date
  │   └→ Keep: existing ward, VD (don't overwrite)
  └→ NOT EXISTS: INSERT INTO members_consolidated
      ├→ Set: membership_status_id = 1 (Good Standing)
      ├→ Set: date_joined, last_payment_date, expiry_date
      ├→ Map: metro municipality → sub_region code
      └→ Set: ward_code, voting_district_code
  ↓
COMMIT TRANSACTION
  ↓
Output: ProcessingResult
  ├→ inserts (count)
  ├→ updates (count)
  └→ failures (List with errors)
```

**WebSocket Update:** `progress: 80%, stage: 'processed'`

#### **6. Report Generation**
```
Generate 7-sheet Excel report:
  ├→ Sheet 1: Summary (statistics)
  ├→ Sheet 2: All Uploaded Rows (with IEC status, existing member info)
  ├→ Sheet 3: Invalid IDs (all original columns + error)
  ├→ Sheet 4: Duplicates (all original columns + duplicate_of_row)
  ├→ Sheet 5: Not Registered (voters not in IEC)
  ├→ Sheet 6: New Members (successfully inserted)
  └→ Sheet 7: Existing Members (successfully updated)
  ↓
Apply Formatting:
  ├→ Header row: Bold, blue background
  ├→ Invalid IDs: Light red background
  ├→ Duplicates: Light yellow background
  ├→ Not Registered: Light red background
  └→ Successfully Imported: Light green background
  ↓
Save report to: reports/bulk-upload-report-{timestamp}.xlsx
  ↓
Update database: report_file_path = <path>
```

**WebSocket Update:** `progress: 100%, stage: 'complete'`

---

## 🔌 Integration Points

### 1. **Database (PostgreSQL)**

**Tables Used:**
- `uploaded_files` - File metadata and status
- `members_consolidated` - Main member table
- `provinces` - Province lookup
- `municipalities` - Municipality lookup
- `sub_regions` - Local Municipality lookup
- `wards` - Ward lookup
- `voting_districts` - Voting district lookup
- `membership_statuses` - Status lookup
- `bulk_upload_logs` - Audit trail (future)

**Connection:**
- Python: `psycopg2` library
- Node.js: `pg` library (existing pool)

### 2. **WebSocket Communication**

**Current Flow:**
```
Python Processor → WebSocket Client (Python)
  ↓
WebSocket Server (Node.js backend)
  ↓
Frontend (React)
```

**Events Sent:**
- `bulk-upload:progress` - Progress updates (0-100%)
- `bulk-upload:complete` - Processing complete
- `bulk-upload:error` - Error occurred

**Event Payload:**
```typescript
{
  jobId: string,
  stage: 'reading' | 'validating' | 'verifying' | 'processing' | 'reporting' | 'complete',
  percentage: number,
  message: string,
  inserts?: number,
  updates?: number,
  failures?: number
}
```

### 3. **IEC API Integration**

**Authentication:**
- OAuth 2.0 Client Credentials flow
- Token cached for 1 hour

**Endpoints:**
- `POST /oauth/token` - Get access token
- `POST /api/verify-voter` - Verify single voter

**Rate Limiting:**
- Limit: 10,000 requests/hour
- Tracking: Redis-based counter
- Handling: Pause processing, resume after cooldown

**Response Format:**
```json
{
  "IDNumber": "1234567890123",
  "VoterStatus": "Active",
  "Ward": {
    "WardNumber": "12345678",
    "Name": "Ward 3"
  },
  "VotingDistrict": {
    "VDNumber": "12345678",
    "Name": "Letsemeng VD 1"
  },
  "VotingStation": {
    "Name": "Letsemeng Primary School"
  }
}
```

### 4. **File Storage**

**Upload Directory:**
- Location: `backend/python/_upload_file_directory/`
- Format: `{timestamp}_{original_filename}.xlsx`

**Report Directory:**
- Location: `backend/python/_upload_file_directory/reports/`
- Format: `bulk-upload-report-{timestamp}.xlsx`

---

## ⚠️ Edge Cases & Error Handling

### 1. **Invalid ID Numbers**
- **Scenario:** ID fails Luhn checksum or date validation
- **Handling:** Add to `invalid_ids` list, exclude from processing
- **Report:** Include in "Invalid IDs" sheet with error message

### 2. **Duplicate IDs in File**
- **Scenario:** Same ID appears multiple times in upload file
- **Handling:** Keep first occurrence, mark others as duplicates
- **Report:** Include in "Duplicates" sheet with `duplicate_of_row`

### 3. **Existing Members**
- **Scenario:** ID already exists in database
- **Handling:** UPDATE instead of INSERT, preserve existing ward/VD
- **Report:** Include in "Existing Members" sheet

### 4. **IEC API Failures**
- **Scenario:** API timeout, 500 error, network failure
- **Handling:** Retry 3 times with exponential backoff
- **Fallback:** Mark as "API Error", continue processing
- **Report:** Include in "Not Registered" sheet with error note

### 5. **IEC Rate Limit Exceeded**
- **Scenario:** 10,000 requests/hour limit reached
- **Handling:** Pause processing, save progress, resume after cooldown
- **WebSocket:** Send rate limit warning to frontend
- **Report:** Include rate limit info in summary

### 6. **Database Transaction Failures**
- **Scenario:** Constraint violation, connection loss, deadlock
- **Handling:** ROLLBACK transaction, log error, mark file as failed
- **WebSocket:** Send error notification
- **Report:** Not generated (processing failed)

### 7. **Missing Expiry Date Column**
- **Scenario:** Upload file doesn't have "Expiry Date" column
- **Handling:** Calculate: `expiry_date = last_payment_date + 24 months`
- **Report:** Show calculated expiry date

### 8. **Excel File Corruption**
- **Scenario:** File cannot be read by pandas
- **Handling:** Mark file as failed, send error to frontend
- **WebSocket:** Send error notification
- **Report:** Not generated

### 9. **Metro Municipality Codes**
- **Scenario:** Municipality code is metro (needs mapping to Local Municipality)
- **Handling:** Query mapping table, use Local Municipality code
- **Fallback:** If mapping not found, use municipality code as-is

### 10. **Non-Registered Voters**
- **Scenario:** IEC returns "Not Registered"
- **Handling:** Set `voting_district_code = "999999999"`
- **Report:** Include in "Not Registered" sheet

---

## 🎯 Future Node.js Architecture

### Key Improvements

1. **Integrated Services** - No standalone process, part of backend
2. **Queue-Based Processing** - Bull + Redis for job management
3. **Reuse Existing Services** - IEC API, database pool, WebSocket
4. **Better Error Handling** - Structured error types, retry logic
5. **Comprehensive Logging** - Audit trail for all operations
6. **Type Safety** - TypeScript interfaces for all data structures

### Service Breakdown

**See "Future Node.js/TypeScript Architecture" diagram**

---

**Document Version:** 1.0  
**Date:** 2025-11-24  
**Status:** ✅ Complete - Ready for Phase 1.3
