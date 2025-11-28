/**
 * Create system_settings table in PostgreSQL database
 * 
 * This script creates the system_settings table and populates it with initial data
 */

require('dotenv').config({ path: '.env.postgres' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'eff_membership_db',
});

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   Create System Settings Table                            ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

async function createSystemSettingsTable() {
  const client = await pool.connect();
  
  try {
    console.log('📋 Database Configuration:');
    console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   Port: ${process.env.DB_PORT || '5432'}`);
    console.log(`   Database: ${process.env.DB_NAME || 'eff_membership_db'}`);
    console.log(`   User: ${process.env.DB_USER || 'eff_admin'}`);
    console.log('');

    // Read SQL file
    const sqlFilePath = path.join(__dirname, '../database-recovery/create-system-settings-table.sql');
    console.log('📄 Reading SQL file:', sqlFilePath);
    
    if (!fs.existsSync(sqlFilePath)) {
      console.error('❌ SQL file not found:', sqlFilePath);
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('✅ SQL file loaded successfully\n');

    // Execute SQL
    console.log('🚀 Executing SQL...\n');
    await client.query(sqlContent);

    // Verify table creation
    console.log('✅ SQL executed successfully\n');
    console.log('🔍 Verifying table creation...\n');

    const result = await client.query(`
      SELECT 
        id,
        setting_key,
        setting_value,
        setting_type,
        description
      FROM system_settings
      ORDER BY setting_key
    `);

    console.log('═'.repeat(60));
    console.log('SYSTEM SETTINGS CREATED');
    console.log('═'.repeat(60));
    console.log('');
    console.log(`Total Settings: ${result.rows.length}`);
    console.log('');

    result.rows.forEach((setting, index) => {
      console.log(`${index + 1}. ${setting.setting_key}`);
      console.log(`   Type: ${setting.setting_type}`);
      console.log(`   Value: ${setting.setting_value}`);
      console.log(`   Description: ${setting.description}`);
      console.log('');
    });

    console.log('═'.repeat(60));
    console.log('✅ SUCCESS!');
    console.log('═'.repeat(60));
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. Navigate to System → Settings in the UI');
    console.log('   3. Toggle SMS Notifications on/off');
    console.log('');
    console.log('💡 SMS Enable/Disable:');
    console.log('   - Current value: ' + result.rows.find(r => r.setting_key === 'enable_sms_notifications')?.setting_value);
    console.log('   - Toggle in UI to enable/disable SMS sending');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

createSystemSettingsTable();

