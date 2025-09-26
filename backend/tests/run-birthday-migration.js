const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runBirthdayMigration() {
  let connection;
  
  try {
    console.log('🎂 Running Birthday SMS System Migration...\n');
    
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
    const migrationPath = path.join(__dirname, 'migrations', '013_birthday_sms_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded');
    console.log('🔧 Executing birthday SMS migration...');
    
    // Execute the migration
    await connection.query(migrationSQL);
    
    console.log('✅ Birthday SMS System tables created successfully!');
    
    // Verify tables were created
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME LIKE 'birthday_%'
      ORDER BY TABLE_NAME
    `, [process.env.DB_NAME || 'membership_new']);
    
    console.log('\n📋 Birthday SMS Tables Created:');
    tables.forEach(table => {
      console.log(`   ✅ ${table.TABLE_NAME}`);
    });
    
    // Check views created
    const [views] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.VIEWS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME LIKE '%birthday%'
      ORDER BY TABLE_NAME
    `, [process.env.DB_NAME || 'membership_new']);
    
    console.log('\n📊 Birthday Views Created:');
    views.forEach(view => {
      console.log(`   ✅ ${view.TABLE_NAME}`);
    });
    
    // Check sample data
    const [config] = await connection.query('SELECT COUNT(*) as count FROM birthday_sms_config');
    const [templates] = await connection.query('SELECT COUNT(*) as count FROM sms_templates WHERE name = "Birthday Wishes"');
    
    console.log('\n📊 Sample Data Inserted:');
    console.log(`   🎂 Birthday Configurations: ${config[0].count}`);
    console.log(`   📝 Birthday Templates: ${templates[0].count}`);
    
    // Test today's birthdays view
    const [todaysBirthdays] = await connection.query('SELECT COUNT(*) as count FROM todays_birthdays');
    const [upcomingBirthdays] = await connection.query('SELECT COUNT(*) as count FROM upcoming_birthdays');
    
    console.log('\n🎉 Birthday Data Summary:');
    console.log(`   🎂 Today's Birthdays: ${todaysBirthdays[0].count}`);
    console.log(`   📅 Upcoming Birthdays (7 days): ${upcomingBirthdays[0].count}`);
    
    // Check members with birthday data
    const [membersWithBirthdays] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM members 
      WHERE date_of_birth IS NOT NULL 
        AND cell_number IS NOT NULL 
        AND cell_number != ''
    `);
    
    console.log(`   👥 Members with Birthday Data: ${membersWithBirthdays[0].count}`);
    
    console.log('\n🎉 Birthday SMS System Migration Complete!');
    console.log('🚀 Ready to send automated birthday messages');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runBirthdayMigration();
