const mysql = require('mysql2/promise');

async function checkMeetingsTableSchema() {
  console.log('🔍 Checking meetings table schema...\n');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    // Check if meetings table exists
    const [tables] = await connection.execute("SHOW TABLES LIKE 'meetings'");
    
    if (tables.length === 0) {
      console.log('❌ meetings table does not exist!');
      return;
    }

    console.log('✅ meetings table exists');

    // Get table structure
    const [columns] = await connection.execute('DESCRIBE meetings');
    
    console.log('\n📋 meetings table columns:');
    columns.forEach((column, index) => {
      console.log(`   ${index + 1}. ${column.Field} (${column.Type}) ${column.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${column.Key ? `[${column.Key}]` : ''} ${column.Default !== null ? `DEFAULT: ${column.Default}` : ''}`);
    });

    // Check for specific columns we're trying to use
    const columnNames = columns.map(col => col.Field);
    
    console.log('\n🔍 Column Analysis:');
    const requiredColumns = [
      'meeting_title', 'meeting_type_id', 'hierarchy_level', 'entity_id', 'entity_type',
      'meeting_date', 'meeting_time', 'end_time', 'duration_minutes',
      'location', 'virtual_meeting_link', 'meeting_platform',
      'description', 'objectives', 'agenda_summary', 'quorum_required',
      'meeting_chair_id', 'meeting_secretary_id', 'created_by', 'meeting_status'
    ];

    requiredColumns.forEach(col => {
      if (columnNames.includes(col)) {
        console.log(`   ✅ ${col} - EXISTS`);
      } else {
        console.log(`   ❌ ${col} - MISSING`);
      }
    });

    // Check what columns might be similar
    console.log('\n🔍 Similar columns found:');
    const similarMappings = {
      'meeting_title': ['title', 'name', 'meeting_name'],
      'meeting_type_id': ['type_id', 'meeting_type'],
      'meeting_date': ['date', 'start_date'],
      'meeting_time': ['time', 'start_time'],
      'meeting_status': ['status']
    };

    Object.entries(similarMappings).forEach(([missing, alternatives]) => {
      if (!columnNames.includes(missing)) {
        const found = alternatives.filter(alt => columnNames.includes(alt));
        if (found.length > 0) {
          console.log(`   💡 Instead of '${missing}', found: ${found.join(', ')}`);
        }
      }
    });

    // Show sample data if any exists
    const [sampleData] = await connection.execute('SELECT * FROM meetings LIMIT 3');
    
    if (sampleData.length > 0) {
      console.log('\n📊 Sample data (first 3 rows):');
      sampleData.forEach((row, index) => {
        console.log(`   Row ${index + 1}:`, JSON.stringify(row, null, 2));
      });
    } else {
      console.log('\n📊 No sample data found (table is empty)');
    }

  } catch (error) {
    console.error('❌ Error checking table schema:', error.message);
  } finally {
    await connection.end();
  }
}

checkMeetingsTableSchema().catch(console.error);
