# VOTER STATUS & VOTING DISTRICT CODE IMPLEMENTATION PLAN

**Date**: 2025-11-10  
**Member**: 7808020703087 (Dunga Marshall)  
**Status**: Investigation Complete - Ready for Implementation

---

## 📊 CURRENT STATUS ANALYSIS

### Member 7808020703087 Current Data:
- **Member ID**: 772468
- **Name**: Dunga Marshall
- **Membership Status ID**: 1 (Active - Good Standing) ✅
- **Voter Status ID**: NULL ⚠️
- **Voting District Code**: NULL ⚠️
- **Ward Code**: 79700100
- **Municipality Code**: EKU (metro-level code)
- **Created**: 2025-11-10 14:21:38

### Application Data:
- **Application ID**: 5
- **Status**: Approved
- **Ward Code**: 79700100
- **Voting District Code**: NULL
- **Municipal Code**: EKU
- **IEC Verified**: No column exists in table

### Available Voter Statuses:
1. **Registered** - Registered to vote
2. **Not Registered** - Not registered to vote
3. **Pending Verification** - Registration pending verification
4. **Verification Failed** - Voter verification failed
5. **Deceased** - Deceased voter
6. **Other** - Other status

### Available Membership Statuses:
1. **Active** (ID: 1) - Active membership in good standing ✅
8. **Good Standing** (ID: 8) - Member in good standing with all obligations met

---

## 🔍 IEC VERIFICATION FLOW ANALYSIS

### Current IEC Integration:

**Frontend** (`MembershipApplicationPage.tsx` Line 146):
```typescript
const iecResponse = await api.post('/iec/verify-voter-public', {
  idNumber: idNumber,
});

if (iecResponse.data.success && iecResponse.data.data) {
  const iecData = iecResponse.data.data;
  console.log('✅ IEC verification successful');
  console.log('   Registered:', iecData.is_registered);
  
  // Store IEC data for use in Contact Info step
  updateApplicationData({
    iec_verification: iecData,
  } as any);
}
```

**Backend** (`iecApiService.ts` Line 256-260):
```typescript
const voterDetails: IECVoterDetails = {
  id_number: idNumber,
  is_registered: response.data.bRegistered,  // ← KEY FIELD
  voter_status: response.data.VoterStatus    // ← "You are registered." or "Not Registered"
};
```

**IEC API Response Structure**:
```json
{
  "id_number": "7808020703087",
  "is_registered": true,              ← Boolean flag
  "voter_status": "You are registered.",  ← Status text
  "ward_id": 79800135,
  "vd_number": 32871326,              ← IEC voting district number
  "ward_code": "79800135",
  "voting_district_code": "32871326"
}
```

**Key Finding**: IEC verification happens during application submission, but the data is NOT stored in the database!

---

## 🎯 BUSINESS RULES TO IMPLEMENT

### Rule 1: Registered Voters with VD Code
- **IF**: `voter_status_id` = 1 (Registered)
- **AND**: IEC returned `vd_number` (voting district number)
- **THEN**: Use IEC `vd_number` as `voting_district_code`
- **Example**: `voting_district_code = '32871326'`

### Rule 2: Registered Voters WITHOUT VD Code
- **IF**: `voter_status_id` = 1 (Registered)
- **AND**: IEC did NOT return `vd_number` (NULL)
- **THEN**: Assign special code `voting_district_code = '222222222'`

### Rule 3: Non-Registered Voters
- **IF**: `voter_status_id` = 2 (Not Registered)
- **THEN**: Assign special code `voting_district_code = '999999999'`

### Rule 4: Verification Failed/Pending
- **IF**: `voter_status_id` = 3 (Pending Verification) OR 4 (Verification Failed)
- **THEN**: Assign special code `voting_district_code = '888888888'`

### Rule 5: Municipality Code Mapping
- **IF**: `municipal_code` is metro-level (e.g., "EKU", "JHB")
- **THEN**: Look up sub-region code from ward table
- **Example**: Ward 79700100 → Municipality Code "EKU004" (not "EKU")

### Rule 6: Membership Status
- **ALL** newly approved members: `membership_status_id = 1` (Active) ✅ Already implemented

---

## 🔧 IMPLEMENTATION PLAN

### Phase 1: Add IEC Data Storage to Application Table ✅ (Already exists)

**Columns in `membership_applications`**:
- `voting_district_code` VARCHAR(20) ✅ EXISTS
- Need to add: `iec_verification_data` JSONB (to store full IEC response)
- Need to add: `iec_is_registered` BOOLEAN
- Need to add: `iec_voter_status` VARCHAR(100)

### Phase 2: Update Application Submission to Store IEC Data

**File**: `backend/src/routes/membershipApplications.ts` (or wherever application submission happens)

**Add**: Store IEC verification results when application is submitted:
```typescript
// After IEC verification in frontend, send IEC data with application
{
  ...applicationData,
  iec_is_registered: iecData.is_registered,
  iec_voter_status: iecData.voter_status,
  iec_verification_data: JSON.stringify(iecData),
  voting_district_code: iecData.voting_district_code || null
}
```

### Phase 3: Update Approval Service to Set Voter Status

**File**: `backend/src/services/membershipApprovalService.ts`

**Location**: In `createMemberWithMembershipFromApplication()` method (around Line 121-217)

**Changes**:

1. **Determine Voter Status** (before creating member):
```typescript
// Determine voter_status_id based on IEC verification
let voter_status_id: number | null = null;
let voting_district_code: string | null = application.voting_district_code;

if (application.iec_is_registered === true) {
  voter_status_id = 1; // Registered
  
  // If no VD code from IEC, assign special code
  if (!voting_district_code) {
    voting_district_code = '222222222'; // Registered but no VD data
  }
} else if (application.iec_is_registered === false) {
  voter_status_id = 2; // Not Registered
  voting_district_code = '999999999'; // Not registered special code
} else {
  // IEC verification failed or pending
  voter_status_id = 4; // Verification Failed
  voting_district_code = '888888888'; // Verification failed special code
}
```

2. **Map Municipality Code** (before creating member):
```typescript
// Get correct municipality_code from ward table (sub-region, not metro)
const wardMunicipalityQuery = `
  SELECT municipality_code FROM wards WHERE ward_code = $1
`;
const wardMunicipalityResult = await executeQuery(wardMunicipalityQuery, [
  application.ward_code
]);
const correctMunicipalityCode = wardMunicipalityResult[0]?.municipality_code || application.municipal_code;
```

3. **Update INSERT Query** (Line 170-187):
```typescript
const query = `
  INSERT INTO members_consolidated (
    id_number, firstname, surname, date_of_birth, gender_id,
    ward_code, voting_district_code, voter_status_id,  ← ADD THESE
    cell_number, email, residential_address, postal_address,
    membership_type, application_id,
    province_code, province_name, district_code, district_name,
    municipality_code, municipality_name,
    membership_number, date_joined, last_payment_date, expiry_date,
    subscription_type_id, membership_amount, membership_status_id,
    payment_method, payment_status,
    created_at, updated_at
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
    $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
  RETURNING member_id
`;
```

4. **Update params array** (Line 189-217):
```typescript
const params = [
  application.id_number,
  application.first_name,
  application.last_name,
  application.date_of_birth,
  genderMap[application.gender] || 3,
  application.ward_code,
  voting_district_code,        // ← ADD: Special code or IEC VD code
  voter_status_id,             // ← ADD: 1=Registered, 2=Not Registered, etc.
  application.cell_number,
  application.email,
  application.residential_address,
  application.postal_address,
  application.membership_type || 'Regular',
  application.id,
  application.province_code,
  geographicData.province_name,
  application.district_code,
  geographicData.district_name,
  correctMunicipalityCode,     // ← CHANGE: Use ward's municipality code
  geographicData.municipality_name,
  tempMembershipNumber,
  dateJoined,
  application.last_payment_date || null,
  expiryDateStr,
  1, // Default subscription_type_id
  application.payment_amount || 10.00,
  1, // Active membership_status_id (1 = Good Standing) ✅ Already correct
  application.payment_method || 'Pending',
  application.payment_status || 'Pending'
];
```

### Phase 4: Update Existing Member 7808020703087

**SQL Update**:
```sql
-- Update member 772468 with correct data
UPDATE members_consolidated
SET 
  voter_status_id = 2,           -- Not Registered (since no IEC data stored)
  voting_district_code = '999999999',  -- Not registered special code
  municipality_code = 'EKU004'   -- Correct sub-region code from ward table
WHERE member_id = 772468;
```

**Note**: We should determine if this member was actually IEC verified. Check application logs or re-verify with IEC API.

---

## 📋 SPECIAL VOTING DISTRICT CODES

| Code | Meaning | Usage |
|------|---------|-------|
| `'222222222'` | Registered voter without VD data | IEC confirmed registration but no VD number returned |
| `'999999999'` | Not registered to vote | IEC confirmed NOT registered |
| `'888888888'` | Verification failed/pending | IEC verification failed or pending |
| Actual number (e.g., `'32871326'`) | IEC voting district code | IEC returned valid VD number |

---

## ✅ IMPLEMENTATION CHECKLIST

### Database Changes:
- [ ] Add `iec_verification_data` JSONB column to `membership_applications`
- [ ] Add `iec_is_registered` BOOLEAN column to `membership_applications`
- [ ] Add `iec_voter_status` VARCHAR(100) column to `membership_applications`

### Backend Changes:
- [ ] Update application submission to store IEC data
- [ ] Update `membershipApprovalService.ts` to determine voter_status_id
- [ ] Update `membershipApprovalService.ts` to assign voting_district_code
- [ ] Update `membershipApprovalService.ts` to map municipality code from ward table
- [ ] Add logging for voter status assignment

### Data Migration:
- [ ] Update member 772468 with correct voter status and VD code
- [ ] Verify if member was IEC verified (check logs or re-verify)

### Testing:
- [ ] Test approval with IEC registered voter (with VD code)
- [ ] Test approval with IEC registered voter (without VD code)
- [ ] Test approval with non-registered voter
- [ ] Test approval with verification failed
- [ ] Verify municipality code mapping works correctly

---

## 🚨 IMPORTANT NOTES

1. **IEC Data Not Stored**: Currently, IEC verification happens in frontend but data is NOT stored in database. We need to add columns to store this data.

2. **Municipality Code Issue**: Member has "EKU" (metro) but should have "EKU004" (sub-region from ward table).

3. **Voter Status Unknown**: Member 772468 has NULL voter_status_id. We need to determine if they were IEC verified.

4. **Special Codes**: The special VD codes (222222222, 999999999, 888888888) should be documented and added to a reference table.

---

**Status**: ⏳ **AWAITING APPROVAL TO IMPLEMENT**

**Next Step**: Get user confirmation on:
1. Special VD codes (222222222, 999999999, 888888888)
2. Whether to re-verify member 772468 with IEC API
3. Proceed with implementation

