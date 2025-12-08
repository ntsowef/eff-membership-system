const { Client } = require('pg');

async function checkValidationErrors() {
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

    // Get the most recent upload
    const uploadQuery = `
      SELECT upload_id, upload_uuid, file_name, total_records, successful_records, failed_records, status
      FROM member_application_bulk_uploads
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const uploadResult = await client.query(uploadQuery);
    
    if (uploadResult.rows.length === 0) {
      console.log('No uploads found');
      return;
    }
    
    const upload = uploadResult.rows[0];
    console.log('📊 Most Recent Upload:');
    console.log(`   UUID: ${upload.upload_uuid}`);
    console.log(`   File: ${upload.file_name}`);
    console.log(`   Status: ${upload.status}`);
    console.log(`   Total: ${upload.total_records}, Success: ${upload.successful_records}, Failed: ${upload.failed_records}\n`);
    
    // First, check what columns exist
    const columnsQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'member_application_bulk_upload_records'
      ORDER BY ordinal_position
    `;

    const columnsResult = await client.query(columnsQuery);
    console.log('📋 Table columns:');
    columnsResult.rows.forEach(row => console.log(`   - ${row.column_name}`));
    console.log('');

    // Get error samples
    const errorQuery = `
      SELECT row_number, record_status, error_message, first_name, last_name, id_number, cell_number, ward_code
      FROM member_application_bulk_upload_records
      WHERE upload_id = $1 AND record_status = 'Failed'
      ORDER BY row_number
      LIMIT 10
    `;

    const errorResult = await client.query(errorQuery, [upload.upload_id]);

    console.log(`❌ Sample Validation Errors (showing first 10 of ${upload.failed_records}):\n`);

    errorResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. Row ${row.row_number}:`);
      console.log(`   Name: ${row.first_name} ${row.last_name}`);
      console.log(`   ID: ${row.id_number}`);
      console.log(`   Cell: ${row.cell_number}`);
      console.log(`   Ward: ${row.ward_code}`);
      console.log(`   Error: ${row.error_message}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkValidationErrors();

