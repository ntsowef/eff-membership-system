/**
 * Quick script to run WhatsApp bot tables migration
 * Run: node run-whatsapp-migration.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

async function runMigration() {
  console.log('🚀 Running WhatsApp Bot Tables Migration...\n');

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'membership',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, 'src/migrations/whatsapp_bot_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded:', migrationPath);
    console.log('📝 Executing SQL...\n');

    // Execute migration
    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');
    console.log('Tables created:');
    console.log('  - whatsapp_bot_logs');
    console.log('  - whatsapp_bot_sessions');
    console.log('  - whatsapp_notification_queue');
    console.log('\n🎉 WhatsApp bot is now ready to use!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

