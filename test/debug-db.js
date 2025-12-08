const {Client} = require('pg');

async function checkDatabase() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_database'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'member_application_bulk_uploads'
      )
    `);
    
    console.log('Table exists:', tableCheck.rows[0].exists);

    if (tableCheck.rows[0].exists) {
      // Get column info
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'member_application_bulk_uploads'
      `);
      
      console.log('\nTable columns:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });

      // Check if user 12604 exists
      console.log('\nChecking if user 12604 exists...');
      const userCheck = await client.query('SELECT user_id, name, email FROM users WHERE user_id = $1', [12604]);
      if (userCheck.rows.length > 0) {
        console.log('✅ User exists:', userCheck.rows[0]);
      } else {
        console.log('❌ User 12604 does not exist');
      }

      // Try to insert a test record with a valid UUID
      console.log('\nTrying test insert with user 12604...');
      const { v4: uuidv4 } = require('uuid');
      const testUuid = uuidv4();

      try {
        const testInsert = await client.query(`
          INSERT INTO member_application_bulk_uploads (
            upload_uuid, file_name, file_path, file_type, file_size, uploaded_by, status
          ) VALUES ($1, $2, $3, $4, $5, $6, 'Pending')
          RETURNING upload_id
        `, [
          testUuid,
          'test.xlsx',
          '/tmp/test.xlsx',
          'Excel',
          1000,
          12604  // Test user ID
        ]);

        console.log('✅ Test insert successful, upload_id:', testInsert.rows[0].upload_id);

        // Clean up test record
        await client.query('DELETE FROM member_application_bulk_uploads WHERE upload_uuid = $1', [testUuid]);
        console.log('✅ Test record cleaned up');
      } catch (insertError) {
        console.error('❌ Insert failed:', insertError.message);
        console.error('Error code:', insertError.code);
        console.error('Error detail:', insertError.detail);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error);
  } finally {
    await client.end();
  }
}

checkDatabase();

