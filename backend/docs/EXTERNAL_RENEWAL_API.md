# External Renewal API Documentation

## Overview
The External Renewal API allows external systems to renew memberships and update membership status from inactive to active/good standing. The endpoint returns complete membership data including member details, geographic information, and updated membership status.

## Base URL
```
http://localhost:5000/api/external-renewal
```

## Authentication
Currently, this endpoint does not require authentication. For production use, consider implementing:
- API Key authentication
- OAuth 2.0
- JWT tokens
- IP whitelisting

## Endpoint

### POST /renew
Renew a membership and update status from inactive to active.

**URL:** `/api/external-renewal/renew`

**Method:** `POST`

**Content-Type:** `application/json`

#### Request Body

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id_number` | string | Yes | - | The member's South African ID number (13 digits) |
| `renewal_period_months` | integer | No | 12 | Number of months to extend membership (1-60) |
| `payment_reference` | string | No | - | External payment reference (max 100 chars) |
| `payment_method` | string | No | 'external_system' | Payment method: 'online', 'bank_transfer', 'cash', 'cheque', 'eft', 'external_system' |
| `amount_paid` | number | No | - | Amount paid for renewal |
| `notes` | string | No | - | Additional notes about the renewal (max 500 chars) |
| `external_system_id` | string | No | - | Identifier from the external system (max 100 chars) |

#### Request Example

```json
{
  "id_number": "9001015800084",
  "renewal_period_months": 12,
  "payment_reference": "EXT-PAY-2024-001",
  "payment_method": "online",
  "amount_paid": 120.00,
  "notes": "Renewal processed via external payment gateway",
  "external_system_id": "EXT-SYS-12345"
}
```

#### Success Response

**Code:** `200 OK`

**Response Structure:**

```json
{
  "success": true,
  "message": "Membership renewed and status updated to active",
  "data": {
    "success": true,
    "message": "Membership renewed successfully",
    "renewal_details": {
      "id_number": "9001015800084",
      "member_id": 12345,
      "previous_expiry_date": "2024-01-15",
      "new_expiry_date": "2025-01-15",
      "renewal_period_months": 12,
      "payment_reference": "EXT-PAY-2024-001",
      "payment_method": "online",
      "amount_paid": 120.00,
      "renewed_at": "2024-10-25T10:30:00.000Z"
    },
    "membership": {
      "member_id": 12345,
      "id_number": "9001015800084",
      "firstname": "John",
      "surname": "Doe",
      "middle_name": "Smith",
      "full_name": "John Doe",
      "date_of_birth": "1990-01-15",
      "age": 34,
      "email": "john.doe@example.com",
      "cell_number": "0821234567",
      "landline_number": null,
      "residential_address": "123 Main Street, Johannesburg",
      "postal_address": "PO Box 123, Johannesburg, 2000",
      "ward_code": "79800001",
      "membership_type": "Regular",
      "member_created_at": "2023-01-15T08:00:00.000Z",
      "member_updated_at": "2024-10-25T10:30:00.000Z",
      
      "gender_name": "Male",
      "race_name": "Black African",
      "citizenship_name": "South African",
      "language_name": "English",
      "occupation_name": "Software Developer",
      "occupation_category": "Information Technology",
      "qualification_name": "Bachelor's Degree",
      "qualification_level": 6,
      "voter_status_name": "Registered",
      
      "ward_number": "1",
      "ward_name": "Ward 1",
      "municipality_name": "City of Johannesburg",
      "district_name": "Johannesburg",
      "province_name": "Gauteng",
      
      "membership_id": 98765,
      "membership_number": "MEM012345",
      "date_joined": "2023-01-15",
      "last_payment_date": "2024-10-25",
      "expiry_date": "2025-01-15",
      "subscription_type_id": 1,
      "membership_amount": 120.00,
      "status_id": 1,
      "payment_method": "online",
      "payment_reference": "EXT-PAY-2024-001",
      "payment_status": "Completed",
      "membership_created_at": "2023-01-15T08:00:00.000Z",
      "membership_updated_at": "2024-10-25T10:30:00.000Z",
      
      "membership_status_name": "Active",
      "membership_status_code": "ACT",
      "membership_is_active": true,
      "allows_voting": true,
      "allows_leadership": true,
      
      "subscription_name": "Annual Membership",
      "subscription_code": "ANN",
      "duration_months": 12,
      
      "days_until_expiry": 82,
      "is_expired": false
    }
  },
  "timestamp": "2024-10-25T10:30:00.000Z"
}
```

#### Error Responses

**Member Not Found**

**Code:** `404 Not Found`

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Member with ID number 9001015800084 not found"
  },
  "timestamp": "2024-10-25T10:30:00.000Z"
}
```

**Validation Error**

**Code:** `400 Bad Request`

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "\"id_number\" is required"
  },
  "timestamp": "2024-10-25T10:30:00.000Z"
}
```

**Invalid Renewal Period**

**Code:** `400 Bad Request`

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "\"renewal_period_months\" must be less than or equal to 60"
  },
  "timestamp": "2024-10-25T10:30:00.000Z"
}
```

## Business Logic

### Expiry Date Calculation
1. If the member has an existing membership with an expiry date:
   - If the expiry date is in the future (membership still active): extend from the expiry date
   - If the expiry date is in the past (membership expired): extend from today's date
2. If the member has no existing membership or no expiry date: start from today's date
3. Add the specified `renewal_period_months` to the base date

### Status Update
- The membership status is automatically updated to "Active" (status_id = 1)
- The `payment_status` is set to "Completed"
- The `last_payment_date` is set to the current date

### Membership Creation
- If the member doesn't have an existing membership record, a new one is created
- Default subscription type (ID: 1) is used if not specified
- Default amount of 120.00 is used if `amount_paid` is not provided

### Activity Logging
- A record is created in `membership_status_history` table (if it exists)
- Logs the status change from the previous status to "Active"
- Records the reason as "External renewal via API - X months"

## Integration Examples

### cURL Example

```bash
curl -X POST http://localhost:5000/api/external-renewal/renew \
  -H "Content-Type: application/json" \
  -d '{
    "id_number": "9001015800084",
    "renewal_period_months": 12,
    "payment_reference": "EXT-PAY-2024-001",
    "payment_method": "online",
    "amount_paid": 120.00,
    "notes": "Renewal via external system",
    "external_system_id": "EXT-12345"
  }'
```

### JavaScript/Node.js Example

```javascript
const axios = require('axios');

async function renewMembership(idNumber, renewalData) {
  try {
    const response = await axios.post(
      'http://localhost:5000/api/external-renewal/renew',
      {
        id_number: idNumber,
        renewal_period_months: renewalData.months || 12,
        payment_reference: renewalData.paymentRef,
        payment_method: renewalData.method || 'external_system',
        amount_paid: renewalData.amount,
        notes: renewalData.notes,
        external_system_id: renewalData.externalId
      }
    );

    console.log('Renewal successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('Renewal failed:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
renewMembership('9001015800084', {
  months: 12,
  paymentRef: 'EXT-PAY-2024-001',
  method: 'online',
  amount: 120.00,
  notes: 'Renewal via external payment gateway',
  externalId: 'EXT-12345'
});
```

### Python Example

```python
import requests
import json

def renew_membership(id_number, renewal_data):
    url = 'http://localhost:5000/api/external-renewal/renew'

    payload = {
        'id_number': id_number,
        'renewal_period_months': renewal_data.get('months', 12),
        'payment_reference': renewal_data.get('payment_ref'),
        'payment_method': renewal_data.get('method', 'external_system'),
        'amount_paid': renewal_data.get('amount'),
        'notes': renewal_data.get('notes'),
        'external_system_id': renewal_data.get('external_id')
    }

    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        print('Renewal successful:', response.json())
        return response.json()
    except requests.exceptions.RequestException as e:
        print('Renewal failed:', e)
        raise

# Usage
renew_membership('9001015800084', {
    'months': 12,
    'payment_ref': 'EXT-PAY-2024-001',
    'method': 'online',
    'amount': 120.00,
    'notes': 'Renewal via external payment gateway',
    'external_id': 'EXT-12345'
})
```

## Security Recommendations

For production deployment, implement the following security measures:

1. **API Key Authentication**
   - Generate unique API keys for each external system
   - Validate API key in request headers
   - Implement key rotation policy

2. **Rate Limiting**
   - Limit requests per API key (e.g., 100 requests per hour)
   - Implement exponential backoff for failed requests

3. **IP Whitelisting**
   - Restrict access to known IP addresses
   - Maintain a whitelist of authorized systems

4. **Request Validation**
   - Validate all input parameters
   - Sanitize data to prevent SQL injection
   - Implement request signing for data integrity

5. **Audit Logging**
   - Log all renewal requests with timestamps
   - Track which external system made the request
   - Monitor for suspicious patterns

6. **HTTPS Only**
   - Enforce HTTPS in production
   - Use TLS 1.2 or higher

## Testing

### Test Member IDs
Use the following test scenarios:

1. **Active Member with Valid Expiry**: Test extending an active membership
2. **Expired Member**: Test renewing an expired membership
3. **Member Without Membership Record**: Test creating a new membership
4. **Invalid Member ID**: Test error handling for non-existent members

### Health Check
Before using the API, verify the service is running:

```bash
curl http://localhost:5000/api/health
```

## Support

For issues or questions about this API:
- Check the main API documentation
- Review error messages in the response
- Contact the development team

## Changelog

### Version 1.0.0 (2024-10-25)
- Initial release
- Support for membership renewal
- Complete membership data retrieval
- Status update from inactive to active

