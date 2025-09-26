const mysql = require('mysql2/promise');

async function migrateVoterDistrictCode() {
  let connection;
  
  try {
    console.log('🔄 Starting migration from voter_district_code to voting_district_code...');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('✅ Connected to database');
    
    // Start transaction for safety
    await connection.beginTransaction();
    console.log('🔒 Transaction started');
    
    // 1. Check current state before migration
    const [beforeStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_members,
        COUNT(voter_district_code) as members_with_voter_district_code,
        COUNT(voting_district_code) as members_with_voting_district_code,
        COUNT(CASE WHEN voter_district_code IS NOT NULL AND voting_district_code IS NULL THEN 1 END) as needs_migration
      FROM members
    `);
    
    const before = beforeStats[0];
    console.log('\n📊 Before Migration:');
    console.log(`   Total Members: ${before.total_members}`);
    console.log(`   Members with voter_district_code: ${before.members_with_voter_district_code}`);
    console.log(`   Members with voting_district_code: ${before.members_with_voting_district_code}`);
    console.log(`   Members needing migration: ${before.needs_migration}`);
    
    if (before.needs_migration === 0) {
      console.log('✅ No migration needed - all data is already in the correct column');
      await connection.rollback();
      return;
    }
    
    // 2. Validate that voter_district_code values exist in voting_districts table
    console.log('\n🔍 Validating voter_district_code values...');
    const [validationResults] = await connection.execute(`
      SELECT
        COUNT(DISTINCT m.voter_district_code) as unique_codes,
        COUNT(DISTINCT CASE WHEN vd.voting_district_code IS NOT NULL THEN m.voter_district_code END) as valid_codes,
        COUNT(DISTINCT CASE WHEN vd.voting_district_code IS NULL THEN m.voter_district_code END) as invalid_codes
      FROM members m
      LEFT JOIN voting_districts vd ON CAST(m.voter_district_code AS CHAR) COLLATE utf8mb4_general_ci = vd.voting_district_code COLLATE utf8mb4_general_ci
      WHERE m.voter_district_code IS NOT NULL AND m.voting_district_code IS NULL
    `);
    
    const validation = validationResults[0];
    console.log(`   Unique voter_district_code values: ${validation.unique_codes}`);
    console.log(`   Valid codes (exist in voting_districts): ${validation.valid_codes}`);
    console.log(`   Invalid codes (don't exist): ${validation.invalid_codes}`);
    
    // 3. Show sample of invalid codes if any
    if (validation.invalid_codes > 0) {
      const [invalidSamples] = await connection.execute(`
        SELECT DISTINCT
          m.voter_district_code,
          COUNT(*) as member_count
        FROM members m
        LEFT JOIN voting_districts vd ON CAST(m.voter_district_code AS CHAR) COLLATE utf8mb4_general_ci = vd.voting_district_code COLLATE utf8mb4_general_ci
        WHERE m.voter_district_code IS NOT NULL
          AND m.voting_district_code IS NULL
          AND vd.voting_district_code IS NULL
        GROUP BY m.voter_district_code
        ORDER BY member_count DESC
        LIMIT 10
      `);
      
      console.log('\n⚠️  Sample Invalid Codes:');
      invalidSamples.forEach((sample, index) => {
        console.log(`   ${index + 1}. Code: ${sample.voter_district_code} (${sample.member_count} members)`);
      });
    }
    
    // 4. Perform the migration (only for valid codes)
    console.log('\n🔄 Performing migration...');
    
    // First, let's clean up the voter_district_code values (remove .0 if it's a decimal)
    const [cleanupResult] = await connection.execute(`
      UPDATE members 
      SET voter_district_code = CAST(CAST(voter_district_code AS UNSIGNED) AS CHAR)
      WHERE voter_district_code IS NOT NULL 
        AND voter_district_code LIKE '%.0'
        AND voting_district_code IS NULL
    `);
    
    console.log(`   ✅ Cleaned up ${cleanupResult.affectedRows} decimal voter_district_code values`);
    
    // Now perform the main migration
    const [migrationResult] = await connection.execute(`
      UPDATE members m
      INNER JOIN voting_districts vd ON CAST(m.voter_district_code AS CHAR) COLLATE utf8mb4_general_ci = vd.voting_district_code COLLATE utf8mb4_general_ci
      SET m.voting_district_code = m.voter_district_code
      WHERE m.voter_district_code IS NOT NULL
        AND m.voting_district_code IS NULL
        AND vd.is_active = TRUE
    `);
    
    console.log(`   ✅ Migrated ${migrationResult.affectedRows} members successfully`);
    
    // 5. Check results after migration
    const [afterStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_members,
        COUNT(voter_district_code) as members_with_voter_district_code,
        COUNT(voting_district_code) as members_with_voting_district_code,
        COUNT(CASE WHEN voter_district_code IS NOT NULL AND voting_district_code IS NULL THEN 1 END) as still_needs_migration
      FROM members
    `);
    
    const after = afterStats[0];
    console.log('\n📊 After Migration:');
    console.log(`   Total Members: ${after.total_members}`);
    console.log(`   Members with voter_district_code: ${after.members_with_voter_district_code}`);
    console.log(`   Members with voting_district_code: ${after.members_with_voting_district_code}`);
    console.log(`   Members still needing migration: ${after.still_needs_migration}`);
    
    // 6. Show migration summary
    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${migrationResult.affectedRows} members`);
    console.log(`   📊 voting_district_code column increased from ${before.members_with_voting_district_code} to ${after.members_with_voting_district_code} members`);
    console.log(`   ⚠️  Remaining unmigrated: ${after.still_needs_migration} members (likely invalid codes)`);
    
    // 7. Sample migrated data
    const [sampleMigrated] = await connection.execute(`
      SELECT 
        member_id, 
        firstname, 
        surname, 
        ward_code,
        voter_district_code,
        voting_district_code
      FROM members 
      WHERE voter_district_code IS NOT NULL 
        AND voting_district_code IS NOT NULL
      ORDER BY member_id
      LIMIT 5
    `);
    
    console.log('\n📋 Sample Migrated Records:');
    sampleMigrated.forEach((member, index) => {
      console.log(`   ${index + 1}. ${member.firstname} ${member.surname || ''} (ID: ${member.member_id})`);
      console.log(`      Ward: ${member.ward_code}`);
      console.log(`      voter_district_code: ${member.voter_district_code}`);
      console.log(`      voting_district_code: ${member.voting_district_code} ✅`);
    });
    
    // Commit the transaction
    await connection.commit();
    console.log('\n🎉 Migration completed successfully!');
    console.log('✅ Transaction committed');
    
    // 8. Recommendations
    console.log('\n📝 Next Steps:');
    console.log('   1. ✅ Migration completed - voting_district_code now has the data');
    console.log('   2. 🧪 Test the frontend GeographicSelector to ensure voting districts show up');
    console.log('   3. 🔍 Review any remaining unmigrated records (invalid codes)');
    console.log('   4. 🗑️  Consider dropping voter_district_code column after verification');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (connection) {
      await connection.rollback();
      console.log('🔄 Transaction rolled back');
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrateVoterDistrictCode();
