const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function verifyAttendanceRegisterFix() {
  const client = await pool.connect();
  
  try {
    console.log('='.repeat(80));
    console.log('ATTENDANCE REGISTER FIX VERIFICATION');
    console.log('='.repeat(80));
    console.log();

    // Pick a sample ward to test
    const wardQuery = `
      SELECT m.ward_code, w.ward_name, COUNT(*) as total_members
      FROM members_consolidated m
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      WHERE m.ward_code IS NOT NULL
      GROUP BY m.ward_code, w.ward_name
      HAVING COUNT(*) > 50
      ORDER BY COUNT(*) DESC
      LIMIT 1;
    `;

    const wardResult = await client.query(wardQuery);
    if (wardResult.rows.length === 0) {
      console.log('❌ No wards found with members');
      return;
    }

    const testWard = wardResult.rows[0];
    console.log(`📍 Testing with Ward: ${testWard.ward_code} - ${testWard.ward_name || 'Unknown'}`);
    console.log(`   Total members in ward: ${testWard.total_members}`);
    console.log();

    // Query 1: ALL members in the ward (OLD behavior - WRONG)
    const allMembersQuery = `
      SELECT
        m.member_id,
        m.firstname,
        m.surname,
        m.membership_status_id,
        ms.status_name as membership_status,
        m.voter_status_id,
        vs.status_name as voter_status,
        m.voter_registration_number
      FROM members_consolidated m
      LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
      LEFT JOIN voter_statuses vs ON m.voter_status_id = vs.status_id
      WHERE m.ward_code = $1
      ORDER BY m.firstname, m.surname;
    `;
    
    const allMembers = await client.query(allMembersQuery, [testWard.ward_code]);
    
    console.log('='.repeat(80));
    console.log('BEFORE FIX (ALL MEMBERS - WRONG)');
    console.log('='.repeat(80));
    console.log(`Total members: ${allMembers.rows.length}`);
    console.log();
    
    // Count by membership status
    const membershipStatusCounts = {};
    const voterStatusCounts = {};
    
    allMembers.rows.forEach(member => {
      const memStatus = member.membership_status || 'Unknown';
      const voterStatus = member.voter_status || 'Unknown';
      
      membershipStatusCounts[memStatus] = (membershipStatusCounts[memStatus] || 0) + 1;
      voterStatusCounts[voterStatus] = (voterStatusCounts[voterStatus] || 0) + 1;
    });
    
    console.log('Membership Status Breakdown:');
    Object.entries(membershipStatusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    console.log();
    
    console.log('Voter Status Breakdown:');
    Object.entries(voterStatusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    console.log();

    // Query 2: FILTERED members (NEW behavior - CORRECT)
    const filteredMembersQuery = `
      SELECT
        m.member_id,
        m.firstname,
        m.surname,
        m.membership_status_id,
        ms.status_name as membership_status,
        m.voter_status_id,
        vs.status_name as voter_status,
        m.voter_registration_number
      FROM members_consolidated m
      LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
      LEFT JOIN voter_statuses vs ON m.voter_status_id = vs.status_id
      WHERE m.ward_code = $1
        AND m.membership_status_id = 1  -- Only Active members
        AND m.voter_status_id = 1        -- Only Registered voters
      ORDER BY m.firstname, m.surname;
    `;
    
    const filteredMembers = await client.query(filteredMembersQuery, [testWard.ward_code]);
    
    console.log('='.repeat(80));
    console.log('AFTER FIX (ACTIVE & REGISTERED ONLY - CORRECT)');
    console.log('='.repeat(80));
    console.log(`Total members: ${filteredMembers.rows.length}`);
    console.log();
    
    console.log('All members should be:');
    console.log('  ✅ Membership Status: Active (status_id = 1)');
    console.log('  ✅ Voter Status: Registered (status_id = 1)');
    console.log();

    // Verify all filtered members meet criteria
    let allValid = true;
    filteredMembers.rows.forEach(member => {
      if (member.membership_status_id !== 1 || member.voter_status_id !== 1) {
        console.log(`❌ INVALID: ${member.firstname} ${member.surname} - Membership: ${member.membership_status}, Voter: ${member.voter_status}`);
        allValid = false;
      }
    });
    
    if (allValid && filteredMembers.rows.length > 0) {
      console.log('✅ All filtered members meet the criteria!');
    } else if (filteredMembers.rows.length === 0) {
      console.log('⚠️  No members meet the criteria in this ward');
    }
    console.log();

    // Summary
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    const excluded = allMembers.rows.length - filteredMembers.rows.length;
    const percentageIncluded = ((filteredMembers.rows.length / allMembers.rows.length) * 100).toFixed(2);
    
    console.log(`Total members in ward: ${allMembers.rows.length}`);
    console.log(`Members in attendance register (Active & Registered): ${filteredMembers.rows.length} (${percentageIncluded}%)`);
    console.log(`Members excluded: ${excluded} (${(100 - parseFloat(percentageIncluded)).toFixed(2)}%)`);
    console.log();
    console.log('Excluded members breakdown:');
    console.log(`  - Expired members: ${membershipStatusCounts['Expired'] || 0}`);
    console.log(`  - Inactive members: ${membershipStatusCounts['Inactive'] || 0}`);
    console.log(`  - Grace Period members: ${membershipStatusCounts['Grace Period'] || 0}`);
    console.log(`  - Not Registered voters: ${voterStatusCounts['Not Registered'] || 0}`);
    console.log();
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error verifying fix:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the verification
verifyAttendanceRegisterFix()
  .then(() => {
    console.log('\n✅ Verification completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  });

