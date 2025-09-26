/**
 * Run IEC Electoral Events Migration
 * This script executes the IEC Electoral Events system migration
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  let connection;
  
  try {
    console.log('🚀 Starting IEC Electoral Events Migration...');
    
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'membership_new'
    });

    console.log('✅ Database connection established');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '024_iec_electoral_events_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');

    // Split migration into individual statements
    console.log('⚡ Executing migration...');
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length > 0) {
        try {
          await connection.execute(statement);
          console.log(`✅ Statement ${i + 1}/${statements.length} executed`);
        } catch (error) {
          console.log(`⚠️ Statement ${i + 1} failed: ${error.message}`);
          // Continue with other statements for non-critical errors
          if (error.code !== 'ER_TABLE_EXISTS_ERROR' && error.code !== 'ER_DUP_KEYNAME') {
            throw error;
          }
        }
      }
    }

    console.log('✅ Migration executed successfully');

    // Verify tables were created
    console.log('🔍 Verifying table creation...');
    
    const tables = [
      'iec_electoral_event_types',
      'iec_electoral_events', 
      'iec_electoral_event_delimitations',
      'iec_electoral_event_sync_logs'
    ];

    for (const table of tables) {
      const [rows] = await connection.execute(`SHOW TABLES LIKE '${table}'`);
      if (rows.length > 0) {
        console.log(`✅ Table '${table}' created successfully`);
        
        // Show record count
        const [countResult] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`   Records: ${countResult[0].count}`);
      } else {
        console.log(`❌ Table '${table}' not found`);
      }
    }

    // Verify views were created
    console.log('🔍 Verifying view creation...');
    
    const views = [
      'active_municipal_elections',
      'municipal_election_history'
    ];

    for (const view of views) {
      try {
        const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${view}`);
        console.log(`✅ View '${view}' created successfully`);
        console.log(`   Records: ${rows[0].count}`);
      } catch (error) {
        console.log(`❌ View '${view}' not accessible: ${error.message}`);
      }
    }

    // Show active municipal elections
    console.log('\n📊 Active Municipal Elections:');
    try {
      const [activeElections] = await connection.execute(`
        SELECT iec_event_id, description, election_year, is_active 
        FROM active_municipal_elections
      `);
      
      if (activeElections.length > 0) {
        activeElections.forEach(election => {
          console.log(`   🏛️ ${election.description} (ID: ${election.iec_event_id}, Year: ${election.election_year})`);
        });
      } else {
        console.log('   No active municipal elections found');
      }
    } catch (error) {
      console.log(`   Error querying active elections: ${error.message}`);
    }

    // Show municipal election history
    console.log('\n📚 Municipal Election History:');
    try {
      const [electionHistory] = await connection.execute(`
        SELECT iec_event_id, description, election_year, is_active 
        FROM municipal_election_history 
        LIMIT 10
      `);
      
      if (electionHistory.length > 0) {
        electionHistory.forEach(election => {
          const status = election.is_active ? '🟢 Active' : '🔴 Inactive';
          console.log(`   ${status} ${election.description} (ID: ${election.iec_event_id}, Year: ${election.election_year})`);
        });
      } else {
        console.log('   No municipal election history found');
      }
    } catch (error) {
      console.log(`   Error querying election history: ${error.message}`);
    }

    // Show system settings
    console.log('\n⚙️ IEC Integration Settings:');
    try {
      const [settings] = await connection.execute(`
        SELECT setting_key, setting_value, description 
        FROM system_settings 
        WHERE category = 'iec_integration'
      `);
      
      if (settings.length > 0) {
        settings.forEach(setting => {
          console.log(`   ${setting.setting_key}: ${setting.setting_value}`);
          console.log(`     ${setting.description}`);
        });
      } else {
        console.log('   No IEC integration settings found');
      }
    } catch (error) {
      console.log(`   Error querying settings: ${error.message}`);
    }

    console.log('\n🎉 IEC Electoral Events Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Implement IEC Electoral Events Service');
    console.log('2. Create API endpoints for electoral events');
    console.log('3. Integrate with existing voter verification service');
    console.log('4. Set up automated synchronization with IEC API');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the migration
if (require.main === module) {
  runMigration().then(() => {
    console.log('✅ Migration script completed');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
}

module.exports = runMigration;
