const mysql = require('mysql2/promise');

async function simpleMigrateVoterDistrict() {
  let connection;
  
  try {
    console.log('🔄 Simple migration from voter_district_code to voting_district_code...');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('✅ Connected to database');
    
    // Start transaction
    await connection.beginTransaction();
    console.log('🔒 Transaction started');
    
    // Check current state
    const [beforeStats] = await connection.execute(`
      SELECT 
        COUNT(CASE WHEN voter_district_code IS NOT NULL AND voting_district_code IS NULL THEN 1 END) as needs_migration,
        COUNT(CASE WHEN voting_district_code IS NOT NULL THEN 1 END) as already_migrated
      FROM members
    `);
    
    const before = beforeStats[0];
    console.log(`\n📊 Before Migration:`);
    console.log(`   Members needing migration: ${before.needs_migration}`);
    console.log(`   Members already migrated: ${before.already_migrated}`);
    
    if (before.needs_migration === 0) {
      console.log('✅ No migration needed');
      await connection.rollback();
      return;
    }
    
    // Clean up decimal values first (remove .0)
    console.log('\n🧹 Cleaning up decimal values...');
    const [cleanupResult] = await connection.execute(`
      UPDATE members 
      SET voter_district_code = TRIM(TRAILING '.0' FROM voter_district_code)
      WHERE voter_district_code IS NOT NULL 
        AND voter_district_code LIKE '%.0'
        AND voting_district_code IS NULL
    `);
    
    console.log(`   ✅ Cleaned up ${cleanupResult.affectedRows} decimal values`);
    
    // Simple migration - just copy the values
    console.log('\n🔄 Performing migration...');
    const [migrationResult] = await connection.execute(`
      UPDATE members 
      SET voting_district_code = voter_district_code
      WHERE voter_district_code IS NOT NULL 
        AND voting_district_code IS NULL
    `);
    
    console.log(`   ✅ Migrated ${migrationResult.affectedRows} members`);
    
    // Check results
    const [afterStats] = await connection.execute(`
      SELECT 
        COUNT(CASE WHEN voter_district_code IS NOT NULL AND voting_district_code IS NULL THEN 1 END) as still_needs_migration,
        COUNT(CASE WHEN voting_district_code IS NOT NULL THEN 1 END) as now_migrated
      FROM members
    `);
    
    const after = afterStats[0];
    console.log(`\n📊 After Migration:`);
    console.log(`   Members still needing migration: ${after.still_needs_migration}`);
    console.log(`   Members now migrated: ${after.now_migrated}`);
    console.log(`   Successfully migrated: ${migrationResult.affectedRows} members`);
    
    // Show sample migrated data
    const [sampleData] = await connection.execute(`
      SELECT member_id, firstname, surname, voter_district_code, voting_district_code
      FROM members 
      WHERE voter_district_code IS NOT NULL AND voting_district_code IS NOT NULL
      LIMIT 5
    `);
    
    console.log('\n📋 Sample Migrated Records:');
    sampleData.forEach((member, index) => {
      console.log(`   ${index + 1}. ${member.firstname} ${member.surname || ''} (ID: ${member.member_id})`);
      console.log(`      voter_district_code: ${member.voter_district_code}`);
      console.log(`      voting_district_code: ${member.voting_district_code} ✅`);
    });
    
    // Commit transaction
    await connection.commit();
    console.log('\n🎉 Migration completed successfully!');
    console.log('✅ Transaction committed');
    
    console.log('\n📝 Next Steps:');
    console.log('   1. ✅ Test the frontend GeographicSelector');
    console.log('   2. 🔍 Verify voting districts are now showing up');
    console.log('   3. 📊 Check member counts in voting districts');
    
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

simpleMigrateVoterDistrict();
