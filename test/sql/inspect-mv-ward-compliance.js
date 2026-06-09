const { Client } = require('pg');
(async () => {
  const client = new Client({
    host: 'localhost', port: 5432,
    user: 'eff_admin', password: 'Frames!123',
    database: 'eff_membership_database',
  });
  await client.connect();
  try {
    for (const v of ['mv_ward_compliance_summary', 'mv_voting_district_compliance']) {
      const cols = await client.query(
        `SELECT column_name, data_type
           FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position`,
        [v]
      );
      console.log(`\n--- ${v} columns ---`);
      console.table(cols.rows);
    }

    // Show definition of mv_ward_compliance_summary (criterion logic).
    const def = await client.query(
      `SELECT pg_get_viewdef('mv_ward_compliance_summary', true) AS def`
    );
    console.log('\n--- mv_ward_compliance_summary definition ---');
    console.log(def.rows[0].def);
  } finally { await client.end(); }
})().catch(e => { console.error(e); process.exit(1); });
