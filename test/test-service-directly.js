// Test the service method directly to see where the error is
const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

async function testServiceMethod() {
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

    // Simulate what the service method does
    const upload_uuid = uuidv4();
    const data = {
      file_name: 'test.xlsx',
      file_path: '/tmp/test.xlsx',
      file_type: 'Excel',
      file_size: 1000,
      uploaded_by: 12604
    };

    console.log('\n📝 Creating bulk upload with data:', {
      upload_uuid,
      ...data
    });

    const query = `
      INSERT INTO member_application_bulk_uploads (
        upload_uuid, file_name, file_path, file_type, file_size, uploaded_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'Pending')
      RETURNING upload_id
    `;

    const params = [
      upload_uuid,
      data.file_name,
      data.file_path,
      data.file_type,
      data.file_size,
      data.uploaded_by
    ];

    console.log('📝 Executing query with params:', params);

    const result = await client.query(query, params);

    console.log('✅ Bulk upload created successfully!');
    console.log('   Upload ID:', result.rows[0].upload_id);
    console.log('   Upload UUID:', upload_uuid);

    // Clean up
    await client.query('DELETE FROM member_application_bulk_uploads WHERE upload_uuid = $1', [upload_uuid]);
    console.log('✅ Test record cleaned up');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
    console.error('Full error:', error);
  } finally {
    await client.end();
  }
}

testServiceMethod();

