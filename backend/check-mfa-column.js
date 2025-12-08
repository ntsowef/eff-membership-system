const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function checkMfaColumn() {
  try {
    console.log('🔍 Checking mfa_enabled column type...\n');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'mfa_enabled'
    `);
    
    console.log('mfa_enabled column info:');
    console.table(result.rows);
    
    // Check sample values
    const sampleResult = await pool.query(`
      SELECT mfa_enabled, COUNT(*) as count
      FROM users
      GROUP BY mfa_enabled
    `);
    
    console.log('\nSample values in mfa_enabled:');
    console.table(sampleResult.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkMfaColumn();

