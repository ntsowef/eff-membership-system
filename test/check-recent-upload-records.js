const { Client } = require('pg');

async function checkRecentUploadRecords() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_database'
  });

  try {
    await client.connect();
    
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
    console.log('Most recent upload:');
    console.log(`  UUID: ${upload.upload_uuid}`);
    console.log(`  File: ${upload.file_name}`);
    console.log(`  Total: ${upload.total_records}, Success: ${upload.successful_records}, Failed: ${upload.failed_records}`);
    console.log(`  Status: ${upload.status}\n`);
    
    // Check if there are any records for this upload
    const recordsQuery = `
      SELECT COUNT(*) as count, record_status
      FROM member_application_bulk_upload_records
      WHERE upload_id = $1
      GROUP BY record_status
    `;
    
    const recordsResult = await client.query(recordsQuery, [upload.upload_id]);
    
    console.log('Record counts by status:');
    if (recordsResult.rows.length === 0) {
      console.log('  No records found for this upload!');
    } else {
      recordsResult.rows.forEach(r => {
        console.log(`  ${r.record_status}: ${r.count}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkRecentUploadRecords();

