const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });
  
  try {
    console.log('🚀 Running migration 018: Create meeting_invitations table...');
    
    const migrationPath = path.join(__dirname, '../migrations/018_create_meeting_invitations_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        await connection.execute(statement);
      }
    }
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the table was created
    const [tables] = await connection.execute("SHOW TABLES LIKE 'meeting_invitations'");
    if (tables.length > 0) {
      console.log('✅ meeting_invitations table exists');
      
      // Show the table structure
      const [columns] = await connection.execute('DESCRIBE meeting_invitations');
      console.log('\n📋 meeting_invitations table structure:');
      columns.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(required)' : '(optional)'}`);
      });
    } else {
      console.log('❌ meeting_invitations table was not created');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await connection.end();
  }
}

runMigration().catch(console.error);
