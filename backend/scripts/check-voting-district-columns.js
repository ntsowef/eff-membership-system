const mysql = require('mysql2/promise');

async function checkVotingDistrictColumns() {
  let connection;
  
  try {
    console.log('🔍 Checking voting district columns in members table...');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('✅ Connected to database');
    
    // Check data distribution in both columns
    const [columnStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_members,
        COUNT(voter_district_code) as members_with_voter_district_code,
        COUNT(voting_district_code) as members_with_voting_district_code,
        COUNT(CASE WHEN voter_district_code IS NOT NULL AND voting_district_code IS NOT NULL THEN 1 END) as members_with_both,
        COUNT(CASE WHEN voter_district_code IS NOT NULL AND voting_district_code IS NULL THEN 1 END) as only_voter_district_code,
        COUNT(CASE WHEN voter_district_code IS NULL AND voting_district_code IS NOT NULL THEN 1 END) as only_voting_district_code
      FROM members
    `);
    
    console.log('\n📊 Column Data Distribution:');
    const stats = columnStats[0];
    console.log(`   Total Members: ${stats.total_members}`);
    console.log(`   Members with voter_district_code: ${stats.members_with_voter_district_code}`);
    console.log(`   Members with voting_district_code: ${stats.members_with_voting_district_code}`);
    console.log(`   Members with BOTH columns: ${stats.members_with_both}`);
    console.log(`   Members with ONLY voter_district_code: ${stats.only_voter_district_code}`);
    console.log(`   Members with ONLY voting_district_code: ${stats.only_voting_district_code}`);
    
    // Sample data from both columns
    const [sampleData] = await connection.execute(`
      SELECT 
        member_id, 
        firstname, 
        surname, 
        ward_code,
        voter_district_code,
        voting_district_code,
        CASE 
          WHEN voter_district_code IS NOT NULL AND voting_district_code IS NULL THEN 'NEEDS_MIGRATION'
          WHEN voter_district_code IS NULL AND voting_district_code IS NOT NULL THEN 'ALREADY_MIGRATED'
          WHEN voter_district_code IS NOT NULL AND voting_district_code IS NOT NULL THEN 'HAS_BOTH'
          ELSE 'NO_DATA'
        END as migration_status
      FROM members 
      WHERE voter_district_code IS NOT NULL OR voting_district_code IS NOT NULL
      ORDER BY member_id
      LIMIT 10
    `);
    
    console.log('\n📋 Sample Data (First 10 members with voting district data):');
    sampleData.forEach((member, index) => {
      console.log(`   ${index + 1}. ${member.firstname} ${member.surname || ''} (ID: ${member.member_id})`);
      console.log(`      Ward: ${member.ward_code}`);
      console.log(`      voter_district_code: ${member.voter_district_code || 'NULL'}`);
      console.log(`      voting_district_code: ${member.voting_district_code || 'NULL'}`);
      console.log(`      Status: ${member.migration_status}`);
      console.log('');
    });
    
    // Check if the values are different when both exist
    const [conflictCheck] = await connection.execute(`
      SELECT 
        member_id,
        firstname,
        surname,
        voter_district_code,
        voting_district_code
      FROM members 
      WHERE voter_district_code IS NOT NULL 
        AND voting_district_code IS NOT NULL 
        AND voter_district_code != voting_district_code
      LIMIT 5
    `);
    
    if (conflictCheck.length > 0) {
      console.log('⚠️  CONFLICTS FOUND - Members with different values in both columns:');
      conflictCheck.forEach((member, index) => {
        console.log(`   ${index + 1}. ${member.firstname} ${member.surname || ''} (ID: ${member.member_id})`);
        console.log(`      voter_district_code: ${member.voter_district_code}`);
        console.log(`      voting_district_code: ${member.voting_district_code}`);
      });
    } else {
      console.log('✅ No conflicts found - values are consistent where both columns have data');
    }
    
    // Check which voting districts exist in voting_districts table
    const [validVotingDistricts] = await connection.execute(`
      SELECT COUNT(*) as total_voting_districts
      FROM voting_districts 
      WHERE is_active = TRUE
    `);
    
    console.log(`\n📊 Available Voting Districts: ${validVotingDistricts[0].total_voting_districts} active voting districts`);
    
    // Check if voter_district_code values are valid
    const [validityCheck] = await connection.execute(`
      SELECT 
        COUNT(DISTINCT m.voter_district_code) as unique_voter_district_codes,
        COUNT(DISTINCT CASE WHEN vd.voting_district_code IS NOT NULL THEN m.voter_district_code END) as valid_voter_district_codes
      FROM members m
      LEFT JOIN voting_districts vd ON m.voter_district_code = vd.voting_district_code
      WHERE m.voter_district_code IS NOT NULL
    `);
    
    if (validityCheck.length > 0) {
      const validity = validityCheck[0];
      console.log(`\n🔍 Validity Check for voter_district_code:`);
      console.log(`   Unique voter_district_code values: ${validity.unique_voter_district_codes}`);
      console.log(`   Valid voter_district_code values: ${validity.valid_voter_district_codes}`);
      console.log(`   Invalid voter_district_code values: ${validity.unique_voter_district_codes - validity.valid_voter_district_codes}`);
    }
    
    console.log('\n🎯 Migration Recommendation:');
    if (stats.only_voter_district_code > 0) {
      console.log(`   ✅ MIGRATION NEEDED: ${stats.only_voter_district_code} members have data only in voter_district_code`);
      console.log('   📝 These records should be migrated to voting_district_code column');
    } else {
      console.log('   ℹ️  No migration needed - all data is already in voting_district_code column');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkVotingDistrictColumns();
