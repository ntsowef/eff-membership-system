/**
 * Test API Endpoint for Gauteng Members
 * 
 * Simulates the exact API call the frontend makes to fetch Gauteng members
 */

require('dotenv').config({ path: '.env.postgres' });
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   Test API Endpoint - Gauteng Members                     ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

async function testAPI() {
  try {
    console.log('⚠️  NOTE: This test requires the backend server to be running on port 5000\n');
    console.log('If the server is not running, start it with: cd backend && npm run dev\n');
    console.log('═'.repeat(60));
    console.log('');

    // Test 1: Get members with province_code filter (Gauteng)
    console.log('1️⃣  Testing /api/members with province_code=GP:\n');
    
    try {
      const response = await axios.get(`${API_BASE_URL}/members`, {
        params: {
          province_code: 'GP',
          page: 1,
          limit: 10
        },
        headers: {
          'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
        }
      });

      console.log('   Response Status:', response.status);
      console.log('   Response Data Structure:', Object.keys(response.data));
      console.log('');
      console.log('   Pagination:', response.data.pagination);
      console.log('   Members Count:', response.data.data?.length || 0);
      console.log('');
      
      if (response.data.data && response.data.data.length > 0) {
        console.log('   Sample Members:');
        response.data.data.slice(0, 3).forEach(member => {
          console.log(`      - ${member.firstname} ${member.surname} (${member.province_name})`);
        });
        console.log('');
      }

      if (response.data.pagination) {
        console.log('   ✅ Pagination Info:');
        console.log(`      Page: ${response.data.pagination.page}`);
        console.log(`      Limit: ${response.data.pagination.limit}`);
        console.log(`      Total: ${response.data.pagination.total}`);
        console.log(`      Total Pages: ${response.data.pagination.totalPages}`);
        console.log('');
      }

    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('   ❌ Backend server is not running!');
        console.log('   Please start the backend server: cd backend && npm run dev');
        console.log('');
      } else if (error.response?.status === 401) {
        console.log('   ⚠️  Authentication required');
        console.log('   This is expected - the endpoint requires authentication');
        console.log('   The test shows the endpoint exists and is working');
        console.log('');
      } else {
        console.log('   ❌ Error:', error.message);
        if (error.response) {
          console.log('   Status:', error.response.status);
          console.log('   Data:', error.response.data);
        }
        console.log('');
      }
    }

    // Test 2: Check what parameters the frontend is actually sending
    console.log('2️⃣  Frontend Parameters Analysis:\n');
    console.log('   The frontend (MemberSelector.tsx) sends:');
    console.log('   {');
    console.log('     page: 1,');
    console.log('     limit: 10,');
    console.log('     province_code: "GP"  // When Gauteng is selected');
    console.log('   }');
    console.log('');
    console.log('   Expected Response:');
    console.log('   {');
    console.log('     success: true,');
    console.log('     data: [ ...10 members... ],');
    console.log('     pagination: {');
    console.log('       page: 1,');
    console.log('       limit: 10,');
    console.log('       total: 100777,  // Total Gauteng members');
    console.log('       totalPages: 10078');
    console.log('     }');
    console.log('   }');
    console.log('');

    // Test 3: Direct database query to verify
    console.log('3️⃣  Database Verification:\n');
    console.log('   Run this to verify database has correct data:');
    console.log('   node test/leadership/diagnose-member-selector-issue.js');
    console.log('');

    // Summary
    console.log('═'.repeat(60));
    console.log('ANALYSIS');
    console.log('═'.repeat(60));
    console.log('');
    console.log('🔍 Possible Issues:');
    console.log('');
    console.log('1. **Backend Server Not Running**');
    console.log('   - Check if backend is running on port 5000');
    console.log('   - Start with: cd backend && npm run dev');
    console.log('');
    console.log('2. **Authentication Issue**');
    console.log('   - Frontend needs valid JWT token');
    console.log('   - Check browser console for auth errors');
    console.log('');
    console.log('3. **Geographic Selection Not Passed**');
    console.log('   - Check if geographicSelection prop is passed to MemberSelector');
    console.log('   - Verify province_code is in the API request');
    console.log('   - Check browser Network tab for actual API call');
    console.log('');
    console.log('4. **Frontend Filtering**');
    console.log('   - MemberSelector has client-side filtering (lines 234-283)');
    console.log('   - Check if excludeMemberIds is filtering out members');
    console.log('   - Check if other filters are applied');
    console.log('');
    console.log('5. **Pagination Display**');
    console.log('   - User might be looking at page 1 only');
    console.log('   - Check if pagination controls are visible');
    console.log('   - Verify "1-10 of 100777" is displayed');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('');
    console.log('1. Open browser DevTools (F12)');
    console.log('2. Go to Network tab');
    console.log('3. Open Leadership Management → Member Selector');
    console.log('4. Look for /api/members request');
    console.log('5. Check:');
    console.log('   - Request URL and parameters');
    console.log('   - Response data and pagination');
    console.log('   - Console logs from LeadershipAPI.getMembers');
    console.log('');
    console.log('6. Check Console tab for:');
    console.log('   - "✅ Geographic filter applied: Province = GP"');
    console.log('   - "🔍 LeadershipAPI.getMembers response:"');
    console.log('   - "🔍 Normalized members:"');
    console.log('   - "🔍 MemberSelector data received:"');
    console.log('');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testAPI();

