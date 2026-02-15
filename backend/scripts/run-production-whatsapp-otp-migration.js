/**
 * Run WhatsApp OTP migration on PRODUCTION database (69.164.245.173)
 * Usage: node backend/scripts/run-production-whatsapp-otp-migration.js
 */
const { Pool } = require('pg');

const pool = new Pool({
  host: '69.164.245.173',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database',
  connectionTimeoutMillis: 15000,
  ssl: false
});

(async () => {
  console.log('🔗 Connecting to PRODUCTION database at 69.164.245.173...');
  const client = await pool.connect();
  try {
    // Check existing columns
    const existing = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'user_otp_codes' AND column_name LIKE 'whatsapp%' ORDER BY column_name"
    );
    if (existing.rows.length > 0) {
      console.log('ℹ️  Existing WhatsApp columns:', existing.rows.map(r => r.column_name).join(', '));
    } else {
      console.log('ℹ️  No WhatsApp columns exist yet.');
    }

    // Run migration
    console.log('\n📦 Running migration: add WhatsApp OTP columns...');
    await client.query(`
      ALTER TABLE user_otp_codes
      ADD COLUMN IF NOT EXISTS whatsapp_delivery_status VARCHAR(50) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS whatsapp_delivered_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS whatsapp_delivery_error TEXT
    `);
    console.log('✅ ALTER TABLE completed.');

    // Add comments
    await client.query("COMMENT ON COLUMN user_otp_codes.whatsapp_delivery_status IS 'WhatsApp OTP delivery status: pending, sent, failed, not_attempted'");
    await client.query("COMMENT ON COLUMN user_otp_codes.whatsapp_delivered_at IS 'Timestamp when WhatsApp OTP delivery was attempted'");
    await client.query("COMMENT ON COLUMN user_otp_codes.whatsapp_delivery_error IS 'Error message if WhatsApp delivery failed'");
    console.log('✅ Comments added.');

    // Verify
    const verify = await client.query(
      "SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'user_otp_codes' AND column_name LIKE 'whatsapp%' ORDER BY column_name"
    );
    console.log('\n📊 Verification - WhatsApp columns on PRODUCTION:');
    verify.rows.forEach(r => {
      console.log(`   ✅ ${r.column_name} (${r.data_type}) default: ${r.column_default || 'NULL'}`);
    });

    if (verify.rows.length === 3) {
      console.log('\n🎉 Migration successful on PRODUCTION database!');
    } else {
      console.log(`\n⚠️  Expected 3 columns, found ${verify.rows.length}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
})().catch(e => {
  console.error('❌ ERROR:', e.message);
  pool.end();
  process.exit(1);
});

