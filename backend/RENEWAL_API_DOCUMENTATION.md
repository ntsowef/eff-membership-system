# Membership Renewal API Documentation

## Overview

This document describes the simple membership renewal API endpoints that allow members to renew their membership with payment processing.

## Base URL

```
http://localhost:5000/api/v1/renewals
```

---

## Endpoints

### 1. GET Member Renewal Data

Retrieve existing member data for renewal based on ID number.

**Endpoint:** `GET /api/v1/renewals/member/:idNumber`

**Parameters:**
- `idNumber` (path parameter) - 13-digit South African ID number

**Response:**

```json
{
  "success": true,
  "message": "Member data retrieved for renewal",
  "data": {
    "member": {
      "member_id": 93087,
      "id_number": "7501165402082",
      "firstname": "FRANS NTSWOWE",
      "surname": "",
      "middle_name": null,
      "email": "frans.updated@example.com",
      "cell_number": "0796222802",
      "landline_number": null,
      "residential_address": "ZULU",
      "postal_address": null,
      "ward_code": "79800135",
      "membership_type": "Regular",
      "member_created_at": "2025-10-04T03:48:16.745Z",
      "membership_number": "EFF0067388",
      "date_joined": "2024-08-11T22:00:00Z",
      "last_payment_date": "2025-11-01T22:00:00Z",
      "expiry_date": "2027-11-01T22:00:00Z",
      "status_id": 1,
      "status_name": "Active",
      "province_code": null,
      "province_name": null,
      "district_code": null,
      "district_name": null,
      "municipality_code": "JHB004",
      "municipality_name": "JHB - D",
      "ward_name": "Ward 135",
      "voting_station_name": null
    },
    "renewal_eligible": true,
    "message": "Member data retrieved successfully for renewal"
  },
  "timestamp": "2025-11-02T11:19:14.731Z"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid ID number format
- `404 Not Found` - Member not found

**Example:**

```bash
curl http://localhost:5000/api/v1/renewals/member/7501165402082
```

---

### 2. POST Process Renewal with Payment

Process membership renewal with payment and optional data updates.

**Endpoint:** `POST /api/v1/renewals/process`

**Request Body:**

```json
{
  "id_number": "7501165402082",
  "payment_method": "Cash",
  "payment_reference": "TEST-RENEWAL-001",
  "amount_paid": 150.00,
  "updated_member_data": {
    "email": "frans.updated@example.com",
    "cell_number": "0796222802",
    "landline_number": "0123456789",
    "residential_address": "123 Main Street",
    "postal_address": "PO Box 123",
    "ward_code": "79800135"
  }
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id_number` | string | Yes | 13-digit South African ID number |
| `payment_method` | string | Yes | One of: 'Card', 'Cash', 'EFT', 'Mobile', 'Other' |
| `payment_reference` | string | No | Payment reference number (auto-generated if not provided) |
| `amount_paid` | number | Yes | Payment amount (must be positive) |
| `updated_member_data` | object | No | Optional member data updates |
| `updated_member_data.email` | string | No | Updated email address |
| `updated_member_data.cell_number` | string | No | Updated cell phone number |
| `updated_member_data.landline_number` | string | No | Updated landline number |
| `updated_member_data.residential_address` | string | No | Updated residential address |
| `updated_member_data.postal_address` | string | No | Updated postal address |
| `updated_member_data.ward_code` | string | No | Updated ward code |

**Response:**

```json
{
  "success": true,
  "message": "Membership renewed successfully",
  "data": {
    "member": {
      "member_id": 93087,
      "id_number": "7501165402082",
      "firstname": "FRANS NTSWOWE",
      "surname": "",
      "email": "frans.updated@example.com",
      "cell_number": "0796222802",
      "membership_number": "EFF0067388",
      "date_joined": "2024-08-11T22:00:00.000Z",
      "last_payment_date": "2025-11-01T22:00:00.000Z",
      "expiry_date": "2027-11-01T22:00:00.000Z",
      "status_id": 1,
      "status_name": "Active"
    },
    "payment": {
      "payment_id": 4,
      "payment_reference": "TEST-RENEWAL-001",
      "amount_paid": 150,
      "payment_method": "Cash",
      "payment_date": "2025-11-02"
    },
    "renewal_details": {
      "last_payment_date": "2025-11-02",
      "expiry_date": "2027-11-02",
      "renewal_period": "24 months"
    }
  },
  "timestamp": "2025-11-02T11:18:27.388Z"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid request data (validation errors)
- `404 Not Found` - Member not found
- `500 Internal Server Error` - Database or processing error

**Example:**

```bash
curl -X POST http://localhost:5000/api/v1/renewals/process \
  -H "Content-Type: application/json" \
  -d '{
    "id_number": "7501165402082",
    "payment_method": "Cash",
    "payment_reference": "TEST-RENEWAL-001",
    "amount_paid": 150.00,
    "updated_member_data": {
      "email": "frans.updated@example.com",
      "cell_number": "0796222802"
    }
  }'
```

---

## Business Logic

### Date Calculations

When a renewal is processed:

1. **`last_payment_date`** is set to the current date
2. **`expiry_date`** is calculated as **24 months (730 days)** from `last_payment_date`
3. **`status_id`** is updated to `1` (Active)

### Member Data Updates

- Only fields provided in `updated_member_data` are updated
- If `updated_member_data` is not provided or empty, no member data is changed
- All other fields remain unchanged

### Payment Record

A payment record is created in the `payments` table with:
- `payment_type`: 'Renewal'
- `payment_status`: 'Completed'
- `payment_date`: Current timestamp
- `currency`: 'ZAR' (South African Rand)

---

## Database Tables Affected

### 1. `members` table
- Updates: `email`, `cell_number`, `landline_number`, `residential_address`, `postal_address`, `ward_code` (if provided)

### 2. `memberships` table
- Updates: `last_payment_date`, `expiry_date`, `status_id`, `updated_at`

### 3. `payments` table
- Inserts: New payment record with all payment details

---

## Testing

### Test Script

A test script is provided at `backend/test-renewal-process.js`:

```bash
node test-renewal-process.js
```

### Verification Script

A verification script is provided at `backend/verify-renewal-data.js`:

```bash
node verify-renewal-data.js
```

---

## Implementation Details

### File Location
- **Route File:** `backend/src/routes/memberRenewalSimple.ts`
- **Registered in:** `backend/src/app.ts` (line 220)

### Dependencies
- `express` - Web framework
- `joi` - Request validation
- `pg` - PostgreSQL client
- Database helper functions from `../config/database`

### Validation
- ID number must be exactly 13 digits
- Payment method must be one of the allowed values (case-sensitive)
- Amount paid must be a positive number
- Email must be valid email format (if provided)

---

## Notes

1. **Case Sensitivity:** Payment method values are case-sensitive and must match exactly: 'Card', 'Cash', 'EFT', 'Mobile', 'Other'

2. **Auto-generated Reference:** If `payment_reference` is not provided, it will be auto-generated in the format: `REN-{timestamp}-{member_id}`

3. **Status Update:** The renewal process automatically sets the membership status to Active (status_id = 1)

4. **Date Format:** All dates are stored in ISO 8601 format (YYYY-MM-DD)

5. **Transaction Safety:** The renewal process uses database transactions to ensure data consistency

---

## Future Enhancements

Potential future improvements:
- Email/SMS notifications after successful renewal
- Receipt generation and download
- Payment gateway integration (Peach Payments)
- Renewal history tracking
- Grace period handling for expired memberships
- Bulk renewal processing
- Renewal reminders before expiry

---

## Support

For issues or questions, please contact the development team.

