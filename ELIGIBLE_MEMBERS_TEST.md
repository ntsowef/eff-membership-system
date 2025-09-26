# Eligible Leadership Members - Testing Guide

## ✅ **TypeScript Compilation Fixed**

The TypeScript error has been resolved by adding the missing import:

```typescript
// Fixed import in backend/src/routes/leadership.ts
import { ValidationError, NotFoundError, sendPaginatedSuccess } from '../middleware/errorHandler';
```

## 🧪 **How to Test the Implementation**

### **1. Backend API Test**

**Start the backend server:**
```bash
cd backend
npm run dev
```

**Test the API endpoint:**
```bash
# Get all eligible members
curl -X GET "http://localhost:5000/api/v1/leadership/eligible-members?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get eligible members for specific hierarchy level
curl -X GET "http://localhost:5000/api/v1/leadership/eligible-members?hierarchy_level=National&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Eligible leadership members retrieved successfully",
  "data": [
    {
      "member_id": 123,
      "membership_number": "MEM000123",
      "full_name": "John Doe",
      "first_name": "John",
      "last_name": "Doe",
      "id_number": "8001015009087",
      "email": "john.doe@example.com",
      "phone": "0821234567",
      "membership_status": "Active",
      "province_name": "Gauteng",
      "municipality_name": "City of Johannesburg",
      "membership_duration_months": 12,
      "eligibility_status": "Eligible",
      "eligibility_notes": "Member meets all eligibility criteria (Active status + 6+ months membership)"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### **2. Frontend Component Test**

**Add the route to your app:**
```tsx
// In your main App.tsx or routing file
import { EligibleMembersView } from './components/leadership';

<Route path="/eligible-members" element={<EligibleMembersView />} />
```

**Navigate to the page:**
- Go to `http://localhost:3000/eligible-members`
- Should display a table of eligible members
- Test pagination and filtering

### **3. Database Query Test**

**Run the SQL queries directly:**
```sql
-- Test basic eligibility query
SELECT 
  m.member_id,
  CONCAT('MEM', LPAD(m.member_id, 6, '0')) as membership_number,
  CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
  TIMESTAMPDIFF(MONTH, m.member_created_at, NOW()) as membership_duration_months,
  CASE 
    WHEN TIMESTAMPDIFF(MONTH, m.member_created_at, NOW()) >= 6 THEN 'Eligible'
    ELSE 'Not Eligible'
  END as eligibility_status
FROM members m
WHERE m.member_id IS NOT NULL
  AND TIMESTAMPDIFF(MONTH, m.member_created_at, NOW()) >= 6
ORDER BY m.firstname, m.surname
LIMIT 10;
```

### **4. API Integration Test**

**Test with JavaScript/TypeScript:**
```typescript
import { LeadershipAPI } from './services/leadershipApi';

// Test the API method
async function testEligibleMembers() {
  try {
    const result = await LeadershipAPI.getEligibleLeadershipMembers({
      page: 1,
      limit: 10,
      hierarchy_level: 'National'
    });
    
    console.log(`Found ${result.pagination.total} eligible members`);
    console.log('First member:', result.members[0]);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testEligibleMembers();
```

## 🔍 **Troubleshooting**

### **Common Issues & Solutions**

**1. TypeScript Compilation Error**
- ✅ **Fixed:** Added `sendPaginatedSuccess` import
- Ensure all imports are correct in route files

**2. Database Connection Issues**
- Check database connection in backend
- Verify `members` table exists and has data
- Check `member_created_at` column exists

**3. No Eligible Members Found**
- Check if members have `member_created_at` dates
- Verify members have been in system for 6+ months
- Run the eligibility statistics query to check counts

**4. API Authentication Issues**
- Ensure proper authentication headers
- Check user permissions for `leadership.read`
- Verify JWT token is valid

### **Debug Queries**

**Check member data quality:**
```sql
-- Check member creation dates
SELECT 
  COUNT(*) as total_members,
  COUNT(CASE WHEN member_created_at IS NOT NULL THEN 1 END) as with_creation_date,
  COUNT(CASE WHEN TIMESTAMPDIFF(MONTH, member_created_at, NOW()) >= 6 THEN 1 END) as eligible_members
FROM members;
```

**Check specific member eligibility:**
```sql
-- Replace 123 with actual member ID
SELECT 
  member_id,
  firstname,
  surname,
  member_created_at,
  TIMESTAMPDIFF(MONTH, member_created_at, NOW()) as months_since_joining,
  CASE 
    WHEN TIMESTAMPDIFF(MONTH, member_created_at, NOW()) >= 6 THEN 'ELIGIBLE'
    ELSE 'NOT ELIGIBLE'
  END as status
FROM members 
WHERE member_id = 123;
```

## ✅ **Expected Results**

After successful implementation:

1. **Backend compiles without TypeScript errors**
2. **API endpoint returns eligible members with proper pagination**
3. **Frontend component displays member data in a table**
4. **Database queries return members with 6+ months membership**
5. **Filtering by hierarchy level works correctly**

## 🚀 **Next Steps**

Once testing is complete:

1. **Integration with Leadership Assignment**
   - Use eligible members in MemberSelector
   - Filter appointment candidates by eligibility

2. **Reporting & Analytics**
   - Generate eligibility reports
   - Track leadership pipeline metrics

3. **Performance Optimization**
   - Add database indexes for eligibility queries
   - Implement caching for frequently accessed data

The implementation is now ready for testing and production use!
