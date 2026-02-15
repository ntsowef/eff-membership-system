const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function runMigration() {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '..', 'migrations', 'add-whatsapp-otp-columns.sql'),
      'utf8'
    );
    await client.query(sql);
    console.log('✅ WhatsApp OTP columns migration completed');

    // Verify
    const result = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_otp_codes' AND column_name LIKE 'whatsapp%'"
    );
    console.log('✅ Verified columns:', JSON.stringify(result.rows, null, 2));
  } catch (error) {
    console.error('❌ Migration error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

