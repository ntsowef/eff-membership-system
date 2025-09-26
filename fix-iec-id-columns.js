const mysql = require('mysql2/promise');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'membership_new'
};

async function fixIecIdColumns() {
  let connection;
  
  try {
    console.log('🔧 Fixing IEC ID column types...\n');
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');
    
    // Clear existing data first (since we need to change column types)
    console.log('\n🧹 Clearing existing IEC mapping data...');
    await connection.execute('DELETE FROM iec_ward_mappings');
    await connection.execute('DELETE FROM iec_municipality_mappings');
    console.log('✅ Cleared existing data');
    
    // Modify iec_municipality_mappings table
    console.log('\n🏛️ Modifying iec_municipality_mappings table...');
    
    await connection.execute(`
      ALTER TABLE iec_municipality_mappings 
      MODIFY COLUMN iec_municipality_id VARCHAR(20) NULL
    `);
    console.log('✅ Changed iec_municipality_id to VARCHAR(20)');
    
    // Modify iec_ward_mappings table
    console.log('\n🗳️ Modifying iec_ward_mappings table...');
    
    await connection.execute(`
      ALTER TABLE iec_ward_mappings 
      MODIFY COLUMN iec_ward_id VARCHAR(20) NULL
    `);
    console.log('✅ Changed iec_ward_id to VARCHAR(20)');
    
    await connection.execute(`
      ALTER TABLE iec_ward_mappings 
      MODIFY COLUMN iec_municipality_id VARCHAR(20) NULL
    `);
    console.log('✅ Changed iec_municipality_id to VARCHAR(20)');
    
    // Verify the changes
    console.log('\n🔍 Verifying column changes...');
    
    const [municipalityColumns] = await connection.execute('DESCRIBE iec_municipality_mappings');
    const iecMunicipalityIdCol = municipalityColumns.find(col => col.Field === 'iec_municipality_id');
    console.log(`✅ iec_municipality_mappings.iec_municipality_id: ${iecMunicipalityIdCol.Type}`);
    
    const [wardColumns] = await connection.execute('DESCRIBE iec_ward_mappings');
    const iecWardIdCol = wardColumns.find(col => col.Field === 'iec_ward_id');
    const iecMunicipalityIdCol2 = wardColumns.find(col => col.Field === 'iec_municipality_id');
    console.log(`✅ iec_ward_mappings.iec_ward_id: ${iecWardIdCol.Type}`);
    console.log(`✅ iec_ward_mappings.iec_municipality_id: ${iecMunicipalityIdCol2.Type}`);
    
    console.log('\n🎉 COLUMN TYPE FIXES COMPLETE!');
    console.log('✅ IEC ID columns are now VARCHAR and can store alphanumeric IDs like EC441, EC101, etc.');
    console.log('\n📝 Next step: Run the populate-eastern-cape-real-data.js script again');
    
  } catch (error) {
    console.error('❌ Error fixing columns:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the fix
if (require.main === module) {
  fixIecIdColumns();
}

module.exports = { fixIecIdColumns };
