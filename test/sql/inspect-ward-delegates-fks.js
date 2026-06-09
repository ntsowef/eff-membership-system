const { Client } = require('pg');

(async () => {
  const client = new Client({
    host: 'localhost', port: 5432,
    user: 'eff_admin', password: 'Frames!123',
    database: 'eff_membership_database',
  });
  await client.connect();
  try {
    const fks = await client.query(`
      SELECT conname, pg_get_constraintdef(c.oid) AS def
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
       WHERE t.relname = 'ward_delegates'
         AND c.contype IN ('f','u','p')
       ORDER BY conname
    `);
    console.log('--- ward_delegates constraints ---');
    console.table(fks.rows);

    const wu = await client.query(`
      SELECT conname, pg_get_constraintdef(c.oid) AS def
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
       WHERE t.relname = 'wards'
         AND c.contype IN ('u','p')
       ORDER BY conname
    `);
    console.log('--- wards unique/PK constraints ---');
    console.table(wu.rows);
  } finally { await client.end(); }
})().catch(e => { console.error(e); process.exit(1); });
