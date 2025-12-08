# External Renewal API - Quick Reference Card

## Endpoint
```
POST /api/external-renewal/renew
```

## Minimal Request
```json
{
  "id_number": "9001015800084"
}
```

## Full Request
```json
{
  "id_number": "9001015800084",
  "renewal_period_months": 12,
  "payment_reference": "PAY-2024-001",
  "payment_method": "online",
  "amount_paid": 120.00,
  "notes": "Renewal note",
  "external_system_id": "EXT-12345"
}
```

## Parameters

| Parameter | Type | Required | Default | Range/Values |
|-----------|------|----------|---------|--------------|
| `id_number` | string | ✅ Yes | - | 13-digit South African ID number |
| `renewal_period_months` | integer | No | 12 | 1-60 |
| `payment_reference` | string | No | - | Max 100 chars |
| `payment_method` | string | No | 'external_system' | 'online', 'bank_transfer', 'cash', 'cheque', 'eft', 'external_system' |
| `amount_paid` | number | No | - | ≥ 0 |
| `notes` | string | No | - | Max 500 chars |
| `external_system_id` | string | No | - | Max 100 chars |

## Response Structure
```json
{
  "success": true,
  "message": "Membership renewed and status updated to active",
  "data": {
    "renewal_details": {
      "id_number": "9001015800084",
      "member_id": 12345,
      "previous_expiry_date": "2024-01-15",
      "new_expiry_date": "2025-01-15",
      "renewal_period_months": 12,
      "payment_reference": "PAY-2024-001",
      "payment_method": "online",
      "amount_paid": 120.00,
      "renewed_at": "2024-10-25T10:30:00.000Z"
    },
    "membership": {
      "member_id": 12345,
      "full_name": "John Doe",
      "membership_number": "MEM012345",
      "membership_status_name": "Active",
      "membership_is_active": true,
      "expiry_date": "2025-01-15",
      "days_until_expiry": 82,
      "province_name": "Gauteng",
      ...
    }
  }
}
```

## HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | Success | Renewal completed successfully |
| 400 | Bad Request | Validation error (missing/invalid parameters) |
| 404 | Not Found | Member with specified ID not found |
| 500 | Server Error | Internal server error |

## Error Response
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Member with ID 12345 not found"
  },
  "timestamp": "2024-10-25T10:30:00.000Z"
}
```

## cURL Examples

### Basic Renewal
```bash
curl -X POST http://localhost:5000/api/external-renewal/renew \
  -H "Content-Type: application/json" \
  -d '{"id_number": "9001015800084"}'
```

### Full Renewal
```bash
curl -X POST http://localhost:5000/api/external-renewal/renew \
  -H "Content-Type: application/json" \
  -d '{
    "id_number": "9001015800084",
    "renewal_period_months": 12,
    "payment_reference": "PAY-2024-001",
    "payment_method": "online",
    "amount_paid": 120.00,
    "notes": "Annual renewal"
  }'
```

## JavaScript (Axios)
```javascript
const axios = require('axios');

const result = await axios.post(
  'http://localhost:5000/api/external-renewal/renew',
  {
    id_number: '9001015800084',
    renewal_period_months: 12,
    payment_reference: 'PAY-2024-001',
    payment_method: 'online',
    amount_paid: 120.00
  }
);

console.log(result.data.data.renewal_details);
```

## Python
```python
import requests

response = requests.post(
    'http://localhost:5000/api/external-renewal/renew',
    json={
        'id_number': '9001015800084',
        'renewal_period_months': 12,
        'payment_reference': 'PAY-2024-001',
        'payment_method': 'online',
        'amount_paid': 120.00
    }
)

data = response.json()
print(data['data']['renewal_details'])
```

## PHP
```php
$ch = curl_init('http://localhost:5000/api/external-renewal/renew');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'id_number' => '9001015800084',
    'renewal_period_months' => 12,
    'payment_reference' => 'PAY-2024-001',
    'payment_method' => 'online',
    'amount_paid' => 120.00
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

$response = curl_exec($ch);
$data = json_decode($response, true);
curl_close($ch);

print_r($data['data']['renewal_details']);
```

## Business Logic

### Expiry Date Calculation
1. **Active membership** (expiry in future): Extend from expiry date
2. **Expired membership**: Extend from today
3. **No membership**: Start from today
4. Add `renewal_period_months` to base date

### Status Update
- Membership status → "Active" (status_id = 1)
- Payment status → "Completed"
- Last payment date → Current date

## Common Errors

### Member Not Found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Member with ID number 9999999999999 not found"
  }
}
```
**Solution:** Verify id_number exists in database (13-digit South African ID)

### Missing id_number
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "\"id_number\" is required"
  }
}
```
**Solution:** Include id_number in request body (13-digit South African ID)

### Invalid Renewal Period
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "\"renewal_period_months\" must be less than or equal to 60"
  }
}
```
**Solution:** Use value between 1 and 60

## Testing

### Run Automated Tests
```bash
node test/api/external-renewal.test.js
```

### Import Postman Collection
```
File: test/postman/External-Renewal-API.postman_collection.json
```

### Health Check
```bash
curl http://localhost:5000/api/health
```

## Documentation Links

- **Full API Docs:** `backend/docs/EXTERNAL_RENEWAL_API.md`
- **Code Examples:** `backend/docs/EXTERNAL_RENEWAL_EXAMPLES.md`
- **Implementation:** `backend/docs/EXTERNAL_RENEWAL_IMPLEMENTATION.md`
- **Main API Docs:** `backend/API_DOCUMENTATION.md`

## Support

- Review error messages in response
- Check server logs for details
- Verify database connection
- Ensure member exists in database

## Security Notes

⚠️ **Current:** No authentication required  
✅ **Production:** Implement API key authentication, rate limiting, IP whitelisting

## Performance

- Average response time: ~100ms
- Handles concurrent requests
- Database connection pooling enabled
- Suitable for high-volume integrations

---

**Version:** 1.0.0  
**Last Updated:** 2024-10-25  
**Endpoint:** `/api/external-renewal/renew`

