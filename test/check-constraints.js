const { Client } = require('pg');

async function checkConstraints() {
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
      SELECT 
        con.conname AS constraint_name,
        con.contype AS constraint_type,
        CASE con.contype
          WHEN 'p' THEN 'PRIMARY KEY'
          WHEN 'u' THEN 'UNIQUE'
          WHEN 'f' THEN 'FOREIGN KEY'
          WHEN 'c' THEN 'CHECK'
          ELSE con.contype::text
        END AS constraint_type_desc,
        pg_get_constraintdef(con.oid) AS constraint_definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'membership_applications'
      ORDER BY con.contype, con.conname
    `;
    
    const result = await client.query(query);
    console.log('Constraints on membership_applications table:\n');
    result.rows.forEach(r => {
      console.log(`${r.constraint_type_desc}: ${r.constraint_name}`);
      console.log(`  ${r.constraint_definition}\n`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkConstraints();

