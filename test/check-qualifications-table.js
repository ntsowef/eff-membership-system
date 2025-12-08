const { Client } = require('pg');

async function checkQualificationsTable() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_database'
  });

  try {
    await client.connect();
    
    // Get columns
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'qualifications'
      ORDER BY ordinal_position
    `;
    const columnsResult = await client.query(columnsQuery);
    
    console.log('📋 Table: qualifications');
    console.log('Columns:');
    columnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });

    // Get row count
    const countQuery = `SELECT COUNT(*) as count FROM qualifications`;
    const countResult = await client.query(countQuery);
    console.log(`\nTotal rows: ${countResult.rows[0].count}`);

    // Get sample data
    const sampleQuery = `SELECT * FROM qualifications LIMIT 5`;
    const sampleResult = await client.query(sampleQuery);
    if (sampleResult.rows.length > 0) {
      console.log('\nSample data:');
      sampleResult.rows.forEach((row, idx) => {
        console.log(`  ${idx + 1}.`, JSON.stringify(row));
      });
    }
    
    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    await client.end();
  }
}

checkQualificationsTable();

