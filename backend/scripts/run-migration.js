const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'membership_new',
    multipleStatements: true
  });

  try {
    console.log('🔄 Running migration to add voting_district_code to members table...');
    
    const migrationPath = path.join(__dirname, '../migrations/015_add_voting_district_to_members.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    const [results] = await connection.execute(migrationSQL);
    console.log('✅ Migration completed successfully!');
    console.log('Results:', results);
    
    // Test if the column was added
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'membership_new' 
        AND TABLE_NAME = 'members' 
        AND COLUMN_NAME = 'voting_district_code'
    `);
    
    if (columns.length > 0) {
      console.log('✅ voting_district_code column confirmed in members table');
    } else {
      console.log('❌ voting_district_code column not found in members table');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await connection.end();
  }
}

runMigration();
