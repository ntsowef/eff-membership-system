const mysql = require('mysql2/promise');

async function checkMembershipApplicationsTable() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔍 Checking membership_applications table...\n');

    // Check if table exists
    const [tableExists] = await connection.execute(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'membership_new' AND table_name = 'membership_applications'
    `);

    if (tableExists[0].count === 0) {
      console.log('❌ membership_applications table does not exist');
      await connection.end();
      return;
    }

    console.log('✅ membership_applications table exists');

    // Get table structure
    const [columns] = await connection.execute(`DESCRIBE membership_applications`);
    console.log('\n📋 Table structure:');
    columns.forEach(col => {
      console.log(`  • ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Count total records
    const [countResult] = await connection.execute(`SELECT COUNT(*) as total FROM membership_applications`);
    console.log(`\n📊 Total records: ${countResult[0].total}`);

    // Get sample data
    const [sampleData] = await connection.execute(`SELECT * FROM membership_applications LIMIT 3`);
    if (sampleData.length > 0) {
      console.log('\n📋 Sample data:');
      sampleData.forEach((row, index) => {
        console.log(`  ${index + 1}. ID: ${row.id}, Name: ${row.first_name} ${row.last_name}, Status: ${row.status}, Email: ${row.email}`);
      });
    } else {
      console.log('\n❌ No data found in membership_applications table');
    }

    // Test the exact query from the model
    console.log('\n🔍 Testing the exact query from the model...');
    try {
      const [testResults] = await connection.execute(`
        SELECT 
          id,
          application_number,
          first_name,
          last_name,
          email,
          cell_number,
          id_number,
          status,
          workflow_stage,
          financial_status,
          membership_type,
          created_at,
          submitted_at,
          reviewed_at
        FROM membership_applications 
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `, [20, 0]);

      console.log(`✅ Query successful! Found ${testResults.length} records`);
      if (testResults.length > 0) {
        console.log('Sample result:', {
          id: testResults[0].id,
          name: `${testResults[0].first_name} ${testResults[0].last_name}`,
          status: testResults[0].status,
          email: testResults[0].email
        });
      }
    } catch (queryError) {
      console.log('❌ Query failed:', queryError.message);
    }

    await connection.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkMembershipApplicationsTable();
