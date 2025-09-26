const mysql = require('mysql2/promise');

async function checkDatabaseSchema() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '', // Empty password for root user
      database: 'membership_new'
    });

    console.log('🔍 Checking database schema...\n');
    
    // 1. Check if voting_districts table exists
    console.log('1. Checking voting_districts table:');
    const [votingDistrictsTable] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'membership_new' 
        AND TABLE_NAME = 'voting_districts'
    `);
    
    if (votingDistrictsTable.length > 0) {
      console.log('   ✅ voting_districts table exists');
      
      // Check voting_districts table structure
      const [votingDistrictsColumns] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'membership_new' 
          AND TABLE_NAME = 'voting_districts'
        ORDER BY ORDINAL_POSITION
      `);
      
      console.log('   📋 voting_districts columns:');
      votingDistrictsColumns.forEach(col => {
        console.log(`      - ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
      
      // Check sample data
      const [votingDistrictsData] = await connection.execute(`
        SELECT COUNT(*) as count FROM voting_districts
      `);
      console.log(`   📊 voting_districts has ${votingDistrictsData[0].count} records\n`);
      
    } else {
      console.log('   ❌ voting_districts table does NOT exist\n');
    }
    
    // 2. Check members table for voting_district_code column
    console.log('2. Checking members table for voting_district_code:');
    const [membersVotingDistrictColumn] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'membership_new' 
        AND TABLE_NAME = 'members' 
        AND COLUMN_NAME = 'voting_district_code'
    `);
    
    if (membersVotingDistrictColumn.length > 0) {
      console.log('   ✅ voting_district_code column exists in members table');
    } else {
      console.log('   ❌ voting_district_code column does NOT exist in members table');
    }
    
    // 3. Check all members table columns
    console.log('\n3. Members table structure:');
    const [membersColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'membership_new' 
        AND TABLE_NAME = 'members'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('   📋 members columns:');
    membersColumns.forEach(col => {
      console.log(`      - ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // 4. Check if views exist
    console.log('\n4. Checking database views:');
    const [views] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.VIEWS 
      WHERE TABLE_SCHEMA = 'membership_new'
    `);
    
    if (views.length > 0) {
      console.log('   📋 Existing views:');
      views.forEach(view => {
        console.log(`      - ${view.TABLE_NAME}`);
      });
    } else {
      console.log('   ❌ No views found');
    }
    
    // 5. Check geographic tables
    console.log('\n5. Checking geographic tables:');
    const geographicTables = ['provinces', 'districts', 'municipalities', 'wards'];
    
    for (const tableName of geographicTables) {
      const [table] = await connection.execute(`
        SELECT COUNT(*) as count
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = 'membership_new' 
          AND TABLE_NAME = ?
      `, [tableName]);
      
      if (table[0].count > 0) {
        const [data] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`   ✅ ${tableName} table exists with ${data[0].count} records`);
      } else {
        console.log(`   ❌ ${tableName} table does NOT exist`);
      }
    }
    
    // 6. Check foreign key constraints
    console.log('\n6. Checking foreign key constraints:');
    const [foreignKeys] = await connection.execute(`
      SELECT 
        CONSTRAINT_NAME,
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = 'membership_new' 
        AND REFERENCED_TABLE_NAME IS NOT NULL
        AND (TABLE_NAME = 'members' OR TABLE_NAME = 'voting_districts')
      ORDER BY TABLE_NAME, CONSTRAINT_NAME
    `);
    
    if (foreignKeys.length > 0) {
      console.log('   📋 Foreign key constraints:');
      foreignKeys.forEach(fk => {
        console.log(`      - ${fk.TABLE_NAME}.${fk.COLUMN_NAME} → ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
      });
    } else {
      console.log('   ❌ No foreign key constraints found for members/voting_districts');
    }
    
    console.log('\n🎯 Schema check completed!');
    
  } catch (error) {
    console.error('❌ Schema check failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkDatabaseSchema();
