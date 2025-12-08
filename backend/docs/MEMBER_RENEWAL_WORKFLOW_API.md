# Member Renewal Workflow API Documentation

## Overview

This API provides a comprehensive workflow for member-initiated membership renewals with admin approval. The workflow ensures that:

1. **Members can update their own information** (except restricted fields like `id_number` and `status`)
2. **Members can submit renewal requests** with payment information
3. **Renewals are in "pending approval" state** until verified by admin/finance staff
4. **Admin staff can approve or reject** renewal requests
5. **Upon approval**, membership status is updated to "Active" and new expiry date is applied

## Workflow Diagram

```
┌─────────────────┐
│  Member Login   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Update Profile Info     │
│ (Cannot update:         │
│  - id_number            │
│  - status)              │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Submit Renewal Request  │
│ - Payment info          │
│ - Renewal period        │
│ Status: Pending         │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Admin Reviews Request   │
│ - Verify payment        │
│ - Check details         │
└────────┬────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│Approve │ │Reject  │
└───┬────┘ └───┬────┘
    │          │
    ▼          ▼
┌────────┐ ┌────────┐
│Status: │ │Status: │
│Active  │ │Failed  │
│Expiry  │ │        │
│Updated │ │        │
└────────┘ └────────┘
```

## API Endpoints

### 1. Member Profile Update

**Endpoint:** `PUT /api/profile/me`

**Authentication:** Required (Member)

**Description:** Update member profile information. Cannot update `id_number` or membership `status`.

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "cell_number": "0821234567",
  "alternative_contact": "0117654321",
  "residential_address": "123 Main Street, Johannesburg",
  "postal_address": "PO Box 123, Johannesburg, 2000"
}
```

**Restricted Fields (Will be rejected):**
- `id_number`
- `status`
- `status_id`
- `membership_status`
- `member_id`

**Response (Success):**
```json
{
  "success": true,
  "message": "Member profile updated successfully",
  "data": {
    "member": {
      "member_id": 12345,
      "id_number": "9001015800084",
      "firstname": "John",
      "surname": "Doe",
      "email": "john.doe@example.com",
      "cell_number": "0821234567",
      ...
    }
  },
  "timestamp": "2024-10-25T10:30:00.000Z"
}
```

**Response (Error - Restricted Field):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Cannot update restricted fields: id_number, status. These fields can only be updated by administrators."
  }
}
```

---

### 2. Submit Renewal Request

**Endpoint:** `POST /api/member-renewals/request`

**Authentication:** Required (Member)

**Description:** Submit a membership renewal request with payment information.

**Request Body:**
```json
{
  "renewal_period_months": 12,
  "payment_method": "bank_transfer",
  "payment_reference": "PAY-2024-001",
  "payment_amount": 120.00,
  "notes": "Annual renewal payment via bank transfer"
}
```

**Parameters:**
- `renewal_period_months` (integer, optional, default: 12): Number of months to renew (1-60)
- `payment_method` (string, required): Payment method ('online', 'bank_transfer', 'cash', 'eft', 'card')
- `payment_reference` (string, optional): Payment reference number
- `payment_amount` (number, required): Amount paid for renewal
- `notes` (string, optional): Additional notes

**Response:**
```json
{
  "success": true,
  "message": "Renewal request submitted successfully. Pending admin approval.",
  "data": {
    "renewal_id": 456,
    "renewal_status": "Pending",
    "payment_status": "Pending",
    "renewal_details": {
      "renewal_id": 456,
      "member_id": 12345,
      "membership_id": 789,
      "renewal_year": 2024,
      "previous_expiry_date": "2024-12-31",
      "new_expiry_date": "2025-12-31",
      "renewal_amount": 120.00,
      "payment_method": "bank_transfer",
      "payment_reference": "PAY-2024-001",
      ...
    }
  },
  "timestamp": "2024-10-25T10:30:00.000Z"
}
```

---

### 3. View Member's Renewal Requests

**Endpoint:** `GET /api/member-renewals/my-requests`

**Authentication:** Required (Member)

**Description:** Get the authenticated member's renewal history.

**Response:**
```json
{
  "success": true,
  "data": {
    "renewals": [
      {
        "renewal_id": 456,
        "renewal_status": "Pending",
        "payment_status": "Pending",
        "renewal_requested_date": "2024-10-25T10:30:00.000Z",
        "renewal_amount": 120.00,
        ...
      }
    ],
    "total": 1
  },
  "timestamp": "2024-10-25T10:35:00.000Z"
}
```

---

### 4. Get Pending Renewals (Admin)

**Endpoint:** `GET /api/member-renewals/pending`

**Authentication:** Required (Admin/Finance)

**Description:** Get all pending renewal requests for admin review.

**Query Parameters:**
- `province_code` (string, optional): Filter by province
- `district_code` (string, optional): Filter by district
- `municipality_code` (string, optional): Filter by municipality
- `ward_code` (string, optional): Filter by ward
- `payment_status` (string, optional): Filter by payment status

**Response:**
```json
{
  "success": true,
  "data": {
    "renewals": [
      {
        "renewal_id": 456,
        "member_id": 12345,
        "id_number": "9001015800084",
        "full_name": "John Doe",
        "email": "john.doe@example.com",
        "cell_number": "0821234567",
        "membership_number": "MEM012345",
        "current_status_name": "Expired",
        "current_expiry_date": "2024-01-15",
        "new_expiry_date": "2025-01-15",
        "renewal_amount": 120.00,
        "payment_method": "bank_transfer",
        "payment_reference": "PAY-2024-001",
        "payment_status": "Pending",
        "renewal_status": "Pending",
        "renewal_requested_date": "2024-10-25T10:30:00.000Z",
        "ward_name": "Ward 5",
        "municipality_name": "Johannesburg",
        "district_name": "City of Johannesburg",
        "province_name": "Gauteng"
      }
    ],
    "total": 1,
    "filters": {}
  },
  "timestamp": "2024-10-25T10:40:00.000Z"
}
```

---

### 5. Get Renewal Details (Admin/Member)

**Endpoint:** `GET /api/member-renewals/:id`

**Authentication:** Required (Admin can view all, Member can view own)

**Description:** Get detailed information about a specific renewal request.

**Response:**
```json
{
  "success": true,
  "data": {
    "renewal": {
      "renewal_id": 456,
      "member_id": 12345,
      "membership_id": 789,
      "id_number": "9001015800084",
      "full_name": "John Doe",
      "email": "john.doe@example.com",
      "membership_number": "MEM012345",
      "current_status_name": "Expired",
      "current_expiry_date": "2024-01-15",
      "previous_expiry_date": "2024-01-15",
      "new_expiry_date": "2025-01-15",
      "renewal_amount": 120.00,
      "final_amount": 120.00,
      "payment_method": "bank_transfer",
      "payment_reference": "PAY-2024-001",
      "payment_status": "Pending",
      "renewal_status": "Pending",
      "renewal_requested_date": "2024-10-25T10:30:00.000Z",
      ...
    }
  },
  "timestamp": "2024-10-25T10:45:00.000Z"
}
```

---

### 6. Approve Renewal (Admin)

**Endpoint:** `POST /api/member-renewals/:id/approve`

**Authentication:** Required (Admin/Finance)

**Description:** Approve a renewal request. This will:
- Update renewal status to 'Completed'
- Update payment status to 'Completed'
- Update membership status to 'Active'
- Apply new expiry date to membership
- Record approval timestamp and admin

**Request Body:**
```json
{
  "admin_notes": "Payment verified via bank statement. Approved."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Renewal request approved successfully. Membership status updated to Active.",
  "data": {
    "renewal": {
      "renewal_id": 456,
      "renewal_status": "Completed",
      "payment_status": "Completed",
      "approved_by": 1,
      "approved_by_name": "admin",
      "approved_at": "2024-10-25T11:00:00.000Z",
      "renewal_processed_date": "2024-10-25T11:00:00.000Z",
      "renewal_completed_date": "2024-10-25T11:00:00.000Z",
      ...
    }
  },
  "timestamp": "2024-10-25T11:00:00.000Z"
}
```

---

### 7. Reject Renewal (Admin)

**Endpoint:** `POST /api/member-renewals/:id/reject`

**Authentication:** Required (Admin/Finance)

**Description:** Reject a renewal request with a reason.

**Request Body:**
```json
{
  "rejection_reason": "Payment reference not found in bank records. Please provide correct reference."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Renewal request rejected.",
  "data": {
    "renewal": {
      "renewal_id": 456,
      "renewal_status": "Failed",
      "payment_status": "Failed",
      "rejected_by": 1,
      "rejected_by_name": "admin",
      "rejected_at": "2024-10-25T11:05:00.000Z",
      "rejection_reason": "Payment reference not found in bank records. Please provide correct reference.",
      ...
    }
  },
  "timestamp": "2024-10-25T11:05:00.000Z"
}
```

---

## Database Schema

### membership_renewals Table

Key fields added for approval workflow:

```sql
approved_by INT NULL              -- User ID of admin who approved
approved_at TIMESTAMP NULL        -- Timestamp of approval
rejected_by INT NULL              -- User ID of admin who rejected
rejected_at TIMESTAMP NULL        -- Timestamp of rejection
rejection_reason TEXT NULL        -- Reason for rejection
previous_expiry_date DATE NULL    -- Expiry before renewal
new_expiry_date DATE NULL         -- Expiry after renewal
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Invalid request data or restricted field update attempt |
| `NOT_FOUND` | Resource not found (member, renewal, etc.) |
| `AUTHORIZATION_ERROR` | Insufficient permissions or unauthorized access |
| `AUTHENTICATION_ERROR` | Invalid or missing authentication token |

---

## Testing

Run the test suite:

```bash
node test/api/member-renewal-workflow.test.js
```

The test suite covers:
1. Member login
2. Admin login
3. Restricted field update attempts (should fail)
4. Allowed field updates
5. Renewal request submission
6. Viewing member renewals
7. Admin viewing pending renewals
8. Admin viewing renewal details
9. Admin approval
10. Verification of membership status update

---

## Security Considerations

1. **Field Restrictions**: Members cannot update `id_number` or membership `status`
2. **Role-Based Access**: Only admin/finance roles can approve/reject renewals
3. **Ownership Validation**: Members can only view their own renewal requests
4. **Audit Trail**: All approvals and rejections are logged with admin ID and timestamp
5. **Transaction Safety**: Approval process uses database transactions to ensure data consistency

---

## Best Practices

1. **Always verify payment** before approving renewal requests
2. **Provide clear rejection reasons** to help members correct issues
3. **Use filters** when viewing pending renewals to manage large volumes
4. **Monitor renewal status** regularly to ensure timely processing
5. **Keep admin notes** for audit and reference purposes

