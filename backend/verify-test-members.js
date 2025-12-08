require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function verifyTestMembers() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verifying test members in database...\n');
    
    // Get the 10 most recent membership applications
    const result = await client.query(`
      SELECT 
        application_id,
        application_number,
        first_name,
        last_name,
        id_number,
        date_of_birth,
        gender,
        email,
        cell_number,
        ward_code,
        province_code,
        municipal_code,
        status,
        created_at
      FROM membership_applications
      ORDER BY created_at DESC
      LIMIT 10;
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No membership applications found in database!');
    } else {
      console.log(`✓ Found ${result.rows.length} recent membership applications\n`);
      console.log('Recent Test Members:');
      console.log('='.repeat(120));
      console.log('ID'.padEnd(6) + 'App Number'.padEnd(18) + 'Name'.padEnd(30) + 'ID Number'.padEnd(15) + 'Ward'.padEnd(12) + 'Province'.padEnd(10) + 'Status');
      console.log('='.repeat(120));
      
      result.rows.forEach(row => {
        const fullName = `${row.first_name} ${row.last_name}`;
        console.log(
          row.application_id.toString().padEnd(6) +
          row.application_number.padEnd(18) +
          fullName.padEnd(30) +
          row.id_number.padEnd(15) +
          row.ward_code.padEnd(12) +
          (row.province_code || 'N/A').padEnd(10) +
          row.status
        );
      });
      console.log('='.repeat(120));
      
      // Count by status
      const statusCount = await client.query(`
        SELECT status, COUNT(*) as count
        FROM membership_applications
        GROUP BY status
        ORDER BY count DESC;
      `);
      
      console.log('\nMembership Applications by Status:');
      console.log('-'.repeat(40));
      statusCount.rows.forEach(row => {
        console.log(`  ${row.status.padEnd(20)} ${row.count} applications`);
      });
      console.log('-'.repeat(40));
      
      // Total count
      const totalCount = await client.query(`
        SELECT COUNT(*) as total FROM membership_applications;
      `);
      
      console.log(`\nTotal Membership Applications: ${totalCount.rows[0].total}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyTestMembers();

