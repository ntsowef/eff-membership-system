# IEC API Testing Guide

## Overview

The IEC Verification Service is currently tested with mocks because the IEC API is temporarily unavailable. This guide explains how to test the service with the real IEC API once it becomes available.

---

## Current Status

✅ **Unit Tests Complete**: 11/11 tests passing with mocked IEC API  
⏳ **Integration Tests**: Pending IEC API availability  
⏳ **Live Testing**: Pending IEC API availability

---

## Testing with Real IEC API

### Prerequisites

1. **IEC API Credentials**
   - Client ID
   - Client Secret
   - API Base URL: `https://api.elections.org.za`

2. **Environment Configuration**
   Update `backend/src/config/index.ts`:
   ```typescript
   iec: {
     enabled: true, // Set to true
     baseURL: 'https://api.elections.org.za',
     clientId: process.env.IEC_CLIENT_ID,
     clientSecret: process.env.IEC_CLIENT_SECRET,
     timeout: 30000,
     rateLimit: 10000 // 10,000 requests per hour
   }
   ```

3. **Redis Running**
   - Required for rate limiting
   - Default: `localhost:6379`

---

## Integration Test Script

Create `backend/src/services/bulk-upload/__tests__/iecVerificationService.integration.test.ts`:

```typescript
import { IECVerificationService } from '../iecVerificationService';
import { BulkUploadRecord } from '../types';

/**
 * Integration tests for IEC Verification Service
 * 
 * NOTE: These tests require:
 * 1. Valid IEC API credentials in environment variables
 * 2. Redis running for rate limiting
 * 3. Active internet connection
 * 
 * Run with: npm test -- iecVerificationService.integration.test.ts
 */
describe('IECVerificationService - Integration Tests', () => {
  // Skip if IEC API not configured
  const skipTests = !process.env.IEC_CLIENT_ID || !process.env.IEC_CLIENT_SECRET;

  beforeAll(() => {
    if (skipTests) {
      console.log('⚠️  Skipping IEC integration tests - API credentials not configured');
    }
  });

  it('should verify a known registered voter', async () => {
    if (skipTests) return;

    const record: BulkUploadRecord = {
      row_number: 2,
      'ID Number': '8001015009087', // Replace with known registered ID
      Name: 'Test',
      Surname: 'User'
    };

    const result = await IECVerificationService.verifyRecord(record);

    expect(result.id_number).toBe('8001015009087');
    expect(result.is_registered).toBe(true);
    expect(result.voter_status).toBe('Registered');
    expect(result.province_code).toBeDefined();
    expect(result.municipality_code).toBeDefined();
    expect(result.ward_code).toBeDefined();
    expect(result.voting_district_code).toBeDefined();
    expect(result.verification_date).toBeInstanceOf(Date);
  });

  it('should verify a known non-registered voter', async () => {
    if (skipTests) return;

    const record: BulkUploadRecord = {
      row_number: 2,
      'ID Number': '9001010001088', // Replace with known non-registered ID
      Name: 'Test',
      Surname: 'User'
    };

    const result = await IECVerificationService.verifyRecord(record);

    expect(result.id_number).toBe('9001010001088');
    expect(result.is_registered).toBe(false);
    expect(result.voter_status).toBe('Not Registered');
    expect(result.voting_district_code).toBe('999999999');
  });

  it('should verify batch of voters', async () => {
    if (skipTests) return;

    const records: BulkUploadRecord[] = [
      { row_number: 2, 'ID Number': '8001015009087', Name: 'John', Surname: 'Doe' },
      { row_number: 3, 'ID Number': '9001010001088', Name: 'Jane', Surname: 'Smith' },
      { row_number: 4, 'ID Number': '8506155000084', Name: 'Bob', Surname: 'Johnson' }
    ];

    const progressCallback = jest.fn();
    const results = await IECVerificationService.verifyRecordsBatch(records, progressCallback);

    expect(results.size).toBe(3);
    expect(progressCallback).toHaveBeenCalled();
    
    // Check each result
    results.forEach((result, idNumber) => {
      expect(result.id_number).toBe(idNumber);
      expect(result.verification_date).toBeInstanceOf(Date);
      expect(['Registered', 'Not Registered', 'Verification Error']).toContain(result.voter_status);
    });
  });

  it('should respect rate limiting', async () => {
    if (skipTests) return;

    // This test verifies rate limiting works
    // Note: May take time depending on rate limit settings
    
    const records: BulkUploadRecord[] = Array.from({ length: 20 }, (_, i) => ({
      row_number: i + 2,
      'ID Number': `800101500908${i}`,
      Name: `Person${i}`,
      Surname: 'Test'
    }));

    const startTime = Date.now();
    const results = await IECVerificationService.verifyRecordsBatch(records);
    const duration = Date.now() - startTime;

    expect(results.size).toBe(20);
    // Should take at least 3 seconds (4 batches × 1 second delay)
    expect(duration).toBeGreaterThanOrEqual(3000);
  });
});
```

---

## Manual Testing Steps

### 1. Test Single Voter Verification

```bash
# Start Node.js REPL
node

# Load service
const { IECVerificationService } = require('./dist/services/bulk-upload/iecVerificationService');

# Test single record
const record = {
  row_number: 2,
  'ID Number': '8001015009087',
  Name: 'Test',
  Surname: 'User'
};

IECVerificationService.verifyRecord(record).then(console.log);
```

### 2. Test Batch Verification

```bash
# Create test file: test-iec-batch.js
const { IECVerificationService } = require('./dist/services/bulk-upload/iecVerificationService');

const records = [
  { row_number: 2, 'ID Number': '8001015009087', Name: 'John', Surname: 'Doe' },
  { row_number: 3, 'ID Number': '9001010001088', Name: 'Jane', Surname: 'Smith' }
];

IECVerificationService.verifyRecordsBatch(records, (current, total) => {
  console.log(`Progress: ${current}/${total}`);
}).then(results => {
  console.log(`\nVerified ${results.size} records:`);
  results.forEach((result, idNumber) => {
    console.log(`${idNumber}: ${result.voter_status}`);
  });
});

# Run test
node test-iec-batch.js
```

---

## Expected Behavior

### Registered Voter
```json
{
  "id_number": "8001015009087",
  "is_registered": true,
  "voter_status": "Registered",
  "province_code": "5",
  "municipality_code": "599",
  "ward_code": "59900001",
  "voting_district_code": "59900001001",
  "voting_station_name": "Test Voting Station",
  "verification_date": "2025-11-24T..."
}
```

### Non-Registered Voter
```json
{
  "id_number": "9001010001088",
  "is_registered": false,
  "voter_status": "Not Registered",
  "voting_district_code": "999999999",
  "verification_date": "2025-11-24T..."
}
```

### Registered Without VD Code
```json
{
  "id_number": "8506155000084",
  "is_registered": true,
  "voter_status": "Registered",
  "voting_district_code": "222222222",
  "verification_date": "2025-11-24T..."
}
```

---

## Troubleshooting

### Rate Limit Errors
```
Error: IEC API rate limit exceeded (10000/10000)
```
**Solution**: Wait for rate limit to reset (shown in error message)

### Authentication Errors
```
Error: Failed to authenticate with IEC API
```
**Solution**: Check IEC_CLIENT_ID and IEC_CLIENT_SECRET environment variables

### Connection Errors
```
Error: IEC API connection failed
```
**Solution**: Check internet connection and IEC API status

---

## Contact

When IEC API becomes available, update this guide with:
- Real test ID numbers
- Expected response formats
- Any API-specific quirks or limitations

