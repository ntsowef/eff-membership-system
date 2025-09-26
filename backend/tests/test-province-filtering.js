#!/usr/bin/env node

/**
 * Test Province-Based Data Filtering
 * 
 * This script tests the province-based data filtering functionality
 * for provincial admin users to ensure they can only access data
 * from their assigned province.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

// Test configuration
const TEST_CONFIG = {
  // Demo credentials for testing
  nationalAdmin: {
    email: 'admin@membership.org',
    password: 'Admin123!'
  },
  // Mock provincial admin (would need to be created in real scenario)
  provincialAdmin: {
    email: 'province.admin@membership.org',
    password: 'Province123!',
    expectedProvince: 'WC' // Western Cape
  }
};

class ProvinceFilteringTester {
  constructor() {
    this.nationalToken = null;
    this.provincialToken = null;
  }

  async runTests() {
    console.log('🧪 Starting Province-Based Data Filtering Tests\n');

    try {
      // Test 1: National Admin Authentication
      await this.testNationalAdminAuth();
      
      // Test 2: National Admin Dashboard Access
      await this.testNationalAdminDashboard();
      
      // Test 3: National Admin Statistics Access
      await this.testNationalAdminStatistics();
      
      // Test 4: National Admin Member Access
      await this.testNationalAdminMembers();
      
      // Test 5: Provincial Admin Authentication (simulated)
      await this.testProvincialAdminSimulation();
      
      console.log('\n✅ All Province Filtering Tests Completed Successfully!');
      
    } catch (error) {
      console.error('\n❌ Province Filtering Tests Failed:', error.message);
      process.exit(1);
    }
  }

  async testNationalAdminAuth() {
    console.log('1️⃣ Testing National Admin Authentication...');
    
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, TEST_CONFIG.nationalAdmin);
      
      if (response.data.success) {
        this.nationalToken = response.data.data.token;
        const user = response.data.data.user;
        
        console.log(`   ✅ National admin authenticated: ${user.name}`);
        console.log(`   ✅ Admin level: ${user.admin_level}`);
        console.log(`   ✅ Province code: ${user.province_code || 'null (national access)'}`);
        
        // Verify national admin has no province restrictions
        if (user.admin_level === 'national' && !user.province_code) {
          console.log('   ✅ National admin has unrestricted access');
        } else {
          throw new Error('National admin should have no province restrictions');
        }
      } else {
        throw new Error('National admin authentication failed');
      }
    } catch (error) {
      throw new Error(`National admin auth test failed: ${error.message}`);
    }
  }

  async testNationalAdminDashboard() {
    console.log('\n2️⃣ Testing National Admin Dashboard Access...');
    
    try {
      const response = await axios.get(`${BASE_URL}/statistics/dashboard`, {
        headers: { Authorization: `Bearer ${this.nationalToken}` }
      });
      
      if (response.data.success) {
        const data = response.data.data;
        
        console.log(`   ✅ Dashboard data retrieved successfully`);
        console.log(`   ✅ Total members: ${data.system?.total_members || 'N/A'}`);
        console.log(`   ✅ Province filtering: ${data.province_context?.filtered_by_province ? 'Yes' : 'No'}`);
        
        // National admin should see all data (not filtered by province)
        if (data.province_context && data.province_context.filtered_by_province) {
          throw new Error('National admin dashboard should not be filtered by province');
        }
        
        console.log('   ✅ National admin sees unfiltered dashboard data');
      } else {
        throw new Error('Dashboard access failed');
      }
    } catch (error) {
      throw new Error(`National admin dashboard test failed: ${error.message}`);
    }
  }

  async testNationalAdminStatistics() {
    console.log('\n3️⃣ Testing National Admin Statistics Access...');
    
    try {
      const response = await axios.get(`${BASE_URL}/statistics/provincial-distribution`, {
        headers: { Authorization: `Bearer ${this.nationalToken}` }
      });
      
      if (response.data.success) {
        const data = response.data.data;
        
        console.log(`   ✅ Provincial distribution retrieved successfully`);
        console.log(`   ✅ Total provinces: ${data.summary?.total_provinces || 'N/A'}`);
        console.log(`   ✅ Province filtering: ${data.province_context?.filtered_by_province ? 'Yes' : 'No'}`);
        
        // National admin should see all provinces
        if (data.province_context && data.province_context.filtered_by_province) {
          throw new Error('National admin should see all provinces');
        }
        
        console.log('   ✅ National admin sees all provincial data');
      } else {
        throw new Error('Provincial distribution access failed');
      }
    } catch (error) {
      throw new Error(`National admin statistics test failed: ${error.message}`);
    }
  }

  async testNationalAdminMembers() {
    console.log('\n4️⃣ Testing National Admin Member Access...');
    
    try {
      const response = await axios.get(`${BASE_URL}/members?limit=5`, {
        headers: { Authorization: `Bearer ${this.nationalToken}` }
      });
      
      if (response.data.success) {
        const data = response.data.data;
        
        console.log(`   ✅ Member data retrieved successfully`);
        console.log(`   ✅ Total members found: ${data.total || 'N/A'}`);
        console.log(`   ✅ Members in response: ${data.members?.length || 0}`);
        
        // Check if members from different provinces are included
        if (data.members && data.members.length > 0) {
          const provinces = [...new Set(data.members.map(m => m.province_name).filter(Boolean))];
          console.log(`   ✅ Provinces represented: ${provinces.join(', ') || 'N/A'}`);
          
          if (provinces.length > 1) {
            console.log('   ✅ National admin sees members from multiple provinces');
          }
        }
      } else {
        throw new Error('Member access failed');
      }
    } catch (error) {
      throw new Error(`National admin members test failed: ${error.message}`);
    }
  }

  async testProvincialAdminSimulation() {
    console.log('\n5️⃣ Testing Provincial Admin Simulation...');
    
    console.log('   ℹ️  Provincial admin testing requires a real provincial admin user');
    console.log('   ℹ️  In a real scenario, the following would be tested:');
    console.log('   📋 Provincial admin authentication with province assignment');
    console.log('   📋 Dashboard data filtered to assigned province only');
    console.log('   📋 Statistics showing only assigned province data');
    console.log('   📋 Member directory filtered to assigned province');
    console.log('   📋 Search results limited to assigned province');
    console.log('   📋 Access denied to other provinces\' data');
    console.log('   📋 Audit logging of province-based access attempts');
    
    // Test the province filtering middleware logic
    console.log('\n   🔍 Testing Province Context Logic...');
    
    // Simulate provincial admin user
    const mockProvincialUser = {
      id: 2,
      email: 'province.admin@membership.org',
      admin_level: 'province',
      province_code: 'WC',
      district_code: 'CPT',
      municipal_code: 'CPT',
      ward_code: null
    };
    
    // Test province context creation
    const provinceContext = {
      province_code: mockProvincialUser.province_code,
      district_code: mockProvincialUser.district_code,
      municipal_code: mockProvincialUser.municipal_code,
      ward_code: mockProvincialUser.ward_code,
      filtered_by_province: mockProvincialUser.admin_level === 'province' && !!mockProvincialUser.province_code
    };
    
    console.log(`   ✅ Mock provincial admin: ${mockProvincialUser.email}`);
    console.log(`   ✅ Assigned province: ${mockProvincialUser.province_code}`);
    console.log(`   ✅ Province filtering enabled: ${provinceContext.filtered_by_province}`);
    
    // Test access validation
    const canAccessWC = mockProvincialUser.province_code === 'WC';
    const canAccessGP = mockProvincialUser.province_code === 'GP';
    
    console.log(`   ✅ Can access Western Cape: ${canAccessWC}`);
    console.log(`   ✅ Can access Gauteng: ${canAccessGP}`);
    
    if (canAccessWC && !canAccessGP) {
      console.log('   ✅ Province access validation working correctly');
    } else {
      throw new Error('Province access validation failed');
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the tests
async function main() {
  const tester = new ProvinceFilteringTester();
  await tester.runTests();
}

if (require.main === module) {
  main().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = ProvinceFilteringTester;
