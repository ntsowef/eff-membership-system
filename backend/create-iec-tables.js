/**
 * Create IEC Electoral Events Tables
 * This script creates the necessary tables for IEC Electoral Events integration
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function createIECTables() {
  let connection;
  
  try {
    console.log('🚀 Creating IEC Electoral Events Tables...');
    
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'membership_new'
    });

    console.log('✅ Database connection established');

    // 1. Create IEC Electoral Event Types table
    console.log('📋 Creating iec_electoral_event_types table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS iec_electoral_event_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        iec_event_type_id INT NOT NULL UNIQUE,
        description VARCHAR(255) NOT NULL,
        is_municipal_election BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_iec_event_type_id (iec_event_type_id),
        INDEX idx_municipal_election (is_municipal_election),
        INDEX idx_description (description)
      )
    `);

    // 2. Create IEC Electoral Events table
    console.log('📋 Creating iec_electoral_events table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS iec_electoral_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        iec_event_id INT NOT NULL UNIQUE,
        iec_event_type_id INT NOT NULL,
        description VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT FALSE,
        election_year YEAR NULL,
        election_date DATE NULL,
        
        last_synced_at TIMESTAMP NULL,
        sync_status ENUM('pending', 'syncing', 'completed', 'failed') DEFAULT 'pending',
        sync_error TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (iec_event_type_id) REFERENCES iec_electoral_event_types(iec_event_type_id) ON DELETE RESTRICT,
        
        INDEX idx_iec_event_id (iec_event_id),
        INDEX idx_iec_event_type_id (iec_event_type_id),
        INDEX idx_is_active (is_active),
        INDEX idx_election_year (election_year),
        INDEX idx_sync_status (sync_status),
        INDEX idx_last_synced (last_synced_at)
      )
    `);

    // 3. Create IEC Electoral Event Delimitations table
    console.log('📋 Creating iec_electoral_event_delimitations table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS iec_electoral_event_delimitations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        iec_event_id INT NOT NULL,
        province_id INT NULL,
        province_name VARCHAR(255) NULL,
        municipality_id INT NULL,
        municipality_name VARCHAR(255) NULL,
        ward_id INT NULL,
        ward_number VARCHAR(50) NULL,
        voting_district_number VARCHAR(50) NULL,
        voting_district_name VARCHAR(255) NULL,
        
        last_synced_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (iec_event_id) REFERENCES iec_electoral_events(iec_event_id) ON DELETE CASCADE,
        
        INDEX idx_iec_event_id (iec_event_id),
        INDEX idx_province_id (province_id),
        INDEX idx_municipality_id (municipality_id),
        INDEX idx_ward_id (ward_id),
        INDEX idx_voting_district (voting_district_number),
        INDEX idx_composite_location (province_id, municipality_id, ward_id)
      )
    `);

    // 4. Create IEC Electoral Event Sync Log table
    console.log('📋 Creating iec_electoral_event_sync_logs table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS iec_electoral_event_sync_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sync_type ENUM('event_types', 'events', 'delimitations', 'full_sync') NOT NULL,
        sync_status ENUM('started', 'completed', 'failed') NOT NULL,
        records_processed INT DEFAULT 0,
        records_created INT DEFAULT 0,
        records_updated INT DEFAULT 0,
        records_failed INT DEFAULT 0,
        error_message TEXT NULL,
        sync_duration_ms INT NULL,
        started_at TIMESTAMP NOT NULL,
        completed_at TIMESTAMP NULL,
        
        triggered_by ENUM('manual', 'scheduled', 'api_call') DEFAULT 'manual',
        user_id INT NULL,
        
        INDEX idx_sync_type (sync_type),
        INDEX idx_sync_status (sync_status),
        INDEX idx_started_at (started_at),
        INDEX idx_triggered_by (triggered_by)
      )
    `);

    // 5. Insert initial IEC Electoral Event Types
    console.log('📋 Inserting initial electoral event types...');
    await connection.execute(`
      INSERT INTO iec_electoral_event_types (iec_event_type_id, description, is_municipal_election) VALUES
      (1, 'National Election', FALSE),
      (2, 'Provincial Election', FALSE),
      (3, 'Local Government Election', TRUE),
      (4, 'By-Election', FALSE)
      ON DUPLICATE KEY UPDATE 
        description = VALUES(description),
        is_municipal_election = VALUES(is_municipal_election),
        updated_at = CURRENT_TIMESTAMP
    `);

    // 6. Insert known IEC Electoral Events
    console.log('📋 Inserting known electoral events...');
    await connection.execute(`
      INSERT INTO iec_electoral_events (iec_event_id, iec_event_type_id, description, is_active, election_year) VALUES
      (1091, 3, 'LOCAL GOVERNMENT ELECTION 2021', TRUE, 2021),
      (402, 3, 'LOCAL GOVERNMENT ELECTION 2016', FALSE, 2016),
      (197, 3, 'LGE 2011', FALSE, 2011),
      (95, 3, 'LGE 2006', FALSE, 2006),
      (2, 3, 'LGE 2000', FALSE, 2000),
      (1334, 1, '2024 NATIONAL ELECTION', TRUE, 2024),
      (699, 1, '2019 NATIONAL ELECTION', FALSE, 2019),
      (291, 1, '2014 National Election', FALSE, 2014),
      (146, 1, '22 Apr 2009 National Election', FALSE, 2009),
      (45, 1, '14 Apr 2004 National Election', FALSE, 2004),
      (1, 1, 'National Elections 1999', FALSE, 1999)
      ON DUPLICATE KEY UPDATE 
        description = VALUES(description),
        is_active = VALUES(is_active),
        election_year = VALUES(election_year),
        updated_at = CURRENT_TIMESTAMP
    `);

    // 7. Create views
    console.log('📋 Creating views...');
    await connection.execute(`
      CREATE OR REPLACE VIEW active_municipal_elections AS
      SELECT 
        iee.id,
        iee.iec_event_id,
        iee.description,
        iee.election_year,
        iee.election_date,
        iee.is_active,
        ieet.description as event_type_description
      FROM iec_electoral_events iee
      JOIN iec_electoral_event_types ieet ON iee.iec_event_type_id = ieet.iec_event_type_id
      WHERE ieet.is_municipal_election = TRUE
        AND iee.is_active = TRUE
    `);

    await connection.execute(`
      CREATE OR REPLACE VIEW municipal_election_history AS
      SELECT 
        iee.id,
        iee.iec_event_id,
        iee.description,
        iee.election_year,
        iee.election_date,
        iee.is_active,
        iee.last_synced_at,
        ieet.description as event_type_description
      FROM iec_electoral_events iee
      JOIN iec_electoral_event_types ieet ON iee.iec_event_type_id = ieet.iec_event_type_id
      WHERE ieet.is_municipal_election = TRUE
      ORDER BY iee.election_year DESC
    `);

    console.log('✅ All tables and views created successfully');

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

    // Show active municipal elections
    console.log('\n📊 Active Municipal Elections:');
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

    // Show municipal election history
    console.log('\n📚 Municipal Election History:');
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

    console.log('\n🎉 IEC Electoral Events Tables created successfully!');

  } catch (error) {
    console.error('❌ Table creation failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the script
if (require.main === module) {
  createIECTables().then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = createIECTables;
