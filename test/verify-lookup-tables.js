const { Client } = require('pg');

async function verifyLookupTables() {
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

    const tables = [
      'genders',
      'races',
      'languages',
      'qualification_levels',
      'occupation_categories',
      'occupations',
      'meeting_types'
    ];

    for (const tableName of tables) {
      console.log(`\n📋 Table: ${tableName}`);
      console.log('─'.repeat(50));

      // Check if table exists
      const tableExistsQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `;
      const existsResult = await client.query(tableExistsQuery, [tableName]);
      
      if (!existsResult.rows[0].exists) {
        console.log(`❌ Table does not exist`);
        continue;
      }

      // Get columns
      const columnsQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `;
      const columnsResult = await client.query(columnsQuery, [tableName]);
      
      console.log('Columns:');
      columnsResult.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      });

      // Get row count
      const countQuery = `SELECT COUNT(*) as count FROM ${tableName}`;
      const countResult = await client.query(countQuery);
      console.log(`\nTotal rows: ${countResult.rows[0].count}`);

      // Get sample data
      const sampleQuery = `SELECT * FROM ${tableName} LIMIT 3`;
      const sampleResult = await client.query(sampleQuery);
      if (sampleResult.rows.length > 0) {
        console.log('\nSample data:');
        sampleResult.rows.forEach((row, idx) => {
          console.log(`  ${idx + 1}.`, JSON.stringify(row));
        });
      }
    }

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
  }
}

verifyLookupTables();

