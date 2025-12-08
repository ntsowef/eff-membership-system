const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_db'
});

async function testVotingDistrictFilter() {
  try {
    console.log('🧪 Testing voting district filter...\n');

    // Test voting district code
    const votingDistrictCode = '97110299';
    
    // First, check if this voting district exists
    const vdCheckQuery = `
      SELECT voting_district_code, voting_district_name, ward_code
      FROM voting_districts
      WHERE voting_district_code = $1
    `;
    const vdResult = await pool.query(vdCheckQuery, [votingDistrictCode]);
    
    if (vdResult.rows.length === 0) {
      console.log(`❌ Voting district ${votingDistrictCode} not found in voting_districts table`);
    } else {
      console.log(`✅ Voting district found:`, vdResult.rows[0]);
    }
    
    // Check members with this voting district code
    const membersQuery = `
      SELECT
        member_id,
        firstname,
        surname,
        voting_district_code,
        ward_code,
        municipality_code
      FROM members_with_voting_districts
      WHERE voting_district_code = $1
      LIMIT 10
    `;
    
    const membersResult = await pool.query(membersQuery, [votingDistrictCode]);
    
    console.log(`\n📊 Found ${membersResult.rows.length} members with voting district ${votingDistrictCode}:`);
    membersResult.rows.forEach((member, index) => {
      console.log(`${index + 1}. ${member.firstname} ${member.surname} (ID: ${member.member_id})`);
      console.log(`   Ward: ${member.ward_code}, Municipality: ${member.municipality_code}`);
    });
    
    // Count total members
    const countQuery = `
      SELECT COUNT(*) as count
      FROM members_with_voting_districts
      WHERE voting_district_code = $1
    `;
    
    const countResult = await pool.query(countQuery, [votingDistrictCode]);
    console.log(`\n📈 Total members in voting district ${votingDistrictCode}: ${countResult.rows[0].count}`);
    
    await pool.end();
    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

testVotingDistrictFilter();

