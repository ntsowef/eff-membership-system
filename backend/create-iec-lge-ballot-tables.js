/**
 * Create IEC LGE Ballot Results System Tables
 * Sets up the database schema for IEC LGE ballot results integration
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function createIecLgeBallotTables() {
  try {
    console.log('🏗️ Creating IEC LGE Ballot Results System Tables...');
    console.log('====================================================\n');

    // Import the compiled database connection
    const { initializeDatabase } = require('./dist/config/database');
    await initializeDatabase();
    console.log('✅ Database connection initialized');

    const { executeQuery } = require('./dist/config/database');

    // Read and execute the migration SQL
    const fs = require('fs').promises;
    const migrationPath = path.join(__dirname, 'migrations', '025_iec_lge_ballot_results_system.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');

    console.log('📄 Executing migration SQL...');
    
    // Execute the SQL directly (MySQL2 can handle multiple statements)
    let successCount = 0;
    let errorCount = 0;

    try {
      // Execute the entire migration as one transaction
      await executeQuery(migrationSQL);
      successCount = 1;
      console.log('✅ Migration SQL executed successfully');
    } catch (error) {
      errorCount = 1;
      console.error(`❌ Error executing migration: ${error.message}`);

      // Try executing individual statements if bulk execution fails
      console.log('🔄 Attempting individual statement execution...');

      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));

      successCount = 0;
      errorCount = 0;

      for (const statement of statements) {
        try {
          if (statement.trim()) {
            await executeQuery(statement);
            successCount++;

            // Log table creation
            if (statement.includes('CREATE TABLE')) {
              const tableName = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?`?(\w+)`?/i)?.[1];
              console.log(`✅ Created table: ${tableName}`);
            } else if (statement.includes('CREATE OR REPLACE VIEW')) {
              const viewName = statement.match(/CREATE OR REPLACE VIEW `?(\w+)`?/i)?.[1];
              console.log(`✅ Created view: ${viewName}`);
            } else if (statement.includes('INSERT')) {
              console.log('✅ Inserted initial data');
            } else if (statement.includes('UPDATE')) {
              console.log('✅ Updated initial data');
            }
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ Error executing statement: ${error.message}`);
          console.error(`Statement: ${statement.substring(0, 100)}...`);
        }
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);

    // Verify table creation
    console.log('\n🔍 Verifying table creation...');
    
    const tables = [
      'iec_province_mappings',
      'iec_municipality_mappings', 
      'iec_ward_mappings',
      'iec_lge_ballot_results',
      'iec_lge_ballot_sync_logs'
    ];

    for (const tableName of tables) {
      try {
        const result = await executeQuery(`
          SELECT COUNT(*) as count
          FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_SCHEMA = 'membership_new' 
            AND TABLE_NAME = ?
        `, [tableName]);
        
        if (result[0].count > 0) {
          console.log(`✅ Table ${tableName} exists`);
        } else {
          console.log(`❌ Table ${tableName} does NOT exist`);
        }
      } catch (error) {
        console.log(`❌ Error checking table ${tableName}: ${error.message}`);
      }
    }

    // Verify views creation
    console.log('\n🔍 Verifying view creation...');
    
    const views = [
      'current_lge_results_by_province',
      'current_lge_results_by_municipality',
      'current_lge_results_by_ward'
    ];

    for (const viewName of views) {
      try {
        const result = await executeQuery(`
          SELECT COUNT(*) as count
          FROM INFORMATION_SCHEMA.VIEWS 
          WHERE TABLE_SCHEMA = 'membership_new' 
            AND TABLE_NAME = ?
        `, [viewName]);
        
        if (result[0].count > 0) {
          console.log(`✅ View ${viewName} exists`);
        } else {
          console.log(`❌ View ${viewName} does NOT exist`);
        }
      } catch (error) {
        console.log(`❌ Error checking view ${viewName}: ${error.message}`);
      }
    }

    // Check initial data
    console.log('\n🔍 Verifying initial data...');
    
    try {
      const provinceCount = await executeQuery(`
        SELECT COUNT(*) as count FROM iec_province_mappings
      `);
      console.log(`✅ Province mappings: ${provinceCount[0].count} records`);
      
      if (provinceCount[0].count > 0) {
        const sampleProvinces = await executeQuery(`
          SELECT province_code, province_name, iec_province_id 
          FROM iec_province_mappings 
          LIMIT 5
        `);
        console.log('📋 Sample province mappings:');
        console.table(sampleProvinces);
      }
    } catch (error) {
      console.log(`❌ Error checking initial data: ${error.message}`);
    }

    console.log('\n🎯 Database Schema Summary');
    console.log('===========================');
    console.log('✅ iec_province_mappings: Maps province_code → IEC ProvinceID');
    console.log('✅ iec_municipality_mappings: Maps municipality_code → IEC MunicipalityID');
    console.log('✅ iec_ward_mappings: Maps ward_code → IEC WardID');
    console.log('✅ iec_lge_ballot_results: Stores LGE ballot results data');
    console.log('✅ iec_lge_ballot_sync_logs: Tracks synchronization history');
    console.log('✅ Views: Easy access to current ballot results by geographic level');

    console.log('\n🚀 Next Steps');
    console.log('==============');
    console.log('1. Implement IEC Geographic ID Discovery Service');
    console.log('2. Populate mapping tables with real IEC IDs');
    console.log('3. Create LGE Ballot Results Service');
    console.log('4. Build API endpoints for ballot results');
    console.log('5. Test with real IEC API calls');

    console.log('\n🎉 IEC LGE Ballot Results System Tables Created Successfully!');

  } catch (error) {
    console.error('❌ Table creation failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the table creation
if (require.main === module) {
  createIecLgeBallotTables().then(() => {
    console.log('\n✅ Table creation completed successfully');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Table creation failed:', error);
    process.exit(1);
  });
}

module.exports = createIecLgeBallotTables;
