const mysql = require('mysql2/promise');

async function checkAttendanceSchema() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });
  
  try {
    console.log('🔍 Checking meeting_attendance table schema...\n');
    
    const [columns] = await connection.execute('DESCRIBE meeting_attendance');
    
    console.log('📋 Current meeting_attendance table columns:');
    console.table(columns);
    
    // Check if attendance_type column exists
    const hasAttendanceType = columns.some(col => col.Field === 'attendance_type');
    
    if (hasAttendanceType) {
      console.log('\n✅ attendance_type column EXISTS');
    } else {
      console.log('\n❌ attendance_type column MISSING');
      console.log('💡 Need to add attendance_type column or update the code to use existing columns');
    }
    
    // Show what columns are available for attendance-related data
    console.log('\n📊 Available columns for attendance data:');
    columns.forEach(col => {
      if (col.Field.includes('attendance') || col.Field.includes('status') || col.Field.includes('type')) {
        console.log(`  - ${col.Field} (${col.Type})`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error checking schema:', error.message);
  } finally {
    await connection.end();
  }
}

checkAttendanceSchema().catch(console.error);
