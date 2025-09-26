const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'membership_new'
};

async function checkMembersSchema() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully');

    // Check members table schema
    console.log('\n📋 Checking members table schema...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'membership_new' 
      AND TABLE_NAME = 'members'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('Members table columns:');
    columns.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Check if we have any sample data
    console.log('\n📋 Checking for sample members...');
    const [members] = await connection.execute('SELECT COUNT(*) as count FROM members');
    console.log(`Total members: ${members[0].count}`);

    if (members[0].count > 0) {
      const [sampleMembers] = await connection.execute('SELECT * FROM members LIMIT 3');
      console.log('\nSample members:');
      sampleMembers.forEach((member, index) => {
        console.log(`   ${index + 1}. ID: ${member.member_id}, Name: ${member.name || member.full_name || 'N/A'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the test
checkMembersSchema().catch(console.error);
