// Quick column inspection for voting_districts table
const { Client } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

(async () => {
  const c = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await c.connect();
  const r = await c.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'voting_districts'
    ORDER BY ordinal_position;
  `);
  console.log('voting_districts columns:');
  r.rows.forEach((row) => console.log(`  ${row.column_name} (${row.data_type})`));
  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
