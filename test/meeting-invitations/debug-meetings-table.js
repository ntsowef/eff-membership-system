const mysql = require('mysql2/promise');

async function debugMeetingsTable() {
  try {
    const c = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔍 Checking meetings table structure...\n');
    
    // Check table structure
    const [columns] = await c.execute('DESCRIBE meetings');
    console.log('📋 Meetings table columns:');
    console.table(columns);
    
    // Check if there are any existing meetings
    const [meetings] = await c.execute('SELECT COUNT(*) as count FROM meetings');
    console.log(`\n📊 Total meetings in database: ${meetings[0].count}`);
    
    // Test a simple insert to see what fails
    console.log('\n🧪 Testing simple meeting insert...');
    
    try {
      const testData = {
        title: 'Test Meeting',
        description: 'Test description',
        hierarchy_level: 'Provincial',
        entity_id: 5, // KZN province ID
        meeting_type: 'Regular',
        start_datetime: '2025-01-15 09:00:00',
        end_datetime: '2025-01-15 11:00:00',
        location: 'Test Location',
        meeting_status: 'Scheduled',
        created_by: 1
      };
      
      const insertQuery = `
        INSERT INTO meetings (
          title, description, hierarchy_level, entity_id, meeting_type,
          start_datetime, end_datetime, location, meeting_status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        testData.title,
        testData.description,
        testData.hierarchy_level,
        testData.entity_id,
        testData.meeting_type,
        testData.start_datetime,
        testData.end_datetime,
        testData.location,
        testData.meeting_status,
        testData.created_by
      ];
      
      console.log('Query:', insertQuery);
      console.log('Params:', params);
      
      const [result] = await c.execute(insertQuery, params);
      console.log('✅ Insert successful! Meeting ID:', result.insertId);
      
      // Clean up - delete the test meeting
      await c.execute('DELETE FROM meetings WHERE id = ?', [result.insertId]);
      console.log('🧹 Test meeting cleaned up');
      
    } catch (insertError) {
      console.error('❌ Insert failed:', insertError.message);
      console.error('Error code:', insertError.code);
      console.error('SQL State:', insertError.sqlState);
    }
    
    await c.end();
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

debugMeetingsTable();
