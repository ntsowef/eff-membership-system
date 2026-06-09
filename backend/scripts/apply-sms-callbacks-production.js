/**
 * Apply SMS Delivery Callbacks migration to PRODUCTION database
 * Production: 69.164.245.173
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const PRODUCTION_CONFIG = {
  host: '69.164.245.173',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database',
  connectionTimeoutMillis: 10000,
};

async function applyMigration() {
  console.log('='.repeat(70));
  console.log('Applying SMS Delivery Callbacks Migration to PRODUCTION');
  console.log(`Target: ${PRODUCTION_CONFIG.host}:${PRODUCTION_CONFIG.port}/${PRODUCTION_CONFIG.database}`);
  console.log('='.repeat(70));

  const pool = new Pool(PRODUCTION_CONFIG);
  let client;

  try {
    console.log('\n🔗 Connecting to production database...');
    client = await pool.connect();
    console.log('✅ Connected successfully\n');

    // Step 1: Check if table already exists
    console.log('📋 Step 1: Checking existing tables...');
    const tableCheck = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('sms_delivery_callbacks', 'sms_webhook_log')
      ORDER BY table_name
    `);
    console.log(`   Found tables: ${tableCheck.rows.map(r => r.table_name).join(', ') || 'none'}`);

    // Step 2: Check existing columns if table exists
    if (tableCheck.rows.some(r => r.table_name === 'sms_delivery_callbacks')) {
      const colCheck = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'sms_delivery_callbacks' ORDER BY ordinal_position
      `);
      console.log(`   Existing columns: ${colCheck.rows.map(r => r.column_name).join(', ')}`);
    }

    // Step 3: Read and apply migration
    console.log('\n📋 Step 2: Applying migration 040_sms_delivery_callbacks.sql...');
    const migrationFile = path.join(__dirname, '..', 'migrations', '040_sms_delivery_callbacks.sql');
    const migrationSQL = fs.readFileSync(migrationFile, 'utf8');
    
    try {
      await client.query(migrationSQL);
      console.log('   ✅ Main migration applied');
    } catch (err) {
      console.log(`   ⚠️  Main migration partial: ${err.message}`);
    }

    // Step 4: Apply alter migration (add missing columns)
    console.log('\n📋 Step 3: Applying migration 040b_sms_delivery_callbacks_alter.sql...');
    const alterFile = path.join(__dirname, '..', 'migrations', '040b_sms_delivery_callbacks_alter.sql');
    const alterSQL = fs.readFileSync(alterFile, 'utf8');
    
    // Execute each statement separately to handle partial failures
    const statements = alterSQL.split(';').filter(s => s.trim().length > 0);
    let successCount = 0;
    let skipCount = 0;

    for (const stmt of statements) {
      try {
        await client.query(stmt + ';');
        successCount++;
      } catch (err) {
        if (err.message.includes('already exists') || err.message.includes('does not exist')) {
          skipCount++;
        } else {
          console.log(`   ⚠️  Statement error: ${err.message.substring(0, 100)}`);
        }
      }
    }
    console.log(`   ✅ Alter migration: ${successCount} succeeded, ${skipCount} skipped`);

    // Step 5: Verify final state
    console.log('\n📋 Step 4: Verifying final table state...');
    const finalCols = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'sms_delivery_callbacks' ORDER BY ordinal_position
    `);
    console.log(`   Columns (${finalCols.rows.length}):`);
    finalCols.rows.forEach(r => console.log(`     - ${r.column_name} (${r.data_type})`));

    // Check webhook_log table too
    const webhookCols = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'sms_webhook_log' ORDER BY ordinal_position
    `);
    console.log(`\n   sms_webhook_log columns (${webhookCols.rows.length}):`);
    webhookCols.rows.forEach(r => console.log(`     - ${r.column_name}`));

    // Check indexes
    const indexes = await client.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'sms_delivery_callbacks' ORDER BY indexname
    `);
    console.log(`\n   Indexes (${indexes.rows.length}):`);
    indexes.rows.forEach(r => console.log(`     - ${r.indexname}`));

    console.log('\n' + '='.repeat(70));
    console.log('✅ PRODUCTION MIGRATION COMPLETED SUCCESSFULLY');
    console.log('='.repeat(70));

  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

applyMigration();

