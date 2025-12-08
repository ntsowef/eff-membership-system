# Bulk Upload Processor - Proof of Concept (Node.js/TypeScript)

## Overview

This is a **standalone, working proof-of-concept** that demonstrates the complete bulk upload processing workflow in Node.js/TypeScript, replacing the current Python implementation.

## Features

✅ **Excel File Reading** - Reads `.xlsx` files using `xlsx` library  
✅ **ID Validation** - South African ID number validation with Luhn checksum algorithm  
✅ **Duplicate Detection** - Detects duplicate ID numbers within the uploaded file  
✅ **Database Integration** - Checks existing members in PostgreSQL database  
✅ **IEC Voter Verification** - Verifies voter registration status (with mock mode for testing)  
✅ **Database Operations** - Inserts new members and updates existing members  
✅ **Excel Report Generation** - Generates comprehensive multi-sheet Excel reports using `exceljs`  
✅ **Error Handling** - Comprehensive error handling and logging  

## Prerequisites

1. **Node.js** (v16 or higher)
2. **TypeScript** and **ts-node** installed globally or locally
3. **PostgreSQL** database running on localhost:5432
4. **Database**: `eff_membership_database` with `members_consolidated` table

## Installation

```bash
# Navigate to the POC directory
cd test/bulk-upload-poc

# Install dependencies (if not already installed in root)
npm install xlsx exceljs pg @types/node @types/pg

# Or use the root package.json dependencies
cd ../..
npm install
```

## Configuration

### Database Configuration

Edit the `DB_CONFIG` in `test-bulk-upload-processor.ts`:

```typescript
const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123',
};
```

### IEC API Configuration

For testing, IEC verification is **disabled by default** (uses mock data). To enable real IEC API calls:

```bash
export IEC_VERIFICATION_ENABLED=true
export IEC_API_BASE_URL=https://iec-api.example.com
export IEC_CLIENT_ID=your_client_id
export IEC_CLIENT_SECRET=your_client_secret
```

## Usage

### Basic Usage

```bash
# Run with ts-node
npx ts-node test/bulk-upload-poc/test-bulk-upload-processor.ts <excel-file-path>

# Example with sample data
npx ts-node test/bulk-upload-poc/test-bulk-upload-processor.ts test/bulk-upload-poc/sample-data/test-members.xlsx

# Example with absolute path
npx ts-node test/bulk-upload-poc/test-bulk-upload-processor.ts "C:/uploads/members.xlsx"
```

### Expected Output

```
================================================================================
🚀 BULK UPLOAD PROCESSOR - PROOF OF CONCEPT
================================================================================

📂 READING FILE: test/bulk-upload-poc/sample-data/test-members.xlsx
   ✅ Read 50 rows from sheet: Members

📋 PRE-VALIDATION: Processing 50 records
   ✅ Valid IDs: 48
   ❌ Invalid IDs: 2
   📋 Sample invalid ID: Invalid checksum
   ✅ Unique records: 46
   ⚠️  Duplicates: 2
   📋 Sample duplicate: ID 9001015800083 (row 15)
   📋 Existing members: 20
   🆕 New members: 26

🔍 IEC VERIFICATION: Processing 46 records
   ✅ Verified 5/46 records
   ✅ Verified 10/46 records
   ...
   ✅ Verified 46/46 records

💾 DATABASE OPERATIONS: Processing 46 records
   ✅ Inserts: 26
   ✅ Updates: 20
   ❌ Failed: 0
   🗳️  Registered voters: 40
   ⚠️  Not registered: 6

📊 EXCEL REPORT: Generating report...
   ✅ Report saved to: test/bulk-upload-poc/reports/bulk-upload-report-2025-01-24T14-30-00.xlsx

================================================================================
✅ PROCESSING COMPLETE
================================================================================
📊 Total Records: 50
✅ Successfully Processed: 46
❌ Failed: 0
📄 Report: test/bulk-upload-poc/reports/bulk-upload-report-2025-01-24T14-30-00.xlsx
⏱️  Duration: 12.45s
================================================================================
```

## Excel Report Structure

The generated Excel report contains **7 sheets**:

1. **Summary** - Overall statistics and metrics
2. **All Uploaded Rows** - All rows from the uploaded file (as-is)
3. **Invalid IDs** - Records with invalid ID numbers (with error messages)
4. **Duplicates** - Duplicate records within the file
5. **Not Registered** - Members not registered to vote (from IEC verification)
6. **New Members** - Successfully inserted new members
7. **Existing Members (Updated)** - Members that already existed and were updated

## Sample Data

A sample Excel file is provided in `sample-data/test-members.xlsx` with:
- Valid South African ID numbers
- Invalid ID numbers (for testing validation)
- Duplicate records (for testing duplicate detection)
- Mix of new and existing members

## Testing Checklist

Use this checklist to validate the POC:

- [ ] **File Reading**: Successfully reads Excel file
- [ ] **ID Validation**: Correctly identifies invalid ID numbers
- [ ] **Duplicate Detection**: Correctly identifies duplicates within file
- [ ] **Database Connection**: Successfully connects to PostgreSQL
- [ ] **Existing Member Check**: Correctly identifies existing members
- [ ] **IEC Verification**: Successfully verifies voters (or uses mock data)
- [ ] **Database Inserts**: Successfully inserts new members
- [ ] **Database Updates**: Successfully updates existing members
- [ ] **Excel Report Generation**: Generates report with all 7 sheets
- [ ] **Error Handling**: Handles errors gracefully
- [ ] **Performance**: Processes 100-500 records in reasonable time

## Troubleshooting

### Database Connection Error

```
❌ PROCESSING FAILED: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution**: Ensure PostgreSQL is running and credentials are correct.

### File Not Found Error

```
❌ ERROR: File not found: /path/to/file.xlsx
```

**Solution**: Check the file path is correct and file exists.

### TypeScript Compilation Error

```
❌ Cannot find module 'xlsx'
```

**Solution**: Install dependencies:
```bash
npm install xlsx exceljs pg @types/node @types/pg
```

## Next Steps

After validating this POC:

1. ✅ Confirm ID validation logic is correct
2. ✅ Confirm duplicate detection is accurate
3. ✅ Confirm database operations work correctly
4. ✅ Confirm IEC API integration works (if enabled)
5. ✅ Confirm Excel report quality matches Python version
6. ✅ Test with real production data files (100-500 records)
7. ✅ Measure performance and compare with Python version

Once validated, proceed with the full migration plan:
- Create service structure in `backend/src/services/bulkUpload/`
- Implement feature flags for gradual rollout
- Write comprehensive unit tests
- Integrate with existing backend routes
- Deploy with canary rollout strategy

## Questions or Issues?

If you encounter any issues or have questions about the POC, please document them for discussion before proceeding with the full migration.

