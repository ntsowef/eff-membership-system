const { Client } = require('pg');

const DB_URL = 'postgresql://eff_admin:Frames!123@69.164.245.173:5432/eff_membership_database';
const READONLY_PASSWORD = 'ReadOnly!2025';

const statements = [
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'eff_readonly') THEN
      CREATE USER eff_readonly WITH PASSWORD '${READONLY_PASSWORD}';
      RAISE NOTICE 'User eff_readonly created.';
    ELSE
      RAISE NOTICE 'User eff_readonly already exists, skipping creation.';
    END IF;
  END $$`,
  `GRANT CONNECT ON DATABASE eff_membership_database TO eff_readonly`,
  `GRANT USAGE ON SCHEMA public TO eff_readonly`,
  `GRANT SELECT ON ALL TABLES IN SCHEMA public TO eff_readonly`,
  `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO eff_readonly`,
  `GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO eff_readonly`,
  `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO eff_readonly`,
];

async function run() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  console.log('Connected to database.\n');

  for (const stmt of statements) {
    try {
      await client.query(stmt);
      console.log('✓', stmt.trim().split('\n')[0].substring(0, 70));
    } catch (err) {
      console.error('✗ Error:', err.message);
      await client.end();
      process.exit(1);
    }
  }

  // Verify user exists
  const { rows } = await client.query(
    `SELECT rolname, rolcanlogin FROM pg_roles WHERE rolname = 'eff_readonly'`
  );
  console.log('\n=== Verification ===');
  if (rows.length > 0) {
    console.log('User exists:', rows[0]);
    console.log('\nConnection string for readonly user:');
    console.log('postgresql://eff_readonly:ReadOnly!2025@69.164.245.173:5432/eff_membership_database');
  } else {
    console.log('WARNING: User was not found after creation!');
  }

  await client.end();
  console.log('\nDone!');
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
