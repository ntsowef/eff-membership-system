const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runSMSMigration() {
  let connection;
  
  try {
    console.log('🚀 Running SMS Management System Migration...\n');
    
    // Database configuration
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'membership_new',
      port: parseInt(process.env.DB_PORT || '3306'),
      multipleStatements: true
    };
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connection established');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '012_sms_management_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded');
    console.log('🔧 Executing migration...');
    
    // Execute the migration
    await connection.query(migrationSQL);
    
    console.log('✅ SMS Management System tables created successfully!');
    
    // Verify tables were created
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME LIKE 'sms_%'
      ORDER BY TABLE_NAME
    `, [process.env.DB_NAME || 'membership_new']);
    
    console.log('\n📋 SMS Tables Created:');
    tables.forEach(table => {
      console.log(`   ✅ ${table.TABLE_NAME}`);
    });
    
    // Check sample data
    const [templates] = await connection.query('SELECT COUNT(*) as count FROM sms_templates');
    const [providers] = await connection.query('SELECT COUNT(*) as count FROM sms_provider_config');
    
    console.log('\n📊 Sample Data Inserted:');
    console.log(`   📝 SMS Templates: ${templates[0].count}`);
    console.log(`   🔌 SMS Providers: ${providers[0].count}`);
    
    console.log('\n🎉 SMS Management System Migration Complete!');
    console.log('🚀 Ready to implement SMS services and API endpoints');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runSMSMigration();
