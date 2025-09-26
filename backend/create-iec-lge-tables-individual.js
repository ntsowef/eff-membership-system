/**
 * Create IEC LGE Ballot Results System Tables (Individual Statements)
 * Creates tables one by one for better error handling
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function createIecLgeBallotTablesIndividual() {
  try {
    console.log('🏗️ Creating IEC LGE Ballot Results System Tables (Individual)...');
    console.log('================================================================\n');

    // Import the compiled database connection
    const { initializeDatabase } = require('./dist/config/database');
    await initializeDatabase();
    console.log('✅ Database connection initialized');

    const { executeQuery } = require('./dist/config/database');

    let successCount = 0;
    let errorCount = 0;

    // 1. Create IEC Province Mappings Table
    console.log('\n1️⃣ Creating iec_province_mappings table...');
    try {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS iec_province_mappings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          province_code VARCHAR(10) NOT NULL,
          province_name VARCHAR(100) NOT NULL,
          iec_province_id INT,
          iec_province_name VARCHAR(100),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          UNIQUE KEY unique_province_code (province_code),
          UNIQUE KEY unique_iec_province_id (iec_province_id),
          INDEX idx_province_code (province_code),
          INDEX idx_iec_province_id (iec_province_id),
          INDEX idx_is_active (is_active)
        )
      `);
      console.log('✅ iec_province_mappings table created');
      successCount++;
    } catch (error) {
      console.error('❌ Error creating iec_province_mappings:', error.message);
      errorCount++;
    }

    // 2. Create IEC Municipality Mappings Table
    console.log('\n2️⃣ Creating iec_municipality_mappings table...');
    try {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS iec_municipality_mappings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          municipality_code VARCHAR(20) NOT NULL,
          municipality_name VARCHAR(100) NOT NULL,
          province_code VARCHAR(10) NOT NULL,
          iec_municipality_id INT,
          iec_municipality_name VARCHAR(100),
          iec_province_id INT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          UNIQUE KEY unique_municipality_code (municipality_code),
          UNIQUE KEY unique_iec_municipality_id (iec_municipality_id),
          INDEX idx_municipality_code (municipality_code),
          INDEX idx_province_code (province_code),
          INDEX idx_iec_municipality_id (iec_municipality_id),
          INDEX idx_iec_province_id (iec_province_id),
          INDEX idx_is_active (is_active),
          
          FOREIGN KEY (province_code) REFERENCES provinces(province_code) ON UPDATE CASCADE
        )
      `);
      console.log('✅ iec_municipality_mappings table created');
      successCount++;
    } catch (error) {
      console.error('❌ Error creating iec_municipality_mappings:', error.message);
      errorCount++;
    }

    // 3. Create IEC Ward Mappings Table
    console.log('\n3️⃣ Creating iec_ward_mappings table...');
    try {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS iec_ward_mappings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          ward_code VARCHAR(20) NOT NULL,
          ward_name VARCHAR(100),
          ward_number INT,
          municipality_code VARCHAR(20) NOT NULL,
          province_code VARCHAR(10) NOT NULL,
          iec_ward_id INT,
          iec_ward_name VARCHAR(100),
          iec_municipality_id INT,
          iec_province_id INT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          UNIQUE KEY unique_ward_code (ward_code),
          UNIQUE KEY unique_iec_ward_id (iec_ward_id),
          INDEX idx_ward_code (ward_code),
          INDEX idx_municipality_code (municipality_code),
          INDEX idx_province_code (province_code),
          INDEX idx_iec_ward_id (iec_ward_id),
          INDEX idx_iec_municipality_id (iec_municipality_id),
          INDEX idx_iec_province_id (iec_province_id),
          INDEX idx_is_active (is_active),
          
          FOREIGN KEY (municipality_code) REFERENCES municipalities(municipality_code) ON UPDATE CASCADE,
          FOREIGN KEY (province_code) REFERENCES provinces(province_code) ON UPDATE CASCADE
        )
      `);
      console.log('✅ iec_ward_mappings table created');
      successCount++;
    } catch (error) {
      console.error('❌ Error creating iec_ward_mappings:', error.message);
      errorCount++;
    }

    // 4. Create IEC LGE Ballot Results Table
    console.log('\n4️⃣ Creating iec_lge_ballot_results table...');
    try {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS iec_lge_ballot_results (
          id INT AUTO_INCREMENT PRIMARY KEY,
          iec_event_id INT NOT NULL,
          iec_province_id INT,
          iec_municipality_id INT,
          iec_ward_id INT,
          
          province_code VARCHAR(10),
          municipality_code VARCHAR(20),
          ward_code VARCHAR(20),
          
          ballot_data JSON NOT NULL,
          
          total_votes INT DEFAULT 0,
          registered_voters INT DEFAULT 0,
          voter_turnout_percentage DECIMAL(5,2) DEFAULT 0.00,
          
          result_type ENUM('province', 'municipality', 'ward') NOT NULL,
          data_source VARCHAR(50) DEFAULT 'IEC_API',
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          INDEX idx_iec_event_id (iec_event_id),
          INDEX idx_iec_province_id (iec_province_id),
          INDEX idx_iec_municipality_id (iec_municipality_id),
          INDEX idx_iec_ward_id (iec_ward_id),
          INDEX idx_province_code (province_code),
          INDEX idx_municipality_code (municipality_code),
          INDEX idx_ward_code (ward_code),
          INDEX idx_result_type (result_type),
          INDEX idx_last_updated (last_updated),
          
          FOREIGN KEY (iec_event_id) REFERENCES iec_electoral_events(iec_event_id) ON DELETE CASCADE,
          FOREIGN KEY (province_code) REFERENCES provinces(province_code) ON UPDATE CASCADE,
          FOREIGN KEY (municipality_code) REFERENCES municipalities(municipality_code) ON UPDATE CASCADE,
          FOREIGN KEY (ward_code) REFERENCES wards(ward_code) ON UPDATE CASCADE
        )
      `);
      console.log('✅ iec_lge_ballot_results table created');
      successCount++;
    } catch (error) {
      console.error('❌ Error creating iec_lge_ballot_results:', error.message);
      errorCount++;
    }

    // 5. Create IEC LGE Ballot Results Sync Log
    console.log('\n5️⃣ Creating iec_lge_ballot_sync_logs table...');
    try {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS iec_lge_ballot_sync_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          sync_type ENUM('province', 'municipality', 'ward', 'full') NOT NULL,
          iec_event_id INT NOT NULL,
          
          province_code VARCHAR(10),
          municipality_code VARCHAR(20),
          ward_code VARCHAR(20),
          
          sync_status ENUM('started', 'completed', 'failed', 'partial') NOT NULL,
          records_processed INT DEFAULT 0,
          records_successful INT DEFAULT 0,
          records_failed INT DEFAULT 0,
          
          started_at TIMESTAMP NOT NULL,
          completed_at TIMESTAMP NULL,
          duration_ms INT DEFAULT 0,
          
          error_message TEXT,
          error_details JSON,
          
          api_calls_made INT DEFAULT 0,
          api_calls_successful INT DEFAULT 0,
          api_calls_failed INT DEFAULT 0,
          
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          INDEX idx_sync_type (sync_type),
          INDEX idx_iec_event_id (iec_event_id),
          INDEX idx_sync_status (sync_status),
          INDEX idx_province_code (province_code),
          INDEX idx_municipality_code (municipality_code),
          INDEX idx_ward_code (ward_code),
          INDEX idx_started_at (started_at),
          
          FOREIGN KEY (iec_event_id) REFERENCES iec_electoral_events(iec_event_id) ON DELETE CASCADE
        )
      `);
      console.log('✅ iec_lge_ballot_sync_logs table created');
      successCount++;
    } catch (error) {
      console.error('❌ Error creating iec_lge_ballot_sync_logs:', error.message);
      errorCount++;
    }

    // 6. Insert Initial Province Mappings
    console.log('\n6️⃣ Inserting initial province mappings...');
    try {
      await executeQuery(`
        INSERT IGNORE INTO iec_province_mappings (province_code, province_name, iec_province_id, iec_province_name) VALUES
        ('EC', 'Eastern Cape', NULL, 'To be discovered'),
        ('FS', 'Free State', NULL, 'To be discovered'),
        ('GP', 'Gauteng', NULL, 'To be discovered'),
        ('KZN', 'KwaZulu-Natal', NULL, 'To be discovered'),
        ('LP', 'Limpopo', NULL, 'To be discovered'),
        ('MP', 'Mpumalanga', NULL, 'To be discovered'),
        ('NC', 'Northern Cape', NULL, 'To be discovered'),
        ('NW', 'North West', NULL, 'To be discovered'),
        ('WC', 'Western Cape', NULL, 'To be discovered')
      `);
      console.log('✅ Initial province mappings inserted');
      successCount++;
    } catch (error) {
      console.error('❌ Error inserting initial province mappings:', error.message);
      errorCount++;
    }

    console.log(`\n📊 Creation Summary:`);
    console.log(`✅ Successful operations: ${successCount}`);
    console.log(`❌ Failed operations: ${errorCount}`);

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

    console.log('\n🎉 IEC LGE Ballot Results System Tables Created Successfully!');

  } catch (error) {
    console.error('❌ Table creation failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the table creation
if (require.main === module) {
  createIecLgeBallotTablesIndividual().then(() => {
    console.log('\n✅ Table creation completed successfully');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Table creation failed:', error);
    process.exit(1);
  });
}

module.exports = createIecLgeBallotTablesIndividual;
