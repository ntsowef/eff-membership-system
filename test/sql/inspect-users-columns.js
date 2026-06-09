const { Client } = require('pg');
(async () => {
  const client = new Client({
    host: 'localhost', port: 5432,
    user: 'eff_admin', password: 'Frames!123',
    database: 'eff_membership_database',
  });
  await client.connect();
  try {
    const cols = await client.query(
      `SELECT column_name, data_type
         FROM information_schema.columns
        WHERE table_name = 'users'
          AND column_name IN ('user_id','username','first_name','last_name','firstname','surname','email','full_name','name')
        ORDER BY ordinal_position`
    );
    console.log('--- users (relevant cols) ---');
    console.table(cols.rows);

    const cols2 = await client.query(
      `SELECT column_name, data_type
         FROM information_schema.columns
        WHERE table_name = 'members_consolidated'
          AND column_name IN ('email','voting_district_code','firstname','surname','id_number','cell_number')
        ORDER BY ordinal_position`
    );
    console.log('\n--- members_consolidated (relevant cols) ---');
    console.table(cols2.rows);

    const cols3 = await client.query(
      `SELECT column_name, data_type
         FROM information_schema.columns
        WHERE table_name = 'voting_districts'
          AND column_name IN ('voting_district_code','voting_district_name','ward_code')
        ORDER BY ordinal_position`
    );
    console.log('\n--- voting_districts (relevant cols) ---');
    console.table(cols3.rows);
  } finally { await client.end(); }
})().catch(e => { console.error(e); process.exit(1); });
