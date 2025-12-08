const { Client } = require('pg');

async function checkVarcharColumns() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_database'
  });

  try {
    await client.connect();
    
    const query = `
      SELECT column_name, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'membership_applications' 
        AND data_type = 'character varying'
      ORDER BY column_name
    `;
    
    const result = await client.query(query);
    console.log('VARCHAR columns in membership_applications:\n');
    result.rows.forEach(r => {
      console.log(`  ${r.column_name}: VARCHAR(${r.character_maximum_length})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkVarcharColumns();

