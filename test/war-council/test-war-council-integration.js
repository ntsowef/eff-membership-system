// War Council Structure Integration Test
// Comprehensive test that validates the complete War Council system

const mysql = require('mysql2/promise');
const axios = require('axios');

// Configuration
const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'membership_new'
};

const API_BASE_URL = 'http://localhost:5000/api';

class WarCouncilIntegrationTest {
  constructor() {
    this.connection = null;
    this.testResults = {
      database: { passed: 0, failed: 0, tests: [] },
      api: { passed: 0, failed: 0, tests: [] },
      integration: { passed: 0, failed: 0, tests: [] }
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const icons = {
      'info': 'ℹ️',
      'success': '✅',
      'error': '❌',
      'warning': '⚠️',
      'test': '🧪',
      'section': '📋'
    };
    
    console.log(`${icons[type] || ''} [${timestamp}] ${message}`);
  }

  async setup() {
    this.log('Setting up integration test environment...', 'info');
    
    try {
      // Connect to database
      this.connection = await mysql.createConnection(DB_CONFIG);
      this.log('Database connection established', 'success');
      
      // Check if backend is running
      try {
        await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
        this.log('Backend API is accessible', 'success');
      } catch (error) {
        this.log('Backend API is not accessible - some tests will be skipped', 'warning');
      }
      
    } catch (error) {
      this.log(`Setup failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async cleanup() {
    if (this.connection) {
      await this.connection.end();
      this.log('Database connection closed', 'info');
    }
  }

  async runTest(category, testName, testFunction) {
    this.log(`Running ${category} test: ${testName}`, 'test');
    
    try {
      const result = await testFunction();
      this.testResults[category].passed++;
      this.testResults[category].tests.push({ name: testName, status: 'PASSED', result });
      this.log(`✅ ${testName} passed`, 'success');
      return result;
    } catch (error) {
      this.testResults[category].failed++;
      this.testResults[category].tests.push({ name: testName, status: 'FAILED', error: error.message });
      this.log(`❌ ${testName} failed: ${error.message}`, 'error');
      return null;
    }
  }

  // Database Tests
  async testDatabaseSchema() {
    // Test leadership_structures table
    const [structures] = await this.connection.execute(
      'SELECT * FROM leadership_structures WHERE name = "War Council Structure"'
    );
    
    if (structures.length === 0) {
      throw new Error('War Council Structure not found in leadership_structures table');
    }

    // Test War Council positions
    const [positions] = await this.connection.execute(`
      SELECT COUNT(*) as count FROM leadership_positions lp
      JOIN leadership_structures ls ON lp.structure_id = ls.id
      WHERE ls.name = 'War Council Structure'
    `);

    if (positions[0].count < 15) {
      throw new Error(`Expected 15 War Council positions, found ${positions[0].count}`);
    }

    // Test view exists
    await this.connection.execute('SELECT * FROM vw_war_council_structure LIMIT 1');

    return { structures: structures.length, positions: positions[0].count };
  }

  async testDatabaseConstraints() {
    // Test unique position constraints
    const [duplicates] = await this.connection.execute(`
      SELECT position_code, COUNT(*) as count
      FROM leadership_positions lp
      JOIN leadership_structures ls ON lp.structure_id = ls.id
      WHERE ls.name = 'War Council Structure' AND lp.is_unique_position = TRUE
      GROUP BY position_code
      HAVING COUNT(*) > 1
    `);

    if (duplicates.length > 0) {
      throw new Error(`Found duplicate unique positions: ${duplicates.map(d => d.position_code).join(', ')}`);
    }

    // Test province coverage
    const [provinces] = await this.connection.execute(`
      SELECT DISTINCT province_code FROM leadership_positions lp
      JOIN leadership_structures ls ON lp.structure_id = ls.id
      WHERE ls.name = 'War Council Structure' AND lp.province_specific = TRUE
    `);

    const expectedProvinces = ['EC', 'FS', 'GP', 'KZN', 'LP', 'MP', 'NC', 'NW', 'WC'];
    const foundProvinces = provinces.map(p => p.province_code);
    const missingProvinces = expectedProvinces.filter(p => !foundProvinces.includes(p));

    if (missingProvinces.length > 0) {
      throw new Error(`Missing provinces: ${missingProvinces.join(', ')}`);
    }

    return { uniquePositions: 'valid', provincesCovered: foundProvinces.length };
  }

  // API Tests
  async testAPIEndpoints() {
    const endpoints = [
      '/leadership/war-council/structure',
      '/leadership/war-council/dashboard',
      '/leadership/war-council/positions',
      '/leadership/war-council/positions/available'
    ];

    const results = {};

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${API_BASE_URL}${endpoint}`, { timeout: 10000 });
        
        if (response.status !== 200) {
          throw new Error(`Expected status 200, got ${response.status}`);
        }

        if (!response.data.success) {
          throw new Error('API response indicates failure');
        }

        results[endpoint] = 'success';
      } catch (error) {
        results[endpoint] = `failed: ${error.message}`;
      }
    }

    // Check if any endpoint failed
    const failedEndpoints = Object.entries(results).filter(([_, status]) => status.startsWith('failed'));
    if (failedEndpoints.length > 0) {
      throw new Error(`Failed endpoints: ${failedEndpoints.map(([ep, _]) => ep).join(', ')}`);
    }

    return results;
  }

  async testAPIDataConsistency() {
    // Get data from different endpoints and verify consistency
    const [structureResponse, dashboardResponse, positionsResponse] = await Promise.all([
      axios.get(`${API_BASE_URL}/leadership/war-council/structure`),
      axios.get(`${API_BASE_URL}/leadership/war-council/dashboard`),
      axios.get(`${API_BASE_URL}/leadership/war-council/positions`)
    ]);

    const structure = structureResponse.data.data;
    const dashboard = dashboardResponse.data.data;
    const positions = positionsResponse.data.data.positions;

    // Verify position counts match
    if (structure.statistics.total_positions !== positions.length) {
      throw new Error('Position count mismatch between structure and positions endpoints');
    }

    if (structure.statistics.total_positions !== dashboard.statistics.total_positions) {
      throw new Error('Position count mismatch between structure and dashboard');
    }

    // Verify core positions count
    const corePositions = positions.filter(p => !p.province_specific);
    if (structure.statistics.core_positions_total !== corePositions.length) {
      throw new Error('Core positions count mismatch');
    }

    // Verify CCT positions count
    const cctPositions = positions.filter(p => p.province_specific);
    if (structure.statistics.cct_deployees_total !== cctPositions.length) {
      throw new Error('CCT positions count mismatch');
    }

    return {
      totalPositions: structure.statistics.total_positions,
      corePositions: corePositions.length,
      cctPositions: cctPositions.length,
      consistency: 'verified'
    };
  }

  // Integration Tests
  async testDatabaseAPIConsistency() {
    // Get data from database
    const [dbPositions] = await this.connection.execute(`
      SELECT COUNT(*) as count FROM leadership_positions lp
      JOIN leadership_structures ls ON lp.structure_id = ls.id
      WHERE ls.name = 'War Council Structure'
    `);

    // Get data from API
    const apiResponse = await axios.get(`${API_BASE_URL}/leadership/war-council/positions`);
    const apiPositions = apiResponse.data.data.positions;

    if (dbPositions[0].count !== apiPositions.length) {
      throw new Error(`Database has ${dbPositions[0].count} positions, API returns ${apiPositions.length}`);
    }

    // Verify specific positions exist in both
    const [dbCorePositions] = await this.connection.execute(`
      SELECT position_code FROM leadership_positions lp
      JOIN leadership_structures ls ON lp.structure_id = ls.id
      WHERE ls.name = 'War Council Structure' AND lp.province_specific = FALSE
    `);

    const apiCorePositions = apiPositions.filter(p => !p.province_specific);
    const dbCodes = dbCorePositions.map(p => p.position_code).sort();
    const apiCodes = apiCorePositions.map(p => p.position_code).sort();

    if (JSON.stringify(dbCodes) !== JSON.stringify(apiCodes)) {
      throw new Error('Core position codes mismatch between database and API');
    }

    return {
      databasePositions: dbPositions[0].count,
      apiPositions: apiPositions.length,
      consistency: 'verified'
    };
  }

  async testPermissionSystem() {
    // Test that sensitive endpoints require authentication
    const sensitiveEndpoints = [
      '/leadership/war-council/appointments'
    ];

    for (const endpoint of sensitiveEndpoints) {
      try {
        const response = await axios.post(`${API_BASE_URL}${endpoint}`, {
          position_id: 1,
          member_id: 1,
          appointment_type: 'Appointed'
        });

        // If we get here without authentication, that's a problem
        if (response.status === 200) {
          throw new Error(`Endpoint ${endpoint} allowed unauthenticated access`);
        }
      } catch (error) {
        // We expect this to fail with 401 or 403
        if (error.response && [401, 403].includes(error.response.status)) {
          // This is expected - endpoint is properly protected
          continue;
        } else {
          throw new Error(`Unexpected error testing ${endpoint}: ${error.message}`);
        }
      }
    }

    return { securityTest: 'passed' };
  }

  async runAllTests() {
    this.log('🚀 Starting War Council Integration Tests', 'section');

    try {
      await this.setup();

      // Database Tests
      this.log('Running Database Tests...', 'section');
      await this.runTest('database', 'Database Schema', () => this.testDatabaseSchema());
      await this.runTest('database', 'Database Constraints', () => this.testDatabaseConstraints());

      // API Tests
      this.log('Running API Tests...', 'section');
      await this.runTest('api', 'API Endpoints', () => this.testAPIEndpoints());
      await this.runTest('api', 'API Data Consistency', () => this.testAPIDataConsistency());

      // Integration Tests
      this.log('Running Integration Tests...', 'section');
      await this.runTest('integration', 'Database-API Consistency', () => this.testDatabaseAPIConsistency());
      await this.runTest('integration', 'Permission System', () => this.testPermissionSystem());

    } catch (error) {
      this.log(`Integration test suite failed: ${error.message}`, 'error');
    } finally {
      await this.cleanup();
      this.printSummary();
    }
  }

  printSummary() {
    console.log('\n📊 Integration Test Summary:');
    
    Object.entries(this.testResults).forEach(([category, results]) => {
      console.log(`\n${category.toUpperCase()} Tests:`);
      console.log(`  ✅ Passed: ${results.passed}`);
      console.log(`  ❌ Failed: ${results.failed}`);
      console.log(`  📝 Total: ${results.tests.length}`);
      
      if (results.failed > 0) {
        console.log(`  Failed tests:`);
        results.tests
          .filter(t => t.status === 'FAILED')
          .forEach(t => console.log(`    - ${t.name}: ${t.error}`));
      }
    });

    const totalPassed = Object.values(this.testResults).reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = Object.values(this.testResults).reduce((sum, r) => sum + r.failed, 0);
    const totalTests = totalPassed + totalFailed;

    console.log(`\n🎯 Overall Results:`);
    console.log(`  ✅ Passed: ${totalPassed}/${totalTests}`);
    console.log(`  ❌ Failed: ${totalFailed}/${totalTests}`);
    console.log(`  📈 Success Rate: ${totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0}%`);

    if (totalFailed === 0) {
      console.log('\n🎉 All integration tests passed! War Council system is ready for production.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review and fix issues before deployment.');
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new WarCouncilIntegrationTest();
  tester.runAllTests().catch(console.error);
}

module.exports = { WarCouncilIntegrationTest };
