/**
 * Test script for member deletion functionality
 * Tests both single and bulk delete operations
 */

const axios = require('axios');
const mysql = require('mysql2/promise');

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'eff_membership'
};

// Test credentials (adjust based on your system)
const TEST_USER = {
  email: 'admin@example.com',
  password: 'admin123'
};

let authToken = '';
let testMemberIds = [];

// Helper function to login and get token
async function login() {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_USER);
    authToken = response.data.data.token;
    console.log('✅ Login successful');
    return authToken;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

// Helper function to create test members
async function createTestMembers(count = 5) {
  const connection = await mysql.createConnection(DB_CONFIG);
  const memberIds = [];

  try {
    for (let i = 0; i < count; i++) {
      const idNumber = `${Date.now()}${i}`.substring(0, 13);
      const query = `
        INSERT INTO members (
          id_number, firstname, surname, gender_id, ward_code, 
          cell_number, email, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;
      
      const [result] = await connection.execute(query, [
        idNumber,
        `TestFirst${i}`,
        `TestLast${i}`,
        1, // gender_id
        'TEST001', // ward_code
        `0821234567${i}`,
        `test${i}@example.com`
      ]);
      
      memberIds.push(result.insertId);
    }
    
    console.log(`✅ Created ${count} test members:`, memberIds);
    return memberIds;
  } catch (error) {
    console.error('❌ Failed to create test members:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Test 1: Single member delete
async function testSingleDelete() {
  console.log('\n📝 Test 1: Single Member Delete');
  
  if (testMemberIds.length === 0) {
    console.log('⚠️  No test members available');
    return;
  }

  const memberId = testMemberIds[0];
  
  try {
    const response = await axios.delete(
      `${API_BASE_URL}/members/${memberId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    console.log('✅ Single delete successful:', response.data);
    testMemberIds.shift(); // Remove deleted member from array
  } catch (error) {
    console.error('❌ Single delete failed:', error.response?.data || error.message);
  }
}

// Test 2: Bulk member delete
async function testBulkDelete() {
  console.log('\n📝 Test 2: Bulk Member Delete');
  
  if (testMemberIds.length < 2) {
    console.log('⚠️  Not enough test members for bulk delete');
    return;
  }

  const idsToDelete = testMemberIds.slice(0, 3); // Delete up to 3 members
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/members/bulk-delete`,
      { member_ids: idsToDelete },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    console.log('✅ Bulk delete successful:', response.data);
    
    // Remove deleted members from array
    testMemberIds = testMemberIds.filter(id => !idsToDelete.includes(id));
  } catch (error) {
    console.error('❌ Bulk delete failed:', error.response?.data || error.message);
  }
}

// Test 3: Delete non-existent member
async function testDeleteNonExistent() {
  console.log('\n📝 Test 3: Delete Non-Existent Member');
  
  const nonExistentId = 999999999;
  
  try {
    await axios.delete(
      `${API_BASE_URL}/members/${nonExistentId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    console.log('❌ Should have failed but succeeded');
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('✅ Correctly returned 404 for non-existent member');
    } else {
      console.error('❌ Unexpected error:', error.response?.data || error.message);
    }
  }
}

// Test 4: Delete without authentication
async function testDeleteWithoutAuth() {
  console.log('\n📝 Test 4: Delete Without Authentication');
  
  if (testMemberIds.length === 0) {
    console.log('⚠️  No test members available');
    return;
  }

  const memberId = testMemberIds[0];
  
  try {
    await axios.delete(`${API_BASE_URL}/members/${memberId}`);
    console.log('❌ Should have failed but succeeded');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Correctly returned 401 for unauthenticated request');
    } else {
      console.error('❌ Unexpected error:', error.response?.data || error.message);
    }
  }
}

// Cleanup function
async function cleanup() {
  console.log('\n🧹 Cleaning up remaining test members...');
  
  if (testMemberIds.length === 0) {
    console.log('✅ No members to clean up');
    return;
  }

  const connection = await mysql.createConnection(DB_CONFIG);
  
  try {
    const placeholders = testMemberIds.map(() => '?').join(',');
    await connection.execute(
      `DELETE FROM members WHERE member_id IN (${placeholders})`,
      testMemberIds
    );
    console.log(`✅ Cleaned up ${testMemberIds.length} test members`);
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  } finally {
    await connection.end();
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Member Delete Functionality Tests\n');
  console.log('='.repeat(50));
  
  try {
    // Setup
    await login();
    testMemberIds = await createTestMembers(5);
    
    // Run tests
    await testSingleDelete();
    await testBulkDelete();
    await testDeleteNonExistent();
    await testDeleteWithoutAuth();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  } finally {
    // Cleanup
    await cleanup();
  }
}

// Run the tests
runTests().catch(console.error);

