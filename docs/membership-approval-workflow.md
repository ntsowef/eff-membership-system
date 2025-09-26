# Membership Application Approval Workflow

## Overview

This document describes the complete workflow for processing membership applications from submission to member creation in the EFF Membership Management System.

## Workflow Stages

### 1. Application Submission
- **Status**: `Draft` → `Submitted`
- **Process**: User completes the 5-step application form including Party Declaration & Signature
- **Data Stored**: All application data stored in `membership_applications` table
- **Required Fields**: Personal info, contact info, membership details, party declaration, signature

### 2. Application Review
- **Status**: `Submitted` → `Under Review`
- **Process**: Admin reviews application for completeness and accuracy
- **Actions Available**:
  - Set application under review
  - Request additional information
  - Add admin notes

### 3. Application Decision
- **Status**: `Under Review` → `Approved` or `Rejected`
- **Process**: Admin makes final decision on application

#### 3A. Application Approval
When an application is approved, the system automatically:

1. **Creates Member Record** in `members` table:
   ```sql
   INSERT INTO members (
     id_number, firstname, surname, date_of_birth, gender_id,
     ward_code, cell_number, email, residential_address,
     membership_type, application_id, created_at, updated_at
   )
   ```

2. **Creates Membership Record** in `memberships` table:
   ```sql
   INSERT INTO memberships (
     member_id, date_joined, subscription_type_id, membership_amount,
     status_id, payment_method, created_at, updated_at
   )
   ```

3. **Generates Membership Number**: Format `EFF{YEAR}{MEMBER_ID_PADDED}`
   - Example: `EFF2025560406`

4. **Updates Application Status** to `Approved`

5. **Creates Audit Trail** in `application_approval_history` table

#### 3B. Application Rejection
When an application is rejected:

1. **Updates Application Status** to `Rejected`
2. **Records Rejection Reason**
3. **Creates Audit Trail**
4. **No member/membership records created**

## Database Schema

### membership_applications Table
```sql
CREATE TABLE membership_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_number VARCHAR(20) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  id_number VARCHAR(13) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender ENUM('Male','Female','Other','Prefer not to say') NOT NULL,
  email VARCHAR(255),
  cell_number VARCHAR(20) NOT NULL,
  residential_address TEXT NOT NULL,
  ward_code VARCHAR(20) NOT NULL,
  status ENUM('Draft','Submitted','Under Review','Approved','Rejected') NOT NULL,
  signature_type ENUM('typed','drawn'),
  signature_data TEXT,
  declaration_accepted BOOLEAN,
  constitution_accepted BOOLEAN,
  hierarchy_level VARCHAR(50),
  entity_name VARCHAR(200),
  membership_type ENUM('Regular','Associate','Student','Senior'),
  -- Additional fields...
);
```

### members Table
```sql
CREATE TABLE members (
  member_id INT AUTO_INCREMENT PRIMARY KEY,
  id_number VARCHAR(13) NOT NULL UNIQUE,
  firstname VARCHAR(50) NOT NULL,
  surname VARCHAR(50),
  date_of_birth DATE,
  gender_id TINYINT NOT NULL,
  ward_code VARCHAR(15) NOT NULL,
  cell_number VARCHAR(15),
  email VARCHAR(100),
  residential_address TEXT,
  membership_type ENUM('Regular','Student','Senior','Honorary'),
  application_id INT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### memberships Table
```sql
CREATE TABLE memberships (
  membership_id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  date_joined DATE NOT NULL,
  subscription_type_id TINYINT NOT NULL,
  membership_amount DECIMAL(8,2),
  status_id TINYINT NOT NULL,
  payment_method VARCHAR(20),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(member_id)
);
```

## API Endpoints

### Approve Application
```http
POST /api/v1/membership-applications/:id/approve
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "admin_notes": "Application approved after verification"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Application approved successfully and member created",
  "data": {
    "member_id": 560406,
    "membership_id": 560199,
    "membership_number": "EFF2025560406"
  }
}
```

### Reject Application
```http
POST /api/v1/membership-applications/:id/reject
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "rejection_reason": "Incomplete documentation",
  "admin_notes": "Missing proof of address"
}
```

### Get Approval Statistics
```http
GET /api/v1/membership-applications/approval/statistics
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "statistics": {
      "total_applications": 150,
      "pending_approval": 25,
      "under_review": 10,
      "approved": 100,
      "rejected": 15,
      "draft": 0
    }
  }
}
```

## Data Flow

```
Application Form (Frontend)
         ↓
membership_applications table (status: Draft)
         ↓
Admin Review (status: Submitted → Under Review)
         ↓
Admin Decision
         ↓
    ┌─────────────┐         ┌─────────────┐
    │   APPROVE   │         │   REJECT    │
    └─────────────┘         └─────────────┘
         ↓                       ↓
    Create Member           Update Status
         ↓                   (Rejected)
    Create Membership            ↓
         ↓                   End Process
    Generate Membership#
         ↓
    Update Application
    (status: Approved)
         ↓
    Create Audit Trail
         ↓
    End Process
```

## Business Rules

1. **Unique ID Numbers**: Each ID number can only have one active membership
2. **Application States**: Applications can only be approved/rejected from 'Submitted' or 'Under Review' status
3. **Member Creation**: Members are only created upon application approval
4. **Membership Numbers**: Auto-generated in format EFF{YEAR}{MEMBER_ID}
5. **Audit Trail**: All approval/rejection actions are logged
6. **Transaction Safety**: Approval process uses database transactions to ensure data consistency

## Error Handling

- **Duplicate ID Number**: Prevents creating multiple members with same ID
- **Invalid Status Transitions**: Validates application status before approval/rejection
- **Database Rollback**: If any step fails during approval, all changes are rolled back
- **Comprehensive Logging**: All errors and actions are logged for debugging

## Testing

Use the provided test script to verify the workflow:
```bash
node test-approval-workflow.js
```

This creates a test application and simulates the complete approval process, verifying that:
- Application is created correctly
- Member record is created with proper data mapping
- Membership record is created with default values
- Membership number is generated correctly
- Application status is updated appropriately
