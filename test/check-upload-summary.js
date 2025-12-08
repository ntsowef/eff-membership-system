const { Client } = require('pg');

async function checkUploadSummary() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_database'
  });

  try {
    await client.connect();
    
    // Get recent uploads
    const uploadsQuery = `
      SELECT upload_uuid, file_name, total_records, successful_records, failed_records, status, created_at
      FROM member_application_bulk_uploads
      ORDER BY created_at DESC
      LIMIT 5
    `;
    
    const uploadsResult = await client.query(uploadsQuery);
    console.log('📊 Recent uploads:\n');
    uploadsResult.rows.forEach((r, i) => {
      console.log(`${i + 1}. ${r.file_name}`);
      console.log(`   UUID: ${r.upload_uuid}`);
      console.log(`   Total: ${r.total_records}, Success: ${r.successful_records}, Failed: ${r.failed_records}`);
      console.log(`   Status: ${r.status}`);
      console.log(`   Created: ${r.created_at}`);
      console.log('');
    });
    
    // For the most recent upload, check actual record counts
    if (uploadsResult.rows.length > 0) {
      const latestUpload = uploadsResult.rows[0];
      
      const recordCountsQuery = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN record_status = 'Success' THEN 1 ELSE 0 END) as success,
          SUM(CASE WHEN record_status = 'Failed' THEN 1 ELSE 0 END) as failed
        FROM member_application_bulk_upload_records
        WHERE upload_id = (SELECT upload_id FROM member_application_bulk_uploads WHERE upload_uuid = $1)
      `;
      
      const countsResult = await client.query(recordCountsQuery, [latestUpload.upload_uuid]);
      const actualCounts = countsResult.rows[0];
      
      console.log('🔍 Actual record counts for most recent upload:');
      console.log(`   Total: ${actualCounts.total}`);
      console.log(`   Success: ${actualCounts.success}`);
      console.log(`   Failed: ${actualCounts.failed}`);
      console.log('');
      
      if (parseInt(actualCounts.success) !== latestUpload.successful_records) {
        console.log('⚠️  MISMATCH DETECTED!');
        console.log(`   Upload summary shows ${latestUpload.successful_records} successful`);
        console.log(`   But actual records show ${actualCounts.success} successful`);
        console.log('   This indicates the upload summary is not being updated correctly.');
      } else {
        console.log('✅ Upload summary matches actual record counts');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkUploadSummary();

