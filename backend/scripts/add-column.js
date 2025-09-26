const mysql = require('mysql2/promise');

async function addVotingDistrictColumn() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '', // Empty password for root user
      database: 'membership_new'
    });

    console.log('🔄 Adding voting_district_code column to members table...');
    
    // Check if column exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'membership_new' 
        AND TABLE_NAME = 'members' 
        AND COLUMN_NAME = 'voting_district_code'
    `);
    
    if (columns.length > 0) {
      console.log('✅ voting_district_code column already exists');
      return;
    }
    
    // Add the column
    await connection.execute(`
      ALTER TABLE members 
      ADD COLUMN voting_district_code VARCHAR(20) NULL AFTER ward_code
    `);
    console.log('✅ voting_district_code column added');
    
    // Add index
    await connection.execute(`
      ALTER TABLE members 
      ADD INDEX idx_members_voting_district (voting_district_code)
    `);
    console.log('✅ Index added');
    
    // Add foreign key constraint
    await connection.execute(`
      ALTER TABLE members 
      ADD FOREIGN KEY fk_members_voting_district (voting_district_code) 
      REFERENCES voting_districts(voting_district_code) 
      ON DELETE SET NULL ON UPDATE CASCADE
    `);
    console.log('✅ Foreign key constraint added');
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addVotingDistrictColumn();
