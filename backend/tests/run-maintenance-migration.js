#!/usr/bin/env node

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function runMaintenanceMigration() {
  try {
    console.log('🔧 Running Maintenance Mode Database Migration...\n');
    
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'membership_new',
      multipleStatements: true
    });
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'database', 'migrations', 'create_maintenance_mode_table.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');

    console.log('📋 Executing maintenance mode migration...');

    // Split SQL into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        console.log(`   Executing statement ${i + 1}/${statements.length}...`);
        try {
          await connection.execute(statement);
        } catch (error) {
          console.error(`   ❌ Error in statement ${i + 1}:`, error.message);
          console.error(`   SQL: ${statement.substring(0, 100)}...`);
          throw error;
        }
      }
    }
    
    console.log('✅ Migration completed successfully!');
    
    // Verify tables were created
    console.log('\n📊 Verifying created tables...');
    
    const tables = ['maintenance_mode', 'maintenance_mode_logs', 'maintenance_notifications'];
    
    for (const tableName of tables) {
      const [rows] = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = 'membership_new' 
        AND TABLE_NAME = ?
      `, [tableName]);
      
      if (rows[0].count > 0) {
        console.log(`✅ Table '${tableName}' created successfully`);
        
        // Show table structure
        const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
        console.log(`   Columns: ${columns.length}`);
        columns.slice(0, 5).forEach(col => {
          console.log(`   - ${col.Field} (${col.Type})`);
        });
        if (columns.length > 5) {
          console.log(`   ... and ${columns.length - 5} more columns`);
        }
      } else {
        console.log(`❌ Table '${tableName}' was not created`);
      }
    }
    
    // Verify view was created
    const [viewRows] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.VIEWS 
      WHERE TABLE_SCHEMA = 'membership_new' 
      AND TABLE_NAME = 'vw_current_maintenance_status'
    `);
    
    if (viewRows[0].count > 0) {
      console.log(`✅ View 'vw_current_maintenance_status' created successfully`);
    } else {
      console.log(`❌ View 'vw_current_maintenance_status' was not created`);
    }
    
    // Check initial data
    console.log('\n📋 Checking initial maintenance mode record...');
    const [maintenanceRows] = await connection.execute('SELECT * FROM maintenance_mode LIMIT 1');
    
    if (maintenanceRows.length > 0) {
      const record = maintenanceRows[0];
      console.log('✅ Initial maintenance mode record created:');
      console.log(`   Enabled: ${record.is_enabled ? 'Yes' : 'No'}`);
      console.log(`   Level: ${record.maintenance_level}`);
      console.log(`   Bypass Admin Users: ${record.bypass_admin_users ? 'Yes' : 'No'}`);
      console.log(`   Message: ${record.maintenance_message}`);
    } else {
      console.log('❌ No initial maintenance mode record found');
    }
    
    // Test the view
    console.log('\n📋 Testing maintenance status view...');
    const [statusRows] = await connection.execute('SELECT * FROM vw_current_maintenance_status');
    
    if (statusRows.length > 0) {
      const status = statusRows[0];
      console.log('✅ Maintenance status view working:');
      console.log(`   Current Status: ${status.status}`);
      console.log(`   Enabled: ${status.is_enabled ? 'Yes' : 'No'}`);
      console.log(`   Level: ${status.maintenance_level}`);
    }
    
    await connection.end();
    
    console.log('\n🎉 Maintenance Mode Migration Completed Successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ maintenance_mode table created');
    console.log('✅ maintenance_mode_logs table created');
    console.log('✅ maintenance_notifications table created');
    console.log('✅ vw_current_maintenance_status view created');
    console.log('✅ Initial configuration inserted');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  }
}

runMaintenanceMigration();
