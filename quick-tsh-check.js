const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

(async () => {
  try {
    // Find TSH municipalities
    const munis = await pool.query(
      "SELECT municipality_code, municipality_name FROM municipalities WHERE municipality_name ILIKE '%TSH%' ORDER BY municipality_code"
    );
    console.log('TSH Municipalities:');
    console.log(JSON.stringify(munis.rows, null, 2));

    // Check configs
    const configs = await pool.query(
      "SELECT sub_region_code, max_delegates, updated_at FROM srpa_delegate_config WHERE sub_region_code ILIKE '%TSH%'"
    );
    console.log('\nSRPA Configs for TSH:');
    console.log(JSON.stringify(configs.rows, null, 2));

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
  }
})();

