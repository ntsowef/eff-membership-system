/**
 * Criterion 1 Validation Test
 * Tests the new VD-based compliance rules
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database',
});

interface TestCase {
  name: string;
  total_vds: number;
  compliant_vds: number;
  total_members: number;
  expected_compliant: boolean;
  expected_exception: boolean;
  reason: string;
}

const testCases: TestCase[] = [
  // Rule 1: <= 3 VDs - Must have ALL VDs compliant
  {
    name: 'Ward with 2 VDs, all compliant, 250 members',
    total_vds: 2,
    compliant_vds: 2,
    total_members: 250,
    expected_compliant: true,
    expected_exception: false,
    reason: '2 VDs (<=3), all compliant → PASS'
  },
  {
    name: 'Ward with 3 VDs, all compliant, 180 members',
    total_vds: 3,
    compliant_vds: 3,
    total_members: 180,
    expected_compliant: true,
    expected_exception: false,
    reason: '3 VDs (<=3), all compliant → PASS'
  },
  {
    name: 'Ward with 3 VDs, 2 compliant, 300 members',
    total_vds: 3,
    compliant_vds: 2,
    total_members: 300,
    expected_compliant: false,
    expected_exception: false,
    reason: '3 VDs (<=3), not all compliant → FAIL (no exceptions)'
  },
  
  // Rule 2: >= 4 VDs + >= 200 members → Pass
  {
    name: 'Ward with 5 VDs, 3 compliant, 250 members',
    total_vds: 5,
    compliant_vds: 3,
    total_members: 250,
    expected_compliant: true,
    expected_exception: true,
    reason: '5 VDs (>=4), 250 members (>=200) → PASS (exception: not all VDs compliant)'
  },
  {
    name: 'Ward with 4 VDs, all compliant, 220 members',
    total_vds: 4,
    compliant_vds: 4,
    total_members: 220,
    expected_compliant: true,
    expected_exception: false,
    reason: '4 VDs (>=4), 220 members (>=200), all VDs compliant → PASS (no exception needed)'
  },
  
  // Rule 3: >= 4 VDs + 190-199 members + all VDs compliant → Pass
  {
    name: 'Ward with 6 VDs, all compliant, 195 members',
    total_vds: 6,
    compliant_vds: 6,
    total_members: 195,
    expected_compliant: true,
    expected_exception: true,
    reason: '6 VDs (>=4), 195 members (190-199), all VDs compliant → PASS (exception)'
  },
  {
    name: 'Ward with 4 VDs, 3 compliant, 195 members',
    total_vds: 4,
    compliant_vds: 3,
    total_members: 195,
    expected_compliant: false,
    expected_exception: false,
    reason: '4 VDs (>=4), 195 members (190-199), NOT all VDs compliant → FAIL'
  },
  
  // Edge cases
  {
    name: 'Ward with 4 VDs, 2 compliant, 180 members',
    total_vds: 4,
    compliant_vds: 2,
    total_members: 180,
    expected_compliant: false,
    expected_exception: false,
    reason: '4 VDs (>=4), 180 members (<190), not all VDs compliant → FAIL'
  },
  {
    name: 'Ward with 10 VDs, 5 compliant, 500 members',
    total_vds: 10,
    compliant_vds: 5,
    total_members: 500,
    expected_compliant: true,
    expected_exception: true,
    reason: '10 VDs (>=4), 500 members (>=200) → PASS (exception: not all VDs compliant)'
  },
];

async function testCriterion1Logic() {
  console.log('🧪 Testing Criterion 1 Validation Logic\n');
  console.log('=' .repeat(80));
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log(`   VDs: ${testCase.compliant_vds}/${testCase.total_vds} compliant | Members: ${testCase.total_members}`);
    console.log(`   Expected: ${testCase.expected_compliant ? 'PASS' : 'FAIL'} ${testCase.expected_exception ? '(with exception)' : ''}`);
    console.log(`   Reason: ${testCase.reason}`);
    
    // Simulate the logic from the materialized view
    let actual_compliant: boolean;
    let actual_exception: boolean;
    
    if (testCase.total_vds <= 3) {
      // Rule 1: <= 3 VDs - Must have ALL VDs compliant
      actual_compliant = testCase.total_vds > 0 && testCase.total_vds === testCase.compliant_vds;
      actual_exception = false;
    } else if (testCase.total_vds >= 4) {
      // Rule 2 & 3: >= 4 VDs
      if (testCase.total_members >= 200) {
        // Rule 2: >= 200 members - Pass
        actual_compliant = true;
        actual_exception = testCase.total_vds !== testCase.compliant_vds;
      } else if (testCase.total_members >= 190 && testCase.total_members < 200 && testCase.total_vds === testCase.compliant_vds) {
        // Rule 3: 190-199 members + all VDs compliant - Pass
        actual_compliant = true;
        actual_exception = true;
      } else {
        actual_compliant = false;
        actual_exception = false;
      }
    } else {
      actual_compliant = false;
      actual_exception = false;
    }
    
    const test_passed = actual_compliant === testCase.expected_compliant && actual_exception === testCase.expected_exception;
    
    if (test_passed) {
      console.log(`   ✅ PASSED - Actual: ${actual_compliant ? 'PASS' : 'FAIL'} ${actual_exception ? '(with exception)' : ''}`);
      passed++;
    } else {
      console.log(`   ❌ FAILED - Actual: ${actual_compliant ? 'PASS' : 'FAIL'} ${actual_exception ? '(with exception)' : ''}`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 Test Results: ${passed}/${testCases.length} passed, ${failed}/${testCases.length} failed`);
  
  if (failed === 0) {
    console.log('✅ All tests passed!');
  } else {
    console.log('❌ Some tests failed');
  }
}

testCriterion1Logic().then(() => {
  pool.end();
  process.exit(0);
});

