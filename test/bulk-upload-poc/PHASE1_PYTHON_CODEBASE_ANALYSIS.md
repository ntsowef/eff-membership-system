# Phase 1: Python Codebase Analysis

## 📋 Overview

Complete analysis of the Python bulk upload processor modules to understand architecture, dependencies, data flows, and business logic.

---

## 📁 Module Inventory

### 1. **bulk_upload_processor.py** (928 lines)
**Role:** Main orchestrator  
**Location:** `backend/python/bulk_upload_processor.py`

**Key Responsibilities:**
- File monitoring and queue management
- WebSocket communication for progress updates
- Orchestrates pre-validation, IEC verification, and database ingestion
- Error handling and status updates
- Excel report generation coordination

**Dependencies:**
- `flexible_membership_ingestionV2.py` - Database operations
- `excel_report_generator.py` - Report generation
- `iec_verification_module.py` - IEC API verification
- `pre_validation_processor.py` - Pre-validation
- `websocket_client.py` - WebSocket communication
- `pandas` - DataFrame operations
- `psycopg2` - PostgreSQL database

**Key Classes:**
- `BulkUploadProcessor` - Main processor class

**Key Methods:**
- `get_pending_files()` - Query database for pending uploads
- `update_file_status()` - Update processing status
- `process_file()` - Main processing workflow
- `_generate_validation_only_report()` - Generate report for validation failures

**Processing Flow:**
```
1. Get pending files from database
2. STEP 0: Pre-validation (ID validation, duplicates)
3. STEP 1: IEC verification (voter registration check)
4. STEP 2: Database ingestion (insert/update members)
5. Generate Excel report
6. Update file status
7. Send WebSocket completion notification
```

---

### 2. **upload_validation_utils.py** (143 lines)
**Role:** ID validation utilities  
**Location:** `backend/python/upload_validation_utils.py`

**Key Responsibilities:**
- South African ID number validation (Luhn algorithm)
- ID normalization (padding, cleaning)
- Duplicate detection within DataFrame

**Dependencies:**
- `pandas` - DataFrame operations
- `datetime` - Date validation

**Key Functions:**
- `validate_sa_id_number(id_number)` → `(bool, Optional[str])`
  - Validates 13-digit SA ID
  - Checks date portion (YYMMDD)
  - Validates Luhn checksum
  - Returns (is_valid, error_message)

- `normalize_id_number(id_num)` → `Optional[str]`
  - Cleans and pads ID to 13 digits
  - Handles Excel float formatting
  - Returns normalized ID or None

- `detect_duplicates_in_dataframe(df, id_column)` → `Dict`
  - Finds duplicate IDs within file
  - Returns dict with duplicate info and indices

**Luhn Algorithm Implementation:**
```python
# Process odd positions (0, 2, 4, ...)
for i in range(0, 13, 2):
    checksum += digits[i]

# Process even positions (1, 3, 5, ...) - double and subtract 9 if > 9
for i in range(1, 13, 2):
    doubled = digits[i] * 2
    checksum += doubled if doubled < 10 else doubled - 9

# Valid if checksum % 10 == 0
```

---

### 3. **pre_validation_processor.py** (225 lines)
**Role:** Pre-validation before IEC verification  
**Location:** `backend/python/pre_validation_processor.py`

**Key Responsibilities:**
- Validate all ID numbers in upload file
- Detect duplicates within file
- Check for existing members in database
- Separate valid/invalid/duplicate records

**Dependencies:**
- `pandas` - DataFrame operations
- `psycopg2` - PostgreSQL database
- `upload_validation_utils` - ID validation functions

**Key Classes:**
- `PreValidationProcessor` - Main validation class

**Key Methods:**
- `validate_dataframe(df)` → `Dict`
  - Returns validation results with:
    - `valid_df` - DataFrame with valid records
    - `invalid_ids` - List of invalid ID records
    - `duplicates` - List of duplicate records
    - `existing_members` - List of existing members
    - `new_members` - List of new members
    - `validation_stats` - Statistics

**Validation Steps:**
```
1. Validate ID numbers (Luhn algorithm)
2. Detect duplicates within file
3. Query database for existing members
4. Categorize records (valid/invalid/duplicate/existing/new)
5. Return comprehensive validation result
```

**Database Query:**
```sql
SELECT id_number, member_id, created_at, updated_at
FROM members_consolidated
WHERE id_number = ANY($1)
```

---

### 4. **iec_verification_module.py** (342 lines)
**Role:** IEC API integration for voter verification  
**Location:** `backend/python/iec_verification_module.py`

**Key Responsibilities:**
- Authenticate with IEC API
- Verify voter registration status
- Check ward and voting district
- Handle rate limiting (10,000 requests/hour)
- Batch processing with threading

**Dependencies:**
- `requests` - HTTP client
- `pandas` - DataFrame operations
- `concurrent.futures` - Threading
- `iec_rate_limit_tracker` - Rate limit tracking

**Key Classes:**
- `IECVerifier` - Main verifier class
- `IECVerificationError` - Custom exception

**Key Methods:**
- `authenticate()` → `str` - Get OAuth token
- `fetch_voter(id_number, token)` → `Dict` - Verify single voter
- `verify_dataframe(df, id_column, ward_column)` → `(DataFrame, Dict)`
  - Bulk verification with threading
  - Returns (verified_df, verification_report)

**IEC API Response:**
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

**VD Code Mapping Rules:**
- Registered with VD → Use IEC VD code
- Registered without VD → `222222222`
- Not registered → `999999999`

**Threading Configuration:**
- Default: 15 workers
- Batch size: 5 records at a time
- Rate limit: 10,000 requests/hour

---

### 5. **excel_report_generator.py** (~400 lines estimated)
**Role:** Generate comprehensive Excel reports  
**Location:** `backend/python/excel_report_generator.py`

**Key Responsibilities:**
- Generate 7-sheet Excel reports
- Apply formatting and color coding
- Include all validation and processing results

**Dependencies:**
- `pandas` - DataFrame operations
- `openpyxl` - Excel file manipulation
- `xlsxwriter` - Excel formatting

**Key Classes:**
- `ExcelReportGenerator` - Main generator class

**Key Methods:**
- `generate_report(...)` → `str`
  - Generates complete report
  - Returns report file path

**Report Structure:**
1. **Summary** - Statistics and overview
2. **All Uploaded Rows** - All records with IEC status
3. **Invalid IDs** - Records with invalid ID numbers
4. **Duplicates** - Duplicate records within file
5. **Not Registered** - Voters not registered with IEC
6. **Successfully Imported** - New members added
7. **Existing Members** - Members updated

**Formatting:**
- Header row: Bold, blue background
- Invalid IDs: Light red background
- Duplicates: Light yellow background
- Successfully Imported: Light green background
- Auto-fit columns
- Freeze top row
- Auto-filter enabled

---

### 6. **flexible_membership_ingestionV2.py** (Location: Repository root)
**Role:** Database operations for member ingestion  
**Location:** `<repo_root>/flexible_membership_ingestionV2.py`

**Key Responsibilities:**
- Insert new members into database
- Update existing members
- Handle metro-to-subregion code mapping
- Set membership status (Good Standing = 1)
- Transaction management

**Business Rules:**
- Registered voters without VD → VD code = `222222222`
- Non-registered voters → VD code = `999999999`
- All approved members → `membership_status_id = 1`
- Metro municipality codes → Map to sub-region codes
- Expiry date = Last Payment Date + 24 months (if missing)

**Database Tables:**
- `members_consolidated` - Main member table
- `provinces` - Province lookup
- `municipalities` - Municipality lookup
- `sub_regions` - Sub-region lookup
- `wards` - Ward lookup
- `voting_districts` - Voting district lookup
- `membership_statuses` - Status lookup

---

## 🔄 Data Flow

```
Excel File Upload
    ↓
[bulk_upload_processor.py]
    ↓
STEP 0: Pre-Validation
    ├→ [upload_validation_utils.py] - ID validation (Luhn)
    ├→ [pre_validation_processor.py] - Duplicates, existing members
    └→ Output: valid_df, invalid_ids, duplicates, existing_members
    ↓
STEP 1: IEC Verification
    ├→ [iec_verification_module.py] - IEC API calls
    └→ Output: verified_df with IEC status, ward, VD
    ↓
STEP 2: Database Ingestion
    ├→ [flexible_membership_ingestionV2.py] - Insert/update
    └→ Output: successfully_imported, failures
    ↓
Report Generation
    ├→ [excel_report_generator.py] - 7-sheet Excel report
    └→ Output: report_file_path
    ↓
Status Update & WebSocket Notification
```

---

**Document Version:** 1.0  
**Date:** 2025-11-24  
**Status:** ✅ Complete - Ready for Phase 1.2
