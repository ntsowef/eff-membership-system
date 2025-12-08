const { Client } = require('pg');

async function findQualificationTable() {
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
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%qualif%'
      ORDER BY table_name
    `;
    
    const result = await client.query(query);
    console.log('Qualification tables:');
    result.rows.forEach(r => console.log('  -', r.table_name));
    
    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    await client.end();
  }
}

findQualificationTable();

