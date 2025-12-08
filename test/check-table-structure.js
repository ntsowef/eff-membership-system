const { Client } = require('pg');

async function checkTableStructure() {
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
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'membership_applications'
      ORDER BY ordinal_position
    `;
    
    const result = await client.query(query);
    console.log('membership_applications table structure:\n');
    result.rows.forEach(r => {
      console.log(`  ${r.column_name}:`);
      console.log(`    Type: ${r.data_type}`);
      console.log(`    Nullable: ${r.is_nullable}`);
      console.log(`    Default: ${r.column_default || 'None'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTableStructure();

