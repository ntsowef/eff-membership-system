// War Council Structure API Test Script
// Tests all War Council API endpoints for functionality and security

const axios = require('axios');

// API configuration
const API_BASE_URL = 'http://localhost:5000/api';
const TEST_CONFIG = {
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// Test data
const TEST_APPOINTMENT = {
  position_id: null, // Will be set during tests
  member_id: 1, // Assuming member ID 1 exists
  hierarchy_level: 'National',
  entity_id: 1,
  appointment_type: 'Appointed',
  start_date: new Date().toISOString().split('T')[0],
  appointment_notes: 'Test appointment for War Council'
};

class WarCouncilAPITester {
  constructor() {
    this.authToken = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': 'ℹ️ ',
      'success': '✅',
      'error': '❌',
      'warning': '⚠️ ',
      'test': '🧪'
    }[type] || '';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runTest(testName, testFunction) {
    this.log(`Running test: ${testName}`, 'test');
    
    try {
      const result = await testFunction();
      this.testResults.passed++;
      this.testResults.tests.push({ name: testName, status: 'PASSED', result });
      this.log(`Test passed: ${testName}`, 'success');
      return result;
    } catch (error) {
      this.testResults.failed++;
      this.testResults.tests.push({ name: testName, status: 'FAILED', error: error.message });
      this.log(`Test failed: ${testName} - ${error.message}`, 'error');
      throw error;
    }
  }

  async authenticate() {
    // Note: This is a placeholder for authentication
    // In a real test, you would authenticate with valid credentials
    this.log('Authentication skipped - using direct API calls', 'warning');
    return null;
  }

  async testGetWarCouncilStructure() {
    const response = await axios.get(`${API_BASE_URL}/leadership/war-council/structure`, TEST_CONFIG);
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    const data = response.data;
    if (!data.success) {
      throw new Error('API response indicates failure');
    }
    
    if (!data.data || !data.data.structure) {
      throw new Error('Missing structure data in response');
    }
    
    const structure = data.data.structure;
    if (!structure.core_positions || !structure.cct_deployees || !structure.all_positions) {
      throw new Error('Missing required structure sections');
    }
    
    this.log(`Found ${structure.all_positions.length} total positions`);
    return structure;
  }

  async testGetWarCouncilDashboard() {
    const response = await axios.get(`${API_BASE_URL}/leadership/war-council/dashboard`, TEST_CONFIG);
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    const data = response.data;
    if (!data.success || !data.data) {
      throw new Error('Invalid dashboard response');
    }
    
    const dashboard = data.data;
    const requiredFields = ['structure', 'statistics', 'recent_appointments', 'vacant_positions'];
    
    for (const field of requiredFields) {
      if (!(field in dashboard)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    this.log(`Dashboard statistics: ${dashboard.statistics.filled_positions}/${dashboard.statistics.total_positions} positions filled`);
    return dashboard;
  }

  async testGetWarCouncilPositions() {
    const response = await axios.get(`${API_BASE_URL}/leadership/war-council/positions`, TEST_CONFIG);
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    const data = response.data;
    if (!data.success || !data.data || !data.data.positions) {
      throw new Error('Invalid positions response');
    }
    
    const positions = data.data.positions;
    if (!Array.isArray(positions)) {
      throw new Error('Positions should be an array');
    }
    
    // Check for core positions
    const corePositions = ['PRES', 'DPRES', 'SG', 'DSG', 'NCHAIR', 'TG'];
    const foundCodes = positions.map(p => p.position_code);
    const missingCore = corePositions.filter(code => !foundCodes.includes(code));
    
    if (missingCore.length > 0) {
      throw new Error(`Missing core positions: ${missingCore.join(', ')}`);
    }
    
    this.log(`Found ${positions.length} War Council positions`);
    return positions;
  }

  async testGetAvailableWarCouncilPositions() {
    const response = await axios.get(`${API_BASE_URL}/leadership/war-council/positions/available`, TEST_CONFIG);
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    const data = response.data;
    if (!data.success || !data.data || !data.data.positions) {
      throw new Error('Invalid available positions response');
    }
    
    const positions = data.data.positions;
    this.log(`Found ${positions.length} available positions`);
    return positions;
  }

  async testGetEligibleMembers() {
    // First get a position ID
    const positions = await this.testGetWarCouncilPositions();
    const testPosition = positions.find(p => p.position_code === 'PRES');
    
    if (!testPosition) {
      throw new Error('Could not find President position for testing');
    }
    
    const response = await axios.get(
      `${API_BASE_URL}/leadership/war-council/positions/${testPosition.id}/eligible-members`,
      TEST_CONFIG
    );
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    const data = response.data;
    if (!data.success || !data.data || !data.data.members) {
      throw new Error('Invalid eligible members response');
    }
    
    const members = data.data.members;
    this.log(`Found ${members.length} eligible members for ${testPosition.position_name}`);
    return members;
  }

  async testValidateWarCouncilAppointment() {
    // Get a position and member for testing
    const positions = await this.testGetWarCouncilPositions();
    const testPosition = positions.find(p => p.position_code === 'PRES');
    
    if (!testPosition) {
      throw new Error('Could not find President position for testing');
    }
    
    const validationData = {
      position_id: testPosition.id,
      member_id: 1 // Assuming member ID 1 exists
    };
    
    const response = await axios.post(
      `${API_BASE_URL}/leadership/war-council/appointments/validate`,
      validationData,
      TEST_CONFIG
    );
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    const data = response.data;
    if (!data.success || !data.data) {
      throw new Error('Invalid validation response');
    }
    
    const validation = data.data;
    if (typeof validation.isValid !== 'boolean') {
      throw new Error('Validation response missing isValid field');
    }
    
    this.log(`Validation result: ${validation.isValid ? 'Valid' : 'Invalid'}`);
    if (!validation.isValid && validation.errors) {
      this.log(`Validation errors: ${validation.errors.join(', ')}`);
    }
    
    return validation;
  }

  async testCheckPositionVacancy() {
    const positions = await this.testGetWarCouncilPositions();
    const testPosition = positions.find(p => p.position_code === 'PRES');
    
    if (!testPosition) {
      throw new Error('Could not find President position for testing');
    }
    
    const response = await axios.get(
      `${API_BASE_URL}/leadership/war-council/positions/${testPosition.id}/vacancy`,
      TEST_CONFIG
    );
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    const data = response.data;
    if (!data.success || !data.data) {
      throw new Error('Invalid vacancy response');
    }
    
    const isVacant = data.data.is_vacant;
    if (typeof isVacant !== 'boolean') {
      throw new Error('Vacancy response missing is_vacant field');
    }
    
    this.log(`Position ${testPosition.position_name} is ${isVacant ? 'vacant' : 'filled'}`);
    return isVacant;
  }

  async runAllTests() {
    this.log('🚀 Starting War Council API Tests', 'info');
    
    try {
      // Authentication (if needed)
      await this.authenticate();
      
      // Run all tests
      await this.runTest('Get War Council Structure', () => this.testGetWarCouncilStructure());
      await this.runTest('Get War Council Dashboard', () => this.testGetWarCouncilDashboard());
      await this.runTest('Get War Council Positions', () => this.testGetWarCouncilPositions());
      await this.runTest('Get Available Positions', () => this.testGetAvailableWarCouncilPositions());
      await this.runTest('Get Eligible Members', () => this.testGetEligibleMembers());
      await this.runTest('Validate Appointment', () => this.testValidateWarCouncilAppointment());
      await this.runTest('Check Position Vacancy', () => this.testCheckPositionVacancy());
      
      // Note: Appointment creation test would require authentication and proper setup
      this.log('⚠️  Skipping appointment creation test (requires authentication)', 'warning');
      this.testResults.skipped++;
      
    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error');
    }
    
    // Print summary
    this.printSummary();
  }

  printSummary() {
    console.log('\n📊 Test Summary:');
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`⏭️  Skipped: ${this.testResults.skipped}`);
    console.log(`📝 Total: ${this.testResults.tests.length + this.testResults.skipped}`);
    
    if (this.testResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults.tests
        .filter(t => t.status === 'FAILED')
        .forEach(t => console.log(`   - ${t.name}: ${t.error}`));
    }
    
    console.log('\n🎉 War Council API Tests Completed!');
  }
}

// Run the tests
if (require.main === module) {
  const tester = new WarCouncilAPITester();
  tester.runAllTests().catch(console.error);
}

module.exports = { WarCouncilAPITester };
