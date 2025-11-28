/**
 * Verify provider_name column was added to sms_delivery_tracking
 */

require('dotenv').config({ path: '.env.postgres' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'eff_membership_db',
});

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   Verify provider_name Column                              ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

async function verify() {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Check if column exists
    console.log('🔍 Checking for provider_name column...');
    const columnCheck = await client.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'sms_delivery_tracking'
      AND column_name = 'provider_name';
    `);

    if (columnCheck.rows.length > 0) {
      console.log('✅ provider_name column exists!\n');
      console.log('Column Details:');
      console.log(`   Name: ${columnCheck.rows[0].column_name}`);
      console.log(`   Type: ${columnCheck.rows[0].data_type}`);
      console.log(`   Nullable: ${columnCheck.rows[0].is_nullable}`);
      console.log(`   Default: ${columnCheck.rows[0].column_default}`);
      console.log('');
    } else {
      console.log('❌ provider_name column does NOT exist\n');
      client.release();
      await pool.end();
      process.exit(1);
    }

    // Show all columns
    console.log('📋 All columns in sms_delivery_tracking:');
    const allColumns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'sms_delivery_tracking'
      ORDER BY ordinal_position;
    `);

    allColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    console.log('');

    // Check indexes
    console.log('📊 Indexes on sms_delivery_tracking:');
    const indexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'sms_delivery_tracking'
      ORDER BY indexname;
    `);

    indexes.rows.forEach(idx => {
      console.log(`   - ${idx.indexname}`);
    });
    console.log('');

    client.release();

    console.log('═'.repeat(60));
    console.log('✅ SUCCESS! provider_name column is ready');
    console.log('═'.repeat(60));
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. Restart backend server (if running)');
    console.log('   2. Backend should now start without errors');
    console.log('   3. Run SMS test: node test/sms/send-and-track-sms.js');
    console.log('');

    await pool.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verify();

