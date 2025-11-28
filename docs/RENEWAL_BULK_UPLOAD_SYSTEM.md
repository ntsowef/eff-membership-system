# Renewal Bulk Upload System - Complete Documentation

**Date**: 2025-10-01  
**Version**: 1.0  
**Status**: ✅ **IMPLEMENTED**

---

## 📋 **Overview**

The Renewal Bulk Upload System enables provincial administrators to upload spreadsheets containing membership renewal data with intelligent validation and fraud detection capabilities.

### **Key Features**

1. **Bulk Upload Processing** - Accept Excel/CSV files with up to 10,000 records
2. **Automatic Categorization** - Classify renewals as Early or Inactive
3. **Fraud Detection** - Detect ward mismatch and duplicate renewal attempts
4. **Real-time Progress** - Track processing status with progress percentage
5. **Comprehensive Reporting** - Generate detailed reports with fraud cases
6. **Audit Trail** - Complete logging of all actions

---

## 🗄️ **Database Tables**

### **1. renewal_bulk_uploads**
Main tracking table for bulk uploads.

**Key Fields**:
- `upload_uuid` - Unique identifier for tracking
- `file_name`, `file_path`, `file_type`, `file_size` - File details
- `upload_status` - Uploaded, Validating, Processing, Completed, Failed, Cancelled
- `total_records`, `processed_records` - Progress tracking
- `successful_renewals`, `failed_validations`, `fraud_detected` - Statistics
- `early_renewals`, `inactive_renewals` - Renewal type counts
- `progress_percentage` - Real-time progress (0-100)

### **2. renewal_bulk_upload_records**
Individual records from the upload.

**Key Fields**:
- `row_number` - Row in spreadsheet
- `member_id_number`, `member_firstname`, `member_surname` - Member info from file
- `renewal_ward_code`, `renewal_amount`, `payment_method` - Renewal details
- `record_status` - Pending, Validating, Valid, Invalid, Fraud, Processed, Failed
- `validation_passed`, `validation_errors` - Validation results
- `fraud_detected`, `fraud_type`, `fraud_details` - Fraud detection
- `found_member_id`, `current_ward_code` - Member lookup results
- `renewal_type` - Early, Inactive, or New

### **3. renewal_fraud_cases**
Detected fraud cases with full details.

**Key Fields**:
- `fraud_type` - Ward Mismatch, Duplicate Renewal, Invalid Member, Payment Mismatch
- `fraud_severity` - Low, Medium, High, Critical
- `current_ward_code`, `attempted_ward_code` - Ward comparison
- `fraud_description`, `fraud_evidence` - Detailed information
- `case_status` - Detected, Under Review, Confirmed, False Positive, Resolved

### **4. renewal_upload_validation_rules**
Configurable validation rules.

**Pre-configured Rules**:
- `member_id_required` - Member ID is required
- `ward_code_required` - Ward code is required
- `payment_amount_required` - Payment amount is required
- `member_exists` - Member must exist in database
- `ward_mismatch_detection` - Detect ward mismatch fraud
- `duplicate_renewal` - Detect duplicate attempts
- `payment_amount_valid` - Validate payment amount

---

## 🔌 **API Endpoints**

### **Base URL**: `/api/v1/renewal-bulk-upload`

### **1. Upload Spreadsheet**

**POST** `/upload`

Upload Excel or CSV file for processing.

**Request**:
- Content-Type: `multipart/form-data`
- Body:
  - `file` (required) - Excel (.xlsx, .xls) or CSV file
  - `province_code` (optional) - Province code for filtering

**Response**:
```json
{
  "success": true,
  "data": {
    "upload_uuid": "550e8400-e29b-41d4-a716-446655440000",
    "message": "File uploaded successfully. Processing started in background."
  }
}
```

**Example**:
```bash
curl -X POST http://localhost:5000/api/v1/renewal-bulk-upload/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@renewals.xlsx" \
  -F "province_code=GP"
```

---

### **2. Get Upload Status**

**GET** `/status/:upload_uuid`

Get real-time processing status.

**Response**:
```json
{
  "success": true,
  "data": {
    "upload": {
      "upload_uuid": "550e8400-e29b-41d4-a716-446655440000",
      "file_name": "renewals.xlsx",
      "upload_status": "Processing",
      "total_records": 1000,
      "processed_records": 450,
      "successful_renewals": 420,
      "failed_validations": 20,
      "fraud_detected": 10,
      "early_renewals": 300,
      "inactive_renewals": 120,
      "progress_percentage": 45.00,
      "uploaded_at": "2025-10-01T10:00:00Z",
      "uploaded_by_name": "John Doe"
    }
  }
}
```

---

### **3. Get Fraud Cases**

**GET** `/fraud-cases/:upload_uuid`

Get all fraud cases detected in the upload.

**Response**:
```json
{
  "success": true,
  "data": {
    "fraud_cases": [
      {
        "fraud_case_id": 1,
        "fraud_type": "Ward Mismatch",
        "fraud_severity": "High",
        "case_status": "Detected",
        "member_id_number": "1234567890123",
        "member_name": "John Doe",
        "current_ward_code": "WARD001",
        "current_ward_name": "Ward 1",
        "attempted_ward_code": "WARD002",
        "attempted_ward_name": "Ward 2",
        "fraud_description": "Member has active membership in ward WARD001 but renewal attempts to register in ward WARD002",
        "detected_at": "2025-10-01T10:15:00Z"
      }
    ],
    "total": 1
  }
}
```

---

### **4. Get Upload Records**

**GET** `/records/:upload_uuid`

Get all records from the upload with optional filtering.

**Query Parameters**:
- `status` - Filter by record status (Valid, Invalid, Fraud, Processed, Failed)
- `fraud_only` - Show only fraud cases (true/false)
- `limit` - Limit number of results

**Response**:
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "record_id": 1,
        "row_number": 2,
        "member_id_number": "1234567890123",
        "member_firstname": "John",
        "member_surname": "Doe",
        "renewal_ward_code": "WARD001",
        "renewal_amount": 500.00,
        "record_status": "Processed",
        "validation_passed": true,
        "fraud_detected": false,
        "renewal_type": "Early",
        "created_renewal_id": 123
      }
    ],
    "total": 1
  }
}
```

---

### **5. Get Recent Uploads**

**GET** `/recent`

Get recent bulk uploads.

**Query Parameters**:
- `limit` - Number of uploads to return (default: 20)

---

### **6. Cancel Upload**

**POST** `/cancel/:upload_uuid`

Cancel an in-progress upload.

---

### **7. Download Template**

**GET** `/download-template`

Download Excel template for bulk upload.

**Response**: Excel file with sample data and correct column headers.

---

### **8. Export Report**

**GET** `/export-report/:upload_uuid`

Export detailed report with all records and fraud cases.

**Response**: Excel file with multiple sheets:
- **Summary** - Upload statistics
- **All Records** - Complete record list
- **Fraud Cases** - Detected fraud cases

---

## 📊 **Spreadsheet Format**

### **Required Columns**

| Column Name | Type | Required | Description |
|-------------|------|----------|-------------|
| Member ID | Text | Yes | 13-digit ID number |
| Ward Code | Text | Yes | Ward code for renewal |
| Amount | Number | Yes | Renewal amount (R500.00) |

### **Optional Columns**

| Column Name | Type | Description |
|-------------|------|-------------|
| First Name | Text | Member first name |
| Surname | Text | Member surname |
| Email | Text | Member email |
| Phone | Text | Member phone number |
| Ward Name | Text | Ward name |
| Payment Method | Text | Cash, Card, EFT, etc. |
| Payment Reference | Text | Payment reference number |
| Payment Date | Date | Date of payment |

### **Example Spreadsheet**

| Member ID | First Name | Surname | Email | Phone | Ward Code | Ward Name | Amount | Payment Method | Payment Reference | Payment Date |
|-----------|------------|---------|-------|-------|-----------|-----------|--------|----------------|-------------------|--------------|
| 1234567890123 | John | Doe | john@example.com | 0821234567 | WARD001 | Ward 1 | 500.00 | Cash | REF123 | 2025-10-01 |
| 9876543210987 | Jane | Smith | jane@example.com | 0829876543 | WARD002 | Ward 2 | 500.00 | EFT | REF456 | 2025-10-01 |

---

## 🔍 **Fraud Detection**

### **1. Ward Mismatch Detection**

**Scenario**: Member has active membership in Ward A, but renewal attempts to register in Ward B.

**Detection Logic**:
1. Look up member in database by ID number
2. Check if member has active membership (status = Active OR expiry_date > today)
3. Compare current ward code with renewal ward code
4. If different → Flag as "Ward Mismatch" fraud

**Fraud Evidence**:
```json
{
  "current_ward": "WARD001",
  "current_ward_name": "Ward 1",
  "attempted_ward": "WARD002",
  "attempted_ward_name": "Ward 2",
  "membership_status": "Active",
  "expiry_date": "2026-12-31"
}
```

**Severity**: High

---

### **2. Duplicate Renewal Detection**

**Scenario**: Same member appears multiple times in the upload.

**Detection Logic**:
1. Scan all records in upload
2. Group by member ID number
3. If member appears more than once → Flag as "Duplicate Renewal"

**Fraud Evidence**:
```json
{
  "duplicate_rows": [2, 45, 123]
}
```

**Severity**: Medium

---

## 🔄 **Processing Workflow**

### **Step-by-Step Process**

1. **Upload File**
   - User uploads Excel/CSV file
   - System validates file type and size
   - Creates upload record with UUID
   - Returns UUID to user

2. **Background Processing Starts**
   - Parse file and extract records
   - Update total_records count

3. **For Each Record**:
   
   a. **Validate Record**
   - Check required fields (Member ID, Ward Code, Amount)
   - Validate format (ID length, amount > 0)
   - Check payment amount matches standard fee
   
   b. **Look Up Member**
   - Search database by ID number
   - Retrieve current ward, membership status, expiry date
   
   c. **Detect Fraud**
   - Run ward mismatch detection
   - Check for duplicates in upload
   
   d. **Determine Renewal Type**
   - If expiry_date > today → "Early"
   - If expiry_date < today → "Inactive"
   - If member not found → "New"
   
   e. **Save Record**
   - Save to renewal_bulk_upload_records table
   - Include validation results, fraud detection, member lookup
   
   f. **Create Fraud Case** (if detected)
   - Save to renewal_fraud_cases table
   - Log to audit trail
   - Create manual note for follow-up
   
   g. **Process Valid Renewals**
   - If no fraud and validation passed
   - Create renewal record in membership_renewals
   - Update member status
   
   h. **Update Progress**
   - Update processed_records count
   - Calculate progress_percentage
   - Update statistics (successful, failed, fraud)

4. **Complete Processing**
   - Set upload_status to "Completed"
   - Set progress_percentage to 100
   - Log audit trail entry

---

## 📈 **Renewal Type Classification**

### **Early Renewal**
- Member renewing **before** membership expiration
- Current membership is still active
- Expiry date is in the future

### **Inactive Renewal**
- Member renewing **after** membership has lapsed
- Membership has expired
- Expiry date is in the past

### **New Member**
- Member not found in database
- First-time registration

---

## 🚨 **Error Handling**

### **Validation Errors**

| Error | Description | Action |
|-------|-------------|--------|
| Member ID Required | Missing member ID | Mark as Invalid |
| Ward Code Required | Missing ward code | Mark as Invalid |
| Amount Required | Missing or invalid amount | Mark as Invalid |
| Member Not Found | ID not in database | Mark as Invalid |
| Invalid ID Format | ID not 13 digits | Warning only |

### **Processing Errors**

| Error | Description | Action |
|-------|-------------|--------|
| File Parse Error | Cannot read file | Fail upload |
| Database Error | Database connection issue | Retry or fail |
| Fraud Detected | Ward mismatch or duplicate | Flag for review |

---

## 📊 **Reporting**

### **Summary Report**

Includes:
- Total records uploaded
- Successful renewals
- Failed validations
- Fraud cases detected
- Early vs Inactive breakdown
- Processing time

### **Detailed Report**

Excel file with 3 sheets:
1. **Summary** - Overall statistics
2. **All Records** - Every record with status
3. **Fraud Cases** - Detailed fraud information

### **Fraud Report**

Separate report showing:
- Fraud type and severity
- Member details
- Current ward vs attempted ward
- Evidence and description
- Detection timestamp

---

## ✅ **Implementation Status**

| Component | Status |
|-----------|--------|
| **Database Tables** | ✅ Created |
| **Upload Service** | ✅ Implemented |
| **Fraud Detection** | ✅ Implemented |
| **Background Processor** | ✅ Implemented |
| **API Routes** | ✅ Implemented |
| **File Upload** | ✅ Configured |
| **Template Download** | ✅ Implemented |
| **Report Export** | ✅ Implemented |
| **Documentation** | ✅ Complete |

---

## 🚀 **Next Steps**

1. **Test Upload** - Upload sample file
2. **Monitor Progress** - Check status endpoint
3. **Review Fraud Cases** - Examine detected fraud
4. **Export Reports** - Download detailed reports
5. **Frontend UI** - Build admin interface

---

**Status**: ✅ **COMPLETE - READY FOR TESTING**  
**Supported Formats**: Excel (.xlsx, .xls), CSV  
**Max File Size**: 50MB  
**Max Records**: 10,000 per upload

