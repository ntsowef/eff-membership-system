const { Client } = require('pg');
const readline = require('readline');

/**
 * Clear test data from the database
 * This script removes all bulk upload records and applications created during testing
 */

async function clearTestData() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_database'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get counts before deletion
    const uploadCountQuery = 'SELECT COUNT(*) as count FROM member_application_bulk_uploads';
    const recordCountQuery = 'SELECT COUNT(*) as count FROM member_application_bulk_upload_records';
    const appCountQuery = 'SELECT COUNT(*) as count FROM membership_applications';

    const uploadCount = await client.query(uploadCountQuery);
    const recordCount = await client.query(recordCountQuery);
    const appCount = await client.query(appCountQuery);

    console.log('📊 Current data counts:');
    console.log(`   Bulk uploads: ${uploadCount.rows[0].count}`);
    console.log(`   Upload records: ${recordCount.rows[0].count}`);
    console.log(`   Applications: ${appCount.rows[0].count}\n`);

    // Ask for confirmation
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      rl.question('⚠️  Are you sure you want to delete ALL test data? (yes/no): ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'yes') {
      console.log('\n❌ Operation cancelled');
      return;
    }

    console.log('\n🗑️  Deleting test data...\n');

    // Delete in correct order (respecting foreign keys)
    console.log('   Deleting upload records...');
    await client.query('DELETE FROM member_application_bulk_upload_records');
    console.log('   ✅ Upload records deleted');

    console.log('   Deleting bulk uploads...');
    await client.query('DELETE FROM member_application_bulk_uploads');
    console.log('   ✅ Bulk uploads deleted');

    console.log('   Deleting membership applications...');
    await client.query('DELETE FROM membership_applications');
    console.log('   ✅ Membership applications deleted\n');

    // Get counts after deletion
    const uploadCountAfter = await client.query(uploadCountQuery);
    const recordCountAfter = await client.query(recordCountQuery);
    const appCountAfter = await client.query(appCountQuery);

    console.log('📊 Data counts after deletion:');
    console.log(`   Bulk uploads: ${uploadCountAfter.rows[0].count}`);
    console.log(`   Upload records: ${recordCountAfter.rows[0].count}`);
    console.log(`   Applications: ${appCountAfter.rows[0].count}\n`);

    console.log('✅ Test data cleared successfully!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

clearTestData();

