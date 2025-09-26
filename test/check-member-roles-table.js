const mysql = require('mysql2/promise');

async function checkMemberRolesTable() {
  console.log('🔍 Checking member_roles table structure...\n');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    // Check table structure
    const [columns] = await connection.execute('DESCRIBE member_roles');
    
    console.log('📋 member_roles table columns:');
    columns.forEach(col => {
      console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(NOT NULL)' : '(NULL)'} ${col.Key ? `[${col.Key}]` : ''} ${col.Default !== null ? `Default: ${col.Default}` : ''}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

// Run the script
checkMemberRolesTable().catch(console.error);
