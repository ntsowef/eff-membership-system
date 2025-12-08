const { Client } = require('pg');

async function checkRecordStatus() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_database'
  });

  try {
    await client.connect();
    
    // Get status counts
    const statusQuery = `
      SELECT COUNT(*) as count, record_status 
      FROM member_application_bulk_upload_records 
      WHERE upload_id = (SELECT upload_id FROM member_application_bulk_uploads ORDER BY created_at DESC LIMIT 1) 
      GROUP BY record_status
    `;
    
    const statusResult = await client.query(statusQuery);
    console.log('Record status counts:');
    statusResult.rows.forEach(r => console.log(`  ${r.record_status}: ${r.count}`));
    console.log('');
    
    // Get sample failed records
    const failedQuery = `
      SELECT row_number, first_name, last_name, id_number, cell_number, ward_code, error_message, record_status
      FROM member_application_bulk_upload_records
      WHERE upload_id = (SELECT upload_id FROM member_application_bulk_uploads ORDER BY created_at DESC LIMIT 1)
      ORDER BY row_number
      LIMIT 10
    `;

    const failedResult = await client.query(failedQuery);
    console.log('Sample records:');
    failedResult.rows.forEach((r, i) => {
      console.log(`\n${i + 1}. Row ${r.row_number} [${r.record_status}]:`);
      console.log(`   Name: ${r.first_name} ${r.last_name}`);
      console.log(`   ID: ${r.id_number}`);
      console.log(`   Cell: ${r.cell_number}`);
      console.log(`   Ward: ${r.ward_code}`);
      console.log(`   Error: ${r.error_message || 'None'}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkRecordStatus();

