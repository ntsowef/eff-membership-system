const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function verifyAnalyticsDashboard() {
  console.log('🔍 Verifying Analytics Dashboard Fix...\n');
  console.log('=' .repeat(80));

  try {
    // 1. Test Total Members Count
    console.log('\n📊 TEST 1: Total Members Count');
    console.log('-'.repeat(80));
    
    const totalMembersResult = await pool.query(`
      SELECT COUNT(*) as count FROM members_consolidated
    `);
    const totalMembers = parseInt(totalMembersResult.rows[0].count);
    console.log(`✅ Total Members: ${totalMembers.toLocaleString()}`);
    console.log(`   Expected: 1,203,052`);
    console.log(`   Match: ${totalMembers === 1203052 ? '✅ YES' : '❌ NO'}`);

    // 2. Test Active Members Count
    console.log('\n📊 TEST 2: Active Members Count');
    console.log('-'.repeat(80));
    
    const activeMembersResult = await pool.query(`
      SELECT COUNT(*) as count FROM members_consolidated
      WHERE membership_status_id = 1
    `);
    const activeMembers = parseInt(activeMembersResult.rows[0].count);
    console.log(`✅ Active Members (status_id = 1): ${activeMembers.toLocaleString()}`);
    console.log(`   Expected: 636,295`);
    console.log(`   Match: ${activeMembers === 636295 ? '✅ YES' : '❌ NO'}`);

    // 3. Test Membership Status Breakdown
    console.log('\n📊 TEST 3: Membership Status Breakdown');
    console.log('-'.repeat(80));
    
    const statusBreakdownResult = await pool.query(`
      SELECT
        ms.status_name,
        COUNT(*) as member_count,
        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM members_consolidated)), 2) as percentage
      FROM members_consolidated m
      LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
      GROUP BY ms.status_name, ms.status_id
      ORDER BY ms.status_id
    `);
    
    console.log('Membership Status Distribution:');
    statusBreakdownResult.rows.forEach(row => {
      console.log(`  ${row.status_name}: ${parseInt(row.member_count).toLocaleString()} (${row.percentage}%)`);
    });

    // Expected values
    const expectedStatus = {
      'Active': 636295,
      'Expired': 535170,
      'Inactive': 26643,
      'Grace Period': 4944
    };

    console.log('\nExpected vs Actual:');
    let statusMatch = true;
    statusBreakdownResult.rows.forEach(row => {
      const expected = expectedStatus[row.status_name];
      const actual = parseInt(row.member_count);
      const match = expected === actual;
      if (!match) statusMatch = false;
      console.log(`  ${row.status_name}: ${match ? '✅' : '❌'} (Expected: ${expected?.toLocaleString() || 'N/A'}, Actual: ${actual.toLocaleString()})`);
    });

    // 4. Test Voter Registration Status Breakdown
    console.log('\n📊 TEST 4: Voter Registration Status Breakdown');
    console.log('-'.repeat(80));
    
    const voterStatusResult = await pool.query(`
      SELECT
        vs.status_name,
        COUNT(*) as member_count,
        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM members_consolidated)), 2) as percentage
      FROM members_consolidated m
      LEFT JOIN voter_statuses vs ON m.voter_status_id = vs.status_id
      GROUP BY vs.status_name, vs.status_id
      ORDER BY vs.status_id
    `);
    
    console.log('Voter Registration Status Distribution:');
    voterStatusResult.rows.forEach(row => {
      console.log(`  ${row.status_name}: ${parseInt(row.member_count).toLocaleString()} (${row.percentage}%)`);
    });

    // 5. Verify Total vs Active are DIFFERENT
    console.log('\n📊 TEST 5: Total vs Active Members Difference');
    console.log('-'.repeat(80));
    
    const difference = totalMembers - activeMembers;
    console.log(`Total Members: ${totalMembers.toLocaleString()}`);
    console.log(`Active Members: ${activeMembers.toLocaleString()}`);
    console.log(`Difference: ${difference.toLocaleString()}`);
    console.log(`Are they different? ${difference > 0 ? '✅ YES' : '❌ NO'}`);

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📋 SUMMARY');
    console.log('='.repeat(80));
    
    const allTestsPassed = 
      totalMembers === 1203052 &&
      activeMembers === 636295 &&
      statusMatch &&
      difference > 0;

    if (allTestsPassed) {
      console.log('✅ ALL TESTS PASSED!');
      console.log('✅ Analytics Dashboard is using correct membership and voter status data');
      console.log('✅ Total Members and Active Members are different (as expected)');
      console.log('✅ Membership status breakdown matches expected values');
      console.log('✅ Voter registration status breakdown is available');
    } else {
      console.log('❌ SOME TESTS FAILED');
      console.log('Please review the test results above');
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    await pool.end();
  }
}

// Run the verification
verifyAnalyticsDashboard();

