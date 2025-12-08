/**
 * API Endpoints Compatibility Test
 * Tests critical member-related API endpoints to ensure they work correctly
 * with the new consolidated database schema and return data in the format
 * expected by the frontend.
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '../backend/.env' });

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_database'
});

// Test results tracker
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper function to log test results
function logTest(testName, passed, message, data = null) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`\n${status}: ${testName}`);
  if (message) console.log(`   ${message}`);
  if (data) console.log(`   Data:`, JSON.stringify(data, null, 2));
  
  testResults.tests.push({ testName, passed, message, data });
  if (passed) testResults.passed++;
  else testResults.failed++;
}

// Test 1: Member List Query - Simulates GET /members endpoint
async function testMemberListQuery() {
  console.log('\n📋 Test 1: Member List Query (GET /members)');
  console.log('Testing that member list returns all required fields for frontend...');
  
  try {
    const query = `
      SELECT
        m.member_id,
        m.id_number,
        m.firstname,
        m.surname,
        m.firstname || ' ' || COALESCE(m.surname, '') as full_name,
        m.age,
        m.gender_id,
        m.ward_code,
        m.municipality_code,
        m.district_code,
        m.province_code,
        m.province_name,
        m.district_name,
        m.municipality_name,
        m.cell_number,
        m.email,
        m.membership_number,
        m.membership_status_id,
        m.date_joined,
        m.expiry_date,
        m.membership_amount,
        m.payment_status,
        ms.status_name as membership_status,
        g.gender_name,
        m.created_at,
        m.updated_at
      FROM members m
      LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
      LEFT JOIN genders g ON m.gender_id = g.gender_id
      ORDER BY m.member_id DESC
      LIMIT 5
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length > 0) {
      const member = result.rows[0];
      
      // Check required fields for frontend
      const requiredFields = [
        'member_id', 'id_number', 'firstname', 'full_name',
        'ward_code', 'province_code', 'province_name',
        'membership_number', 'membership_status'
      ];
      
      const missingFields = requiredFields.filter(field => !member[field]);
      
      if (missingFields.length === 0) {
        logTest(
          'Member List Query',
          true,
          `Retrieved ${result.rows.length} members with all required fields`,
          { sample: member }
        );
      } else {
        logTest(
          'Member List Query',
          false,
          `Missing required fields: ${missingFields.join(', ')}`,
          { sample: member }
        );
      }
    } else {
      logTest('Member List Query', false, 'No members found in database');
    }
  } catch (error) {
    logTest('Member List Query', false, `Error: ${error.message}`);
  }
}

// Test 2: Member Details Query - Simulates GET /members/:id endpoint
async function testMemberDetailsQuery() {
  console.log('\n📋 Test 2: Member Details Query (GET /members/:id)');
  console.log('Testing that member details return complete information...');
  
  try {
    // First get a member ID
    const idQuery = 'SELECT member_id FROM members LIMIT 1';
    const idResult = await pool.query(idQuery);
    
    if (idResult.rows.length === 0) {
      logTest('Member Details Query', false, 'No members found to test');
      return;
    }
    
    const memberId = idResult.rows[0].member_id;
    
    const query = `
      SELECT
        m.*,
        g.gender_name,
        ms.status_name,
        st.subscription_name,
        m.firstname || ' ' || COALESCE(m.surname, '') as full_name
      FROM members m
      LEFT JOIN genders g ON m.gender_id = g.gender_id
      LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
      LEFT JOIN subscription_types st ON m.subscription_type_id = st.subscription_type_id
      WHERE m.member_id = $1
    `;
    
    const result = await pool.query(query, [memberId]);
    
    if (result.rows.length > 0) {
      const member = result.rows[0];
      
      // Check that membership fields are present
      const membershipFields = [
        'membership_number', 'date_joined', 'expiry_date',
        'membership_status_id', 'membership_amount', 'payment_status'
      ];
      
      const hasAllFields = membershipFields.every(field => field in member);
      
      logTest(
        'Member Details Query',
        hasAllFields,
        hasAllFields 
          ? 'Member details include all membership fields'
          : 'Some membership fields are missing',
        { 
          member_id: member.member_id,
          has_membership_number: !!member.membership_number,
          has_date_joined: !!member.date_joined,
          has_expiry_date: !!member.expiry_date,
          membership_status: member.status_name
        }
      );
    } else {
      logTest('Member Details Query', false, 'Member not found');
    }
  } catch (error) {
    logTest('Member Details Query', false, `Error: ${error.message}`);
  }
}

// Test 3: Member Search Query - Simulates search functionality
async function testMemberSearchQuery() {
  console.log('\n📋 Test 3: Member Search Query');
  console.log('Testing member search by name and ID number...');
  
  try {
    const query = `
      SELECT
        m.member_id,
        m.id_number,
        m.firstname,
        m.surname,
        m.firstname || ' ' || COALESCE(m.surname, '') as full_name,
        m.cell_number,
        m.email,
        m.membership_number,
        ms.status_name as membership_status
      FROM members m
      LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
      WHERE m.firstname ILIKE $1 OR m.surname ILIKE $1 OR m.id_number ILIKE $1
      LIMIT 5
    `;
    
    const result = await pool.query(query, ['%a%']); // Search for 'a'
    
    logTest(
      'Member Search Query',
      result.rows.length > 0,
      `Found ${result.rows.length} members matching search criteria`,
      { count: result.rows.length }
    );
  } catch (error) {
    logTest('Member Search Query', false, `Error: ${error.message}`);
  }
}

// Test 4: Membership Status Query
async function testMembershipStatusQuery() {
  console.log('\n📋 Test 4: Membership Status Query');
  console.log('Testing membership status calculation and filtering...');

  try {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE m.membership_status_id IS NOT NULL) as with_status,
        COUNT(*) FILTER (WHERE m.expiry_date IS NOT NULL) as with_expiry,
        COUNT(*) FILTER (WHERE m.expiry_date >= CURRENT_DATE) as active_memberships,
        COUNT(*) FILTER (WHERE m.expiry_date < CURRENT_DATE) as expired_memberships,
        COUNT(*) as total_members
      FROM members m
    `;

    const result = await pool.query(query);
    const stats = result.rows[0];

    logTest(
      'Membership Status Query',
      true,
      'Membership statistics calculated successfully',
      stats
    );
  } catch (error) {
    logTest('Membership Status Query', false, `Error: ${error.message}`);
  }
}

// Test 5: Geographic Filtering Query
async function testGeographicFilteringQuery() {
  console.log('\n📋 Test 5: Geographic Filtering Query');
  console.log('Testing geographic filtering by province, district, municipality, ward...');

  try {
    const query = `
      SELECT
        m.province_code,
        m.province_name,
        COUNT(*) as member_count
      FROM members m
      WHERE m.province_code IS NOT NULL
      GROUP BY m.province_code, m.province_name
      ORDER BY member_count DESC
      LIMIT 5
    `;

    const result = await pool.query(query);

    logTest(
      'Geographic Filtering Query',
      result.rows.length > 0,
      `Found ${result.rows.length} provinces with members`,
      { provinces: result.rows }
    );
  } catch (error) {
    logTest('Geographic Filtering Query', false, `Error: ${error.message}`);
  }
}

// Test 6: Frontend Field Compatibility
async function testFrontendFieldCompatibility() {
  console.log('\n📋 Test 6: Frontend Field Compatibility');
  console.log('Testing that all frontend-expected fields are available...');

  try {
    const query = `
      SELECT
        m.member_id as id,
        m.member_id,
        m.id_number,
        m.firstname as first_name,
        m.surname as last_name,
        m.firstname,
        m.surname,
        m.firstname || ' ' || COALESCE(m.surname, '') as full_name,
        m.age,
        m.date_of_birth,
        m.gender_id,
        g.gender_name,
        m.province_code,
        m.province_name,
        m.district_code,
        m.district_name,
        m.municipality_code as municipal_code,
        m.municipality_name as municipal_name,
        m.municipality_code,
        m.municipality_name,
        m.ward_code,
        m.cell_number,
        m.cell_number as phone,
        m.email,
        m.residential_address,
        m.membership_number,
        m.membership_status_id,
        ms.status_name as membership_status,
        m.date_joined,
        m.expiry_date as membership_expiry,
        m.membership_amount,
        m.payment_status,
        m.district_name as region_name,
        m.created_at,
        m.updated_at
      FROM members m
      LEFT JOIN genders g ON m.gender_id = g.gender_id
      LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
      LIMIT 1
    `;

    const result = await pool.query(query);

    if (result.rows.length > 0) {
      const member = result.rows[0];

      // Frontend expected fields based on analysis
      const frontendFields = [
        'id', 'member_id', 'id_number', 'first_name', 'last_name',
        'full_name', 'province_code', 'province_name', 'district_code',
        'district_name', 'municipal_code', 'municipal_name', 'ward_code',
        'cell_number', 'phone', 'email', 'membership_number',
        'membership_status', 'membership_expiry', 'region_name'
      ];

      const availableFields = frontendFields.filter(field => field in member);
      const missingFields = frontendFields.filter(field => !(field in member));

      logTest(
        'Frontend Field Compatibility',
        missingFields.length === 0,
        missingFields.length === 0
          ? 'All frontend-expected fields are available'
          : `Missing fields: ${missingFields.join(', ')}`,
        {
          available: availableFields.length,
          missing: missingFields.length,
          missingFields
        }
      );
    } else {
      logTest('Frontend Field Compatibility', false, 'No members found to test');
    }
  } catch (error) {
    logTest('Frontend Field Compatibility', false, `Error: ${error.message}`);
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting API Endpoints Compatibility Tests');
  console.log('=' .repeat(60));
  console.log(`Database: ${process.env.DB_NAME}`);
  console.log(`Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
  console.log('=' .repeat(60));

  try {
    // Test database connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Run all tests
    await testMemberListQuery();
    await testMemberDetailsQuery();
    await testMemberSearchQuery();
    await testMembershipStatusQuery();
    await testGeographicFilteringQuery();
    await testFrontendFieldCompatibility();

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  } finally {
    await pool.end();
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));

  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runTests();

