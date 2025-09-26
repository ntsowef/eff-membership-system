const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  let connection;
  
  try {
    console.log('🔍 Connecting to database...');
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new',
      multipleStatements: true
    });

    console.log('✅ Connected! Running payment tables migration...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'backend', 'migrations', '006_create_payment_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await connection.execute(migrationSQL);

    console.log('✅ Payment tables migration completed successfully!');

    // Verify tables were created
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'membership_new' 
      AND TABLE_NAME IN (
        'payment_transactions',
        'cash_payment_verifications',
        'admin_notifications',
        'financial_monitoring_summary',
        'payment_gateway_configs',
        'application_workflow_status',
        'receipt_uploads',
        'financial_audit_trail'
      )
      ORDER BY TABLE_NAME
    `);

    console.log('\n📋 Created tables:');
    tables.forEach(table => {
      console.log(`  ✅ ${table.TABLE_NAME}`);
    });

    console.log(`\n🎉 Migration completed! Created ${tables.length} new tables.`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed.');
    }
  }
}

console.log('🚀 Starting payment tables migration...');
runMigration();
