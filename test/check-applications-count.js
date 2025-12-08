const { Client } = require('pg');

async function checkApplicationsCount() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_database'
  });

  try {
    await client.connect();
    
    // Get total count
    const countQuery = 'SELECT COUNT(*) as count FROM membership_applications';
    const countResult = await client.query(countQuery);
    console.log(`\n📊 Total applications in database: ${countResult.rows[0].count}\n`);
    
    // Get count by status
    const statusQuery = `
      SELECT status, COUNT(*) as count 
      FROM membership_applications 
      GROUP BY status 
      ORDER BY count DESC
    `;
    const statusResult = await client.query(statusQuery);
    console.log('Applications by status:');
    statusResult.rows.forEach(r => {
      console.log(`  ${r.status}: ${r.count}`);
    });
    
    // Get sample records
    const sampleQuery = `
      SELECT application_id, application_number, first_name, last_name, status, created_at
      FROM membership_applications
      ORDER BY created_at DESC
      LIMIT 10
    `;
    const sampleResult = await client.query(sampleQuery);
    console.log('\n📋 Sample applications (most recent):');
    sampleResult.rows.forEach((r, i) => {
      console.log(`  ${i+1}. ${r.application_number} - ${r.first_name} ${r.last_name} (${r.status})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkApplicationsCount();

